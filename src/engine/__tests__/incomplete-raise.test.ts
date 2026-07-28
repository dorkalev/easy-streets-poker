// Real No-Limit rule: an all-in for LESS than a full raise (an "incomplete
// raise") does not reopen the betting to players who have already acted —
// they may only call the extra or fold, not re-raise.

import { describe, expect, it } from 'vitest'
import { createGame, legalActions, step } from '../engine'
import type { ActionType, GameState, RulesConfig } from '../types'

const NL: RulesConfig = {
  id: 'test-nl-incomplete',
  numPlayers: 3,
  holeCards: 2,
  streets: [
    { name: 'preflop', deal: 0, bet: true },
    { name: 'flop', deal: 3, bet: true },
    { name: 'turn', deal: 1, bet: true },
    { name: 'river', deal: 1, bet: true },
  ],
  enabledHands: ['high-card', 'pair', 'two-pair', 'trips', 'straight', 'flush', 'full-house', 'quads', 'straight-flush'],
  handSize: 5,
  kickersMatter: true,
  betting: { mode: 'no-limit', blinds: { small: 5, big: 10 } },
  startingStack: 1000,
}

function act(s: GameState, seat: number, type: ActionType, amount?: number): GameState {
  expect(s.actingSeat).toBe(seat)
  return step(s, { type: 'PLAYER_ACTION', seat, action: type, amount }).state
}

/** Start a hand and pump ADVANCE until the first player is on the clock. */
function deal(s: GameState): GameState {
  let r = step(s, { type: 'START_HAND' })
  let guard = 0
  while (r.state.phase !== 'betting' && guard++ < 20) r = step(r.state, { type: 'ADVANCE' })
  return r.state
}

// 3-handed, hand 0: button rotates to seat 0, so preflop order is 0 (button),
// 1 (small blind), 2 (big blind).
describe('incomplete all-in raise', () => {
  it('does not reopen re-raise rights for a player who already acted', () => {
    let s = createGame(NL, 123, ['hero', 'shorty', 'big'])
    s.players[1].stack = 40 // shorty (seat 1) can only reach 40 total
    s = deal(s)

    s = act(s, 0, 'raise', 30) // hero opens to 30 (full raise; min-raise now 20)
    s = act(s, 1, 'all-in') // shorty all-in to 40 → raiseSize 10 < 20 = incomplete

    // Seat 0 already acted and faces only an incomplete raise → closed to raising.
    expect(s.noRaiseSeats).toContain(0)
    // Seat 2 hasn't acted → keeps full rights.
    expect(s.noRaiseSeats).not.toContain(2)

    // Seat 2 (big blind) acts first now, with full options.
    expect(s.actingSeat).toBe(2)
    expect(legalActions(s).map((l) => l.type)).toContain('raise')
    s = act(s, 2, 'call')

    // Back to seat 0: may only call the extra or fold — NOT raise.
    expect(s.actingSeat).toBe(0)
    const legal = legalActions(s).map((l) => l.type)
    expect(legal).toContain('call')
    expect(legal).not.toContain('raise')
  })

  it('a full raise still reopens betting normally', () => {
    let s = createGame(NL, 77, ['hero', 'mid', 'big'])
    s = deal(s)

    s = act(s, 0, 'raise', 30) // hero opens to 30
    s = act(s, 1, 'call') // seat 1 calls 30
    s = act(s, 2, 'raise', 120) // seat 2 makes a full re-raise

    // Betting reopens to seat 0 with full rights.
    expect(s.noRaiseSeats).toEqual([])
    expect(s.actingSeat).toBe(0)
    expect(legalActions(s).map((l) => l.type)).toContain('raise')
  })
})
