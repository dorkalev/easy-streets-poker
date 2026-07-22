// Penny the Dealer: an event-consuming trigger pipeline. Pure — it reads the
// event stream + game state and produces messages; the orchestrator decides
// pacing and blocking. All copy comes from the i18n dictionaries.

import type { GameEvent, GameState } from '../engine/types'
import type { LevelConfig } from '../levels/types'
import { L } from '../i18n'

export interface CoachMessage {
  id: string
  text: string
  /** Blocking messages pause the ADVANCE pump until dismissed. */
  blocking: boolean
}

export interface CoachTrigger {
  id: string
  once: boolean
  on: GameEvent['type'][]
  when?: (ev: GameEvent, state: GameState, level: LevelConfig) => boolean
  text: (ev: GameEvent, state: GameState, level: LevelConfig) => string
  blocking?: boolean
}

const TRIGGERS: CoachTrigger[] = [
  {
    id: 'open-duel-explainer',
    once: true,
    on: ['cards-dealt'],
    when: (_ev, state, level) =>
      level.ui.peekAndPredict && level.ui.openDuels > 0 && state.handNumber === 0,
    text: () => L.coach.openDuel,
    blocking: true,
  },
  {
    id: 'hidden-duel-explainer',
    once: true,
    on: ['cards-dealt'],
    when: (_ev, state, level) =>
      level.ui.peekAndPredict && level.ui.openDuels > 0 && state.handNumber === level.ui.openDuels,
    text: () => L.coach.hiddenDuel,
    blocking: true,
  },
  {
    id: 'first-tie-split',
    once: true,
    on: ['pot-awarded'],
    when: (ev) => ev.type === 'pot-awarded' && ev.awards.some((a) => a.split),
    text: () => L.coach.tieSplit,
    blocking: true,
  },
  {
    id: 'first-fold-win',
    once: true,
    on: ['pot-awarded'],
    when: (ev) => ev.type === 'pot-awarded' && ev.awards.some((a) => a.wonBy === 'fold' && a.playerId === 'hero'),
    text: () => L.coach.foldWin,
  },
  {
    id: 'first-carry',
    once: true,
    on: ['pot-carried'],
    text: (ev) => (ev.type === 'pot-carried' ? L.coach.carry(ev.amount) : ''),
    blocking: true,
  },
  {
    id: 'hero-loses-showdown',
    once: true,
    on: ['pot-awarded'],
    when: (ev) =>
      ev.type === 'pot-awarded' &&
      ev.awards.every((a) => a.playerId !== 'hero') &&
      ev.awards.some((a) => a.rank !== null),
    text: (ev) => {
      if (ev.type !== 'pot-awarded') return ''
      const w = ev.awards.find((a) => a.rank)
      return w?.rank ? L.coach.losesShowdown(L.hands.handName(w.rank)) : ''
    },
  },
  {
    id: 'first-kicker-win',
    once: true,
    on: ['pot-awarded'],
    when: (ev, state) =>
      ev.type === 'pot-awarded' &&
      state.rules.kickersMatter &&
      ev.awards.some((a) => a.rank !== null && a.rank.kickers.length > 0 && !a.split),
    text: () => L.coach.kickerWin,
  },
  {
    id: 'first-all-in',
    once: true,
    on: ['all-in-runout'],
    text: () => L.coach.allIn,
    blocking: true,
  },
  {
    id: 'first-side-pot',
    once: true,
    on: ['pot-awarded'],
    when: (ev) => ev.type === 'pot-awarded' && ev.sidePots > 0,
    text: () => L.coach.sidePot,
    blocking: true,
  },
  {
    id: 'first-blinds',
    once: true,
    on: ['posts'],
    when: (ev) => ev.type === 'posts' && ev.posts.some((p) => p.kind === 'sb'),
    text: () => L.coach.blinds,
    blocking: true,
  },
  {
    id: 'blinds-up',
    once: false,
    on: ['hand-started'],
    when: (ev, state) => {
      if (ev.type !== 'hand-started' || !ev.blinds || !state.rules.blindSchedule) return false
      return ev.handNumber > 0 && ev.handNumber % state.rules.blindSchedule.everyHands === 0
    },
    text: (ev) => (ev.type === 'hand-started' && ev.blinds ? L.coach.blindsUp(ev.blinds.small, ev.blinds.big) : ''),
  },
  {
    id: 'hero-busted',
    once: false,
    on: ['player-busted'],
    when: (ev) => ev.type === 'player-busted' && ev.playerId === 'hero',
    text: (_ev, _state, level) => (level.rebuys ? L.coach.heroBustedRebuy : L.coach.heroBustedTournament),
    blocking: true,
  },
  {
    id: 'bot-busted',
    once: false,
    on: ['player-busted'],
    when: (ev) => ev.type === 'player-busted' && ev.playerId !== 'hero',
    text: () => L.coach.botBusted,
  },
]

export interface CoachState {
  firedIds: string[]
}

export function coachOnEvents(
  events: GameEvent[],
  state: GameState,
  level: LevelConfig,
  coach: CoachState,
): { messages: CoachMessage[]; coach: CoachState } {
  const messages: CoachMessage[] = []
  const fired = new Set(coach.firedIds)
  for (const ev of events) {
    for (const t of TRIGGERS) {
      if (!t.on.includes(ev.type)) continue
      if (t.once && fired.has(t.id)) continue
      if (t.when && !t.when(ev, state, level)) continue
      const text = t.text(ev, state, level)
      if (!text) continue
      fired.add(t.id)
      messages.push({ id: t.id, text, blocking: t.blocking ?? false })
    }
  }
  return { messages, coach: { firedIds: [...fired] } }
}
