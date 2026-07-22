import type { LegalAction } from '../engine/types'
import { chenScore, estimateEquity } from '../engine/strength'
import { rngNext } from '../engine/rng'
import type { BotContext, BotDecision, BotPersonality, SpeechTrigger } from './types'

/** Difficulty 0..3: more noise and forced mistakes at the low end. */
export type Difficulty = 0 | 1 | 2 | 3

function find(legal: LegalAction[], type: LegalAction['type']): LegalAction | undefined {
  return legal.find((l) => l.type === type)
}

/** Raw hand strength 0..1 for the bot's current situation. */
export function botStrength(ctx: BotContext): number {
  if (ctx.myCards.length === 1) return (ctx.myCards[0].rank - 2) / 12
  if (ctx.community.length === 0 && ctx.totalStreets > 1) return chenScore(ctx.myCards)
  const boardToCome = Math.max(0, 5 - ctx.community.length)
  // Showdown-only or board-based levels: straight Monte-Carlo equity.
  return estimateEquity(
    ctx.myCards,
    ctx.community,
    Math.max(1, ctx.numOpponents),
    ctx.streetIndex >= ctx.totalStreets - 1 ? 0 : boardToCome,
    ctx.rngState,
    120,
  )
}

export function decide(p: BotPersonality, ctx: BotContext, difficulty: Difficulty): BotDecision {
  let rng = ctx.rngState
  const roll = (): number => {
    const [v, next] = rngNext(rng)
    rng = next
    return v
  }

  const base = botStrength(ctx)
  const noiseScale = [0.18, 0.12, 0.06, 0.03][difficulty]
  const strength = clamp(base - (p.tightness - 0.5) * 0.25 + (roll() - 0.5) * 2 * noiseScale)

  const stay = find(ctx.legal, 'stay')
  if (stay) {
    const threshold = 0.38 + p.tightness * 0.25
    const action = strength > threshold ? 'stay' : 'fold'
    return withSpeech(p, ctx, {
      action,
      bluffing: false,
      thinkTimeMs: thinkTime(roll, false),
    }, action === 'stay' ? 'calls' : 'folds', roll)
  }

  const check = find(ctx.legal, 'check')
  const call = find(ctx.legal, 'call')
  const bet = find(ctx.legal, 'bet')
  const raise = find(ctx.legal, 'raise')
  const aggressive = bet ?? raise

  const betThreshold = 0.62 - p.aggression * 0.22
  const callThreshold = 0.34 - (1 - p.tightness) * 0.18
  const wantsBluff = strength < 0.3 && roll() < p.bluffFreq && aggressive !== undefined

  // Pot odds gate for calls (smart bots only).
  const potOddsOk = (): boolean => {
    if (difficulty < 2 || !call) return true
    const price = ctx.toCall / Math.max(1, ctx.potSize + ctx.toCall)
    return strength >= price - 0.08
  }

  let decision: BotDecision
  let trigger: SpeechTrigger

  if (wantsBluff) {
    decision = {
      action: aggressive!.type,
      amount: sizeBet(ctx, aggressive!, 0.65, roll),
      bluffing: true,
      thinkTimeMs: thinkTime(roll, true),
    }
    trigger = aggressive!.type === 'raise' ? 'raises' : 'bets'
  } else if (aggressive && strength > betThreshold && roll() < 0.35 + p.aggression * 0.6) {
    const frac = strength > 0.85 ? 0.9 + p.aggression * 0.4 : strength > 0.7 ? 0.7 : 0.5
    decision = {
      action: aggressive.type,
      amount: sizeBet(ctx, aggressive, frac, roll),
      bluffing: false,
      thinkTimeMs: thinkTime(roll, false),
    }
    trigger = aggressive.type === 'raise' ? 'raises' : 'bets'
  } else if (check) {
    decision = { action: 'check', bluffing: false, thinkTimeMs: thinkTime(roll, false) }
    trigger = 'checks'
  } else if (call && strength > callThreshold && potOddsOk()) {
    decision = { action: 'call', bluffing: false, thinkTimeMs: thinkTime(roll, ctx.toCall > ctx.potSize / 2) }
    trigger = 'calls'
  } else if (call && ctx.toCall >= ctx.myStack && strength > 0.72) {
    decision = { action: 'call', bluffing: false, thinkTimeMs: thinkTime(roll, true) }
    trigger = 'calls'
  } else {
    decision = { action: 'fold', bluffing: false, thinkTimeMs: thinkTime(roll, false) }
    trigger = 'folds'
  }

  return withSpeech(p, ctx, decision, trigger, roll)
}

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function thinkTime(roll: () => number, bigDecision: boolean): number {
  const base = 500 + roll() * 900
  return Math.round(bigDecision ? base + 800 : base)
}

/** Convert a pot fraction to a commit-to amount inside the legal window. */
function sizeBet(
  ctx: BotContext,
  spec: LegalAction,
  potFraction: number,
  roll: () => number,
): number | undefined {
  if (spec.max === undefined) return undefined // fixed-limit: size is implied
  const jitter = 0.85 + roll() * 0.3
  let target = Math.round((spec.min ?? 0) + ctx.potSize * potFraction * jitter)
  const bb = Math.max(1, ctx.bigBlind)
  target = Math.round(target / bb) * bb
  return Math.max(spec.min ?? 0, Math.min(spec.max, target))
}

function withSpeech(
  p: BotPersonality,
  _ctx: BotContext,
  decision: BotDecision,
  trigger: SpeechTrigger,
  roll: () => number,
): BotDecision {
  const lines = p.lines[trigger]
  if (!lines || lines.length === 0 || roll() > p.speechChance) return decision
  const text = lines[Math.floor(roll() * lines.length)]
  const mood =
    trigger === 'folds' ? 'sad'
    : trigger === 'raises' || trigger === 'bets' ? 'confident'
    : trigger === 'calls' ? 'thinking'
    : 'happy'
  return { ...decision, speech: { text, mood } }
}
