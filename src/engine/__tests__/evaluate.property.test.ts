import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { makeDeck } from '../deck'
import { evaluate, bestHand } from '../evaluate'
import { HAND_CATEGORY_ORDER, type Card, type HandCategory } from '../types'

const DECK = makeDeck()
const full = { enabledHands: HAND_CATEGORY_ORDER, kickersMatter: true }

/**
 * Brute-force reference evaluator, written independently (naive if-chain over
 * sorted rank multiset). Returns [categoryIndex, ...tiebreak] as an array for
 * lexicographic comparison.
 */
function referenceScore(cards: Card[]): number[] {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a)
  const counts = new Map<number, number>()
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const isFlush = new Set(cards.map((c) => c.suit)).size === 1
  const uniq = [...new Set(ranks)]
  let straightHigh = 0
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0]
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2 && uniq[1] - uniq[4] === 3) straightHigh = 5
  }
  const cat = (name: HandCategory) => HAND_CATEGORY_ORDER.indexOf(name)
  const kickersOf = (...exclude: number[]) => ranks.filter((r) => !exclude.includes(r))
  if (isFlush && straightHigh) return [cat('straight-flush'), straightHigh]
  if (groups[0][1] === 4) return [cat('quads'), groups[0][0], ...kickersOf(groups[0][0])]
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) return [cat('full-house'), groups[0][0], groups[1][0]]
  if (isFlush) return [cat('flush'), ...ranks]
  if (straightHigh) return [cat('straight'), straightHigh]
  if (groups[0][1] === 3) return [cat('trips'), groups[0][0], ...kickersOf(groups[0][0])]
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    return [cat('two-pair'), groups[0][0], groups[1][0], ...kickersOf(groups[0][0], groups[1][0])]
  }
  if (groups[0][1] === 2) return [cat('pair'), groups[0][0], ...kickersOf(groups[0][0])]
  return [cat('high-card'), ...ranks]
}

function compareVectors(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const distinctCards = (n: number) =>
  fc
    .uniqueArray(fc.integer({ min: 0, max: 51 }), { minLength: n, maxLength: n })
    .map((idxs) => idxs.map((i) => DECK[i]))

describe('evaluate vs brute-force reference', () => {
  it('agrees on category and tiebreak ordering for random 5-card pairs', () => {
    fc.assert(
      fc.property(distinctCards(5), distinctCards(5), (h1, h2) => {
        const ours = evaluate(h1, full).score - evaluate(h2, full).score
        const ref = compareVectors(referenceScore(h1), referenceScore(h2))
        expect(Math.sign(ours)).toBe(Math.sign(ref))
      }),
      { numRuns: 500 },
    )
  })

  it('agrees on the exact category for random 5-card hands', () => {
    fc.assert(
      fc.property(distinctCards(5), (h) => {
        expect(HAND_CATEGORY_ORDER.indexOf(evaluate(h, full).category)).toBe(referenceScore(h)[0])
      }),
      { numRuns: 500 },
    )
  })

  it('bestHand over 7 cards is >= every 5-card subset', () => {
    fc.assert(
      fc.property(distinctCards(7), (seven) => {
        const best = bestHand(seven.slice(0, 2), seven.slice(2), { ...full, handSize: 5 })
        // Spot-check a handful of subsets including the "board only" one.
        const subsets = [seven.slice(2, 7), seven.slice(0, 5), [seven[0], ...seven.slice(3, 7)]]
        for (const sub of subsets) {
          expect(best.score).toBeGreaterThanOrEqual(evaluate(sub, full).score)
        }
      }),
      { numRuns: 300 },
    )
  })

  it('partial rank sets never rank a hand above its full-set score', () => {
    const partial = { enabledHands: ['high-card', 'pair', 'trips'] as HandCategory[], kickersMatter: true }
    fc.assert(
      fc.property(distinctCards(5), (h) => {
        expect(evaluate(h, partial).score).toBeLessThanOrEqual(evaluate(h, full).score)
      }),
      { numRuns: 300 },
    )
  })
})
