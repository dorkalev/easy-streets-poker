// "Think out loud" teaching speech: in early levels bots narrate WHY they act,
// which is how betting concepts get taught without walls of text.

import { bestHand } from '../engine/evaluate'
import { HAND_CATEGORY_ORDER } from '../engine/types'
import { L } from '../i18n'
import type { BotContext, BotDecision } from './types'
import { botStrength } from './decide'

const FULL = { enabledHands: HAND_CATEGORY_ORDER, kickersMatter: true, handSize: 5 as const }

export function explainDecision(ctx: BotContext, decision: BotDecision): string {
  const cards = [...ctx.myCards, ...ctx.community]
  const made = cards.length >= 1
    ? L.hands.handName(
        bestHand(ctx.myCards, ctx.community, {
          ...FULL,
          handSize: cards.length >= 5 ? 5 : cards.length >= 2 ? 2 : 1,
        }),
      )
    : ''
  const strength = botStrength(ctx)

  switch (decision.action) {
    case 'fold':
      return ctx.toCall > 0 ? L.explain.fold(made, ctx.toCall) : L.explain.foldFree(made)
    case 'stay':
      return L.explain.stay(made)
    case 'check':
      return strength > 0.5 ? L.explain.checkStrong : L.explain.checkWeak
    case 'call':
      return ctx.toCall > 0 ? L.explain.call(ctx.toCall, ctx.potSize, made) : L.explain.callPlain
    case 'bet':
      return decision.bluffing ? L.explain.betBluff(String(decision.amount ?? '')) : L.explain.betValue(made)
    case 'raise':
      return decision.bluffing ? L.explain.raiseBluff : L.explain.raiseValue(made)
    case 'all-in':
      return L.explain.allIn
  }
  return ''
}
