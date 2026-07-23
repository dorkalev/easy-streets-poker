import type { HandCategory, RulesConfig } from '../engine/types'
import type { Difficulty } from '../bots/decide'

export type WinCondition =
  | { type: 'predictions'; target: number } // correct Peek & Predict calls
  | { type: 'hands-won'; target: number }
  | { type: 'chips'; target: number } // reach this stack
  | { type: 'profit'; afterHands: number } // be up after N hands
  | { type: 'tournament' } // be the last one standing

/** Star-2 quest: a concept-proving feat, detected from the event stream. */
export type Quest =
  | { type: 'correct-predictions'; count: number; label: string }
  | { type: 'prediction-streak'; count: number; label: string } // N correct in a row
  | { type: 'win-with-category'; categories: HandCategory[]; count: number; label: string }
  | { type: 'win-raised-pot'; count: number; label: string } // pot with >= 2 raises
  | { type: 'win-without-showdown'; count: number; label: string } // bluff-shaped
  | { type: 'steal-blinds'; count: number; label: string } // preflop raise, all fold
  | { type: 'fold-preflop'; count: number; label: string } // discipline
  | { type: 'win-on-button'; count: number; label: string } // position pays
  | { type: 'win-with-kicker'; count: number; label: string } // kicker decides
  | { type: 'win-tournament'; label: string }

export interface LevelUI {
  /** Visual 2→A ladder that cards ping onto at reveal. */
  showRankRibbon: boolean
  /** Fish→shark gauge under the hero's cards. */
  showHandStrengthMeter: boolean
  /** Suggested action pulse on the buttons. */
  showActionHints: boolean
  /** Bots narrate the WHY of their actions. */
  botsThinkOutLoud: boolean
  /** L1–3: guess win/lose/split before the flip. */
  peekAndPredict: boolean
  /**
   * Training wheels for Peek & Predict: the first N hands are played with the
   * bot's cards FACE-UP, so the learner just points at the winner before any
   * hidden-information guessing starts.
   */
  openDuels: number
  /** Green/yellow/red preflop tint on hero hole cards. */
  stoplight: boolean
}

export interface LevelConfig {
  rules: RulesConfig
  levelNumber: number // 1..17
  act: number // 1..5
  actName: string
  title: string
  subtitle: string
  /** THE new-rule indicator: shown as a banner at level start + on the map. */
  newRules: string[]
  /** Penny's one-liner when the level starts. */
  intro: string
  botIds: string[] // seat order 1..n
  handsToComplete: number
  winCondition: WinCondition
  quest: Quest
  ui: LevelUI
  difficulty: Difficulty
  /** Rookie insurance: busting triggers a free rebuy (voids the flawless star). */
  rebuys: boolean
}
