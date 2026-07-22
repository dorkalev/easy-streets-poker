import type { Card, HandCategory, HandRank } from './types'
import { HAND_CATEGORY_ORDER } from './types'

export interface EvalOptions {
  enabledHands: HandCategory[]
  kickersMatter: boolean
}

/** Number of trailing tiebreak entries that are "kickers" per category. */
const KICKER_TIEBREAKS: Record<HandCategory, number> = {
  'high-card': 4, // all but the top card
  pair: 3,
  'two-pair': 1,
  trips: 2,
  straight: 0,
  flush: 0, // all five ranks define a flush; none are droppable kickers
  'full-house': 0,
  quads: 1,
  'straight-flush': 0,
}

interface RankGroup {
  rank: number
  cards: Card[]
}

function groupByRank(cards: Card[]): RankGroup[] {
  const map = new Map<number, Card[]>()
  for (const c of cards) {
    const list = map.get(c.rank) ?? []
    list.push(c)
    map.set(c.rank, list)
  }
  const groups = [...map.entries()].map(([rank, cs]) => ({ rank, cards: cs }))
  // Bigger groups first, then higher ranks.
  groups.sort((a, b) => b.cards.length - a.cards.length || b.rank - a.rank)
  return groups
}

/** Returns the straight's high rank (5 for the wheel) or null. Requires 5 cards. */
function straightHigh(cards: Card[]): number | null {
  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => b - a)
  if (ranks.length !== 5) return null
  if (ranks[0] - ranks[4] === 4) return ranks[0]
  // Wheel: A-5-4-3-2
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[1] - ranks[4] === 3) return 5
  return null
}

function byRankDesc(a: Card, b: Card): number {
  return b.rank - a.rank
}

interface Detection {
  category: HandCategory
  tiebreak: number[]
  core: Card[]
  kickers: Card[]
}

/** Detect whether `category` is present in exactly these cards (1..5 of them). */
function detect(category: HandCategory, cards: Card[]): Detection | null {
  const groups = groupByRank(cards)
  const sorted = cards.slice().sort(byRankDesc)
  const isFive = cards.length === 5
  const flush = isFive && cards.every((c) => c.suit === cards[0].suit)
  const straight = isFive ? straightHigh(cards) : null

  switch (category) {
    case 'straight-flush':
      if (flush && straight !== null) {
        return { category, tiebreak: [straight], core: sorted, kickers: [] }
      }
      return null
    case 'quads': {
      const quad = groups.find((g) => g.cards.length === 4)
      if (!quad) return null
      const kickers = sorted.filter((c) => c.rank !== quad.rank)
      return {
        category,
        tiebreak: [quad.rank, ...kickers.map((c) => c.rank)],
        core: quad.cards,
        kickers,
      }
    }
    case 'full-house': {
      const trips = groups.find((g) => g.cards.length === 3)
      const pair = groups.find((g) => g.cards.length === 2)
      if (!trips || !pair) return null
      return {
        category,
        tiebreak: [trips.rank, pair.rank],
        core: [...trips.cards, ...pair.cards],
        kickers: [],
      }
    }
    case 'flush':
      if (flush) {
        return { category, tiebreak: sorted.map((c) => c.rank), core: sorted, kickers: [] }
      }
      return null
    case 'straight':
      if (straight !== null) {
        return { category, tiebreak: [straight], core: sorted, kickers: [] }
      }
      return null
    case 'trips': {
      const trips = groups.find((g) => g.cards.length === 3)
      if (!trips) return null
      const kickers = sorted.filter((c) => c.rank !== trips.rank)
      return {
        category,
        tiebreak: [trips.rank, ...kickers.map((c) => c.rank)],
        core: trips.cards,
        kickers,
      }
    }
    case 'two-pair': {
      const pairs = groups.filter((g) => g.cards.length === 2)
      if (pairs.length < 2) return null
      const [hi, lo] = pairs
      const kickers = sorted.filter((c) => c.rank !== hi.rank && c.rank !== lo.rank)
      return {
        category,
        tiebreak: [hi.rank, lo.rank, ...kickers.map((c) => c.rank)],
        core: [...hi.cards, ...lo.cards],
        kickers,
      }
    }
    case 'pair': {
      const pair = groups.find((g) => g.cards.length === 2)
      if (!pair) return null
      const kickers = sorted.filter((c) => c.rank !== pair.rank)
      return {
        category,
        tiebreak: [pair.rank, ...kickers.map((c) => c.rank)],
        core: pair.cards,
        kickers,
      }
    }
    case 'high-card':
      return {
        category,
        tiebreak: sorted.map((c) => c.rank),
        core: [sorted[0]],
        kickers: sorted.slice(1),
      }
  }
}

function packScore(category: HandCategory, tiebreak: number[]): number {
  let score = HAND_CATEGORY_ORDER.indexOf(category)
  for (let i = 0; i < 5; i++) {
    score = score * 15 + (tiebreak[i] ?? 0)
  }
  return score
}

/**
 * Evaluate exactly these cards (1, 2 or 5 of them) under a possibly partial
 * rank set. A hand whose best natural category is disabled demotes to the best
 * ENABLED category present — e.g. with straights disabled, 9-8-7-6-5 is
 * nine-high.
 */
export function evaluate(cards: Card[], opts: EvalOptions): HandRank {
  for (let i = HAND_CATEGORY_ORDER.length - 1; i >= 0; i--) {
    const category = HAND_CATEGORY_ORDER[i]
    if (category !== 'high-card' && !opts.enabledHands.includes(category)) continue
    const d = detect(category, cards)
    if (!d) continue

    let tiebreak = d.tiebreak
    let kickers = d.kickers
    if (!opts.kickersMatter) {
      const drop = KICKER_TIEBREAKS[category]
      if (drop > 0) {
        tiebreak = tiebreak.slice(0, tiebreak.length - Math.min(drop, kickers.length))
        kickers = []
      }
    }
    return {
      category,
      tiebreak,
      cardsUsed: [...d.core, ...kickers],
      kickers,
      score: packScore(category, tiebreak),
    }
  }
  throw new Error('unreachable: high-card always matches')
}

export function compareRanks(a: HandRank, b: HandRank): number {
  return a.score - b.score
}

function* combinations<T>(items: T[], k: number): Generator<T[]> {
  const n = items.length
  if (k > n) return
  const idx = Array.from({ length: k }, (_, i) => i)
  while (true) {
    yield idx.map((i) => items[i])
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
}

/**
 * Best hand from hole + community under the level's hand size. For handSize 5
 * with more than 5 available cards, picks the best 5-card combination.
 */
export function bestHand(
  hole: Card[],
  community: Card[],
  opts: EvalOptions & { handSize: 1 | 2 | 5 },
): HandRank {
  const all = [...hole, ...community]
  if (all.length <= opts.handSize) return evaluate(all, opts)
  let best: HandRank | null = null
  for (const combo of combinations(all, opts.handSize)) {
    const rank = evaluate(combo, opts)
    if (!best || rank.score > best.score) best = rank
  }
  return best!
}
