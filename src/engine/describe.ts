import type { HandRank, Rank } from './types'
import { rankName } from './deck'

function plural(rank: number): string {
  const name = rankName(rank as Rank)
  return name === 'Six' ? 'Sixes' : `${name}s`
}

/** Human name for a hand: "Pair of Nines", "Flush, King high", ... */
export function handName(rank: HandRank): string {
  const t = rank.tiebreak
  switch (rank.category) {
    case 'high-card':
      return `${rankName(t[0] as Rank)} high`
    case 'pair':
      return `Pair of ${plural(t[0])}`
    case 'two-pair':
      return `Two Pair, ${plural(t[0])} and ${plural(t[1])}`
    case 'trips':
      return `Three of a Kind, ${plural(t[0])}`
    case 'straight':
      return `Straight to the ${rankName(t[0] as Rank)}`
    case 'flush':
      return `Flush, ${rankName(t[0] as Rank)} high`
    case 'full-house':
      return `Full House, ${plural(t[0])} full of ${plural(t[1])}`
    case 'quads':
      return `Four of a Kind, ${plural(t[0])}`
    case 'straight-flush':
      return t[0] === 14 ? 'ROYAL FLUSH' : `Straight Flush to the ${rankName(t[0] as Rank)}`
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  'high-card': 'High Card',
  pair: 'Pair',
  'two-pair': 'Two Pair',
  trips: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  'full-house': 'Full House',
  quads: 'Four of a Kind',
  'straight-flush': 'Straight Flush',
  'royal-flush': 'Royal Flush',
}
