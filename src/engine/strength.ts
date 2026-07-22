import type { Card } from './types'
import { makeDeck, sameCard } from './deck'
import { bestHand } from './evaluate'
import { HAND_CATEGORY_ORDER, type HandCategory } from './types'
import { rngInt } from './rng'

const ALL_HANDS: HandCategory[] = HAND_CATEGORY_ORDER

/** Chen formula for 2-card starting hands, normalized to roughly 0..1. */
export function chenScore(hole: Card[]): number {
  if (hole.length === 1) return (hole[0].rank - 2) / 12
  const [a, b] = hole.slice().sort((x, y) => y.rank - x.rank)
  const high = (r: number): number =>
    r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2
  let score = high(a.rank)
  if (a.rank === b.rank) {
    score = Math.max(5, score * 2)
  } else {
    if (a.suit === b.suit) score += 2
    const gap = a.rank - b.rank - 1
    if (gap === 1) score -= 1
    else if (gap === 2) score -= 2
    else if (gap === 3) score -= 4
    else if (gap >= 4) score -= 5
    if (gap <= 1 && a.rank < 12) score += 1
  }
  return Math.max(0, Math.min(1, Math.ceil(score * 2) / 2 / 20))
}

/**
 * Monte-Carlo equity vs `numOpponents` random hands, with the remaining board
 * dealt out. Deterministic given rngState. Always evaluates with the FULL rank
 * set — used by bots and the strength meter, not for adjudication.
 */
export function estimateEquity(
  hole: Card[],
  community: Card[],
  numOpponents: number,
  boardCardsToCome: number,
  rngState: number,
  trials = 160,
): number {
  const used = [...hole, ...community]
  const remaining = makeDeck().filter((c) => !used.some((u) => sameCard(u, c)))
  const opts = { enabledHands: ALL_HANDS, kickersMatter: true, handSize: 5 as const }
  let s = rngState
  let wins = 0
  for (let t = 0; t < trials; t++) {
    // Partial Fisher–Yates: draw just the cards we need for this trial.
    const pool = remaining.slice()
    const need = numOpponents * hole.length + boardCardsToCome
    for (let i = 0; i < need; i++) {
      let j: number
      ;[j, s] = rngInt(s, pool.length - i)
      ;[pool[i], pool[i + j]] = [pool[i + j], pool[i]]
    }
    let cursor = 0
    const extraBoard = pool.slice(cursor, (cursor += boardCardsToCome))
    const fullBoard = [...community, ...extraBoard]
    const myRank = bestHand(hole, fullBoard, opts)
    let best = true
    let tie = false
    for (let o = 0; o < numOpponents; o++) {
      const oppHole = pool.slice(cursor, (cursor += hole.length))
      const oppRank = bestHand(oppHole, fullBoard, opts)
      if (oppRank.score > myRank.score) {
        best = false
        break
      }
      if (oppRank.score === myRank.score) tie = true
    }
    if (best) wins += tie ? 0.5 : 1
  }
  return wins / trials
}

export type StrengthLabel = 'trash' | 'weak' | 'decent' | 'strong' | 'monster'

export function strengthLabel(equity: number): StrengthLabel {
  if (equity < 0.25) return 'trash'
  if (equity < 0.4) return 'weak'
  if (equity < 0.55) return 'decent'
  if (equity < 0.75) return 'strong'
  return 'monster'
}
