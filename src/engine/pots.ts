import type { HandRank, PlayerState, Pot, PotAward } from './types'
import { compareRanks } from './evaluate'

/**
 * Build main + side pots from what each player committed this hand. Folded
 * players' chips stay in the pots they contributed to, but they are never
 * eligible to win. `carryPot` (guts carryover) is added to the main pot.
 */
export function buildPots(players: PlayerState[], carryPot = 0): Pot[] {
  const contributors = players.filter((p) => p.committedTotal > 0)
  const levels = [...new Set(contributors.map((p) => p.committedTotal))].sort((a, b) => a - b)
  const pots: Pot[] = []
  let prev = 0
  for (const level of levels) {
    const amount = contributors.reduce(
      (sum, p) => sum + Math.max(0, Math.min(p.committedTotal, level) - prev),
      0,
    )
    const eligible = players
      .filter((p) => p.status !== 'folded' && p.status !== 'busted' && p.committedTotal >= level)
      .map((p) => p.id)
    if (amount > 0) pots.push({ amount, eligible })
    prev = level
  }
  // Merge consecutive pots with identical eligibility (cleaner display + payout).
  const merged: Pot[] = []
  for (const pot of pots) {
    const last = merged[merged.length - 1]
    if (last && last.eligible.length === pot.eligible.length && last.eligible.every((id, i) => id === pot.eligible[i])) {
      last.amount += pot.amount
    } else {
      merged.push({ ...pot })
    }
  }
  if (merged.length === 0 && carryPot > 0) merged.push({ amount: 0, eligible: [] })
  if (merged.length > 0) merged[0].amount += carryPot
  return merged
}

/**
 * Award pots at showdown. Winners split evenly; odd chips go to the earliest
 * winner in `oddChipOrder` (standard rule: first active seat left of the
 * button). Returns one aggregated award per winning player.
 */
export function awardPots(
  pots: Pot[],
  ranks: Map<string, HandRank>,
  oddChipOrder: string[],
): PotAward[] {
  const totals = new Map<string, { amount: number; rank: HandRank | null; split: boolean }>()
  for (const pot of pots) {
    const contenders = pot.eligible.filter((id) => ranks.has(id))
    if (contenders.length === 0) continue
    let bestScore = -1
    for (const id of contenders) {
      bestScore = Math.max(bestScore, ranks.get(id)!.score)
    }
    const winners = contenders.filter((id) => ranks.get(id)!.score === bestScore)
    const share = Math.floor(pot.amount / winners.length)
    let remainder = pot.amount - share * winners.length
    const ordered = oddChipOrder.filter((id) => winners.includes(id))
    for (const id of ordered) {
      let amount = share
      if (remainder > 0) {
        amount += 1
        remainder -= 1
      }
      const prev = totals.get(id)
      totals.set(id, {
        amount: (prev?.amount ?? 0) + amount,
        rank: ranks.get(id)!,
        split: (prev?.split ?? false) || winners.length > 1,
      })
    }
  }
  return [...totals.entries()].map(([playerId, t]) => ({
    playerId,
    amount: t.amount,
    rank: t.rank,
    wonBy: 'showdown' as const,
    split: t.split,
  }))
}

export { compareRanks }
