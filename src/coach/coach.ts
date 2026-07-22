// Penny the Dealer: an event-consuming trigger pipeline. Pure — it reads the
// event stream + game state and produces messages; the orchestrator decides
// pacing and blocking.

import type { GameEvent, GameState } from '../engine/types'
import { handName } from '../engine/describe'
import type { LevelConfig } from '../levels/types'

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
    text: () =>
      'Easy start: BOTH cards are face-up. The higher card wins the duel — the ladder on the right shows the order, 2 at the bottom, Ace on top. Just tap who wins!',
    blocking: true,
  },
  {
    id: 'hidden-duel-explainer',
    once: true,
    on: ['cards-dealt'],
    when: (_ev, state, level) =>
      level.ui.peekAndPredict && level.ui.openDuels > 0 && state.handNumber === level.ui.openDuels,
    text: () =>
      "Now the real thing: her card flips FACE-DOWN. Look at YOUR card and guess how the duel ends. A big card is usually a win, a small card usually isn't. Guess, then we flip!",
    blocking: true,
  },
  {
    id: 'first-tie-split',
    once: true,
    on: ['pot-awarded'],
    when: (ev) => ev.type === 'pot-awarded' && ev.awards.some((a) => a.split),
    text: () => 'Same rank? Nobody loses — the pot gets SPLIT. And remember: suits are just outfits, they never break a tie.',
    blocking: true,
  },
  {
    id: 'first-fold-win',
    once: true,
    on: ['pot-awarded'],
    when: (ev) => ev.type === 'pot-awarded' && ev.awards.some((a) => a.wonBy === 'fold' && a.playerId === 'hero'),
    text: () => 'Everyone folded — the pot is yours without showing a card. Betting can win all by itself.',
  },
  {
    id: 'first-carry',
    once: true,
    on: ['pot-carried'],
    text: (ev) => ev.type === 'pot-carried' ? `Everybody folded, so the pot of ${ev.amount} CARRIES OVER. Next hand just got spicier.` : '',
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
      return w?.rank ? `They win with ${handName(w.rank)}. Watch which hands beat which — that ladder is the whole game.` : ''
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
    text: () => 'That pot was decided by the KICKER — the side card. Same pair, but the bigger fifth card plays.',
  },
  {
    id: 'first-all-in',
    once: true,
    on: ['all-in-runout'],
    text: () => 'All the chips are in — no more betting. Cards face up, and the rest of the board decides it. Hold on tight.',
    blocking: true,
  },
  {
    id: 'first-side-pot',
    once: true,
    on: ['pot-awarded'],
    when: (ev) => ev.type === 'pot-awarded' && ev.sidePots > 0,
    text: () => 'A SIDE POT! When someone is all-in for less, they can only win the chips they matched. The rest goes in a separate pot for the others.',
    blocking: true,
  },
  {
    id: 'first-blinds',
    once: true,
    on: ['posts'],
    when: (ev) => ev.type === 'posts' && ev.posts.some((p) => p.kind === 'sb'),
    text: () => 'The BLINDS: two forced bets left of the dealer button. They rotate every hand — so does the button. Blinds are a prize; go steal them.',
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
    text: (ev) => ev.type === 'hand-started' && ev.blinds ? `BLINDS UP! Now ${ev.blinds.small}/${ev.blinds.big}. Sitting tight gets expensive — act or bleed.` : '',
  },
  {
    id: 'hero-busted',
    once: false,
    on: ['player-busted'],
    when: (ev) => ev.type === 'player-busted' && ev.playerId === 'hero',
    text: (_ev, _state, level) =>
      level.rebuys
        ? 'Out of chips! Here — rookie insurance, on the house. (A flawless run means no rebuys, though.)'
        : 'That\'s the tournament, kid. Grab a fresh ticket and run it back.',
    blocking: true,
  },
  {
    id: 'bot-busted',
    once: false,
    on: ['player-busted'],
    when: (ev) => ev.type === 'player-busted' && ev.playerId !== 'hero',
    text: () => 'And one falls! Fewer players means the blinds come around faster — stay sharp.',
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
