// Fairness audit: (1) deals must not favor any seat; (2) key gate levels must
// be statistically winnable by sound-but-automated play. Deterministic seeds
// keep these statistical tests reproducible.

import { describe, expect, it } from 'vitest'
import { createGame, legalActions, step } from '../engine'
import { chenScore } from '../strength'
import type { GameState } from '../types'
import { getLevel } from '../../levels/levels'
import type { LevelConfig } from '../../levels/types'
import { decide } from '../../bots/decide'
import { PERSONALITIES } from '../../bots/personalities'
import { seedFrom } from '../rng'

// vitest runs in node; the app tsconfig has no node types, so declare the bit we use
declare const process: { env: Record<string, string | undefined> }

describe('deal fairness (level 11 rules)', () => {
  it('no seat gets systematically better hole cards over 20k deals', () => {
    const L11 = getLevel(11)
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
      for (const p of state.players) p.stack = 1000
    }
    const chen = stats.map((s) => s.chen / HANDS)
    const pairs = stats.map((s) => s.pairs / HANDS)
    const top = stats.map((s) => s.top / HANDS)
    for (const p of pairs) expect(p).toBeGreaterThan(0.052)
    for (const p of pairs) expect(p).toBeLessThan(0.066)
    expect(Math.max(...chen) - Math.min(...chen)).toBeLessThan(0.01)
    expect(Math.max(...top) - Math.min(...top)).toBeLessThan(0.15)
  })
})

describe('gate-level winnability (AUDIT=1)', () => {
  /** Play one full level run with every seat driven by a bot brain — the hero
   * uses the balanced professor brain at the level's difficulty. Returns
   * whether the level's own win condition was met. */
  function simulateRun(level: LevelConfig, seed: number): { won: boolean; profit: number } {
    let state: GameState = createGame(level.rules, seed, ['hero', ...level.botIds])
    const persona = (id: string) => PERSONALITIES[id === 'hero' ? 'professor' : id]
    let counter = 0
    let heroHandsWon = 0

    for (let h = 0; h < level.handsToComplete; h++) {
      let r = step(state, { type: 'START_HAND' })
      let guard = 0
      while (r.state.phase !== 'hand-complete') {
        if (guard++ > 400) throw new Error('hand stuck')
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
            level.difficulty,
          )
          r = step(s, { type: 'PLAYER_ACTION', seat: s.actingSeat, action: d.action, amount: d.amount })
        } else {
          r = step(s, { type: 'ADVANCE' })
        }
        for (const ev of r.events) {
          if (ev.type === 'pot-awarded' && ev.awards.some((a) => a.playerId === 'hero')) heroHandsWon++
        }
      }
      state = r.state

      const hero = state.players[0]
      const bots = state.players.slice(1)
      const win = level.winCondition
      if (win.type === 'tournament') {
        if (hero.status === 'busted') return { won: false, profit: -level.rules.startingStack }
        if (bots.every((b) => b.status === 'busted')) return { won: true, profit: hero.stack - level.rules.startingStack }
      } else if (level.rebuys) {
        for (const p of state.players) {
          if (p.status === 'busted') {
            p.status = 'active'
            p.stack = level.rules.startingStack
          }
        }
      }
      if (win.type === 'hands-won' && heroHandsWon >= win.target) return { won: true, profit: hero.stack - level.rules.startingStack }
      if (win.type === 'chips' && hero.stack >= win.target) return { won: true, profit: hero.stack - level.rules.startingStack }
    }

    const hero = state.players[0]
    const profit = hero.stack - level.rules.startingStack
    const win = level.winCondition
    const won =
      win.type === 'profit' ? profit > 0
      : win.type === 'hands-won' ? heroHandsWon >= win.target
      : win.type === 'chips' ? hero.stack >= win.target
      : false // tournament not decided within cap
    return { won, profit }
  }

  function audit(levelNumber: number, runs: number): { passRate: number; meanProfit: number } {
    const level = getLevel(levelNumber)
    let wins = 0
    let total = 0
    for (let i = 0; i < runs; i++) {
      const r = simulateRun(level, 1000 + i * 7919)
      if (r.won) wins++
      total += r.profit
    }
    const passRate = wins / runs
    // eslint-disable-next-line no-console
    console.log(`L${levelNumber} "${level.title}": pass ${(passRate * 100).toFixed(0)}% · mean profit ${(total / runs).toFixed(1)}`)
    return { passRate, meanProfit: total / runs }
  }

  // ~minutes of Monte-Carlo; run explicitly with AUDIT=1 npx vitest run fairness
  it.skipIf(!process.env.AUDIT)('L11 (mechanics) is comfortably winnable', { timeout: 240_000 }, () => {
    expect(audit(11, 60).passRate).toBeGreaterThan(0.7)
  })

  it.skipIf(!process.env.AUDIT)('L12 (discipline gate) is demanding but fair', { timeout: 240_000 }, () => {
    expect(audit(12, 60).passRate).toBeGreaterThan(0.35)
  })

  it.skipIf(!process.env.AUDIT)('L16 tournament (Shove & Survive) is winnable often enough', { timeout: 300_000 }, () => {
    // 3-handed sit-n-go: pure chance baseline is ~33%.
    expect(audit(16, 60).passRate).toBeGreaterThan(0.25)
  })
})
