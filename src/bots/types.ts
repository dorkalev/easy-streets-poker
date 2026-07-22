import type { ActionType, Card, GameEvent, LegalAction } from '../engine/types'

export type Mood = 'happy' | 'nervous' | 'confident' | 'annoyed' | 'thinking' | 'sad'

export interface BotDecision {
  action: ActionType
  amount?: number
  speech?: { text: string; mood: Mood }
  /** Whether this decision is a bluff (drives the tell animation). */
  bluffing: boolean
  thinkTimeMs: number
}

/** Everything a bot is allowed to see. Built by a selector — bots can't cheat. */
export interface BotContext {
  myCards: Card[]
  community: Card[]
  streetName: string
  streetIndex: number
  totalStreets: number
  toCall: number
  potSize: number
  myStack: number
  legal: LegalAction[]
  numActivePlayers: number
  numOpponents: number
  bigBlind: number
  /** Events so far this hand, for flavor reactions. */
  handEvents: GameEvent[]
  /** Deterministic per-bot random stream state. */
  rngState: number
}

export type SpeechTrigger =
  | 'folds'
  | 'calls'
  | 'checks'
  | 'bets'
  | 'raises'
  | 'wins'
  | 'loses'
  | 'bluff-revealed'
  | 'big-hand'
  | 'facing-raise'

export interface BotPersonality {
  id: string
  name: string
  emoji: string
  /** Short archetype label shown on the character card. */
  archetype: string
  tagline: string
  /** 0 = plays everything, 1 = folds everything marginal. */
  tightness: number
  /** 0 = check/call only, 1 = bets and raises relentlessly. */
  aggression: number
  /** Probability of turning air into a bet. */
  bluffFreq: number
  /** Probability of an audible line on a given trigger. */
  speechChance: number
  /** Reliability of the visual tell when bluffing (0..1). */
  tellReliability: number
  lines: Partial<Record<SpeechTrigger, string[]>>
  /** How to beat this bot — fills in on their character card. */
  howToBeat: string
  color: string
}
