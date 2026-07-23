// English strings — the source of truth for the Strings type.
// Values may be functions when interpolation or grammar is needed.

import type { HandCategory, HandRank, Rank } from '../engine/types'
import { rankName } from '../engine/deck'

function plural(rank: number): string {
  const name = rankName(rank as Rank)
  return name === 'Six' ? 'Sixes' : `${name}s`
}

export const en = {
  brand: {
    kicker: '♠ ♥ The Card Parlor ♦ ♣',
    tableLogo: '✦ The Card Parlor ✦',
  },

  acts: ['Card School', 'Chips on the Line', 'The Board', 'Take Your Seat', 'The Real Game'],

  hud: {
    meta: (level: number, hand: number, blinds: { small: number; big: number } | null) =>
      `Level ${level} · Hand ${hand}${blinds ? ` · Blinds ${blinds.small}/${blinds.big}` : ''}`,
    levelTip: (hand: number, blinds: { small: number; big: number } | null) =>
      `You're on hand ${hand} of this level.${
        blinds
          ? ` “Blinds ${blinds.small}/${blinds.big}” are forced bets two players must post before every deal — they rotate around the table.`
          : ''
      }`,
    goal: {
      predictions: (got: number, target: number) => `Call ${got}/${target} duels`,
      handsWon: (got: number, target: number) => `Win ${got}/${target} hands`,
      chips: (target: number) => `Reach ${target} chips`,
      profit: (after: number) => `Finish up after ${after} hands`,
      tournament: () => 'Last one standing wins',
    },
    goalTip: {
      predictions: (target: number, got: number, cap: number) =>
        `YOUR MISSION: call the result of a duel correctly ${target} times — you've got ${got} so far. Wrong guesses cost nothing; you have up to ${cap} duels to get there.`,
      handsWon: (target: number, got: number, cap: number) =>
        `YOUR MISSION: win ${target} hands (you've won ${got}) within ${cap} deals. A hand is won by having the best cards — or being the last one who didn't fold.`,
      chips: (target: number, start: number) =>
        `YOUR MISSION: grow your chip pile to ${target}. You started with ${start}. Win pots to grow it; fold bad hands so it doesn't shrink.`,
      profit: (after: number, start: number) =>
        `YOUR MISSION: after ${after} hands, have MORE chips than the ${start} you started with. Folding a bad hand SAVES chips — that counts too.`,
      tournament: () =>
        `THIS IS A TOURNAMENT: lose all your chips and you're out. Knock everyone else out to win. If you bust, you get a free ticket to try again.`,
    },
    questTip: (label: string) =>
      `BONUS QUEST — worth an extra ★ star: “${label}”. Totally optional; the level still completes without it. Stars just show off your mastery.`,
    stackTip: (start: number) =>
      `YOUR CHIPS. You started this level with ${start}. Bets are paid from here, and every pot you win lands back in it.`,
  },

  progress: {
    nodeTip: (n: number, title: string, rule: string, stars: number, current: boolean) =>
      `LEVEL ${n}: ${title} — ${rule}${stars ? ` (${'★'.repeat(stars)})` : ''}${current ? ' · You are here!' : ' · Click to play'}`,
    lockedTip: (n: number, title: string) =>
      `LEVEL ${n}: ${title} — locked. Finish level ${n - 1} to open it.`,
    actTip: (act: number, name: string) => `Act ${act} — ${name}`,
  },

  settings: {
    codexTip: "THE HAND CODEX: every poker hand you've ever made lights up here. Fill all nine!",
    codexTitle: '📖 Hand Codex',
    soundOnTip: 'Sound is ON — click to mute.',
    soundOffTip: 'Sound is OFF — click to unmute.',
    speedTip: (speed: number) =>
      `Game speed ×${speed} — click to cycle (×1 → ×1.5 → ×2). Speeds up dealing and bot thinking.`,
    resetTip: 'Reset ALL progress and start the school from scratch.',
    resetConfirm: 'Reset ALL progress?',
    langTip: 'החלף לעברית — Switch to Hebrew.',
    langLabel: 'עב',
  },

  actions: {
    fold: 'Fold',
    check: 'Check',
    call: (n: number) => `Call ${n}`,
    bet: (n: number) => `Bet ${n}`,
    raiseTo: (n: number) => `Raise to ${n}`,
    allIn: 'All in',
    stay: 'STAY 😤',
    foldDeclare: 'FOLD 🏳️',
    min: 'Min',
    halfPot: '½ Pot',
    pot: 'Pot',
    foldTip:
      'FOLD: give up this hand. You lose the chips you already put in — but nothing more. Folding bad hands is how winners stay winners.',
    checkTip:
      'CHECK: stay in the hand for FREE. Only possible when nobody has bet this round — you pass the turn without paying.',
    callTip: (n: number) => `CALL: match the current bet (${n} chips) to stay in the hand and see what happens next.`,
    betTip: 'BET: put chips in first. Everyone else must at least match your bet — or fold and hand you the pot.',
    raiseTip: "RAISE: don't just match their bet — increase it! Now THEY must match your bigger bet, or fold.",
    allInTip:
      "ALL IN: bet every single chip you have. Maximum pressure, maximum risk — you can't act again this hand.",
    stayTip: "STAY: you're in! If your hand beats everyone else who stayed, the whole pot is yours.",
    foldDeclareTip: 'FOLD: drop out safely. You lose only the ante you already paid — a smart fold SAVES chips.',
    declareStatus: 'Both players declare in secret…',
    thinking: (name: string) => `${name} is thinking…`,
    idle: '· · ·',
  },

  predict: {
    titleOpen: 'Both cards are face-up — who wins this duel?',
    titleHidden: (rival: string) => `${rival}'s card is face-down — take your guess, then we flip!`,
    helpOpen: 'Higher card wins. Compare the two cards (the ladder on the right shows the order).',
    helpHidden: (rival: string) =>
      `Look at YOUR card: is it likely higher or lower than ${rival}'s hidden one? Big cards usually win.`,
    myWin: 'My card wins 💪',
    tie: "It's a tie 🤝",
    rivalWins: (rival: string) => `${rival} wins 😬`,
    calledIt: 'CALLED IT!',
    notQuite: 'NOT QUITE!',
    why: (guess: string, actual: string) => `You guessed “${guess}” — it was “${actual}”.`,
    words: { win: 'win', lose: 'lose', split: 'split' },
  },

  newRule: {
    tag: (count: number) => `New Rule${count > 1 ? 's' : ''}`,
    finalTag: '★ Final Exam ★',
    levelOf: (n: number, act: string) => `Level ${n} · ${act}`,
    penny: (intro: string) => `🎠 Penny: “${intro}”`,
    dealMeIn: 'Deal me in',
  },

  coach: {
    name: 'Penny the Dealer',
    gotIt: 'Got it',
    openDuel:
      'Easy start: BOTH cards are face-up. The higher card wins the duel — the ladder on the right shows the order, 2 at the bottom, Ace on top. Just tap who wins!',
    hiddenDuel:
      "Now the real thing: her card flips FACE-DOWN. Look at YOUR card and guess how the duel ends. A big card is usually a win, a small card usually isn't. Guess, then we flip!",
    tieSplit:
      'Same rank? Nobody loses — the pot gets SPLIT. And remember: suits are just outfits, they never break a tie.',
    foldWin: 'Everyone folded — the pot is yours without showing a card. Betting can win all by itself.',
    carry: (amount: number) => `Everybody folded, so the pot of ${amount} CARRIES OVER. Next hand just got spicier.`,
    losesShowdown: (hand: string) =>
      `They win with ${hand}. Watch which hands beat which — that ladder is the whole game.`,
    kickerWin: 'That pot was decided by the KICKER — the side card. Same pair, but the bigger fifth card plays.',
    allIn: 'All the chips are in — no more betting. Cards face up, and the rest of the board decides it. Hold on tight.',
    sidePot:
      'A SIDE POT! When someone is all-in for less, they can only win the chips they matched. The rest goes in a separate pot for the others.',
    blinds:
      'The BLINDS: two forced bets left of the dealer button. They rotate every hand — so does the button. Blinds are a prize; go steal them.',
    blindsUp: (small: number, big: number) =>
      `BLINDS UP! Now ${small}/${big}. Sitting tight gets expensive — act or bleed.`,
    heroBustedRebuy:
      'Out of chips! Here — rookie insurance, on the house. (A flawless run means no rebuys, though.)',
    heroBustedTournament: "That's the tournament, kid. Grab a fresh ticket and run it back.",
    botBusted: 'And one falls! Fewer players means the blinds come around faster — stay sharp.',
  },

  levelEnd: {
    won: 'Level Complete!',
    lost: 'Not This Time',
    profit: (n: number) => `You made ${n} chips 🪙`,
    down: (n: number) => `Down ${n} chips this time`,
    questDone: '✓ Quest complete!',
    questMiss: '· Quest missed — replay any time',
    replay: 'Replay',
    tryAgain: 'Try again',
    next: 'Next level →',
    champion: 'Champion! Run it back 🏆',
  },

  celebration: { small: 'YOU WIN!', big: 'MONSTER HAND!', royal: 'ROYAL FLUSH!!' },

  meter: {
    title: 'Hand strength',
    tip: "HAND STRENGTH METER: a training tool that shows how strong your cards are right now, from 🐟 trash to 🐉 monster. It updates every time a new card appears. (Real players don't get one — it retires in later levels!)",
    words: { trash: 'trash', weak: 'weak', decent: 'decent', strong: 'strong', monster: 'monster' },
  },

  ribbon: {
    high: 'HIGH',
    low: 'LOW',
    tip: "THE RANK LADDER: every card's strength in order — 2 is the weakest (bottom), Ace is the strongest (top). Cards currently on the table glow gold, so you can see at a glance who's higher.",
  },

  table: {
    pot: (n: number) => `POT ${n}`,
    potTip: 'THE POT: every chip that gets bet lands in this pile. Win the hand, win the whole pot.',
    carried: ' (carried!)',
    dealerTip:
      "THE DEALER BUTTON: marks who 'deals' this hand. It moves one seat left every hand and decides the acting order.",
    you: 'You',
  },

  seat: {
    ante: 'ante',
    ready: 'ready',
    stay: 'STAY',
    fold: 'FOLD',
    allIn: 'ALL IN',
    action: {
      check: 'check',
      fold: 'fold',
      call: (n: number) => `call ${n}`,
      bet: (n: number) => `bet ${n}`,
      raise: (n: number) => `raise ${n}`,
    },
  },

  hands: {
    categories: {
      'high-card': 'High Card',
      pair: 'Pair',
      'two-pair': 'Two Pair',
      trips: 'Three of a Kind',
      straight: 'Straight',
      flush: 'Flush',
      'full-house': 'Full House',
      quads: 'Four of a Kind',
      'straight-flush': 'Straight Flush',
    } as Record<HandCategory, string>,
    handName: (rank: HandRank): string => {
      const t = rank.tiebreak
      switch (rank.category) {
        case 'high-card':
          return `${rankName(t[0] as Rank)} high`
        case 'pair':
          return `Pair of ${plural(t[0])}`
        case 'two-pair':
          return `Two Pair, ${plural(t[0])} and ${plural(t[1])}`
        case 'trips':
          return `Three of a Kind, ${plural(t[0])}`
        case 'straight':
          return `Straight to the ${rankName(t[0] as Rank)}`
        case 'flush':
          return `Flush, ${rankName(t[0] as Rank)} high`
        case 'full-house':
          return `Full House, ${plural(t[0])} full of ${plural(t[1])}`
        case 'quads':
          return `Four of a Kind, ${plural(t[0])}`
        case 'straight-flush':
          return t[0] === 14 ? 'ROYAL FLUSH' : `Straight Flush to the ${rankName(t[0] as Rank)}`
      }
    },
  },

  explain: {
    fold: (made: string, toCall: number) =>
      `I only have ${made}, and it costs ${toCall} to keep going... too expensive. I fold.`,
    foldFree: (made: string) => `${made}? Not worth playing. I fold.`,
    stay: (made: string) => `${made} feels strong enough — I'm staying in!`,
    checkStrong: `I'll check — no need to scare anyone off yet.`,
    checkWeak: `Nothing great here. I'll check and see a free card.`,
    call: (toCall: number, pot: number, made: string) =>
      `${toCall} to call, and the pot has ${pot}. With ${made}, that price is fine — call.`,
    callPlain: 'I call.',
    betBluff: (amount: string) => `I'll bet ${amount}... (don't tell anyone what I have)`,
    betValue: (made: string) => `I have ${made} — that's worth a bet. Chips in!`,
    raiseBluff: `RAISE! ...my cards? Never mind my cards.`,
    raiseValue: (made: string) => `${made} is too good to just call. Raise!`,
    allIn: `Everything. ALL IN.`,
  },

  levels: {
    L01: {
      title: 'High Noon',
      subtitle: 'One card each. Highest card wins.',
      newRules: [
        'You and Callie each get ONE card. The higher card wins the duel.',
        'Cards have a rank order: 2 is the lowest, Ace is the highest.',
        'Your job: call the winner BEFORE the duel is decided.',
      ],
      intro: 'Welcome to the kitchen table, kid. We start easy: both cards face-up — just point at the winner.',
      quest: 'Call 3 duels correctly in a row',
    },
    L02: {
      title: 'Copycats',
      subtitle: 'Same rank? Nobody loses.',
      newRules: ['Ties SPLIT the pot.', 'Suits never break a tie — they are just outfits.'],
      intro: 'Watch close — some of these cards are twins. What happens then?',
      quest: 'Call 4 flips in a row (splits count!)',
    },
    L03: {
      title: 'Perfect Pair',
      subtitle: 'Two cards each — and your first real poker hand.',
      newRules: [
        'A PAIR (two cards of the same rank) beats any high card.',
        'Higher pair beats lower pair.',
      ],
      intro: 'Two cards now. If they match, they team up — and a team beats a loner. Every time.',
      quest: 'Win 3 flips with a pair',
    },
    L04: {
      title: 'Ante Up',
      subtitle: 'Pay to play. Fold to survive.',
      newRules: [
        'The ANTE: everyone pays 5 chips before the deal.',
        'STAY or FOLD: folding gives up the pot — and saves your chips.',
        'If everyone folds, the pot carries to the next hand!',
      ],
      intro: "Chips are real now. Here's the secret nobody tells beginners: folding bad hands IS winning.",
      quest: 'Fold 4 trash hands (discipline!)',
    },
    L05: {
      title: 'Check, Please',
      subtitle: 'Your first betting round.',
      newRules: [
        'CHECK: stay in for free (when nobody has bet).',
        'BET: put 10 chips in — now they must pay to continue.',
        'CALL: match the bet. FOLD: give up the hand.',
        'Act in turn — the glowing arrow shows whose go it is.',
      ],
      intro: 'Four buttons, one betting round. Bet your good hands — Callie WILL pay you off.',
      quest: 'Get paid 3 times with a pair',
    },
    L06: {
      title: 'Raise the Roof',
      subtitle: 'Meet Vinnie. He raises. A lot.',
      newRules: [
        "RAISE: don't just call a bet — bet MORE on top.",
        'Raises can be re-raised, up to 3 per round. Then the betting caps.',
      ],
      intro: 'This is Vinnie. He raises with anything. Stay calm, call him down, and take his chips.',
      quest: 'Win 2 pots that got raised',
    },
    L07: {
      title: 'Common Ground',
      subtitle: 'Shared cards belong to EVERYONE.',
      newRules: [
        'COMMUNITY CARDS: shared cards in the middle count as part of YOUR hand.',
        'New hands: TWO PAIR and THREE OF A KIND.',
      ],
      intro: "See those cards in the middle? They're yours. And Callie's. And that changes everything.",
      quest: 'Win with two pair or trips',
    },
    L08: {
      title: 'Five of Seven',
      subtitle: 'Suits finally matter.',
      newRules: [
        'Full 5-card board: your best FIVE cards out of seven play.',
        'STRAIGHT: five ranks in a row. FLUSH: five cards of one suit.',
      ],
      intro: 'Meet Lucy. She chases every draw ever dealt. Today, suits stop being outfits.',
      quest: 'Make and win with a straight or flush',
    },
    L09: {
      title: 'Monster Factory',
      subtitle: 'The top of the ladder, experienced live.',
      newRules: [
        'FULL HOUSE: three of a kind + a pair. Beats a flush!',
        'FOUR OF A KIND beats that. STRAIGHT FLUSH beats everything.',
        'The ROYAL FLUSH (A-K-Q-J-10 suited) is the rarest hand in poker.',
      ],
      intro: 'Tonight the deck is running HOT. Monsters everywhere — watch who beats whom.',
      quest: 'Win with a full house or better',
    },
    L10: {
      title: 'Street Smarts',
      subtitle: 'Flop. Turn. River. The drama arrives in stages.',
      newRules: [
        'The board comes in STREETS: 3 cards (flop), then 1 (turn), then 1 (river).',
        'You bet between every street — and bets get bigger on the turn and river.',
      ],
      intro: "Hands change street by street. Watch your strength meter breathe — that's poker's heartbeat.",
      quest: 'Win a hand that came together on the turn or river',
    },
    L11: {
      title: 'Blind Ambition',
      subtitle: 'The button rotates. The blinds are a prize.',
      newRules: [
        'BLINDS replace the ante: small blind and big blind, posted left of the dealer BUTTON.',
        'The button moves every hand — everyone takes turns paying.',
        'Most starting hands belong in the muck. Fold them.',
      ],
      intro: "Real table rules now. See those blinds? They're not a tax — they're a bounty.",
      quest: 'Steal the blinds twice (raise, everyone folds)',
    },
    L12: {
      title: 'Seat of Power',
      subtitle: 'Acting last is a superpower.',
      newRules: [
        'POSITION: players after you see your move before making theirs.',
        'On the button you act LAST — play more hands there. First to act? Play tight.',
      ],
      intro: "This is Sly. He barely looks at his cards — he's watching YOU. Time to learn why the button is a throne.",
      quest: 'Win 3 pots from the button',
    },
    L13: {
      title: 'The Price Is Right',
      subtitle: 'Draws have a price. Learn when to pay it.',
      newRules: [
        'OUTS: the cards that turn your almost-hand into a made hand.',
        'Compare the price (the bet) to the prize (the pot). Big pot + live draw = call. Small pot + long shot = fold.',
      ],
      intro: 'Lucy chases everything. You? You chase when the price is right. Good decisions beat good luck.',
      quest: 'Complete 2 draws and win with them',
    },
    L14: {
      title: 'Stone Cold',
      subtitle: 'No-limit. Bet anything. Even everything.',
      newRules: [
        'NO-LIMIT: bet any amount, from the big blind up to your whole stack.',
        "BLUFFING: a big enough bet wins even when your cards can't. Gary folds everything — make him.",
      ],
      intro: "The training wheels are OFF — no more strength meter, kid. You don't need it anymore. Now: Gary folds too much. Punish him.",
      quest: 'Win 3 pots without showing your cards',
    },
    L15: {
      title: 'Shove & Survive',
      subtitle: 'Short stacks. Rising blinds. Last one standing.',
      newRules: [
        "ALL-IN: bet your whole stack. If you're covered, your tournament is on the line.",
        'SIDE POTS: an all-in player can only win chips they matched — the rest goes in a side pot.',
        'Blinds DOUBLE every 5 hands. Waiting is dying.',
      ],
      intro: 'A real tournament ticket. You can actually lose this one — so make your chips count.',
      quest: 'Win 2 pots someone raised',
    },
    L16: {
      title: 'Kicker Karma',
      subtitle: 'The fine print of showdowns.',
      newRules: [
        'KICKERS: when hands tie, the highest side card wins the pot.',
        "If the board is everyone's best hand, the pot SPLITS.",
      ],
      intro: 'The Professor is in. Same pair, different fates — the fifth card matters, my friend.',
      quest: 'Win a pot on a kicker',
    },
    L17: {
      title: 'The Main Event',
      subtitle: 'Full table. Every rule. No training wheels.',
      newRules: ['No new rules. You know them ALL. Now win the whole thing.'],
      intro: "Six seats. Five familiar faces. Every trick you've learned has a target at this table. Shuffle up and deal.",
      quest: 'Win the Main Event',
    },
  },

  bots: {
    callie: {
      name: 'Callie the Koala',
      archetype: 'The Calling Station',
      tagline: 'Sweet, sleepy, and physically incapable of folding.',
      howToBeat: 'Bet big with good hands — she WILL pay you off. Never bluff her.',
      lines: {
        calls: ['I just want to see what happens!', 'Calling! These chips wanted a hug anyway.', 'Okie dokie, I call.'],
        checks: ['Snooze... oh! Check.', 'Checky check.'],
        folds: ["Even I can't call that one...", 'Fine, FINE, I fold.'],
        wins: ['Yay! Chip cuddles!', 'Wait, I won? I won!!'],
        loses: ["That's okay, they'll come back.", 'Aww. Worth it though.'],
        'big-hand': ['Oooh. OOOOH.', '*ears perk up*'],
        'facing-raise': ["That's a lot of chips... I'm still in!"],
      },
    },
    gary: {
      name: 'Granite Gary',
      archetype: 'The Rock',
      tagline: 'Every chip is a retirement fund. Folds 85% of everything.',
      howToBeat: 'Steal his blinds relentlessly. But when Gary bets — RUN.',
      lines: {
        folds: ['Not worth five chips of my savings.', 'Nope. Nope nope nope.', 'The blinds will eat you alive if you play every hand.'],
        bets: ['Now THIS is a hand.', "I didn't wait 40 years to check."],
        calls: ['Hmph. Fine.'],
        wins: ['Patience pays, kid.', 'Slow and steady.'],
        loses: ['Outrageous.', 'This is why I fold.'],
        'facing-raise': ['You better have it.'],
      },
    },
    vinnie: {
      name: 'Vinnie the Volcano',
      archetype: 'The Maniac',
      tagline: 'Raises first, checks what his cards were later.',
      howToBeat: 'Do LESS. Call him down with decent hands and let him bluff off his stack.',
      lines: {
        raises: ['RAISE! Obviously!', 'MORE CHIPS IN THE MIDDLE!', 'You call that a bet?!'],
        bets: ['BOOM!', 'Feel the heat!'],
        calls: ['Pfft. Fine, call.'],
        folds: ['WHAT?! Ugh. Fold. WHATEVER.'],
        wins: ['HAHA! The volcano ERUPTS!', 'Too easy! TOO EASY!'],
        loses: ['IMPOSSIBLE!', 'I demand a re-deal!'],
        'bluff-revealed': ['HA! I had NOTHING! NOTHING!', "You just got VOLCANO'D!"],
      },
    },
    lucy: {
      name: 'Lucky Lucy',
      archetype: 'The Chaser',
      tagline: 'Will chase any draw to the river. Any draw. Any price.',
      howToBeat: 'Make her pay for her draws — bet big when the board has flush and straight possibilities.',
      lines: {
        calls: ['One more card, baby!', "Ooh it's SO close I can taste it.", "Four hearts... one more and it's flush city!"],
        checks: ['Free card? Yes please!'],
        folds: ['Not even I chase that.', 'No sparkle in this one.'],
        wins: ['THERE IT IS! Told you!', 'Lucky? No no. Destined.'],
        loses: ['It was RIGHT THERE.', 'Next time it hits. I can feel it.'],
        'big-hand': ['*eyes sparkle*'],
      },
    },
    sly: {
      name: 'Sly the Fox',
      archetype: 'The Positional Thief',
      tagline: 'Plays the player, not the cards. Loves acting last.',
      howToBeat: 'Fight back from the blinds and re-raise his button steals — he folds when caught.',
      lines: {
        raises: ['You have to act first? Lovely.', "I'll just take these blinds, thank you.", 'Position, position, position.'],
        bets: ['You checked. Interesting.', 'I noticed you hesitate.'],
        folds: ['You caught me. This time.', "Take it. I'll steal two more later."],
        calls: ["Let's see where this goes."],
        wins: ['Like taking candy from... well, you.', 'The button is a throne.'],
        loses: ['Well played. I mean it. Mostly.'],
      },
    },
    professor: {
      name: 'The Professor',
      archetype: 'The Balanced Final Boss',
      tagline: 'Near-perfect play, unfailingly polite. No tricks. No tells.',
      howToBeat: "There is no trick. Play your best poker — that's the diploma.",
      lines: {
        wins: ['The fifth card matters, my friend.', 'A sound decision poorly rewarded is still sound. Mine was both.'],
        loses: ['Well played. Genuinely.', "I'd make the same play again — and so should you."],
        raises: ['I believe the pot is light.'],
        folds: ['Discretion. Do write that down.'],
        calls: ['Your price is fair.'],
      },
    },
  },
}

export type Strings = typeof en
