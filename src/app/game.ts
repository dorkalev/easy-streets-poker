// View store + orchestrator: consumes engine events on a timed queue, drives
// bot turns, gates on coach messages, tracks level runs. The ONLY place where
// time exists — engine, bots and coach stay pure.

import { create } from 'zustand'
import type {
  ActionType,
  Card,
  GameEvent,
  GameState,
  HandRank,
  LegalAction,
  PlayerStatus,
} from '../engine/types'
import { createGame, legalActions, step } from '../engine/engine'
import { cardId } from '../engine/deck'
import { L } from '../i18n'
import { seedFrom } from '../engine/rng'
import { estimateEquity, chenScore, strengthLabel, type StrengthLabel } from '../engine/strength'
import { decide } from '../bots/decide'
import { explainDecision } from '../bots/explain'
import { PERSONALITIES } from '../bots/personalities'
import type { BotContext, Mood } from '../bots/types'
import { coachOnEvents, type CoachMessage, type CoachState } from '../coach/coach'
import { getLevel } from '../levels/levels'
import type { LevelConfig, Quest } from '../levels/types'
import { sfx, setSoundEnabled } from './sfx'
import { useProgress } from './progress'

// ---------------------------------------------------------------------------
// View types
// ---------------------------------------------------------------------------

export interface SeatView {
  seat: number
  playerId: string
  name: string
  emoji: string
  color: string
  isHero: boolean
  stack: number
  committed: number
  status: PlayerStatus
  cards: Card[]
  cardCount: number
  revealed: boolean
  speech: { text: string; mood: Mood } | null
  lastAction: string | null
  acting: boolean
  isButton: boolean
  winner: boolean
  handLabel: string | null
  bestCardIds: string[]
  tell: boolean
  declared: 'stay' | 'fold' | null
}

export interface RunView {
  handsPlayed: number
  handsWon: number
  predictionsCorrect: number
  questProgress: number
  questTarget: number
  questLabel: string
  rebuys: number
  profitStart: number
}

export type Prediction = 'win' | 'lose' | 'split'

export interface LevelEndView {
  outcome: 'won' | 'lost'
  stars: number
  profit: number
  questDone: boolean
  title: string
}

export interface GameView {
  levelNumber: number | null
  seats: SeatView[]
  community: Card[]
  pot: number
  carryPot: number
  streetBanner: string | null
  handNumber: number
  blinds: { small: number; big: number } | null
  heroTurn: { legal: LegalAction[]; toCall: number } | null
  heroDeclare: boolean
  predictionOpen: boolean
  predictionResult: { guess: Prediction; actual: Prediction; correct: boolean; line: string } | null
  coach: CoachMessage | null
  newRuleOpen: boolean
  celebration: 'small' | 'big' | 'royal' | null
  levelEnd: LevelEndView | null
  run: RunView
  heroStrength: StrengthLabel | null
  stoplight: 'green' | 'yellow' | 'red' | null
}

const EMPTY_RUN: RunView = {
  handsPlayed: 0,
  handsWon: 0,
  predictionsCorrect: 0,
  questProgress: 0,
  questTarget: 1,
  questLabel: '',
  rebuys: 0,
  profitStart: 0,
}

const INITIAL_VIEW: GameView = {
  levelNumber: null,
  seats: [],
  community: [],
  pot: 0,
  carryPot: 0,
  streetBanner: null,
  handNumber: 0,
  blinds: null,
  heroTurn: null,
  heroDeclare: false,
  predictionOpen: false,
  predictionResult: null,
  coach: null,
  newRuleOpen: false,
  celebration: null,
  levelEnd: null,
  run: EMPTY_RUN,
  heroStrength: null,
  stoplight: null,
}

export const useGame = create<GameView>(() => INITIAL_VIEW)

const set = (partial: Partial<GameView>) => useGame.setState(partial)
const get = () => useGame.getState()

function setSeat(playerId: string, patch: Partial<SeatView>): void {
  set({ seats: get().seats.map((s) => (s.playerId === playerId ? { ...s, ...patch } : s)) })
}

function setAllSeats(patch: Partial<SeatView> | ((s: SeatView) => Partial<SeatView>)): void {
  set({
    seats: get().seats.map((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })),
  })
}

// ---------------------------------------------------------------------------
// Orchestrator internals
// ---------------------------------------------------------------------------

interface Orc {
  level: LevelConfig | null
  engine: GameState | null
  seed: number
  actionCounter: number
  coach: CoachState
  coachQueue: CoachMessage[]
  timers: ReturnType<typeof setTimeout>[]
  // per-hand trackers
  streetIndex: number
  raisesThisHand: number
  heroAggressedPreflop: boolean
  lastShowdown: { playerId: string; rank: HandRank }[] | null
  prediction: Prediction | null
  overrideCursor: Record<string, number>
  /** Guards against double-scheduling a bot decision timer. */
  awaitingBot: boolean
  /** Re-entry latch: pump() can fire multiple times while phase is
   * hand-complete (batch pump, toast auto-clear, coach auto-dismiss) —
   * hand completion side effects must run exactly once per hand. */
  lastCompletedHand: number
  // run trackers
  predictionStreak: number
  handsPlayed: number
  handsWon: number
  predictionsCorrect: number
  questProgress: number
  rebuys: number
  foldedPreflopCount: number
  ended: boolean
}

const orc: Orc = {
  level: null,
  engine: null,
  seed: 0,
  actionCounter: 0,
  coach: { firedIds: [] },
  coachQueue: [],
  timers: [],
  streetIndex: 0,
  raisesThisHand: 0,
  heroAggressedPreflop: false,
  lastShowdown: null,
  prediction: null,
  overrideCursor: {},
  awaitingBot: false,
  lastCompletedHand: -1,
  predictionStreak: 0,
  handsPlayed: 0,
  handsWon: 0,
  predictionsCorrect: 0,
  questProgress: 0,
  rebuys: 0,
  foldedPreflopCount: 0,
  ended: false,
}

// Dev-only debugging handle (harmless in prod builds, tree-shaken by usage).
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__poker = { orc, useGame }
}

function speedFactor(): number {
  return useProgress.getState().speed
}

function wait(ms: number, fn: () => void): void {
  const t = setTimeout(fn, ms / speedFactor())
  orc.timers.push(t)
}

function clearTimers(): void {
  for (const t of orc.timers) clearTimeout(t)
  orc.timers = []
}

// ---------------------------------------------------------------------------
// Public API (called from UI)
// ---------------------------------------------------------------------------

export function startLevel(levelNumber: number): void {
  clearTimers()
  const level = getLevel(levelNumber)
  const progress = useProgress.getState()
  setSoundEnabled(progress.soundOn)
  orc.level = level
  orc.seed = seedFrom(Date.now() & 0xffffffff, levelNumber)
  orc.engine = createGame(level.rules, orc.seed, ['hero', ...level.botIds])
  orc.actionCounter = 0
  orc.coach = { firedIds: [...progress.coachFiredIds] }
  orc.coachQueue = []
  orc.lastCompletedHand = -1
  orc.predictionStreak = 0
  orc.handsPlayed = 0
  orc.handsWon = 0
  orc.predictionsCorrect = 0
  orc.questProgress = 0
  orc.rebuys = 0
  orc.foldedPreflopCount = 0
  orc.ended = false
  resetHandTrackers()

  const seats: SeatView[] = orc.engine.players.map((p) => {
    const persona = p.id === 'hero' ? null : PERSONALITIES[p.id]
    return {
      seat: p.seat,
      playerId: p.id,
      name: persona?.name ?? L.table.you,
      emoji: persona?.emoji ?? '🙂',
      color: persona?.color ?? '#ffd166',
      isHero: p.id === 'hero',
      stack: p.stack,
      committed: 0,
      status: 'active',
      cards: [],
      cardCount: 0,
      revealed: false,
      speech: null,
      lastAction: null,
      acting: false,
      isButton: false,
      winner: false,
      handLabel: null,
      bestCardIds: [],
      tell: false,
      declared: null,
    }
  })

  useGame.setState({
    ...INITIAL_VIEW,
    levelNumber,
    seats,
    newRuleOpen: true,
    run: {
      ...EMPTY_RUN,
      questTarget: questTarget(level.quest),
      questLabel: level.quest.label,
      profitStart: level.rules.startingStack,
    },
  })
  sfx.newRule()
}

export function dismissNewRule(): void {
  set({ newRuleOpen: false })
  wait(300, startHand)
}

export function heroAction(action: ActionType, amount?: number): void {
  if (!orc.engine || get().heroTurn === null) return
  set({ heroTurn: null })
  playActionSound(action)
  dispatch({ type: 'PLAYER_ACTION', seat: 0, action, amount })
}

export function heroDeclare(choice: 'stay' | 'fold'): void {
  if (!orc.engine || !get().heroDeclare) return
  set({ heroDeclare: false })
  sfx.click()
  dispatch({ type: 'PLAYER_ACTION', seat: 0, action: choice })
}

export function heroPredict(guess: Prediction): void {
  if (!get().predictionOpen) return
  orc.prediction = guess
  set({ predictionOpen: false })
  sfx.click()
  dispatch({ type: 'ADVANCE' })
}

export function dismissCoach(): void {
  const next = orc.coachQueue.shift() ?? null
  set({ coach: next })
  if (next) return
  // Coach gate released: resume the pump.
  wait(120, pump)
}

export function dismissPredictionResult(): void {
  set({ predictionResult: null })
  wait(80, pump)
}

export function retryLevel(): void {
  const n = get().levelNumber
  if (n) startLevel(n)
}

// ---------------------------------------------------------------------------
// Engine pump
// ---------------------------------------------------------------------------

function dispatch(action: Parameters<typeof step>[1]): void {
  if (!orc.engine) return
  let result: ReturnType<typeof step>
  try {
    result = step(orc.engine, action)
  } catch (err) {
    // An illegal dispatch must never kill the timer chain that issued it.
    console.error('engine rejected action', action, err)
    return
  }
  orc.engine = result.state
  processEvents(result.events)
}

function startHand(): void {
  if (!orc.engine || orc.ended) return
  // A stale timer may fire after the next hand already started.
  if (orc.engine.phase !== 'idle' && orc.engine.phase !== 'hand-complete') return
  resetHandTrackers()
  dispatch({ type: 'START_HAND' })
}

function resetHandTrackers(): void {
  orc.streetIndex = 0
  orc.raisesThisHand = 0
  orc.heroAggressedPreflop = false
  orc.lastShowdown = null
  orc.prediction = null
  orc.overrideCursor = {}
}

/** Serially animate a batch of events, then decide what happens next. */
function processEvents(events: GameEvent[]): void {
  if (!orc.level || !orc.engine) return
  const { messages, coach } = coachOnEvents(events, orc.engine, orc.level, orc.coach)
  orc.coach = coach
  useProgress.getState().setCoachFired(coach.firedIds)
  orc.coachQueue.push(...messages)

  let delay = 0
  for (const ev of events) {
    const ms = eventDelay(ev)
    wait(delay, () => applyEvent(ev))
    delay += ms
  }
  wait(delay, pump)
}

function eventDelay(ev: GameEvent): number {
  switch (ev.type) {
    case 'hand-started': return 350
    case 'posts': return 450
    case 'cards-dealt': return 700
    case 'street-started': return ev.street === 'preflop' || ev.street === 'declare' || ev.street === 'the bet' ? 100 : 500
    case 'community-dealt': return 250 + ev.cards.length * 160
    case 'action-required': return 0
    case 'declarations-required': return 100
    case 'player-declared': return 300
    case 'declarations-revealed': return 800
    case 'player-acted': return 500
    case 'betting-round-complete': return 450
    case 'all-in-runout': return 900
    case 'showdown': return 1000
    case 'pot-awarded': return 1200
    case 'pot-carried': return 900
    case 'player-busted': return 500
    case 'hand-complete': return 300
  }
}

/** What to do once the current event batch has finished animating. */
function pump(): void {
  if (!orc.engine || !orc.level || orc.ended) return

  // Coach gate: a BLOCKING message pauses everything until dismissed.
  if (get().coach?.blocking) return
  if (orc.coachQueue.length > 0 && !get().coach) {
    const msg = orc.coachQueue.shift()!
    set({ coach: msg })
    sfx.pop()
    if (msg.blocking) return
    // Non-blocking: show it, keep the game moving, self-dismiss.
    wait(4200, () => {
      if (get().coach?.id === msg.id) set({ coach: null })
    })
  }
  if (get().predictionResult) return // brief toast; auto-clears then re-pumps

  const s = orc.engine
  switch (s.phase) {
    case 'street-begin':
    case 'street-end':
    case 'runout':
    case 'payout-pending':
      dispatch({ type: 'ADVANCE' })
      return
    case 'showdown-pending':
      if (orc.level.ui.peekAndPredict && orc.prediction === null && !get().predictionOpen) {
        set({ predictionOpen: true })
        return
      }
      dispatch({ type: 'ADVANCE' })
      return
    case 'betting':
      if (s.actingSeat === 0) {
        const legal = legalActions(s)
        const hero = s.players[0]
        const toCall = Math.min(Math.max(0, s.currentBet - hero.committedThisRound), hero.stack)
        set({ heroTurn: { legal, toCall } })
        updateHeroMeters()
      } else if (s.actingSeat !== null) {
        scheduleBotAction(s.actingSeat)
      }
      return
    case 'declaring':
      handleDeclarations()
      return
    case 'hand-complete':
      onHandComplete()
      return
    case 'idle':
      startHand()
      return
  }
}

// ---------------------------------------------------------------------------
// Event → view
// ---------------------------------------------------------------------------

function applyEvent(ev: GameEvent): void {
  if (!orc.level) return
  switch (ev.type) {
    case 'hand-started': {
      const carry = get().carryPot
      set({
        community: [],
        pot: carry,
        carryPot: 0,
        streetBanner: null,
        handNumber: ev.handNumber + 1,
        blinds: ev.blinds,
        predictionResult: null,
        celebration: null,
        heroStrength: null,
        stoplight: null,
      })
      setAllSeats((s) => ({
        committed: 0,
        cards: s.isHero ? [] : s.cards,
        cardCount: 0,
        revealed: false,
        lastAction: null,
        acting: false,
        winner: false,
        handLabel: null,
        bestCardIds: [],
        tell: false,
        declared: null,
        speech: null,
        isButton: s.seat === ev.buttonSeat,
        ...(s.status !== 'busted' ? { status: 'active' as PlayerStatus, cards: [] } : {}),
      }))
      break
    }
    case 'posts': {
      sfx.chip()
      for (const post of ev.posts) {
        const seat = get().seats.find((s) => s.playerId === post.playerId)
        if (!seat) continue
        setSeat(post.playerId, {
          stack: seat.stack - post.amount,
          committed: post.kind === 'ante' ? seat.committed : seat.committed + post.amount,
          lastAction: post.kind === 'ante' ? L.seat.ante : post.kind.toUpperCase(),
        })
        set({ pot: get().pot + (post.kind === 'ante' ? post.amount : 0) })
      }
      break
    }
    case 'cards-dealt': {
      sfx.deal()
      // Open duels: the first N Peek & Predict hands play the bots face-up,
      // so the learner points at the winner before hidden-info guessing.
      const open =
        (orc.level.ui.openDuels ?? 0) > (orc.engine?.handNumber ?? 0) && orc.level.ui.peekAndPredict
      for (const deal of ev.deals) {
        if (deal.playerId === 'hero') {
          setSeat('hero', { cards: deal.cards, cardCount: deal.cards.length })
        } else {
          setSeat(deal.playerId, {
            cards: open ? deal.cards : [],
            cardCount: deal.cards.length,
            revealed: open,
          })
        }
      }
      updateHeroMeters()
      break
    }
    case 'street-started': {
      orc.streetIndex = ev.streetIndex
      if (!['declare', 'the bet', 'preflop'].includes(ev.street)) {
        set({ streetBanner: ev.street.toUpperCase() })
        sfx.whoosh()
        wait(1100, () => set({ streetBanner: null }))
      }
      break
    }
    case 'community-dealt': {
      sfx.flip()
      set({ community: [...get().community, ...ev.cards] })
      updateHeroMeters()
      break
    }
    case 'action-required': {
      setAllSeats((s) => ({ acting: s.seat === ev.seat }))
      break
    }
    case 'declarations-required':
      break
    case 'player-declared': {
      sfx.click()
      setSeat(ev.playerId, { lastAction: L.seat.ready })
      break
    }
    case 'declarations-revealed': {
      for (const d of ev.declarations) {
        setSeat(d.playerId, {
          declared: d.choice,
          lastAction: d.choice === 'stay' ? L.seat.stay : L.seat.fold,
          ...(d.choice === 'fold' ? { status: 'folded' as PlayerStatus } : {}),
        })
      }
      break
    }
    case 'player-acted': {
      playActionSound(ev.action)
      const seat = get().seats.find((s) => s.playerId === ev.playerId)
      if (!seat) break
      if (ev.action === 'raise' || ev.action === 'bet') {
        orc.raisesThisHand += ev.action === 'raise' ? 1 : 0
        if (ev.playerId === 'hero' && orc.streetIndex === 0) orc.heroAggressedPreflop = true
      }
      if (ev.playerId === 'hero' && ev.action === 'fold' && orc.streetIndex === 0) {
        orc.foldedPreflopCount += 1
        bumpQuest('fold-preflop')
      }
      setSeat(ev.playerId, {
        stack: seat.stack - ev.amount,
        committed: ev.action === 'fold' ? seat.committed : seat.committed + ev.amount,
        status: ev.action === 'fold' ? 'folded' : ev.allIn ? 'all-in' : seat.status,
        lastAction: actionLabel(ev.action, ev.amount, ev.allIn),
        acting: false,
        speech: seat.speech,
      })
      set({ pot: ev.potAfter })
      break
    }
    case 'betting-round-complete': {
      sfx.chips()
      setAllSeats({ committed: 0, acting: false })
      set({ pot: ev.potTotal })
      break
    }
    case 'all-in-runout': {
      sfx.allIn()
      if (orc.engine) {
        for (const r of ev.reveals) {
          setSeat(r.playerId, { cards: r.cards, cardCount: r.cards.length, revealed: true })
        }
      }
      break
    }
    case 'showdown': {
      sfx.flip()
      orc.lastShowdown = ev.reveals.map((r) => ({ playerId: r.playerId, rank: r.rank }))
      for (const r of ev.reveals) {
        setSeat(r.playerId, {
          cards: r.cards,
          cardCount: r.cards.length,
          revealed: true,
          handLabel: L.hands.handName(r.rank),
          bestCardIds: r.rank.cardsUsed.map(cardId),
        })
        if (r.playerId === 'hero') useProgress.getState().recordCodex(r.rank.category)
      }
      gradePrediction(ev.reveals)
      break
    }
    case 'pot-awarded': {
      onPotAwarded(ev)
      break
    }
    case 'pot-carried': {
      sfx.chips()
      set({ carryPot: ev.amount, pot: ev.amount })
      setAllSeats({ committed: 0 })
      break
    }
    case 'player-busted': {
      sfx.lose()
      setSeat(ev.playerId, { status: 'busted' })
      break
    }
    case 'hand-complete':
      break
  }
}

function onPotAwarded(ev: Extract<GameEvent, { type: 'pot-awarded' }>): void {
  const heroAward = ev.awards.find((a) => a.playerId === 'hero')
  for (const award of ev.awards) {
    const seat = get().seats.find((s) => s.playerId === award.playerId)
    if (!seat) continue
    setSeat(award.playerId, {
      stack: seat.stack + award.amount,
      winner: true,
      handLabel: award.rank ? L.hands.handName(award.rank) : seat.handLabel,
    })
  }
  set({ pot: 0 })
  setAllSeats({ committed: 0, acting: false })

  if (heroAward) {
    orc.handsWon += 1
    const category = heroAward.rank?.category
    if (category) useProgress.getState().recordCodex(category)
    trackHeroWinQuests(heroAward, ev)
    const celebration =
      category === 'straight-flush' && heroAward.rank?.tiebreak[0] === 14
        ? 'royal'
        : category && ['full-house', 'quads', 'straight-flush'].includes(category)
          ? 'big'
          : 'small'
    set({ celebration })
    if (celebration === 'small') sfx.winSmall()
    else sfx.winBig()
    wait(1800, () => set({ celebration: null }))
  } else if (ev.awards.length > 0) {
    sfx.lose()
  }
  syncStacksFromEngine()
}

// ---------------------------------------------------------------------------
// Quests + run tracking
// ---------------------------------------------------------------------------

function questTarget(q: Quest): number {
  return 'count' in q ? q.count : 1
}

function bumpQuest(type: Quest['type']): void {
  if (!orc.level || orc.level.quest.type !== type) return
  orc.questProgress += 1
  syncRun()
}

function trackHeroWinQuests(
  award: { rank: HandRank | null; wonBy: 'showdown' | 'fold'; split: boolean },
  ev: Extract<GameEvent, { type: 'pot-awarded' }>,
): void {
  const level = orc.level
  const engine = orc.engine
  if (!level || !engine) return
  const q = level.quest
  switch (q.type) {
    case 'win-with-category':
      if (award.rank && q.categories.includes(award.rank.category)) bumpQuest(q.type)
      break
    case 'win-raised-pot':
      if (orc.raisesThisHand >= 1) bumpQuest(q.type)
      break
    case 'win-without-showdown':
      if (award.wonBy === 'fold') bumpQuest(q.type)
      break
    case 'steal-blinds':
      if (award.wonBy === 'fold' && orc.streetIndex === 0 && orc.heroAggressedPreflop) bumpQuest(q.type)
      break
    case 'win-on-button':
      if (engine.buttonSeat === 0) bumpQuest(q.type)
      break
    case 'win-with-kicker': {
      if (!award.rank || award.split || award.rank.kickers.length === 0 || !orc.lastShowdown) break
      const rival = orc.lastShowdown.find(
        (r) =>
          r.playerId !== 'hero' &&
          r.rank.category === award.rank!.category &&
          r.rank.tiebreak[0] === award.rank!.tiebreak[0],
      )
      if (rival) bumpQuest(q.type)
      break
    }
    case 'win-tournament': {
      const bots = engine.players.filter((p) => p.id !== 'hero')
      if (bots.every((p) => p.status === 'busted')) bumpQuest(q.type)
      break
    }
    case 'correct-predictions':
    case 'prediction-streak':
    case 'fold-preflop':
      break // tracked elsewhere
  }
  void ev
}

function gradePrediction(reveals: { playerId: string; rank: HandRank }[]): void {
  if (!orc.level?.ui.peekAndPredict || orc.prediction === null) return
  const hero = reveals.find((r) => r.playerId === 'hero')
  const others = reveals.filter((r) => r.playerId !== 'hero')
  if (!hero || others.length === 0) return
  const bestReveal = others.reduce((a, b) => (a.rank.score >= b.rank.score ? a : b))
  const best = bestReveal.rank.score
  const actual: Prediction = hero.rank.score > best ? 'win' : hero.rank.score < best ? 'lose' : 'split'
  const heroHand = L.hands.handName(hero.rank)
  const rivalHand = L.hands.handName(bestReveal.rank)
  const line =
    actual === 'win' ? L.predict.beats(heroHand, rivalHand)
    : actual === 'lose' ? L.predict.beats(rivalHand, heroHand)
    : L.predict.bothHave(heroHand)
  const correct = actual === orc.prediction
  if (correct) {
    orc.predictionsCorrect += 1
    orc.predictionStreak += 1
    if (orc.level.quest.type === 'correct-predictions') orc.questProgress += 1
    if (orc.level.quest.type === 'prediction-streak') {
      orc.questProgress = Math.max(orc.questProgress, orc.predictionStreak)
    }
  } else {
    orc.predictionStreak = 0
  }
  set({ predictionResult: { guess: orc.prediction, actual, correct, line } })
  if (correct) sfx.winSmall()
  else sfx.lose()
  syncRun()
  wait(1700, () => {
    if (get().predictionResult) {
      set({ predictionResult: null })
      pump()
    }
  })
}

function syncRun(): void {
  if (!orc.level) return
  set({
    run: {
      handsPlayed: orc.handsPlayed,
      handsWon: orc.handsWon,
      predictionsCorrect: orc.predictionsCorrect,
      questProgress: orc.questProgress,
      questTarget: questTarget(orc.level.quest),
      questLabel: orc.level.quest.label,
      rebuys: orc.rebuys,
      profitStart: orc.level.rules.startingStack,
    },
  })
}

function syncStacksFromEngine(): void {
  if (!orc.engine) return
  for (const p of orc.engine.players) {
    setSeat(p.id, { stack: p.stack })
  }
}

// ---------------------------------------------------------------------------
// Hand completion / level flow
// ---------------------------------------------------------------------------

function onHandComplete(): void {
  const level = orc.level
  const engine = orc.engine
  if (!level || !engine) return
  if (orc.lastCompletedHand === engine.handNumber) return // pump re-entry
  orc.lastCompletedHand = engine.handNumber
  orc.handsPlayed += 1
  syncRun()

  const hero = engine.players[0]
  const win = level.winCondition

  // Rebuys (rookie insurance) keep cash levels alive for everyone.
  if (level.rebuys) {
    for (const p of engine.players) {
      if (p.status === 'busted') {
        p.status = 'active'
        p.stack = level.rules.startingStack
        if (p.id === 'hero') orc.rebuys += 1
        setSeat(p.id, { status: 'active', stack: p.stack })
      }
    }
  }

  // Tournament outcomes.
  if (win.type === 'tournament') {
    const alive = engine.players.filter((p) => p.status !== 'busted')
    if (hero.status === 'busted') return endLevel('lost')
    if (alive.length === 1 && alive[0].id === 'hero') return endLevel('won')
  } else {
    if (conditionMet(win, hero.stack)) return endLevel('won')
    if (orc.handsPlayed >= level.handsToComplete) {
      return endLevel(conditionMet(win, hero.stack, true) ? 'won' : 'lost')
    }
  }
  wait(1400, startHand)
}

function conditionMet(
  win: LevelConfig['winCondition'],
  heroStack: number,
  atEnd = false,
): boolean {
  const level = orc.level!
  switch (win.type) {
    case 'predictions':
      return orc.predictionsCorrect >= win.target
    case 'hands-won':
      return orc.handsWon >= win.target
    case 'chips':
      return heroStack >= win.target
    case 'profit':
      return atEnd && orc.handsPlayed >= win.afterHands && heroStack > level.rules.startingStack
    case 'tournament':
      return false // handled separately
  }
}

function endLevel(outcome: 'won' | 'lost'): void {
  const level = orc.level
  const engine = orc.engine
  if (!level || !engine) return
  orc.ended = true
  const hero = engine.players[0]
  const profit = hero.stack - level.rules.startingStack
  const questDone = orc.questProgress >= questTarget(level.quest)
  const flawless = outcome === 'won' && questDone && orc.rebuys === 0
  const stars = outcome === 'won' ? 1 + (questDone ? 1 : 0) + (flawless ? 1 : 0) : 0

  if (outcome === 'won') {
    useProgress.getState().recordResult(level.levelNumber, {
      stars,
      completed: true,
      bestProfit: profit,
    })
    sfx.levelUp()
  } else {
    sfx.lose()
  }
  wait(900, () =>
    set({
      levelEnd: { outcome, stars, profit, questDone, title: level.title },
      heroTurn: null,
      heroDeclare: false,
      predictionOpen: false,
    }),
  )
}

// ---------------------------------------------------------------------------
// Bots
// ---------------------------------------------------------------------------

function buildBotContext(seat: number): BotContext {
  const s = orc.engine!
  const p = s.players[seat]
  const street = s.rules.streets[s.streetIndex]
  return {
    myCards: p.holeCards,
    community: s.community,
    streetName: street?.name ?? '',
    streetIndex: s.streetIndex,
    totalStreets: s.rules.streets.length,
    toCall: Math.min(Math.max(0, s.currentBet - p.committedThisRound), p.stack),
    potSize: s.carryPot + s.players.reduce((sum, pl) => sum + pl.committedTotal, 0),
    myStack: p.stack,
    legal: legalActions(s),
    numActivePlayers: s.players.filter((pl) => pl.status === 'active' || pl.status === 'all-in').length,
    numOpponents: s.players.filter((pl, i) => i !== seat && (pl.status === 'active' || pl.status === 'all-in')).length,
    bigBlind: s.currentBlinds?.big ?? s.rules.betting?.fixedBet ?? 10,
    handEvents: [],
    rngState: seedFrom(orc.seed, seat, s.handNumber, orc.actionCounter),
  }
}

function scriptedOverride(botId: string): ActionType | null {
  const s = orc.engine!
  const overrides = s.rules.script?.[s.handNumber]?.botOverrides?.[botId]
  if (!overrides) return null
  const cursor = orc.overrideCursor[botId] ?? 0
  if (cursor >= overrides.length) return null
  orc.overrideCursor[botId] = cursor + 1
  return overrides[cursor]
}

function scheduleBotAction(seat: number): void {
  const level = orc.level
  const s = orc.engine
  if (!level || !s || orc.awaitingBot) return
  orc.awaitingBot = true
  const p = s.players[seat]
  const persona = PERSONALITIES[p.id]
  orc.actionCounter += 1
  const ctx = buildBotContext(seat)
  const decision = decide(persona, ctx, level.difficulty)
  const forced = scriptedOverride(p.id)
  if (forced) decision.action = forced

  wait(decision.thinkTimeMs, () => {
    orc.awaitingBot = false
    if (!orc.engine || orc.engine.actingSeat !== seat) return
    // Speech: teaching narration in early levels, personality flavor later.
    const speech = level.ui.botsThinkOutLoud
      ? { text: explainDecision(ctx, decision), mood: decision.speech?.mood ?? ('thinking' as Mood) }
      : decision.speech ?? null
    if (speech) {
      setSeat(p.id, { speech })
      wait(2600, () => setSeat(p.id, { speech: null }))
    }
    if (decision.bluffing && Math.random() < persona.tellReliability) {
      setSeat(p.id, { tell: true })
      wait(2000, () => setSeat(p.id, { tell: false }))
    }
    dispatch({ type: 'PLAYER_ACTION', seat, action: decision.action, amount: decision.amount })
  })
}

function handleDeclarations(): void {
  const level = orc.level
  const s = orc.engine
  if (!level || !s) return
  const pending = s.pendingDeclarations
  if (pending.includes(0) && !get().heroDeclare) {
    set({ heroDeclare: true })
    updateHeroMeters()
  }
  const botSeat = pending.find((seat) => seat !== 0)
  if (botSeat !== undefined && !orc.awaitingBot) {
    orc.awaitingBot = true
    const p = s.players[botSeat]
    const persona = PERSONALITIES[p.id]
    orc.actionCounter += 1
    const ctx = buildBotContext(botSeat)
    const decision = decide(persona, ctx, level.difficulty)
    wait(decision.thinkTimeMs, () => {
      orc.awaitingBot = false
      if (!orc.engine || !orc.engine.pendingDeclarations.includes(botSeat)) return
      dispatch({ type: 'PLAYER_ACTION', seat: botSeat, action: decision.action })
    })
  }
}

// ---------------------------------------------------------------------------
// Hero helpers
// ---------------------------------------------------------------------------

function updateHeroMeters(): void {
  const level = orc.level
  const s = orc.engine
  if (!level || !s) return
  const hero = s.players[0]
  if (hero.holeCards.length === 0) {
    set({ heroStrength: null, stoplight: null })
    return
  }
  if (level.ui.showHandStrengthMeter) {
    const opponents = s.players.filter((p, i) => i > 0 && p.status !== 'busted' && p.status !== 'folded').length
    const boardToCome = level.rules.handSize === 5 ? Math.max(0, 5 - s.community.length) : 0
    const equity =
      hero.holeCards.length === 1
        ? (hero.holeCards[0].rank - 2) / 12
        : estimateEquity(hero.holeCards, s.community, Math.max(1, opponents), boardToCome, seedFrom(orc.seed, 999, s.handNumber, s.community.length), 120)
    set({ heroStrength: strengthLabel(equity) })
  }
  if (level.ui.stoplight && s.community.length === 0 && hero.holeCards.length === 2) {
    const chen = chenScore(hero.holeCards)
    const onButton = s.buttonSeat === 0
    const green = onButton ? 0.35 : 0.45
    const yellow = onButton ? 0.22 : 0.3
    set({ stoplight: chen >= green ? 'green' : chen >= yellow ? 'yellow' : 'red' })
  } else if (!level.ui.stoplight) {
    set({ stoplight: null })
  }
}

function playActionSound(action: ActionType): void {
  switch (action) {
    case 'check': sfx.check(); break
    case 'fold': sfx.fold(); break
    case 'call': sfx.chip(); break
    case 'bet': sfx.chips(); break
    case 'raise': sfx.raise(); break
    case 'all-in': sfx.allIn(); break
    case 'stay': sfx.click(); break
  }
}

function actionLabel(action: ActionType, amount: number, allIn: boolean): string {
  if (allIn) return L.seat.allIn
  switch (action) {
    case 'check': return L.seat.action.check
    case 'fold': return L.seat.action.fold
    case 'call': return L.seat.action.call(amount)
    case 'bet': return L.seat.action.bet(amount)
    case 'raise': return L.seat.action.raise(amount)
    default: return action
  }
}
