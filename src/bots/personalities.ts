import type { BotPersonality } from './types'
import { L } from '../i18n'

export const PERSONALITIES: Record<string, BotPersonality> = {
  callie: {
    id: 'callie',
    name: 'Callie the Koala',
    emoji: '🐨',
    archetype: 'The Calling Station',
    tagline: 'Sweet, sleepy, and physically incapable of folding.',
    tightness: 0.1,
    aggression: 0.15,
    bluffFreq: 0,
    speechChance: 0.6,
    tellReliability: 0.8,
    howToBeat: 'Bet big with good hands — she WILL pay you off. Never bluff her.',
    color: '#8e9aaf',
    lines: {
      calls: ['I just want to see what happens!', 'Calling! These chips wanted a hug anyway.', 'Okie dokie, I call.'],
      checks: ['Snooze... oh! Check.', 'Checky check.'],
      folds: ['Even I can\'t call that one...', 'Fine, FINE, I fold.'],
      wins: ['Yay! Chip cuddles!', 'Wait, I won? I won!!'],
      loses: ['Aww. Worth it though.', 'That\'s okay, they\'ll come back.'],
      'big-hand': ['Oooh. OOOOH.', '*ears perk up*'],
      'facing-raise': ['That\'s a lot of chips... I\'m still in!'],
    },
  },
  gary: {
    id: 'gary',
    name: 'Granite Gary',
    emoji: '🐢',
    archetype: 'The Rock',
    tagline: 'Every chip is a retirement fund. Folds 85% of everything.',
    tightness: 0.9,
    aggression: 0.5,
    bluffFreq: 0,
    speechChance: 0.5,
    tellReliability: 0.9,
    howToBeat: 'Steal his blinds relentlessly. But when Gary bets — RUN.',
    color: '#6b705c',
    lines: {
      folds: ['Not worth five chips of my savings.', 'Nope. Nope nope nope.', 'The blinds will eat you alive if you play every hand.'],
      bets: ['Now THIS is a hand.', 'I didn\'t wait 40 years to check.'],
      calls: ['Hmph. Fine.'],
      wins: ['Patience pays, kid.', 'Slow and steady.'],
      loses: ['Outrageous.', 'This is why I fold.'],
      'facing-raise': ['You better have it.'],
    },
  },
  vinnie: {
    id: 'vinnie',
    name: 'Vinnie the Volcano',
    emoji: '🐉',
    archetype: 'The Maniac',
    tagline: 'Raises first, checks what his cards were later.',
    tightness: 0.05,
    aggression: 0.95,
    bluffFreq: 0.3,
    speechChance: 0.8,
    tellReliability: 0.7,
    howToBeat: 'Do LESS. Call him down with decent hands and let him bluff off his stack.',
    color: '#e63946',
    lines: {
      raises: ['RAISE! Obviously!', 'MORE CHIPS IN THE MIDDLE!', 'You call that a bet?!'],
      bets: ['BOOM!', 'Feel the heat!'],
      calls: ['Pfft. Fine, call.'],
      folds: ['WHAT?! Ugh. Fold. WHATEVER.'],
      wins: ['HAHA! The volcano ERUPTS!', 'Too easy! TOO EASY!'],
      loses: ['IMPOSSIBLE!', 'I demand a re-deal!'],
      'bluff-revealed': ['HA! I had NOTHING! NOTHING!', 'You just got VOLCANO\'D!'],
    },
  },
  lucy: {
    id: 'lucy',
    name: 'Lucky Lucy',
    emoji: '🦝',
    archetype: 'The Chaser',
    tagline: 'Will chase any draw to the river. Any draw. Any price.',
    tightness: 0.2,
    aggression: 0.3,
    bluffFreq: 0.05,
    speechChance: 0.7,
    tellReliability: 0.75,
    howToBeat: 'Make her pay for her draws — bet big when the board has flush and straight possibilities.',
    color: '#9d4edd',
    lines: {
      calls: ['One more card, baby!', 'Ooh it\'s SO close I can taste it.', 'Four hearts... one more and it\'s flush city!'],
      checks: ['Free card? Yes please!'],
      folds: ['Not even I chase that.', 'No sparkle in this one.'],
      wins: ['THERE IT IS! Told you!', 'Lucky? No no. Destined.'],
      loses: ['It was RIGHT THERE.', 'Next time it hits. I can feel it.'],
      'big-hand': ['*eyes sparkle*'],
    },
  },
  sly: {
    id: 'sly',
    name: 'Sly the Fox',
    emoji: '🦊',
    archetype: 'The Positional Thief',
    tagline: 'Plays the player, not the cards. Loves acting last.',
    tightness: 0.5,
    aggression: 0.7,
    bluffFreq: 0.2,
    speechChance: 0.6,
    tellReliability: 0.6,
    howToBeat: 'Fight back from the blinds and re-raise his button steals — he folds when caught.',
    color: '#f77f00',
    lines: {
      raises: ['You have to act first? Lovely.', 'I\'ll just take these blinds, thank you.', 'Position, position, position.'],
      bets: ['You checked. Interesting.', 'I noticed you hesitate.'],
      folds: ['You caught me. This time.', 'Take it. I\'ll steal two more later.'],
      calls: ['Let\'s see where this goes.'],
      wins: ['Like taking candy from... well, you.', 'The button is a throne.'],
      loses: ['Well played. I mean it. Mostly.'],
    },
  },
  professor: {
    id: 'professor',
    name: 'The Professor',
    emoji: '🦉',
    archetype: 'The Balanced Final Boss',
    tagline: 'Near-perfect play, unfailingly polite. No tricks. No tells.',
    tightness: 0.6,
    aggression: 0.6,
    bluffFreq: 0.12,
    speechChance: 0.4,
    tellReliability: 0,
    howToBeat: 'There is no trick. Play your best poker — that\'s the diploma.',
    color: '#457b9d',
    lines: {
      wins: ['The fifth card matters, my friend.', 'A sound decision poorly rewarded is still sound. Mine was both.'],
      loses: ['Well played. Genuinely.', 'I\'d make the same play again — and so should you.'],
      raises: ['I believe the pot is light.'],
      folds: ['Discretion. Do write that down.'],
      calls: ['Your price is fair.'],
    },
  },
}

// Localize the human-facing bot copy from the active locale. Numeric play
// style stays here; words come from the i18n dictionaries.
for (const p of Object.values(PERSONALITIES)) {
  const copy = L.bots[p.id as keyof typeof L.bots]
  if (!copy) continue
  p.name = copy.name
  p.archetype = copy.archetype
  p.tagline = copy.tagline
  p.howToBeat = copy.howToBeat
  p.lines = copy.lines
}

/** Penny is the dealer/coach — a voice, not an opponent. */
export const PENNY = {
  id: 'penny',
  name: L.coach.name,
  emoji: '🎠',
}
