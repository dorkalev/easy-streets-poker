import type { Card, CardId, Rank, Suit } from './types'

export const SUITS: Suit[] = ['c', 'd', 'h', 's']
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit })
  }
  return deck
}

export function cardId(card: Card): CardId {
  return `${card.rank}${card.suit}`
}

export function parseCard(id: CardId): Card {
  const suit = id.slice(-1) as Suit
  const rank = Number(id.slice(0, -1)) as Rank
  if (!SUITS.includes(suit) || !RANKS.includes(rank)) {
    throw new Error(`Invalid card id: ${id}`)
  }
  return { rank, suit }
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit
}

const RANK_NAMES: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight',
  9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
}

const RANK_SHORT: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
}

const SUIT_NAMES: Record<Suit, string> = { c: 'Clubs', d: 'Diamonds', h: 'Hearts', s: 'Spades' }
const SUIT_SYMBOLS: Record<Suit, string> = { c: '♣', d: '♦', h: '♥', s: '♠' }

export function rankName(rank: Rank): string {
  return RANK_NAMES[rank]
}

export function rankShort(rank: Rank): string {
  return RANK_SHORT[rank]
}

export function suitName(suit: Suit): string {
  return SUIT_NAMES[suit]
}

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit]
}

export function formatCard(card: Card): string {
  return `${RANK_SHORT[card.rank]}${SUIT_SYMBOLS[card.suit]}`
}
