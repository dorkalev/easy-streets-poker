import type { HandCategory, RulesConfig, StreetSpec } from '../engine/types'
import type { LevelConfig, LevelUI } from './types'

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const LADDER: HandCategory[] = [
  'high-card', 'pair', 'two-pair', 'trips', 'straight', 'flush', 'full-house', 'quads', 'straight-flush',
]
const hands = (upTo: HandCategory): HandCategory[] => LADDER.slice(0, LADDER.indexOf(upTo) + 1)

const FULL_STREETS: StreetSpec[] = [
  { name: 'preflop', deal: 0, bet: true },
  { name: 'flop', deal: 3, bet: true },
  { name: 'turn', deal: 1, bet: true },
  { name: 'river', deal: 1, bet: true },
]

const UI_OFF: LevelUI = {
  showRankRibbon: false,
  showHandStrengthMeter: false,
  showActionHints: false,
  botsThinkOutLoud: false,
  peekAndPredict: false,
  openDuels: 0,
  stoplight: false,
}

// ---------------------------------------------------------------------------
// Act I — Card School (no chips, no way to lose)
// ---------------------------------------------------------------------------

const L01: LevelConfig = {
  levelNumber: 1,
  act: 1,
  actName: 'Card School',
  title: 'High Noon',
  subtitle: 'One card each. Highest card wins.',
  newRules: [
    'You and Callie each get ONE card. The higher card wins the duel.',
    'Cards have a rank order: 2 is the lowest, Ace is the highest.',
    'Your job: call the winner BEFORE the duel is decided.',
  ],
  intro: 'Welcome to the kitchen table, kid. We start easy: both cards face-up — just point at the winner.',
  botIds: ['callie'],
  handsToComplete: 12,
  winCondition: { type: 'predictions', target: 5 },
  quest: { type: 'correct-predictions', count: 8, label: 'Call 8 duels correctly' },
  ui: { ...UI_OFF, showRankRibbon: true, peekAndPredict: true, openDuels: 3, botsThinkOutLoud: true },
  difficulty: 0,
  rebuys: false,
  rules: {
    id: 'L01',
    numPlayers: 2,
    holeCards: 1,
    streets: [],
    enabledHands: ['high-card'],
    handSize: 1,
    kickersMatter: false,
    betting: null,
    startingStack: 0,
    script: { 0: { deckStack: ['14s', '9c'] } }, // first flip: you hold the Ace
  },
}

const L02: LevelConfig = {
  levelNumber: 2,
  act: 1,
  actName: 'Card School',
  title: 'Copycats',
  subtitle: 'Same rank? Nobody loses.',
  newRules: [
    'Ties SPLIT the pot.',
    'Suits never break a tie — they are just outfits.',
  ],
  intro: 'Watch close — some of these cards are twins. What happens then?',
  botIds: ['callie'],
  handsToComplete: 14,
  winCondition: { type: 'predictions', target: 6 },
  quest: { type: 'correct-predictions', count: 10, label: 'Call 10 flips correctly (splits count!)' },
  ui: { ...UI_OFF, showRankRibbon: true, peekAndPredict: true, openDuels: 1, botsThinkOutLoud: true },
  difficulty: 0,
  rebuys: false,
  rules: {
    id: 'L02',
    numPlayers: 2,
    holeCards: 1,
    streets: [],
    enabledHands: ['high-card'],
    handSize: 1,
    kickersMatter: false,
    betting: null,
    startingStack: 0,
    deckBias: 'ties',
    script: { 0: { deckStack: ['11h', '11c'] } }, // first flip is a tie, on purpose
  },
}

const L03: LevelConfig = {
  levelNumber: 3,
  act: 1,
  actName: 'Card School',
  title: 'Perfect Pair',
  subtitle: 'Two cards each — and your first real poker hand.',
  newRules: [
    'A PAIR (two cards of the same rank) beats any high card.',
    'Higher pair beats lower pair.',
  ],
  intro: 'Two cards now. If they match, they team up — and a team beats a loner. Every time.',
  botIds: ['callie'],
  handsToComplete: 14,
  winCondition: { type: 'predictions', target: 6 },
  quest: { type: 'win-with-category', categories: ['pair'], count: 3, label: 'Win 3 flips with a pair' },
  ui: { ...UI_OFF, showRankRibbon: true, peekAndPredict: true, botsThinkOutLoud: true },
  difficulty: 0,
  rebuys: false,
  rules: {
    id: 'L03',
    numPlayers: 2,
    holeCards: 2,
    streets: [],
    enabledHands: hands('pair'),
    handSize: 2,
    kickersMatter: false,
    betting: null,
    startingStack: 0,
    deckBias: 'pairs',
    script: { 0: { deckStack: ['9s', '9d', '13c', '5h'] } }, // your 9s beat her King-high
  },
}

// ---------------------------------------------------------------------------
// Act II — Chips on the Line
// ---------------------------------------------------------------------------

const L04: LevelConfig = {
  levelNumber: 4,
  act: 2,
  actName: 'Chips on the Line',
  title: 'Ante Up',
  subtitle: 'Pay to play. Fold to survive.',
  newRules: [
    'The ANTE: everyone pays 5 chips before the deal.',
    'STAY or FOLD: folding gives up the pot — and saves your chips.',
    'If everyone folds, the pot carries to the next hand!',
  ],
  intro: 'Chips are real now. Here\'s the secret nobody tells beginners: folding bad hands IS winning.',
  botIds: ['gary'],
  handsToComplete: 15,
  winCondition: { type: 'profit', afterHands: 15 },
  quest: { type: 'fold-preflop', count: 4, label: 'Fold 4 trash hands (discipline!)' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, botsThinkOutLoud: true },
  difficulty: 0,
  rebuys: true,
  rules: {
    id: 'L04',
    numPlayers: 2,
    holeCards: 2,
    streets: [{ name: 'declare', deal: 0, bet: true }],
    enabledHands: hands('pair'),
    handSize: 2,
    kickersMatter: false,
    betting: { mode: 'stay-fold', ante: 5, carryPotOnAllFold: true },
    startingStack: 100,
  },
}

const L05: LevelConfig = {
  levelNumber: 5,
  act: 2,
  actName: 'Chips on the Line',
  title: 'Check, Please',
  subtitle: 'Your first betting round.',
  newRules: [
    'CHECK: stay in for free (when nobody has bet).',
    'BET: put 10 chips in — now they must pay to continue.',
    'CALL: match the bet. FOLD: give up the hand.',
    'Act in turn — the glowing arrow shows whose go it is.',
  ],
  intro: 'Four buttons, one betting round. Bet your good hands — Callie WILL pay you off.',
  botIds: ['callie'],
  handsToComplete: 12,
  winCondition: { type: 'chips', target: 160 },
  quest: { type: 'win-with-category', categories: ['pair'], count: 3, label: 'Get paid 3 times with a pair' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, showActionHints: true, botsThinkOutLoud: true },
  difficulty: 0,
  rebuys: true,
  rules: {
    id: 'L05',
    numPlayers: 2,
    holeCards: 2,
    streets: [{ name: 'the bet', deal: 0, bet: true }],
    enabledHands: hands('pair'),
    handSize: 2,
    kickersMatter: false,
    betting: {
      mode: 'fixed',
      fixedBet: 10,
      ante: 5,
      allowedActions: ['check', 'bet', 'call', 'fold'], // no raising yet
    },
    startingStack: 100,
    deckBias: 'pairs',
  },
}

const L06: LevelConfig = {
  levelNumber: 6,
  act: 2,
  actName: 'Chips on the Line',
  title: 'Raise the Roof',
  subtitle: 'Meet Vinnie. He raises. A lot.',
  newRules: [
    'RAISE: don\'t just call a bet — bet MORE on top.',
    'Raises can be re-raised, up to 3 per round. Then the betting caps.',
  ],
  intro: 'This is Vinnie. He raises with anything. Stay calm, call him down, and take his chips.',
  botIds: ['vinnie'],
  handsToComplete: 12,
  winCondition: { type: 'profit', afterHands: 12 },
  quest: { type: 'win-raised-pot', count: 2, label: 'Win 2 pots that got raised' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, showActionHints: true, botsThinkOutLoud: true },
  difficulty: 0,
  rebuys: true,
  rules: {
    id: 'L06',
    numPlayers: 2,
    holeCards: 2,
    streets: [{ name: 'the bet', deal: 0, bet: true }],
    enabledHands: hands('pair'),
    handSize: 2,
    kickersMatter: false,
    betting: { mode: 'fixed', fixedBet: 10, ante: 5, maxRaisesPerRound: 3 },
    startingStack: 150,
    deckBias: 'pairs',
  },
}

// ---------------------------------------------------------------------------
// Act III — The Board
// ---------------------------------------------------------------------------

const L07: LevelConfig = {
  levelNumber: 7,
  act: 3,
  actName: 'The Board',
  title: 'Common Ground',
  subtitle: 'Shared cards belong to EVERYONE.',
  newRules: [
    'COMMUNITY CARDS: shared cards in the middle count as part of YOUR hand.',
    'New hands: TWO PAIR and THREE OF A KIND.',
  ],
  intro: 'See those cards in the middle? They\'re yours. And Callie\'s. And that changes everything.',
  botIds: ['callie'],
  handsToComplete: 10,
  winCondition: { type: 'chips', target: 200 },
  quest: { type: 'win-with-category', categories: ['two-pair', 'trips'], count: 2, label: 'Win with two pair or trips' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, showActionHints: true, botsThinkOutLoud: true },
  difficulty: 1,
  rebuys: true,
  rules: {
    id: 'L07',
    numPlayers: 2,
    holeCards: 2,
    streets: [{ name: 'the board', deal: 3, bet: true }],
    enabledHands: hands('trips'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'fixed', fixedBet: 10, ante: 5, maxRaisesPerRound: 3 },
    startingStack: 150,
    script: { 0: { deckStack: ['13h', '8c', '9d', '4s', '13d', '7s', '2c'] } }, // the King in the middle is YOURS too
  },
}

const L08: LevelConfig = {
  levelNumber: 8,
  act: 3,
  actName: 'The Board',
  title: 'Five of Seven',
  subtitle: 'Suits finally matter.',
  newRules: [
    'Full 5-card board: your best FIVE cards out of seven play.',
    'STRAIGHT: five ranks in a row. FLUSH: five cards of one suit.',
  ],
  intro: 'Meet Lucy. She chases every draw ever dealt. Today, suits stop being outfits.',
  botIds: ['lucy'],
  handsToComplete: 10,
  winCondition: { type: 'chips', target: 220 },
  quest: { type: 'win-with-category', categories: ['straight', 'flush'], count: 1, label: 'Make and win with a straight or flush' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, showActionHints: true, botsThinkOutLoud: true },
  difficulty: 1,
  rebuys: true,
  rules: {
    id: 'L08',
    numPlayers: 2,
    holeCards: 2,
    streets: [{ name: 'the board', deal: 5, bet: true }],
    enabledHands: hands('flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'fixed', fixedBet: 10, ante: 5, maxRaisesPerRound: 3 },
    startingStack: 150,
    deckBias: 'draws',
    script: { 0: { deckStack: ['14h', '9h', '12c', '11d', '2h', '7h', '12h', '10s', '3c'] } }, // your first flush
  },
}

const L09: LevelConfig = {
  levelNumber: 9,
  act: 3,
  actName: 'The Board',
  title: 'Monster Factory',
  subtitle: 'The top of the ladder, experienced live.',
  newRules: [
    'FULL HOUSE: three of a kind + a pair. Beats a flush!',
    'FOUR OF A KIND beats that. STRAIGHT FLUSH beats everything.',
    'The ROYAL FLUSH (A-K-Q-J-10 suited) is the rarest hand in poker.',
  ],
  intro: 'Tonight the deck is running HOT. Monsters everywhere — watch who beats whom.',
  botIds: ['callie', 'vinnie'],
  handsToComplete: 10,
  winCondition: { type: 'hands-won', target: 3 },
  quest: { type: 'win-with-category', categories: ['full-house', 'quads', 'straight-flush'], count: 1, label: 'Win with a full house or better' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, showActionHints: true, botsThinkOutLoud: true },
  difficulty: 1,
  rebuys: true,
  rules: {
    id: 'L09',
    numPlayers: 3,
    holeCards: 2,
    streets: [{ name: 'the board', deal: 5, bet: true }],
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'fixed', fixedBet: 10, ante: 5, maxRaisesPerRound: 3 },
    startingStack: 200,
    deckBias: 'monsters',
  },
}

const L10: LevelConfig = {
  levelNumber: 10,
  act: 3,
  actName: 'The Board',
  title: 'Street Smarts',
  subtitle: 'Flop. Turn. River. The drama arrives in stages.',
  newRules: [
    'The board comes in STREETS: 3 cards (flop), then 1 (turn), then 1 (river).',
    'You bet between every street — and bets get bigger on the turn and river.',
  ],
  intro: 'Hands change street by street. Watch your strength meter breathe — that\'s poker\'s heartbeat.',
  botIds: ['lucy'],
  handsToComplete: 10,
  winCondition: { type: 'profit', afterHands: 10 },
  quest: { type: 'win-with-category', categories: ['straight', 'flush', 'full-house'], count: 1, label: 'Win a hand that came together on the turn or river' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, showActionHints: true, botsThinkOutLoud: true },
  difficulty: 1,
  rebuys: true,
  rules: {
    id: 'L10',
    numPlayers: 2,
    holeCards: 2,
    streets: [
      { name: 'preflop', deal: 0, bet: true },
      { name: 'flop', deal: 3, bet: true },
      { name: 'turn', deal: 1, bet: true, betSize: 20 },
      { name: 'river', deal: 1, bet: true, betSize: 20 },
    ],
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'fixed', fixedBet: 10, ante: 5, maxRaisesPerRound: 3 },
    startingStack: 200,
    deckBias: 'draws',
  },
}

// ---------------------------------------------------------------------------
// Act IV — Take Your Seat
// ---------------------------------------------------------------------------

const L11: LevelConfig = {
  levelNumber: 11,
  act: 4,
  actName: 'Take Your Seat',
  title: 'Blind Ambition',
  subtitle: 'The button rotates. The blinds are a prize.',
  newRules: [
    'BLINDS replace the ante: small blind and big blind, posted left of the dealer BUTTON.',
    'The button moves every hand — everyone takes turns paying.',
    'Most starting hands belong in the muck. Fold them.',
  ],
  intro: 'Real table rules now. See those blinds? They\'re not a tax — they\'re a bounty.',
  botIds: ['callie', 'gary'],
  handsToComplete: 12,
  winCondition: { type: 'profit', afterHands: 12 },
  quest: { type: 'steal-blinds', count: 2, label: 'Steal the blinds twice (raise, everyone folds)' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, stoplight: true, botsThinkOutLoud: true },
  difficulty: 2,
  rebuys: true,
  rules: {
    id: 'L11',
    numPlayers: 3,
    holeCards: 2,
    streets: FULL_STREETS.map((s) => (s.name === 'turn' || s.name === 'river' ? { ...s, betSize: 20 } : s)),
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'fixed', fixedBet: 10, maxRaisesPerRound: 3, blinds: { small: 5, big: 10 } },
    startingStack: 300,
  },
}

const L12: LevelConfig = {
  levelNumber: 12,
  act: 4,
  actName: 'Take Your Seat',
  title: 'Seat of Power',
  subtitle: 'Acting last is a superpower.',
  newRules: [
    'POSITION: players after you see your move before making theirs.',
    'On the button you act LAST — play more hands there. First to act? Play tight.',
  ],
  intro: 'This is Sly. He barely looks at his cards — he\'s watching YOU. Time to learn why the button is a throne.',
  botIds: ['callie', 'gary', 'sly'],
  handsToComplete: 12,
  winCondition: { type: 'profit', afterHands: 12 },
  quest: { type: 'win-on-button', count: 3, label: 'Win 3 pots from the button' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, stoplight: true, botsThinkOutLoud: true },
  difficulty: 2,
  rebuys: true,
  rules: {
    id: 'L12',
    numPlayers: 4,
    holeCards: 2,
    streets: FULL_STREETS.map((s) => (s.name === 'turn' || s.name === 'river' ? { ...s, betSize: 20 } : s)),
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'fixed', fixedBet: 10, maxRaisesPerRound: 3, blinds: { small: 5, big: 10 } },
    startingStack: 300,
  },
}

const L13: LevelConfig = {
  levelNumber: 13,
  act: 4,
  actName: 'Take Your Seat',
  title: 'The Price Is Right',
  subtitle: 'Draws have a price. Learn when to pay it.',
  newRules: [
    'OUTS: the cards that turn your almost-hand into a made hand.',
    'Compare the price (the bet) to the prize (the pot). Big pot + live draw = call. Small pot + long shot = fold.',
  ],
  intro: 'Lucy chases everything. You? You chase when the price is right. Good decisions beat good luck.',
  botIds: ['lucy'],
  handsToComplete: 12,
  winCondition: { type: 'profit', afterHands: 12 },
  quest: { type: 'win-with-category', categories: ['straight', 'flush'], count: 2, label: 'Complete 2 draws and win with them' },
  ui: { ...UI_OFF, showHandStrengthMeter: true, stoplight: true, botsThinkOutLoud: true },
  difficulty: 2,
  rebuys: true,
  rules: {
    id: 'L13',
    numPlayers: 2,
    holeCards: 2,
    streets: FULL_STREETS.map((s) => (s.name === 'turn' || s.name === 'river' ? { ...s, betSize: 20 } : s)),
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'fixed', fixedBet: 10, maxRaisesPerRound: 3, blinds: { small: 5, big: 10 } },
    startingStack: 300,
    deckBias: 'draws',
  },
}

// ---------------------------------------------------------------------------
// Act V — The Real Game
// ---------------------------------------------------------------------------

const L14: LevelConfig = {
  levelNumber: 14,
  act: 5,
  actName: 'The Real Game',
  title: 'Stone Cold',
  subtitle: 'No-limit. Bet anything. Even everything.',
  newRules: [
    'NO-LIMIT: bet any amount, from the big blind up to your whole stack.',
    'BLUFFING: a big enough bet wins even when your cards can\'t. Gary folds everything — make him.',
  ],
  intro: 'The training wheels are OFF — no more strength meter, kid. You don\'t need it anymore. Now: Gary folds too much. Punish him.',
  botIds: ['gary'],
  handsToComplete: 12,
  winCondition: { type: 'profit', afterHands: 12 },
  quest: { type: 'win-without-showdown', count: 3, label: 'Win 3 pots without showing your cards' },
  ui: { ...UI_OFF, botsThinkOutLoud: false },
  difficulty: 2,
  rebuys: true,
  rules: {
    id: 'L14',
    numPlayers: 2,
    holeCards: 2,
    streets: FULL_STREETS,
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'no-limit', blinds: { small: 5, big: 10 } },
    startingStack: 1000,
  },
}

const L15: LevelConfig = {
  levelNumber: 15,
  act: 5,
  actName: 'The Real Game',
  title: 'Shove & Survive',
  subtitle: 'Short stacks. Rising blinds. Last one standing.',
  newRules: [
    'ALL-IN: bet your whole stack. If you\'re covered, your tournament is on the line.',
    'SIDE POTS: an all-in player can only win chips they matched — the rest goes in a side pot.',
    'Blinds DOUBLE every 5 hands. Waiting is dying.',
  ],
  intro: 'A real tournament ticket. You can actually lose this one — so make your chips count.',
  botIds: ['vinnie', 'sly'],
  handsToComplete: 40,
  winCondition: { type: 'tournament' },
  quest: { type: 'win-raised-pot', count: 2, label: 'Win 2 pots someone raised' },
  ui: { ...UI_OFF },
  difficulty: 2,
  rebuys: false,
  rules: {
    id: 'L15',
    numPlayers: 3,
    holeCards: 2,
    streets: FULL_STREETS,
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'no-limit', blinds: { small: 5, big: 10 } },
    startingStack: 250,
    blindSchedule: { everyHands: 5, factor: 2 },
  },
}

const L16: LevelConfig = {
  levelNumber: 16,
  act: 5,
  actName: 'The Real Game',
  title: 'Kicker Karma',
  subtitle: 'The fine print of showdowns.',
  newRules: [
    'KICKERS: when hands tie, the highest side card wins the pot.',
    'If the board is everyone\'s best hand, the pot SPLITS.',
  ],
  intro: 'The Professor is in. Same pair, different fates — the fifth card matters, my friend.',
  botIds: ['callie', 'sly', 'professor'],
  handsToComplete: 12,
  winCondition: { type: 'profit', afterHands: 12 },
  quest: { type: 'win-with-kicker', count: 1, label: 'Win a pot on a kicker' },
  ui: { ...UI_OFF },
  difficulty: 3,
  rebuys: true,
  rules: {
    id: 'L16',
    numPlayers: 4,
    holeCards: 2,
    streets: FULL_STREETS,
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'no-limit', blinds: { small: 5, big: 10 } },
    startingStack: 500,
    deckBias: 'kickers',
  },
}

const L17: LevelConfig = {
  levelNumber: 17,
  act: 5,
  actName: 'The Real Game',
  title: 'The Main Event',
  subtitle: 'Full table. Every rule. No training wheels.',
  newRules: ['No new rules. You know them ALL. Now win the whole thing.'],
  intro: 'Six seats. Five familiar faces. Every trick you\'ve learned has a target at this table. Shuffle up and deal.',
  botIds: ['callie', 'gary', 'vinnie', 'lucy', 'sly'],
  handsToComplete: 100,
  winCondition: { type: 'tournament' },
  quest: { type: 'win-tournament', label: 'Win the Main Event' },
  ui: { ...UI_OFF },
  difficulty: 3,
  rebuys: false,
  rules: {
    id: 'L17',
    numPlayers: 6,
    holeCards: 2,
    streets: FULL_STREETS,
    enabledHands: hands('straight-flush'),
    handSize: 5,
    kickersMatter: true,
    betting: { mode: 'no-limit', blinds: { small: 5, big: 10 } },
    startingStack: 1000,
    blindSchedule: { everyHands: 8, factor: 1.5 },
  },
}

export const LEVELS: LevelConfig[] = [
  L01, L02, L03, L04, L05, L06, L07, L08, L09, L10, L11, L12, L13, L14, L15, L16, L17,
]

export function getLevel(levelNumber: number): LevelConfig {
  const level = LEVELS[levelNumber - 1]
  if (!level) throw new Error(`no level ${levelNumber}`)
  return level
}

export const ACT_NAMES = ['Card School', 'Chips on the Line', 'The Board', 'Take Your Seat', 'The Real Game']

/** Import RulesConfig so validate.ts can reference it via this module. */
export type { RulesConfig }
