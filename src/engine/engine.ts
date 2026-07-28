import type {
  ActionType,
  Card,
  EngineAction,
  GameEvent,
  GameState,
  HandRank,
  LegalAction,
  PlayerState,
  PotAward,
  RulesConfig,
  StepResult,
  StreetSpec,
} from './types'
import { HAND_CATEGORY_ORDER } from './types'
import { makeDeck, parseCard, sameCard } from './deck'
import { shuffle } from './rng'
import { bestHand } from './evaluate'
import { buildPots, awardPots } from './pots'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inHand = (p: PlayerState) => p.status === 'active' || p.status === 'all-in'
const canAct = (p: PlayerState) => p.status === 'active' && p.stack > 0

function clone(state: GameState): GameState {
  return structuredClone(state)
}

/** Seats in clockwise order starting AFTER `fromSeat`, non-busted only. */
function seatsAfter(state: GameState, fromSeat: number): number[] {
  const n = state.players.length
  const seats: number[] = []
  for (let i = 1; i <= n; i++) {
    const seat = (fromSeat + i) % n
    if (state.players[seat].status !== 'busted') seats.push(seat)
  }
  return seats
}

function player(state: GameState, seat: number): PlayerState {
  return state.players[seat]
}

function potTotal(state: GameState): number {
  return state.carryPot + state.players.reduce((s, p) => s + p.committedTotal, 0)
}

function currentStreet(state: GameState): StreetSpec | null {
  return state.rules.streets[state.streetIndex] ?? null
}

function evalOpts(rules: RulesConfig) {
  return {
    enabledHands: rules.enabledHands,
    kickersMatter: rules.kickersMatter,
    handSize: rules.handSize,
  }
}

export function rankPlayerHand(state: GameState, p: PlayerState): HandRank {
  return bestHand(p.holeCards, state.community, evalOpts(state.rules))
}

/** Commit chips from a player's stack into the pot (this round + total). */
function commit(p: PlayerState, amount: number): number {
  const real = Math.min(amount, p.stack)
  p.stack -= real
  p.committedThisRound += real
  p.committedTotal += real
  if (p.stack === 0 && p.status === 'active') p.status = 'all-in'
  return real
}

function blindsForHand(rules: RulesConfig, handNumber: number): { small: number; big: number } | null {
  const base = rules.betting?.blinds
  if (!base) return null
  const sched = rules.blindSchedule
  if (!sched) return { ...base }
  const steps = Math.floor(handNumber / sched.everyHands)
  const mult = Math.pow(sched.factor, steps)
  return { small: Math.round(base.small * mult), big: Math.round(base.big * mult) }
}

// ---------------------------------------------------------------------------
// Deck building: scripts + bias
// ---------------------------------------------------------------------------

/** Deal preview for a given deck order (player-by-player, then community). */
function previewDeal(state: GameState, deck: Card[]) {
  const { holeCards, streets } = state.rules
  const holes: Card[][] = []
  let cursor = 0
  for (const p of state.players) {
    holes.push(p.status === 'busted' ? [] : deck.slice(cursor, (cursor += holeCards)))
  }
  const communityCount = streets.reduce((s, st) => s + st.deal, 0)
  const community = deck.slice(cursor, cursor + communityCount)
  return { holes, community }
}

function biasSatisfied(state: GameState, deck: Card[]): boolean {
  const bias = state.rules.deckBias ?? 'none'
  if (bias === 'none') return true
  // Alternate biased/fair hands so play stays believable (monsters: every hand).
  if (bias !== 'monsters' && state.handNumber % 2 === 1) return true
  const { holes, community } = previewDeal(state, deck)
  const live = holes.filter((h) => h.length > 0)
  switch (bias) {
    case 'pairs':
      return live.some((h) => h.length >= 2 && h[0].rank === h[1].rank)
    case 'ties': {
      const hero = holes[0]
      return live.some((h, i) => i > 0 && h.length > 0 && hero.length > 0 && h[0].rank === hero[0].rank)
    }
    case 'draws': {
      const hero = holes[0]
      if (hero.length < 2) return false
      const suited = hero[0].suit === hero[1].suit
      const gap = Math.abs(hero[0].rank - hero[1].rank)
      return suited || gap <= 1
    }
    case 'monsters': {
      const tripsIdx = HAND_CATEGORY_ORDER.indexOf('trips')
      const opts = { enabledHands: HAND_CATEGORY_ORDER, kickersMatter: true, handSize: 5 as const }
      return live.some((h) => {
        const rank = bestHand(h, community, opts)
        return HAND_CATEGORY_ORDER.indexOf(rank.category) >= tripsIdx
      })
    }
    case 'kickers': {
      // Two players collide on category + top tiebreak: kicker showdowns.
      const opts = { enabledHands: HAND_CATEGORY_ORDER, kickersMatter: true, handSize: 5 as const }
      const ranks = live.map((h) => bestHand(h, community, opts))
      for (let i = 0; i < ranks.length; i++) {
        for (let j = i + 1; j < ranks.length; j++) {
          if (ranks[i].category === ranks[j].category && ranks[i].tiebreak[0] === ranks[j].tiebreak[0]) {
            return true
          }
        }
      }
      return false
    }
  }
}

function buildDeck(state: GameState): Card[] {
  const scripted = state.rules.script?.[state.handNumber]?.deckStack
  if (scripted) {
    const top = scripted.map(parseCard)
    const rest = makeDeck().filter((c) => !top.some((t) => sameCard(t, c)))
    const [shuffledRest, rng] = shuffle(rest, state.rngState)
    state.rngState = rng
    return [...top, ...shuffledRest]
  }
  let deck: Card[] = []
  for (let attempt = 0; attempt < 60; attempt++) {
    const [d, rng] = shuffle(makeDeck(), state.rngState)
    state.rngState = rng
    deck = d
    if (biasSatisfied(state, deck)) break
  }
  return deck
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createGame(rules: RulesConfig, seed: number, playerIds: string[]): GameState {
  if (playerIds.length !== rules.numPlayers) {
    throw new Error(`expected ${rules.numPlayers} player ids, got ${playerIds.length}`)
  }
  return {
    rules,
    rngState: seed >>> 0,
    handNumber: -1,
    phase: 'idle',
    streetIndex: 0,
    players: playerIds.map((id, seat) => ({
      id,
      seat,
      stack: rules.startingStack,
      holeCards: [],
      status: 'active',
      committedThisRound: 0,
      committedTotal: 0,
      declaration: null,
    })),
    buttonSeat: playerIds.length - 1,
    actingSeat: null,
    pendingDeclarations: [],
    deck: [],
    community: [],
    currentBet: 0,
    minRaise: 0,
    raisesThisRound: 0,
    toActQueue: [],
    noRaiseSeats: [],
    carryPot: 0,
    currentBlinds: null,
    foldedOut: false,
  }
}

export function legalActions(state: GameState): LegalAction[] {
  if (state.phase === 'declaring') return [{ type: 'stay' }, { type: 'fold' }]
  if (state.phase !== 'betting' || state.actingSeat === null) return []
  const p = player(state, state.actingSeat)
  const betting = state.rules.betting!
  const street = currentStreet(state)!
  const toCall = Math.min(state.currentBet - p.committedThisRound, p.stack)
  const actions: LegalAction[] = [{ type: 'fold' }]
  if (toCall <= 0) actions.push({ type: 'check' })
  else actions.push({ type: 'call', min: toCall })

  const allowed = (a: ActionType) => !betting.allowedActions || betting.allowedActions.includes(a)
  const streetBet = street.betSize ?? betting.fixedBet ?? betting.blinds?.big ?? 10
  const maxRaises = betting.maxRaisesPerRound ?? Infinity
  // A seat facing an incomplete all-in it has already been "closed" against may
  // only call or fold — no re-raise (real No-Limit rule).
  const canRaise = !state.noRaiseSeats.includes(state.actingSeat)

  if (betting.mode === 'fixed') {
    if (state.currentBet === 0 && allowed('bet') && p.stack > 0) {
      actions.push({ type: 'bet', min: Math.min(streetBet, p.stack) })
    } else if (
      state.currentBet > 0 &&
      canRaise &&
      allowed('raise') &&
      state.raisesThisRound < maxRaises &&
      p.stack > toCall
    ) {
      actions.push({
        type: 'raise',
        min: Math.min(state.currentBet + streetBet, p.committedThisRound + p.stack),
      })
    }
  } else if (betting.mode === 'no-limit') {
    const maxCommit = p.committedThisRound + p.stack
    if (state.currentBet === 0 && allowed('bet') && p.stack > 0) {
      const minBet = Math.min(betting.blinds?.big ?? streetBet, maxCommit)
      actions.push({ type: 'bet', min: minBet, max: maxCommit })
    } else if (
      state.currentBet > 0 &&
      canRaise &&
      allowed('raise') &&
      state.raisesThisRound < maxRaises &&
      maxCommit > state.currentBet
    ) {
      const minRaiseTo = Math.min(state.currentBet + state.minRaise, maxCommit)
      actions.push({ type: 'raise', min: minRaiseTo, max: maxCommit })
    }
  }
  return actions
}

export function step(state: GameState, action: EngineAction): StepResult {
  const s = clone(state)
  const events: GameEvent[] = []
  switch (action.type) {
    case 'START_HAND':
      startHand(s, events)
      break
    case 'PLAYER_ACTION':
      applyPlayerAction(s, events, action.seat, action.action, action.amount)
      break
    case 'ADVANCE':
      advance(s, events)
      break
  }
  return { state: s, events }
}

// ---------------------------------------------------------------------------
// Hand lifecycle
// ---------------------------------------------------------------------------

function startHand(s: GameState, events: GameEvent[]): void {
  if (s.phase !== 'idle' && s.phase !== 'hand-complete') {
    throw new Error(`cannot start hand from phase ${s.phase}`)
  }
  s.handNumber += 1
  s.community = []
  s.streetIndex = 0
  s.currentBet = 0
  s.minRaise = 0
  s.raisesThisRound = 0
  s.toActQueue = []
  s.actingSeat = null
  s.pendingDeclarations = []
  s.foldedOut = false
  for (const p of s.players) {
    p.holeCards = []
    p.committedThisRound = 0
    p.committedTotal = 0
    p.declaration = null
    if (p.status !== 'busted') p.status = 'active'
  }
  // Rotate the button to the next live seat.
  const live = seatsAfter(s, s.buttonSeat)
  s.buttonSeat = live[0] ?? s.buttonSeat
  s.currentBlinds = blindsForHand(s.rules, s.handNumber)
  events.push({
    type: 'hand-started',
    handNumber: s.handNumber,
    buttonSeat: s.buttonSeat,
    blinds: s.currentBlinds,
  })

  // Posts: antes then blinds.
  const posts: { playerId: string; amount: number; kind: 'sb' | 'bb' | 'ante' }[] = []
  const ante = s.rules.betting?.ante ?? 0
  if (ante > 0) {
    for (const p of s.players) {
      if (p.status === 'busted') continue
      const paid = Math.min(ante, p.stack)
      // Antes are dead money: they count toward the pot but not toward the
      // current bet, so committedThisRound is restored after the commit.
      const before = p.committedThisRound
      commit(p, paid)
      p.committedThisRound = before
      posts.push({ playerId: p.id, amount: paid, kind: 'ante' })
    }
  }
  if (s.currentBlinds) {
    // seatsAfter ends with the from-seat itself, so its length = live players.
    const liveSeats = seatsAfter(s, s.buttonSeat)
    const headsUp = liveSeats.length === 2
    const sbSeat = headsUp ? s.buttonSeat : liveSeats[0]
    const bbSeat = headsUp ? liveSeats[0] : liveSeats[1]
    const sb = player(s, sbSeat)
    const bb = player(s, bbSeat)
    posts.push({ playerId: sb.id, amount: commit(sb, s.currentBlinds.small), kind: 'sb' })
    posts.push({ playerId: bb.id, amount: commit(bb, s.currentBlinds.big), kind: 'bb' })
  }
  if (posts.length > 0) events.push({ type: 'posts', posts })

  // Deal hole cards player-by-player in seat order (invisible in the UI, and
  // it makes scripted deckStacks trivial to author).
  s.deck = buildDeck(s)
  let cursor = 0
  const deals: { playerId: string; cards: Card[] }[] = []
  for (const p of s.players) {
    if (p.status === 'busted') continue
    p.holeCards = s.deck.slice(cursor, (cursor += s.rules.holeCards))
    deals.push({ playerId: p.id, cards: p.holeCards })
  }
  s.deck = s.deck.slice(cursor)
  events.push({ type: 'cards-dealt', deals })

  s.phase = s.rules.streets.length > 0 ? 'street-begin' : 'showdown-pending'
}

function advance(s: GameState, events: GameEvent[]): void {
  switch (s.phase) {
    case 'street-begin':
      beginStreet(s, events)
      break
    case 'street-end':
      endStreet(s, events)
      break
    case 'runout':
      runoutNext(s, events)
      break
    case 'showdown-pending':
      showdown(s, events)
      break
    case 'payout-pending':
      payout(s, events)
      break
    case 'hand-complete':
    case 'idle':
    case 'betting':
    case 'declaring':
      break // nothing to pump
  }
}

function dealCommunity(s: GameState, events: GameEvent[], street: StreetSpec): void {
  events.push({ type: 'street-started', street: street.name, streetIndex: s.streetIndex })
  if (street.deal > 0) {
    const cards = s.deck.slice(0, street.deal)
    s.deck = s.deck.slice(street.deal)
    s.community.push(...cards)
    events.push({ type: 'community-dealt', street: street.name, cards })
  }
}

function beginStreet(s: GameState, events: GameEvent[]): void {
  const street = currentStreet(s)
  if (!street) {
    s.phase = 'showdown-pending'
    return
  }
  dealCommunity(s, events, street)
  if (!street.bet || !s.rules.betting) {
    s.streetIndex += 1
    if (s.streetIndex >= s.rules.streets.length) s.phase = 'showdown-pending'
    return
  }
  if (s.rules.betting.mode === 'stay-fold') {
    s.phase = 'declaring'
    s.pendingDeclarations = s.players.filter(canAct).map((p) => p.seat)
    events.push({ type: 'declarations-required', seats: [...s.pendingDeclarations] })
    return
  }
  startBettingRound(s, events)
}

function startBettingRound(s: GameState, events: GameEvent[]): void {
  const actors = s.players.filter(canAct)
  if (actors.length < 2) {
    // Nobody can bet (all-in or alone): betting is trivially complete.
    closeBettingRound(s, events)
    return
  }
  s.currentBet = Math.max(0, ...s.players.filter(inHand).map((p) => p.committedThisRound))
  const betting = s.rules.betting!
  const street = currentStreet(s)!
  s.minRaise = street.betSize ?? betting.fixedBet ?? betting.blinds?.big ?? 10
  s.raisesThisRound = 0
  s.noRaiseSeats = []

  // Preflop with blinds: first actor is left of the BB. Otherwise left of button.
  let startAfter = s.buttonSeat
  if (s.currentBlinds && s.streetIndex === 0) {
    const liveSeats = seatsAfter(s, s.buttonSeat)
    const headsUp = liveSeats.length === 2
    startAfter = headsUp ? liveSeats[0] : liveSeats[1] // the BB seat
  }
  s.toActQueue = seatsAfter(s, startAfter).filter((seat) => canAct(player(s, seat)))
  promptNext(s, events)
}

function promptNext(s: GameState, events: GameEvent[]): void {
  while (s.toActQueue.length > 0 && !canAct(player(s, s.toActQueue[0]))) {
    s.toActQueue.shift()
  }
  const next = s.toActQueue[0]
  if (next === undefined) {
    closeBettingRound(s, events)
    return
  }
  s.phase = 'betting'
  s.actingSeat = next
  const p = player(s, next)
  events.push({
    type: 'action-required',
    seat: next,
    playerId: p.id,
    legal: legalActions(s),
    toCall: Math.min(Math.max(0, s.currentBet - p.committedThisRound), p.stack),
  })
}

function closeBettingRound(s: GameState, events: GameEvent[]): void {
  s.actingSeat = null
  s.toActQueue = []
  const street = currentStreet(s)
  events.push({
    type: 'betting-round-complete',
    street: street?.name ?? '',
    potTotal: potTotal(s),
  })
  for (const p of s.players) p.committedThisRound = 0
  s.currentBet = 0
  s.phase = 'street-end'
}

function endStreet(s: GameState, events: GameEvent[]): void {
  if (s.foldedOut) {
    awardUncontested(s, events)
    return
  }
  const alive = s.players.filter(inHand)
  const actors = alive.filter((p) => p.status === 'active' && p.stack > 0)
  s.streetIndex += 1
  const moreStreets = s.streetIndex < s.rules.streets.length
  if (!moreStreets) {
    s.phase = 'showdown-pending'
    return
  }
  if (alive.length >= 2 && actors.length <= 1) {
    // Betting is over for good — flip everyone up and run out the board.
    s.phase = 'runout'
    events.push({
      type: 'all-in-runout',
      reveals: alive.map((p) => ({ playerId: p.id, cards: p.holeCards })),
    })
    return
  }
  s.phase = 'street-begin'
}

function runoutNext(s: GameState, events: GameEvent[]): void {
  const street = currentStreet(s)
  if (!street) {
    s.phase = 'showdown-pending'
    return
  }
  dealCommunity(s, events, street)
  s.streetIndex += 1
  if (s.streetIndex >= s.rules.streets.length) s.phase = 'showdown-pending'
}

function showdown(s: GameState, events: GameEvent[]): void {
  const contenders = s.players.filter(inHand)
  if (contenders.length === 1) {
    awardUncontested(s, events)
    return
  }
  const reveals = contenders.map((p) => ({
    playerId: p.id,
    cards: p.holeCards,
    rank: rankPlayerHand(s, p),
  }))
  events.push({ type: 'showdown', reveals })
  s.phase = 'payout-pending'
}

function payout(s: GameState, events: GameEvent[]): void {
  const pots = buildPots(s.players, s.carryPot)
  s.carryPot = 0
  const ranks = new Map<string, HandRank>()
  for (const p of s.players.filter(inHand)) ranks.set(p.id, rankPlayerHand(s, p))
  const oddChipOrder = seatsAfter(s, s.buttonSeat).map((seat) => player(s, seat).id)
  const awards = awardPots(pots, ranks, oddChipOrder)
  applyAwards(s, events, awards, pots.length - 1)
}

function awardUncontested(s: GameState, events: GameEvent[]): void {
  const winner = s.players.find(inHand)!
  const pots = buildPots(s.players, s.carryPot)
  s.carryPot = 0
  const total = pots.reduce((sum, p) => sum + p.amount, 0)
  const awards: PotAward[] = [
    { playerId: winner.id, amount: total, rank: null, wonBy: 'fold', split: false },
  ]
  applyAwards(s, events, awards, 0)
}

function applyAwards(s: GameState, events: GameEvent[], awards: PotAward[], sidePots: number): void {
  const total = awards.reduce((sum, a) => sum + a.amount, 0)
  for (const award of awards) {
    const p = s.players.find((pl) => pl.id === award.playerId)!
    p.stack += award.amount
  }
  events.push({ type: 'pot-awarded', awards, potTotal: total, sidePots })
  for (const p of s.players) {
    p.committedTotal = 0
    p.committedThisRound = 0
    // Busting only exists in levels where chips are in play at all.
    if (s.rules.startingStack > 0 && p.status !== 'busted' && p.stack === 0) {
      p.status = 'busted'
      events.push({ type: 'player-busted', playerId: p.id })
    }
  }
  events.push({ type: 'hand-complete', handNumber: s.handNumber })
  s.phase = 'hand-complete'
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

function applyPlayerAction(
  s: GameState,
  events: GameEvent[],
  seat: number,
  action: ActionType,
  amount?: number,
): void {
  if (s.phase === 'declaring') {
    applyDeclaration(s, events, seat, action)
    return
  }
  if (s.phase !== 'betting' || s.actingSeat !== seat) {
    throw new Error(`seat ${seat} cannot act now (phase=${s.phase}, acting=${s.actingSeat})`)
  }
  const p = player(s, seat)
  const legal = legalActions(s)
  const resolved = action === 'all-in' ? resolveAllIn(p, legal) : { action, amount }
  const spec = legal.find((l) => l.type === resolved.action)
  if (!spec) throw new Error(`illegal action ${action} for ${p.id}`)

  switch (resolved.action) {
    case 'fold': {
      p.status = 'folded'
      events.push({ type: 'player-acted', playerId: p.id, action: 'fold', amount: 0, potAfter: potTotal(s), allIn: false })
      break
    }
    case 'check': {
      events.push({ type: 'player-acted', playerId: p.id, action: 'check', amount: 0, potAfter: potTotal(s), allIn: false })
      break
    }
    case 'call': {
      const toCall = Math.max(0, s.currentBet - p.committedThisRound)
      const paid = commit(p, toCall)
      events.push({ type: 'player-acted', playerId: p.id, action: 'call', amount: paid, potAfter: potTotal(s), allIn: p.status === 'all-in' })
      break
    }
    case 'bet':
    case 'raise': {
      const maxCommit = p.committedThisRound + p.stack
      let commitTo = resolved.amount ?? spec.min ?? 0
      commitTo = Math.min(Math.max(commitTo, spec.min ?? 0), spec.max ?? spec.min ?? commitTo)
      commitTo = Math.min(commitTo, maxCommit)
      const priorBet = s.currentBet
      const raiseSize = commitTo - priorBet
      // Full raise = at least a min-raise (opening bets are always "full"). An
      // all-in for less is an incomplete raise.
      const fullRaise = priorBet === 0 || raiseSize >= s.minRaise
      // Players still pending before this action (they keep full rights).
      const yetToAct = new Set(s.toActQueue.slice(1))
      const paid = commit(p, commitTo - p.committedThisRound)
      if (resolved.action === 'raise') s.raisesThisRound += 1
      if (fullRaise) s.minRaise = Math.max(s.minRaise, raiseSize)
      s.currentBet = p.committedThisRound
      // Everyone else still able to act must respond to the new bet.
      const reopened = seatsAfter(s, seat).filter((st) => st !== seat && canAct(player(s, st)))
      s.toActQueue = reopened
      if (fullRaise) {
        // A full raise re-grants raise rights to everyone.
        s.noRaiseSeats = []
      } else {
        // Incomplete all-in: seats that had already acted may only call/fold.
        s.noRaiseSeats = Array.from(
          new Set([...s.noRaiseSeats, ...reopened.filter((st) => !yetToAct.has(st))]),
        )
      }
      events.push({ type: 'player-acted', playerId: p.id, action: resolved.action, amount: paid, potAfter: potTotal(s), allIn: p.status === 'all-in' })
      // Prompt next without shifting: queue was rebuilt.
      finishAction(s, events, /*rebuiltQueue*/ true)
      return
    }
    default:
      throw new Error(`unsupported action ${resolved.action}`)
  }
  finishAction(s, events, false)
}

function resolveAllIn(
  p: PlayerState,
  legal: LegalAction[],
): { action: ActionType; amount?: number } {
  const maxCommit = p.committedThisRound + p.stack
  const raise = legal.find((l) => l.type === 'raise')
  if (raise) return { action: 'raise', amount: maxCommit }
  const bet = legal.find((l) => l.type === 'bet')
  if (bet) return { action: 'bet', amount: maxCommit }
  if (legal.some((l) => l.type === 'call')) return { action: 'call' }
  throw new Error('all-in not possible')
}

function finishAction(s: GameState, events: GameEvent[], rebuiltQueue: boolean): void {
  const alive = s.players.filter(inHand)
  if (alive.length === 1) {
    s.foldedOut = true
    s.actingSeat = null
    s.toActQueue = []
    events.push({ type: 'betting-round-complete', street: currentStreet(s)?.name ?? '', potTotal: potTotal(s) })
    for (const p of s.players) p.committedThisRound = 0
    s.currentBet = 0
    s.phase = 'street-end'
    return
  }
  if (!rebuiltQueue) s.toActQueue.shift()
  promptNext(s, events)
}

// ---------------------------------------------------------------------------
// Stay/fold declarations (guts levels)
// ---------------------------------------------------------------------------

function applyDeclaration(s: GameState, events: GameEvent[], seat: number, action: ActionType): void {
  if (!s.pendingDeclarations.includes(seat)) {
    throw new Error(`seat ${seat} has already declared`)
  }
  if (action !== 'stay' && action !== 'fold') {
    throw new Error(`invalid declaration ${action}`)
  }
  const p = player(s, seat)
  p.declaration = action
  s.pendingDeclarations = s.pendingDeclarations.filter((x) => x !== seat)
  events.push({ type: 'player-declared', playerId: p.id })
  if (s.pendingDeclarations.length > 0) return

  const declarations = s.players
    .filter((pl) => pl.declaration !== null)
    .map((pl) => ({ playerId: pl.id, choice: pl.declaration! }))
  events.push({ type: 'declarations-revealed', declarations })
  for (const pl of s.players) {
    if (pl.declaration === 'fold') pl.status = 'folded'
  }
  const stayed = s.players.filter(inHand)
  if (stayed.length === 0) {
    // Everyone chickened out: the pot carries to the next hand.
    const carried = s.players.reduce((sum, pl) => sum + pl.committedTotal, 0)
    s.carryPot += carried
    for (const pl of s.players) {
      pl.committedTotal = 0
      pl.committedThisRound = 0
    }
    events.push({ type: 'pot-carried', amount: s.carryPot })
    events.push({ type: 'hand-complete', handNumber: s.handNumber })
    s.phase = 'hand-complete'
    return
  }
  if (stayed.length === 1) {
    awardUncontested(s, events)
    return
  }
  s.phase = 'showdown-pending'
}
