// Pure engine types. This module (and everything in src/engine) must never
// import from React, the DOM, or any other layer of the app.

export type Suit = 'c' | 'd' | 'h' | 's'
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  rank: Rank
  suit: Suit
}

/** Card id string, e.g. '14s' (ace of spades), '2h'. */
export type CardId = string

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'trips'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'quads'
  | 'straight-flush'

export const HAND_CATEGORY_ORDER: HandCategory[] = [
  'high-card',
  'pair',
  'two-pair',
  'trips',
  'straight',
  'flush',
  'full-house',
  'quads',
  'straight-flush',
]

export interface HandRank {
  category: HandCategory
  /** Lexicographic tiebreak vector, e.g. two pair KK 88 kicker A -> [13, 13, 8, 8, 14]. */
  tiebreak: number[]
  /** The cards that form the hand (1..5), in display order: core cards then kickers. */
  cardsUsed: Card[]
  /** Subset of cardsUsed that are kickers (for coach explanations). */
  kickers: Card[]
  /** Packed integer for fast comparison. Category is the most significant digit. */
  score: number
}

export type ActionType = 'check' | 'bet' | 'call' | 'raise' | 'fold' | 'all-in' | 'stay'

export interface LegalAction {
  type: ActionType
  /** For call: the amount to call. For bet/raise: minimum total commitment this round. */
  min?: number
  /** For bet/raise in no-limit: maximum total commitment this round (stack-bound). */
  max?: number
}

export interface StreetSpec {
  /** Display name shown as the street banner: 'preflop' | 'flop' | 'turn' | 'river' | 'board' | ... */
  name: string
  /** Number of community cards dealt at the start of this street. */
  deal: number
  /** Whether a betting round follows the deal. */
  bet: boolean
  /** Fixed-limit bet size override for this street (e.g. big-bet streets). */
  betSize?: number
}

export type BettingMode = 'stay-fold' | 'fixed' | 'no-limit'

export interface BettingRules {
  mode: BettingMode
  /** Default fixed-limit bet size. */
  fixedBet?: number
  maxRaisesPerRound?: number
  blinds?: { small: number; big: number }
  ante?: number
  /** Restrict the action vocabulary (e.g. no 'raise' before it is taught). */
  allowedActions?: ActionType[]
  /** In stay-fold (guts) levels: an uncalled pot carries over to the next hand. */
  carryPotOnAllFold?: boolean
}

/** A deliberately biased deal, used to guarantee teachable moments. */
export type DeckBias = 'none' | 'pairs' | 'ties' | 'draws' | 'monsters' | 'kickers'

export interface ScriptedHand {
  /** Exact deal order (top of deck first). Deal order: hole cards round-robin, then community. */
  deckStack?: CardId[]
  /** Forced bot actions for this hand, consumed in order by the orchestrator. */
  botOverrides?: Record<string, ActionType[]>
}

/** The rules half of a level config — everything the engine needs to run hands. */
export interface RulesConfig {
  id: string
  numPlayers: number
  holeCards: number
  streets: StreetSpec[]
  enabledHands: HandCategory[]
  handSize: 1 | 2 | 5
  kickersMatter: boolean
  betting: BettingRules | null
  startingStack: number
  /** Tournament blind escalation: blinds multiply by `factor` every `everyHands` hands. */
  blindSchedule?: { everyHands: number; factor: number }
  /** Bias applied to fair shuffles via deterministic rejection sampling. */
  deckBias?: DeckBias
  /** Rigged hands by hand number (0-based). Missing entries fall back to the RNG. */
  script?: Record<number, ScriptedHand>
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'busted'

export interface PlayerState {
  id: string // 'hero' or a bot id
  seat: number
  stack: number
  holeCards: Card[]
  status: PlayerStatus
  committedThisRound: number
  committedTotal: number
  /** Stay-fold declaration, hidden until all have declared. */
  declaration: 'stay' | 'fold' | null
}

export interface Pot {
  amount: number
  eligible: string[] // player ids
}

export type HandPhase =
  | 'idle'
  | 'street-begin' // waiting for ADVANCE to deal the next street
  | 'betting'
  | 'declaring' // simultaneous stay/fold
  | 'street-end' // betting round closed, waiting for ADVANCE
  | 'runout' // everyone all-in: each ADVANCE deals the next street
  | 'showdown-pending'
  | 'payout-pending'
  | 'hand-complete'

export interface GameState {
  rules: RulesConfig
  rngState: number
  handNumber: number
  phase: HandPhase
  streetIndex: number
  players: PlayerState[]
  buttonSeat: number
  actingSeat: number | null
  /** Seats still owing a simultaneous declaration. */
  pendingDeclarations: number[]
  deck: Card[]
  community: Card[]
  currentBet: number
  minRaise: number
  raisesThisRound: number
  /** Seats queued to act in the current betting round, in order. */
  toActQueue: number[]
  /** Seats that may only call/fold for the rest of this round — they already
   * acted and are now facing an incomplete (sub-min) all-in raise, which by
   * the rules does not reopen their right to re-raise. */
  noRaiseSeats: number[]
  carryPot: number
  currentBlinds: { small: number; big: number } | null
  /** Winner already decided by folds (no showdown needed). */
  foldedOut: boolean
}

export type EngineAction =
  | { type: 'START_HAND' }
  | { type: 'PLAYER_ACTION'; seat: number; action: ActionType; amount?: number }
  | { type: 'ADVANCE' }

export interface PotAward {
  playerId: string
  amount: number
  rank: HandRank | null
  wonBy: 'showdown' | 'fold'
  split: boolean
}

export type GameEvent =
  | { type: 'hand-started'; handNumber: number; buttonSeat: number; blinds: { small: number; big: number } | null }
  | { type: 'posts'; posts: { playerId: string; amount: number; kind: 'sb' | 'bb' | 'ante' }[] }
  | { type: 'cards-dealt'; deals: { playerId: string; cards: Card[] }[] }
  | { type: 'street-started'; street: string; streetIndex: number }
  | { type: 'community-dealt'; street: string; cards: Card[] }
  | { type: 'action-required'; seat: number; playerId: string; legal: LegalAction[]; toCall: number }
  | { type: 'declarations-required'; seats: number[] }
  | { type: 'player-declared'; playerId: string }
  | { type: 'declarations-revealed'; declarations: { playerId: string; choice: 'stay' | 'fold' }[] }
  | { type: 'player-acted'; playerId: string; action: ActionType; amount: number; potAfter: number; allIn: boolean }
  | { type: 'betting-round-complete'; street: string; potTotal: number }
  | { type: 'all-in-runout'; reveals: { playerId: string; cards: Card[] }[] }
  | { type: 'showdown'; reveals: { playerId: string; cards: Card[]; rank: HandRank }[] }
  | { type: 'pot-awarded'; awards: PotAward[]; potTotal: number; sidePots: number }
  | { type: 'pot-carried'; amount: number }
  | { type: 'player-busted'; playerId: string }
  | { type: 'hand-complete'; handNumber: number }

export interface StepResult {
  state: GameState
  events: GameEvent[]
}
