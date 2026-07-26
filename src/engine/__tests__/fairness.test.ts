// Fairness audit: (1) deals must not favor any seat; (2) level 11 must be
// statistically winnable by sound-but-automated play. Deterministic seeds
// keep these statistical tests reproducible.

import { describe, expect, it } from 'vitest'
import { createGame, legalActions, step } from '../engine'
import { chenScore } from '../strength'
import { bestHand } from '../evaluate'
import { HAND_CATEGORY_ORDER, type GameState } from '../types'
import { getLevel } from '../../levels/levels'
import { decide } from '../../bots/decide'
import { PERSONALITIES } from '../../bots/personalities'
import { seedFrom } from '../rng'

const L11 = getLevel(11)

describe('deal fairness (level 11 rules)', () => {
  it('no seat gets systematically better hole cards over 20k deals', () => {
    const stats = [0, 1, 2].map(() => ({ chen: 0, pairs: 0, top: 0 }))
    const HANDS = 20_000
    let state = createGame(L11.rules, 424242, ['hero', 'callie', 'gary'])
    for (let h = 0; h < HANDS; h++) {
      const r = step(state, { type: 'START_HAND' })
      for (const p of r.state.players) {
        const s = stats[p.seat]
        s.chen += chenScore(p.holeCards)
        s.pairs += p.holeCards[0].rank === p.holeCards[1].rank ? 1 : 0
        s.top += Math.max(p.holeCards[0].rank, p.holeCards[1].rank)
      }
      // abandon the hand: fold everyone out headlessly
      let cur = r.state
      let guard = 0
      while (cur.phase !== 'hand-complete') {
        if (guard++ > 100) throw new Error('hand stuck')
        if (cur.phase === 'betting' && cur.actingSeat !== null) {
          const legal = legalActions(cur)
          const act = legal.find((l) => l.type === 'check') ?? legal.find((l) => l.type === 'fold') ?? legal[0]
          cur = step(cur, { type: 'PLAYER_ACTION', seat: cur.actingSeat, action: act.type }).state
        } else {
          cur = step(cur, { type: 'ADVANCE' }).state
        }
      }
      state = cur
      // top up stacks so blinds never bust anyone during the audit
      for (const p of state.players) p.stack = 1000
    }
    const chen = stats.map((s) => s.chen / HANDS)
    const pairs = stats.map((s) => s.pairs / HANDS)
    const top = stats.map((s) => s.top / HANDS)
    // Expected pair rate is 3/51 ≈ 5.88%. All seats must be close to each
    // other and to theory.
    for (const p of pairs) expect(p).toBeGreaterThan(0.052)
    for (const p of pairs) expect(p).toBeLessThan(0.066)
    expect(Math.max(...chen) - Math.min(...chen)).toBeLessThan(0.01)
    expect(Math.max(...top) - Math.min(...top)).toBeLessThan(0.15)
  })
})

describe('level 11 winnability', () => {
  /** Play one full 12-hand L11 run with all seats driven by bot brains:
   * hero uses the balanced professor brain at the level difficulty. */
  function simulateRun(seed: number): number {
    let state: GameState = createGame(L11.rules, seed, ['hero', 'callie', 'gary'])
    const persona = (id: string) => PERSONALITIES[id === 'hero' ? 'professor' : id]
    let counter = 0
    for (let h = 0; h < L11.handsToComplete; h++) {
      let r = step(state, { type: 'START_HAND' })
      let guard = 0
      while (r.state.phase !== 'hand-complete') {
        if (guard++ > 300) throw new Error('hand stuck')
        const s = r.state
        if (s.phase === 'betting' && s.actingSeat !== null) {
          const p = s.players[s.actingSeat]
          counter++
          const street = s.rules.streets[s.streetIndex]
          const d = decide(
            persona(p.id),
            {
              myCards: p.holeCards,
              community: s.community,
              streetName: street?.name ?? '',
              streetIndex: s.streetIndex,
              totalStreets: s.rules.streets.length,
              toCall: Math.min(Math.max(0, s.currentBet - p.committedThisRound), p.stack),
              potSize: s.carryPot + s.players.reduce((sum, pl) => sum + pl.committedTotal, 0),
              myStack: p.stack,
              legal: legalActions(s),
              numActivePlayers: s.players.filter((pl) => pl.status === 'active' || pl.status === 'all-in').length,
              numOpponents: s.players.filter((pl, i) => i !== s.actingSeat && (pl.status === 'active' || pl.status === 'all-in')).length,
              bigBlind: s.currentBlinds?.big ?? 10,
              handEvents: [],
              rngState: seedFrom(seed, p.seat, s.handNumber, counter),
            },
            L11.difficulty,
          )
          r = step(s, { type: 'PLAYER_ACTION', seat: s.actingSeat, action: d.action, amount: d.amount })
        } else {
          r = step(s, { type: 'ADVANCE' })
        }
      }
      state = r.state
      // level's rookie-insurance rebuy
      for (const p of state.players) {
        if (p.status === 'busted') {
          p.status = 'active'
          p.stack = L11.rules.startingStack
        }
      }
    }
    return state.players[0].stack - L11.rules.startingStack
  }

  // ~2 min of Monte-Carlo; run explicitly with AUDIT=1 npx vitest run fairness
  it.skipIf(!process.env.AUDIT)('a sound automated player profits in a reasonable share of runs', { timeout: 240_000 }, () => {
    const RUNS = 60
    let wins = 0
    let totalProfit = 0
    const profits: number[] = []
    for (let i = 0; i < RUNS; i++) {
      const profit = simulateRun(1000 + i * 7919)
      profits.push(profit)
      totalProfit += profit
      if (profit > 0) wins += 1
    }
    const passRate = wins / RUNS
    // eslint-disable-next-line no-console
    console.log(
      `L11 audit: pass rate ${(passRate * 100).toFixed(0)}% · mean profit ${(totalProfit / RUNS).toFixed(1)} · ` +
        `median ${profits.sort((a, b) => a - b)[Math.floor(RUNS / 2)]}`,
    )
    // A competent player should clear this teaching level most of the time.
    expect(passRate).toBeGreaterThan(0.35)
  })
})

// keep tree-shaken helpers referenced
void bestHand
void HAND_CATEGORY_ORDER
