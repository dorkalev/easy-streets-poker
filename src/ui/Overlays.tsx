import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  useGame,
  dismissNewRule,
  dismissCoach,
  retryLevel,
  startLevel,
} from '../app/game'
import { getLevel, LEVELS } from '../levels/levels'
import { RANKS, rankShort } from '../engine/deck'
import { L } from '../i18n'
import type { StrengthLabel } from '../engine/strength'

// ---------------------------------------------------------------------------
// NEW RULE banner — the minimum-viable indication of what was just added
// ---------------------------------------------------------------------------

export function NewRuleBanner() {
  const open = useGame((g) => g.newRuleOpen)
  const levelNumber = useGame((g) => g.levelNumber)
  const level = levelNumber ? getLevel(levelNumber) : null

  return (
    <AnimatePresence>
      {open && level && (
        <motion.div className="overlay-dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="newrule"
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <div className="newrule-tag">
              {level.levelNumber === 17 ? L.newRule.finalTag : L.newRule.tag(level.newRules.length)}
            </div>
            <h2>{level.title}</h2>
            <div className="sub">{L.newRule.levelOf(level.levelNumber, level.actName)}</div>
            <ul>
              {level.newRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="intro">{L.newRule.penny(level.intro)}</div>
            <button className="btn-play" onClick={dismissNewRule}>
              {L.newRule.dealMeIn}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Penny the coach
// ---------------------------------------------------------------------------

export function CoachBubble() {
  const coach = useGame((g) => g.coach)
  return (
    <AnimatePresence>
      {coach && (
        <motion.div
          className="coach"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
        >
          <div className="coach-avatar">🎠</div>
          <div className="coach-card">
            <div className="coach-name">{L.coach.name}</div>
            {coach.text}
            {coach.blocking && (
              <div>
                <button className="coach-btn" onClick={dismissCoach}>
                  {L.coach.gotIt}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Street banner + prediction toast + celebration
// ---------------------------------------------------------------------------

export function StreetBanner() {
  const banner = useGame((g) => g.streetBanner)
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          className="street-banner"
          initial={{ opacity: 0, scale: 2.2, x: '-50%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: -30, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        >
          {banner}!
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function PredictToast() {
  const result = useGame((g) => g.predictionResult)
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          className="predict-toast"
          initial={{ opacity: 0, scale: 0.6, x: '-50%', y: '-50%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          exit={{ opacity: 0, scale: 0.85, x: '-50%', y: '-70%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        >
          <div className={`big ${result.correct ? 'good' : 'bad'}`}>
            {result.correct ? L.predict.calledIt : L.predict.notQuite}
          </div>
          <div className="why strong">{result.line}</div>
          <div className="why">
            {L.predict.why(L.predict.words[result.guess], L.predict.words[result.actual])}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const CONFETTI_COLORS = ['#f2c14e', '#d9a441', '#c1442e', '#4da375', '#f7f1e1', '#5b93bd']

export function Celebration() {
  const celebration = useGame((g) => g.celebration)
  const pieces = useMemo(
    () =>
      Array.from({ length: celebration === 'small' ? 26 : 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.4 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      })),
    [celebration],
  )
  if (!celebration) return null
  const word = L.celebration[celebration]
  return (
    <div className="celebration">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
      <motion.div
        className="celebrate-word"
        initial={{ scale: 0.3, opacity: 0, x: '-50%' }}
        animate={{ scale: 1, opacity: 1, x: '-50%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        {word}
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Level end
// ---------------------------------------------------------------------------

export function LevelEndModal() {
  const end = useGame((g) => g.levelEnd)
  const levelNumber = useGame((g) => g.levelNumber)
  const hasNext = levelNumber !== null && levelNumber < LEVELS.length

  return (
    <AnimatePresence>
      {end && (
        <motion.div className="overlay-dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="level-end"
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <h2>{end.outcome === 'won' ? L.levelEnd.won : L.levelEnd.lost}</h2>
            <div className="lvl-sub">{end.title}</div>
            <div className="stars-row">
              {[1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className={i <= end.stars ? 'star-on' : 'star-off'}
                  initial={{ scale: 0, rotate: -60 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.35 * i, type: 'spring', stiffness: 400, damping: 14 }}
                >
                  ★
                </motion.span>
              ))}
            </div>
            {end.profit !== 0 && (
              <div className="result-line">
                {end.profit > 0 ? L.levelEnd.profit(end.profit) : L.levelEnd.down(-end.profit)}
              </div>
            )}
            <div className={`result-line ${end.questDone ? 'quest-done' : 'quest-miss'}`}>
              {end.questDone ? L.levelEnd.questDone : L.levelEnd.questMiss}
            </div>
            <div className="btn-row">
              <button className="btn-secondary" onClick={retryLevel}>
                {end.outcome === 'won' ? L.levelEnd.replay : L.levelEnd.tryAgain}
              </button>
              {end.outcome === 'won' && hasNext && (
                <button className="btn-play" onClick={() => startLevel(levelNumber! + 1)}>
                  {L.levelEnd.next}
                </button>
              )}
              {end.outcome === 'won' && !hasNext && (
                <button className="btn-play" onClick={() => startLevel(levelNumber!)}>
                  {L.levelEnd.champion}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Scaffolds: strength meter + rank ribbon
// ---------------------------------------------------------------------------

const METER_POS: Record<StrengthLabel, number> = {
  trash: 8,
  weak: 28,
  decent: 50,
  strong: 74,
  monster: 93,
}

const METER_EMOJI: Record<StrengthLabel, string> = {
  trash: '🐟',
  weak: '🐠',
  decent: '🐬',
  strong: '🦈',
  monster: '🐉',
}

export function StrengthMeter() {
  const strength = useGame((g) => g.heroStrength)
  const levelNumber = useGame((g) => g.levelNumber)
  const level = levelNumber ? getLevel(levelNumber) : null
  if (!level?.ui.showHandStrengthMeter || !strength) return null
  return (
    <div className="strength-meter tip tip-up" data-tip={L.meter.tip}>
      <div className="label">
        <span>{L.meter.title}</span>
      </div>
      <div className="meter-track">
        <span className="meter-marker" style={{ left: `${METER_POS[strength]}%` }}>
          {METER_EMOJI[strength]}
        </span>
      </div>
      <div className="meter-word">{L.meter.words[strength]}</div>
    </div>
  )
}

export function RankRibbon() {
  const levelNumber = useGame((g) => g.levelNumber)
  const seats = useGame((g) => g.seats)
  const community = useGame((g) => g.community)
  const level = levelNumber ? getLevel(levelNumber) : null
  if (!level?.ui.showRankRibbon) return null

  const lit = new Set<number>()
  for (const seat of seats) {
    if (seat.isHero || seat.revealed) for (const c of seat.cards) lit.add(c.rank)
  }
  for (const c of community) lit.add(c.rank)

  return (
    <div className="rank-ribbon tip tip-left" data-tip={L.ribbon.tip}>
      <div className="ribbon-head">{L.ribbon.high}</div>
      {[...RANKS].reverse().map((r) => (
        <div key={r} className={`ribbon-rank ${lit.has(r) ? 'lit' : ''}`}>
          {rankShort(r)}
        </div>
      ))}
      <div className="ribbon-head">{L.ribbon.low}</div>
    </div>
  )
}
