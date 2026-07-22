import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGame, heroAction, heroDeclare, heroPredict } from '../app/game'
import { getLevel } from '../levels/levels'
import type { ActionType, LegalAction } from '../engine/types'

export function ActionBar() {
  const heroTurn = useGame((g) => g.heroTurn)
  const declare = useGame((g) => g.heroDeclare)
  const predictionOpen = useGame((g) => g.predictionOpen)
  const levelNumber = useGame((g) => g.levelNumber)
  const seats = useGame((g) => g.seats)
  const strength = useGame((g) => g.heroStrength)
  const pot = useGame((g) => g.pot)
  const handNumber = useGame((g) => g.handNumber)

  const level = levelNumber ? getLevel(levelNumber) : null
  // Open duel = bot cards are face-up; the learner just points at the winner.
  const openDuel = (level?.ui.openDuels ?? 0) >= handNumber
  const rival = seats.find((s) => !s.isHero)?.name?.split(' ')[0] ?? 'They'

  const acting = seats.find((s) => s.acting && !s.isHero)
  const status = acting
    ? `${acting.name} is thinking…`
    : heroTurn || declare || predictionOpen
      ? ''
      : '· · ·'

  return (
    <div className="action-dock">
      <AnimatePresence mode="wait">
        {predictionOpen && (
          <ActionRow key="predict">
            <span className="predict-title">
              {openDuel ? 'Both cards are face-up — who wins this duel?' : `${rival}'s card is face-down — take your guess, then we flip!`}
            </span>
            <span className="predict-help">
              {openDuel
                ? 'Higher card wins. Compare the two cards (the ladder on the right shows the order).'
                : `Look at YOUR card: is it likely higher or lower than ${rival}'s hidden one? Big cards usually win.`}
            </span>
            <div className="action-row">
              <button className="btn btn-predict" onClick={() => heroPredict('win')}>My card wins 💪</button>
              <button className="btn btn-predict" onClick={() => heroPredict('split')}>It's a tie 🤝</button>
              <button className="btn btn-predict" onClick={() => heroPredict('lose')}>{rival} wins 😬</button>
            </div>
          </ActionRow>
        )}

        {declare && (
          <ActionRow key="declare">
            <span className="action-status">Both players declare in secret…</span>
            <div className="action-row">
              <button className="btn btn-stay" onClick={() => heroDeclare('stay')}>STAY 😤</button>
              <button className="btn btn-fold" onClick={() => heroDeclare('fold')}>FOLD 🏳️</button>
            </div>
          </ActionRow>
        )}

        {heroTurn && level && (
          <BettingControls
            key="betting"
            legal={heroTurn.legal}
            toCall={heroTurn.toCall}
            pot={pot}
            hints={level.ui.showActionHints}
            strength={strength}
          />
        )}

        {!predictionOpen && !declare && !heroTurn && (
          <motion.div
            key="status"
            className="action-status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {status}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      {children}
    </motion.div>
  )
}

function BettingControls({
  legal,
  toCall,
  pot,
  hints,
  strength,
}: {
  legal: LegalAction[]
  toCall: number
  pot: number
  hints: boolean
  strength: string | null
}) {
  const find = (t: ActionType) => legal.find((l) => l.type === t)
  const bet = find('bet')
  const raise = find('raise')
  const call = find('call')
  const check = find('check')
  const aggressive = bet ?? raise
  const noLimit = aggressive?.max !== undefined && aggressive.max !== aggressive.min

  const [amount, setAmount] = useState(aggressive?.min ?? 0)
  useEffect(() => {
    setAmount(aggressive?.min ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggressive?.min, aggressive?.max])

  const hinted: ActionType | null = useMemo(() => {
    if (!hints || !strength) return null
    const strong = strength === 'strong' || strength === 'monster'
    const decent = strong || strength === 'decent'
    if (toCall === 0) return strong && aggressive ? aggressive.type : 'check'
    return decent ? 'call' : 'fold'
  }, [hints, strength, toCall, aggressive])

  const hintClass = (t: ActionType) => (hinted === t ? 'hinted' : '')

  return (
    <ActionRow>
      {noLimit && aggressive && (
        <div className="bet-slider-row">
          <button className="preset" onClick={() => setAmount(aggressive.min ?? 0)}>Min</button>
          <button
            className="preset"
            onClick={() => setAmount(clampTo(aggressive, toCall + Math.round(pot / 2)))}
          >
            ½ Pot
          </button>
          <button className="preset" onClick={() => setAmount(clampTo(aggressive, toCall + pot))}>
            Pot
          </button>
          <input
            type="range"
            min={aggressive.min ?? 0}
            max={aggressive.max ?? 0}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <span className="bet-amount">{amount}</span>
        </div>
      )}
      <div className="action-row">
        <button className={`btn btn-fold ${hintClass('fold')}`} onClick={() => heroAction('fold')}>
          Fold
        </button>
        {check && (
          <button className={`btn btn-check ${hintClass('check')}`} onClick={() => heroAction('check')}>
            Check
          </button>
        )}
        {call && (
          <button className={`btn btn-call ${hintClass('call')}`} onClick={() => heroAction('call')}>
            Call {toCall}
          </button>
        )}
        {bet && (
          <button
            className={`btn btn-bet ${hintClass('bet')}`}
            onClick={() => heroAction('bet', noLimit ? amount : bet.min)}
          >
            Bet {noLimit ? amount : bet.min}
          </button>
        )}
        {raise && (
          <button
            className={`btn btn-raise ${hintClass('raise')}`}
            onClick={() => heroAction('raise', noLimit ? amount : raise.min)}
          >
            Raise to {noLimit ? amount : raise.min}
          </button>
        )}
        {noLimit && aggressive && (
          <button className="btn btn-allin" onClick={() => heroAction('all-in')}>
            All in
          </button>
        )}
      </div>
    </ActionRow>
  )
}

function clampTo(spec: LegalAction, value: number): number {
  return Math.max(spec.min ?? 0, Math.min(spec.max ?? value, value))
}
