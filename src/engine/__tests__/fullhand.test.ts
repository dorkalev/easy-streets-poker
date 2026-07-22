import { describe, expect, it } from 'vitest'
import { createGame, legalActions, step } from '../engine'
import type {
  ActionType,
  GameEvent,
  GameState,
  LegalAction,
  RulesConfig,
} from '../types'

type Policy = (state: GameState, legal: LegalAction[], playerId: string) => {
  action: ActionType
  amount?: number
}

const callAny: Policy = (_s, legal) => {
  const call = legal.find((l) => l.type === 'call')
  if (call) return { action: 'call' }
  if (legal.some((l) => l.type === 'check')) return { action: 'check' }
  return { action: 'stay' }
}

function playHand(state: GameState, policy: Policy): { state: GameState; events: GameEvent[] } {
  let result = step(state, { type: 'START_HAND' })
  const events = [...result.events]
  let guard = 0
  while (result.state.phase !== 'hand-complete') {
    if (guard++ > 500) throw new Error('hand did not terminate')
    const s = result.state
    if (s.phase === 'betting' && s.actingSeat !== null) {
      const p = s.players[s.actingSeat]
      const choice = policy(s, legalActions(s), p.id)
      result = step(s, { type: 'PLAYER_ACTION', seat: s.actingSeat, ...choice })
    } else if (s.phase === 'declaring') {
      const seat = s.pendingDeclarations[0]
      const choice = policy(s, legalActions(s), s.players[seat].id)
      result = step(s, { type: 'PLAYER_ACTION', seat, ...choice })
    } else {
      result = step(s, { type: 'ADVANCE' })
    }
    events.push(...result.events)
  }
  return { state: result.state, events }
}

function totalChips(state: GameState): number {
  return (
    state.carryPot +
    state.players.reduce((s, p) => s + p.stack + p.committedTotal, 0)
  )
}

const SHOWDOWN_ONLY: RulesConfig = {
  id: 'test-showdown',
  numPlayers: 2,
  holeCards: 1,
  streets: [],
  enabledHands: ['high-card'],
  handSize: 1,
  kickersMatter: false,
  betting: null,
  startingStack: 0,
}

const GUTS: RulesConfig = {
  id: 'test-guts',
  numPlayers: 2,
  holeCards: 2,
  streets: [{ name: 'declare', deal: 0, bet: true }],
  enabledHands: ['high-card', 'pair'],
  handSize: 2,
  kickersMatter: false,
  betting: { mode: 'stay-fold', ante: 5, carryPotOnAllFold: true },
  startingStack: 100,
}

const FIXED_HU: RulesConfig = {
  id: 'test-fixed',
  numPlayers: 2,
  holeCards: 2,
  streets: [
    { name: 'preflop', deal: 0, bet: true },
    { name: 'flop', deal: 3, bet: true },
    { name: 'turn', deal: 1, bet: true },
    { name: 'river', deal: 1, bet: true, betSize: 20 },
  ],
  enabledHands: ['high-card', 'pair', 'two-pair', 'trips', 'straight', 'flush', 'full-house', 'quads', 'straight-flush'],
  handSize: 5,
  kickersMatter: true,
  betting: { mode: 'fixed', fixedBet: 10, maxRaisesPerRound: 3, blinds: { small: 5, big: 10 } },
  startingStack: 500,
}

const NL_3WAY: RulesConfig = {
  ...FIXED_HU,
  id: 'test-nl',
  numPlayers: 3,
  betting: { mode: 'no-limit', blinds: { small: 5, big: 10 } },
  startingStack: 200,
}

describe('full hands (headless)', () => {
  it('showdown-only level completes and awards nothing (no chips in play)', () => {
    const game = createGame(SHOWDOWN_ONLY, 42, ['hero', 'bot'])
    const { events } = playHand(game, callAny)
    const types = events.map((e) => e.type)
    expect(types).toContain('cards-dealt')
    expect(types).toContain('showdown')
    expect(types).toContain('hand-complete')
  })

  it('conserves chips across 30 fixed-limit hands of call-any', () => {
    let state = createGame(FIXED_HU, 7, ['hero', 'bot'])
    const before = totalChips(state)
    for (let i = 0; i < 30; i++) {
      const result = playHand(state, callAny)
      state = result.state
      expect(totalChips(state)).toBe(before)
    }
  })

  it('conserves chips in no-limit with aggressive shoving (side pots)', () => {
    const shover: Policy = (_s, legal, playerId) => {
      if (playerId === 'hero') return callAny(_s, legal, playerId)
      const raise = legal.find((l) => l.type === 'raise') ?? legal.find((l) => l.type === 'bet')
      if (raise) return { action: raise.type, amount: raise.max ?? raise.min }
      return callAny(_s, legal, playerId)
    }
    let state = createGame(NL_3WAY, 99, ['hero', 'b1', 'b2'])
    const before = totalChips(state)
    for (let i = 0; i < 10; i++) {
      if (state.players.filter((p) => p.status !== 'busted').length < 2) break
      const result = playHand(state, shover)
      state = result.state
      expect(totalChips(state)).toBe(before)
    }
  })

  it('folding to a bet ends the hand without showdown', () => {
    const heroFolds: Policy = (_s, legal, playerId) => {
      if (playerId === 'hero' && legal.some((l) => l.type === 'fold') && legal.some((l) => l.type === 'call')) {
        return { action: 'fold' }
      }
      const bet = legal.find((l) => l.type === 'bet')
      if (playerId !== 'hero' && bet) return { action: 'bet', amount: bet.min }
      return callAny(_s, legal, playerId)
    }
    const game = createGame(FIXED_HU, 3, ['hero', 'bot'])
    const { events, state } = playHand(game, heroFolds)
    const award = events.find((e) => e.type === 'pot-awarded')
    expect(award).toBeDefined()
    expect(events.some((e) => e.type === 'showdown')).toBe(false)
    expect(totalChips(state)).toBe(1000)
  })

  it('guts: everyone folding carries the pot to the next hand', () => {
    const allFold: Policy = () => ({ action: 'fold' })
    const game = createGame(GUTS, 11, ['hero', 'bot'])
    const first = playHand(game, allFold)
    expect(first.events.some((e) => e.type === 'pot-carried')).toBe(true)
    expect(first.state.carryPot).toBe(10)
    expect(totalChips(first.state)).toBe(200)
    // Next hand: someone stays and scoops antes + carried pot.
    const allStay: Policy = () => ({ action: 'stay' })
    const second = playHand(first.state, allStay)
    expect(second.state.carryPot).toBe(0)
    expect(totalChips(second.state)).toBe(200)
    const award = second.events.find((e) => e.type === 'pot-awarded')
    expect(award && award.type === 'pot-awarded' ? award.potTotal : 0).toBe(20)
  })

  it('all-in preflop runs out the board and reveals hands', () => {
    const shoveAll: Policy = (_s, legal) => {
      const raise = legal.find((l) => l.type === 'raise') ?? legal.find((l) => l.type === 'bet')
      if (raise && raise.max) return { action: raise.type, amount: raise.max }
      return callAny(_s, legal, '')
    }
    const game = createGame({ ...NL_3WAY, numPlayers: 2 }, 5, ['hero', 'bot'])
    const { events, state } = playHand(game, shoveAll)
    expect(events.some((e) => e.type === 'all-in-runout')).toBe(true)
    expect(events.some((e) => e.type === 'showdown')).toBe(true)
    expect(state.community).toHaveLength(5)
    expect(totalChips(state)).toBe(400)
  })

  it('respects the fixed-limit raise cap', () => {
    const alwaysRaise: Policy = (_s, legal) => {
      const raise = legal.find((l) => l.type === 'raise') ?? legal.find((l) => l.type === 'bet')
      if (raise) return { action: raise.type, amount: raise.min }
      return callAny(_s, legal, '')
    }
    const game = createGame(FIXED_HU, 21, ['hero', 'bot'])
    const { events } = playHand(game, alwaysRaise)
    const preflopRaises = events.filter(
      (e) => e.type === 'player-acted' && e.action === 'raise',
    )
    // 3 raises max per round, 4 rounds max
    expect(preflopRaises.length).toBeLessThanOrEqual(12)
  })
})

describe('rigged decks and determinism', () => {
  it('deckStack deals the exact scripted cards', () => {
    const rules: RulesConfig = {
      ...FIXED_HU,
      script: { 0: { deckStack: ['14s', '14h', '2c', '7d', '13s', '13h', '13d', '5c', '5d'] } },
    }
    const game = createGame(rules, 1, ['hero', 'bot'])
    const { events } = playHand(game, callAny)
    const deal = events.find((e) => e.type === 'cards-dealt')
    if (deal?.type !== 'cards-dealt') throw new Error('no deal')
    expect(deal.deals[0].cards).toEqual([
      { rank: 14, suit: 's' },
      { rank: 14, suit: 'h' },
    ])
    expect(deal.deals[1].cards).toEqual([
      { rank: 2, suit: 'c' },
      { rank: 7, suit: 'd' },
    ])
    const community = events.filter((e) => e.type === 'community-dealt').flatMap((e) =>
      e.type === 'community-dealt' ? e.cards : [],
    )
    expect(community.slice(0, 3)).toEqual([
      { rank: 13, suit: 's' },
      { rank: 13, suit: 'h' },
      { rank: 13, suit: 'd' },
    ])
  })

  it('same seed produces identical event streams', () => {
    const run = () => {
      const game = createGame(FIXED_HU, 1234, ['hero', 'bot'])
      let state = game
      const all: GameEvent[] = []
      for (let i = 0; i < 5; i++) {
        const r = playHand(state, callAny)
        state = r.state
        all.push(...r.events)
      }
      return JSON.stringify(all)
    }
    expect(run()).toBe(run())
  })

  it('ties bias forces rank ties on even hands', () => {
    const rules: RulesConfig = { ...SHOWDOWN_ONLY, deckBias: 'ties' }
    const game = createGame(rules, 8, ['hero', 'bot'])
    const { events } = playHand(game, callAny)
    const deal = events.find((e) => e.type === 'cards-dealt')
    if (deal?.type !== 'cards-dealt') throw new Error('no deal')
    expect(deal.deals[0].cards[0].rank).toBe(deal.deals[1].cards[0].rank)
  })
})
