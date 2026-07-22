import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGame, heroAction, heroDeclare, heroPredict } from '../app/game'
import { getLevel } from '../levels/levels'
import { L } from '../i18n'
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
  const rival = seats.find((s) => !s.isHero)?.name?.split(' ')[0] ?? '?'

  const acting = seats.find((s) => s.acting && !s.isHero)
  const status = acting
    ? L.actions.thinking(acting.name)
    : heroTurn || declare || predictionOpen
      ? ''
      : L.actions.idle

  return (
    <div className="action-dock">
      <AnimatePresence mode="wait">
        {predictionOpen && (
          <ActionRow key="predict">
            <span className="predict-title">
              {openDuel ? L.predict.titleOpen : L.predict.titleHidden(rival)}
            </span>
            <span className="predict-help">
              {openDuel ? L.predict.helpOpen : L.predict.helpHidden(rival)}
            </span>
            <div className="action-row">
              <button className="btn btn-predict" onClick={() => heroPredict('win')}>{L.predict.myWin}</button>
              <button className="btn btn-predict" onClick={() => heroPredict('split')}>{L.predict.tie}</button>
              <button className="btn btn-predict" onClick={() => heroPredict('lose')}>{L.predict.rivalWins(rival)}</button>
            </div>
          </ActionRow>
        )}

        {declare && (
          <ActionRow key="declare">
            <span className="action-status">{L.actions.declareStatus}</span>
            <div className="action-row">
              <button className="btn btn-stay tip tip-up" data-tip={L.actions.stayTip} onClick={() => heroDeclare('stay')}>
                {L.actions.stay}
              </button>
              <button className="btn btn-fold tip tip-up" data-tip={L.actions.foldDeclareTip} onClick={() => heroDeclare('fold')}>
                {L.actions.foldDeclare}
              </button>
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
          <button className="preset" onClick={() => setAmount(aggressive.min ?? 0)}>{L.actions.min}</button>
          <button className="preset" onClick={() => setAmount(clampTo(aggressive, toCall + Math.round(pot / 2)))}>
            {L.actions.halfPot}
          </button>
          <button className="preset" onClick={() => setAmount(clampTo(aggressive, toCall + pot))}>
            {L.actions.pot}
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
        <button
          className={`btn btn-fold tip tip-up ${hintClass('fold')}`}
          data-tip={L.actions.foldTip}
          onClick={() => heroAction('fold')}
        >
          {L.actions.fold}
        </button>
        {check && (
          <button
            className={`btn btn-check tip tip-up ${hintClass('check')}`}
            data-tip={L.actions.checkTip}
            onClick={() => heroAction('check')}
          >
            {L.actions.check}
          </button>
        )}
        {call && (
          <button
            className={`btn btn-call tip tip-up ${hintClass('call')}`}
            data-tip={L.actions.callTip(toCall)}
            onClick={() => heroAction('call')}
          >
            {L.actions.call(toCall)}
          </button>
        )}
        {bet && (
          <button
            className={`btn btn-bet tip tip-up ${hintClass('bet')}`}
            data-tip={L.actions.betTip}
            onClick={() => heroAction('bet', noLimit ? amount : bet.min)}
          >
            {L.actions.bet(noLimit ? amount : bet.min ?? 0)}
          </button>
        )}
        {raise && (
          <button
            className={`btn btn-raise tip tip-up ${hintClass('raise')}`}
            data-tip={L.actions.raiseTip}
            onClick={() => heroAction('raise', noLimit ? amount : raise.min)}
          >
            {L.actions.raiseTo(noLimit ? amount : raise.min ?? 0)}
          </button>
        )}
        {noLimit && aggressive && (
          <button className="btn btn-allin tip tip-up" data-tip={L.actions.allInTip} onClick={() => heroAction('all-in')}>
            {L.actions.allIn}
          </button>
        )}
      </div>
    </ActionRow>
  )
}

function clampTo(spec: LegalAction, value: number): number {
  return Math.max(spec.min ?? 0, Math.min(spec.max ?? value, value))
}
