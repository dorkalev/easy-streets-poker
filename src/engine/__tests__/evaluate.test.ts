import { describe, expect, it } from 'vitest'
import { parseCard } from '../deck'
import { evaluate, bestHand, compareRanks } from '../evaluate'
import { HAND_CATEGORY_ORDER, type HandCategory } from '../types'

const cards = (...ids: string[]) => ids.map(parseCard)
const ALL: HandCategory[] = HAND_CATEGORY_ORDER
const full = { enabledHands: ALL, kickersMatter: true }

describe('evaluate — full rank set', () => {
  it.each<[string, string[], HandCategory]>([
    ['high card', ['14s', '12d', '9c', '7h', '3s'], 'high-card'],
    ['pair', ['9s', '9d', '14c', '7h', '3s'], 'pair'],
    ['two pair', ['9s', '9d', '3c', '3h', '14s'], 'two-pair'],
    ['trips', ['9s', '9d', '9c', '7h', '3s'], 'trips'],
    ['straight', ['9s', '8d', '7c', '6h', '5s'], 'straight'],
    ['wheel straight', ['14s', '2d', '3c', '4h', '5s'], 'straight'],
    ['flush', ['14s', '12s', '9s', '7s', '3s'], 'flush'],
    ['full house', ['9s', '9d', '9c', '3h', '3s'], 'full-house'],
    ['quads', ['9s', '9d', '9c', '9h', '3s'], 'quads'],
    ['straight flush', ['9s', '8s', '7s', '6s', '5s'], 'straight-flush'],
    ['royal flush', ['14s', '13s', '12s', '11s', '10s'], 'straight-flush'],
  ])('%s', (_name, ids, category) => {
    expect(evaluate(cards(...ids), full).category).toBe(category)
  })

  it('ranks categories in order', () => {
    const hands = [
      cards('14s', '12d', '9c', '7h', '3s'), // high card
      cards('2s', '2d', '5c', '7h', '9s'), // pair
      cards('2s', '2d', '3c', '3h', '9s'), // two pair
      cards('2s', '2d', '2c', '7h', '9s'), // trips
      cards('2s', '3d', '4c', '5h', '6s'), // straight
      cards('2s', '5s', '7s', '9s', '11s'), // flush
      cards('2s', '2d', '2c', '3h', '3s'), // boat
      cards('2s', '2d', '2c', '2h', '3s'), // quads
      cards('2s', '3s', '4s', '5s', '6s'), // straight flush
    ].map((h) => evaluate(h, full))
    for (let i = 1; i < hands.length; i++) {
      expect(compareRanks(hands[i], hands[i - 1])).toBeGreaterThan(0)
    }
  })

  it('breaks ties with kickers', () => {
    const a = evaluate(cards('13s', '13d', '14c', '7h', '3s'), full) // KK A kicker
    const b = evaluate(cards('13c', '13h', '12c', '7d', '3d'), full) // KK Q kicker
    expect(compareRanks(a, b)).toBeGreaterThan(0)
    expect(a.kickers.map((k) => k.rank)).toEqual([14, 7, 3])
  })

  it('wheel is the lowest straight', () => {
    const wheel = evaluate(cards('14s', '2d', '3c', '4h', '5s'), full)
    const six = evaluate(cards('2s', '3d', '4c', '5h', '6s'), full)
    expect(compareRanks(six, wheel)).toBeGreaterThan(0)
  })
})

describe('evaluate — partial rank sets (demotion)', () => {
  it('straight disabled: 9-8-7-6-5 is nine-high', () => {
    const opts = { enabledHands: ['high-card', 'pair'] as HandCategory[], kickersMatter: true }
    const rank = evaluate(cards('9s', '8d', '7c', '6h', '5s'), opts)
    expect(rank.category).toBe('high-card')
    expect(rank.tiebreak[0]).toBe(9)
  })

  it('flush disabled but straight enabled: straight flush plays as a straight', () => {
    const opts = {
      enabledHands: ['high-card', 'pair', 'straight'] as HandCategory[],
      kickersMatter: true,
    }
    const rank = evaluate(cards('9s', '8s', '7s', '6s', '5s'), opts)
    expect(rank.category).toBe('straight')
  })

  it('two-pair disabled: demotes to best single pair', () => {
    const opts = { enabledHands: ['high-card', 'pair'] as HandCategory[], kickersMatter: true }
    const rank = evaluate(cards('9s', '9d', '3c', '3h', '14s'), opts)
    expect(rank.category).toBe('pair')
    expect(rank.tiebreak[0]).toBe(9)
  })
})

describe('evaluate — kickersMatter: false', () => {
  const opts = { enabledHands: ['high-card', 'pair'] as HandCategory[], kickersMatter: false }

  it('same pair rank splits regardless of kickers', () => {
    const a = evaluate(cards('9s', '9d'), opts)
    const b = evaluate(cards('9c', '9h'), opts)
    expect(compareRanks(a, b)).toBe(0)
  })

  it('same top card splits', () => {
    const a = evaluate(cards('13s', '4d'), opts)
    const b = evaluate(cards('13c', '9h'), opts)
    expect(compareRanks(a, b)).toBe(0)
  })
})

describe('evaluate — small hand sizes', () => {
  it('single-card duel: higher rank wins, suits never break ties', () => {
    const opts = { enabledHands: ['high-card'] as HandCategory[], kickersMatter: false }
    const ace = evaluate(cards('14c'), opts)
    const king = evaluate(cards('13s'), opts)
    const otherAce = evaluate(cards('14h'), opts)
    expect(compareRanks(ace, king)).toBeGreaterThan(0)
    expect(compareRanks(ace, otherAce)).toBe(0)
  })
})

describe('bestHand — best 5 of 7', () => {
  it('finds the flush hidden in 7 cards', () => {
    const rank = bestHand(
      cards('14s', '2s'),
      cards('9s', '7s', '3s', '13d', '13c'),
      { ...full, handSize: 5 },
    )
    expect(rank.category).toBe('flush')
    expect(rank.cardsUsed.every((c) => c.suit === 's')).toBe(true)
  })

  it('plays the board when hole cards are worthless', () => {
    const rank = bestHand(
      cards('2c', '3d'),
      cards('14s', '14d', '13s', '13d', '12h'),
      { ...full, handSize: 5 },
    )
    expect(rank.category).toBe('two-pair')
    expect(rank.tiebreak).toEqual([14, 13, 12])
  })
})
