import { describe, expect, it } from 'vitest'
import { LEVELS } from '../levels'
import { PERSONALITIES } from '../../bots/personalities'
import { createGame, legalActions, step } from '../../engine/engine'
import { parseCard } from '../../engine/deck'
import type { GameState } from '../../engine/types'

describe('level configs', () => {
  it('has 18 levels, numbered consecutively across 5 acts', () => {
    expect(LEVELS).toHaveLength(18)
    LEVELS.forEach((l, i) => expect(l.levelNumber).toBe(i + 1))
    expect(new Set(LEVELS.map((l) => l.act))).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('every level declares its new rules (the new-rule indicator)', () => {
    for (const l of LEVELS) {
      expect(l.newRules.length, l.title).toBeGreaterThan(0)
      for (const rule of l.newRules) expect(rule.length).toBeGreaterThan(10)
    }
  })

  it('bot ids resolve to personalities and match player count', () => {
    for (const l of LEVELS) {
      expect(l.botIds.length, l.title).toBe(l.rules.numPlayers - 1)
      for (const id of l.botIds) expect(PERSONALITIES[id], `${l.title}: ${id}`).toBeDefined()
    }
  })

  it('community deals match hand size expectations', () => {
    for (const l of LEVELS) {
      const community = l.rules.streets.reduce((s, st) => s + st.deal, 0)
      const total = community + l.rules.holeCards
      expect(total, l.title).toBeGreaterThanOrEqual(l.rules.handSize)
      // Enough cards for a full table plus the board.
      expect(l.rules.numPlayers * l.rules.holeCards + community).toBeLessThanOrEqual(52)
    }
  })

  it('scripted deckStacks contain valid, unique cards', () => {
    for (const l of LEVELS) {
      for (const hand of Object.values(l.rules.script ?? {})) {
        if (!hand.deckStack) continue
        const ids = hand.deckStack
        expect(new Set(ids).size).toBe(ids.length)
        for (const id of ids) expect(() => parseCard(id)).not.toThrow()
      }
    }
  })

  it('betting levels give players enough chips for several hands', () => {
    for (const l of LEVELS) {
      if (!l.rules.betting) continue
      const cost = l.rules.betting.ante ?? l.rules.betting.blinds?.big ?? 0
      expect(l.rules.startingStack, l.title).toBeGreaterThanOrEqual(cost * 10)
    }
  })

  it('every level can play a full hand headlessly without errors', () => {
    for (const l of LEVELS) {
      let result = step(createGame(l.rules, 12345, ['hero', ...l.botIds]), { type: 'START_HAND' })
      let guard = 0
      while (result.state.phase !== 'hand-complete') {
        if (guard++ > 300) throw new Error(`${l.title}: hand did not terminate`)
        const s: GameState = result.state
        if (s.phase === 'betting' && s.actingSeat !== null) {
          const legal = legalActions(s)
          const action = legal.find((a) => a.type === 'check') ?? legal.find((a) => a.type === 'call') ?? legal[0]
          result = step(s, { type: 'PLAYER_ACTION', seat: s.actingSeat, action: action.type })
        } else if (s.phase === 'declaring') {
          result = step(s, { type: 'PLAYER_ACTION', seat: s.pendingDeclarations[0], action: 'stay' })
        } else {
          result = step(s, { type: 'ADVANCE' })
        }
      }
    }
  })
})
