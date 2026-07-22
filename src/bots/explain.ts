// "Think out loud" teaching speech: in early levels bots narrate WHY they act,
// which is how betting concepts get taught without walls of text.

import { bestHand } from '../engine/evaluate'
import { handName } from '../engine/describe'
import { HAND_CATEGORY_ORDER } from '../engine/types'
import type { BotContext, BotDecision } from './types'
import { botStrength } from './decide'

const FULL = { enabledHands: HAND_CATEGORY_ORDER, kickersMatter: true, handSize: 5 as const }

export function explainDecision(ctx: BotContext, decision: BotDecision): string {
  const cards = [...ctx.myCards, ...ctx.community]
  const made = cards.length >= 1
    ? handName(bestHand(ctx.myCards, ctx.community, { ...FULL, handSize: cards.length >= 5 ? 5 : cards.length >= 2 ? 2 : 1 }))
    : ''
  const strength = botStrength(ctx)

  switch (decision.action) {
    case 'fold':
      if (ctx.toCall > 0) {
        return `I only have ${made}, and it costs ${ctx.toCall} to keep going... too expensive. I fold.`
      }
      return `${made}? Not worth playing. I fold.`
    case 'stay':
      return `${made} feels strong enough — I'm staying in!`
    case 'check':
      return strength > 0.5
        ? `I'll check — no need to scare anyone off yet.`
        : `Nothing great here. I'll check and see a free card.`
    case 'call':
      return ctx.toCall > 0
        ? `${ctx.toCall} to call, and the pot has ${ctx.potSize}. With ${made}, that price is fine — call.`
        : `I call.`
    case 'bet':
      return decision.bluffing
        ? `I'll bet ${decision.amount ?? ''}... (don't tell anyone what I have)`
        : `I have ${made} — that's worth a bet. Chips in!`
    case 'raise':
      return decision.bluffing
        ? `RAISE! ...my cards? Never mind my cards.`
        : `${made} is too good to just call. Raise!`
    case 'all-in':
      return `Everything. ALL IN.`
  }
  return ''
}
