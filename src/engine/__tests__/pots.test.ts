import { describe, expect, it } from 'vitest'
import { buildPots, awardPots } from '../pots'
import { evaluate } from '../evaluate'
import { parseCard } from '../deck'
import { HAND_CATEGORY_ORDER, type HandRank, type PlayerState } from '../types'

const full = { enabledHands: HAND_CATEGORY_ORDER, kickersMatter: true }

function mkPlayer(id: string, committedTotal: number, status: PlayerState['status'] = 'active'): PlayerState {
  return {
    id,
    seat: 0,
    stack: 0,
    holeCards: [],
    status,
    committedThisRound: 0,
    committedTotal,
    declaration: null,
  }
}

function rank(...ids: string[]): HandRank {
  return evaluate(ids.map(parseCard), full)
}

const PAIR_9 = rank('9s', '9d', '5c', '3h', '2s')
const PAIR_K = rank('13s', '13d', '5c', '3h', '2s')
const ACE_HIGH = rank('14s', '10d', '5c', '3h', '2s')

describe('buildPots', () => {
  it('single pot when everyone committed equally', () => {
    const pots = buildPots([mkPlayer('a', 100), mkPlayer('b', 100), mkPlayer('c', 100)])
    expect(pots).toHaveLength(1)
    expect(pots[0].amount).toBe(300)
    expect(pots[0].eligible).toEqual(['a', 'b', 'c'])
  })

  it('classic side-pot ladder from two all-ins', () => {
    // a all-in 50, b all-in 200, c covers with 500
    const pots = buildPots([
      mkPlayer('a', 50, 'all-in'),
      mkPlayer('b', 200, 'all-in'),
      mkPlayer('c', 500),
    ])
    expect(pots).toHaveLength(3)
    expect(pots[0]).toEqual({ amount: 150, eligible: ['a', 'b', 'c'] })
    expect(pots[1]).toEqual({ amount: 300, eligible: ['b', 'c'] })
    expect(pots[2]).toEqual({ amount: 300, eligible: ['c'] })
  })

  it('folded players fund pots but are never eligible', () => {
    const pots = buildPots([
      mkPlayer('folder', 80, 'folded'),
      mkPlayer('a', 100),
      mkPlayer('b', 100),
    ])
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(280)
    for (const pot of pots) expect(pot.eligible).not.toContain('folder')
  })

  it('adds the carry pot to the main pot', () => {
    const pots = buildPots([mkPlayer('a', 10), mkPlayer('b', 10)], 40)
    expect(pots[0].amount).toBe(60)
  })
})

describe('awardPots', () => {
  it('best hand takes the pot', () => {
    const pots = buildPots([mkPlayer('a', 100), mkPlayer('b', 100)])
    const awards = awardPots(pots, new Map([['a', PAIR_K], ['b', PAIR_9]]), ['a', 'b'])
    expect(awards).toEqual([
      { playerId: 'a', amount: 200, rank: PAIR_K, wonBy: 'showdown', split: false },
    ])
  })

  it('splits evenly and gives the odd chip to the first seat after the button', () => {
    const pots = buildPots([mkPlayer('a', 101), mkPlayer('b', 101), mkPlayer('c', 101)])
    const awards = awardPots(
      pots,
      new Map([['a', PAIR_K], ['b', PAIR_K], ['c', ACE_HIGH]]),
      ['b', 'c', 'a'], // b is first after the button
    )
    const byId = Object.fromEntries(awards.map((a) => [a.playerId, a]))
    expect(byId.b.amount).toBe(152)
    expect(byId.a.amount).toBe(151)
    expect(byId.b.split).toBe(true)
    expect(byId.c).toBeUndefined()
  })

  it('short all-in winner takes the main pot only; side pot goes to the cover', () => {
    const pots = buildPots([
      mkPlayer('short', 50, 'all-in'),
      mkPlayer('big', 200),
      mkPlayer('mid', 200),
    ])
    const awards = awardPots(
      pots,
      new Map([['short', PAIR_K], ['big', PAIR_9], ['mid', ACE_HIGH]]),
      ['short', 'big', 'mid'],
    )
    const byId = Object.fromEntries(awards.map((a) => [a.playerId, a]))
    expect(byId.short.amount).toBe(150) // main pot: 3 x 50
    expect(byId.big.amount).toBe(300) // side pot: 2 x 150
    const totalAwarded = awards.reduce((s, a) => s + a.amount, 0)
    expect(totalAwarded).toBe(450) // chip conservation
  })
})
