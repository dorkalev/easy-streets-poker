import { Fragment, useState } from 'react'
import { useGame, startLevel } from '../app/game'
import { useProgress, isLevelUnlocked } from '../app/progress'
import { getLevel, LEVELS } from '../levels/levels'
import { CATEGORY_LABELS } from '../engine/describe'
import { HAND_CATEGORY_ORDER } from '../engine/types'
import { sfx, setSoundEnabled } from '../app/sfx'
import { Table } from './Table'
import { ActionBar } from './ActionBar'
import {
  NewRuleBanner,
  CoachBubble,
  StreetBanner,
  PredictToast,
  Celebration,
  LevelEndModal,
  StrengthMeter,
  RankRibbon,
} from './Overlays'

/** The linear journey strip: all 17 levels, always visible on top. */
function ProgressPane() {
  const progress = useProgress()
  const current = useGame((g) => g.levelNumber)

  return (
    <div className="progress-pane">
      {LEVELS.map((level) => {
        const n = level.levelNumber
        const result = progress.levels[n]
        const unlocked = isLevelUnlocked(n, progress.levels)
        const isCurrent = n === current
        const stars = result?.stars ?? 0
        const firstOfAct = LEVELS.find((l) => l.act === level.act)?.levelNumber === n
        const tip = unlocked
          ? `LEVEL ${n}: ${level.title} — ${level.newRules[0]}${stars ? ` (${'★'.repeat(stars)})` : ''}${isCurrent ? ' · You are here!' : ' · Click to play'}`
          : `LEVEL ${n}: ${level.title} — locked. Finish level ${n - 1} to open it.`
        return (
          <Fragment key={n}>
            {firstOfAct && (
              <span className="act-tick tip tip-down" data-tip={`Act ${level.act} — ${level.actName}`}>
                {level.act === 1 ? '♠' : level.act === 2 ? '♥' : level.act === 3 ? '♦' : level.act === 4 ? '♣' : '★'}
              </span>
            )}
            <button
              className={[
                'lnode',
                result?.completed ? 'done' : '',
                isCurrent ? 'current' : '',
                unlocked ? '' : 'locked',
              ]
                .filter(Boolean)
                .join(' ')}
              data-tip={tip}
              onClick={() => {
                if (!unlocked || isCurrent) return
                sfx.click()
                startLevel(n)
              }}
            >
              <span className="lnode-num">{result?.completed && !isCurrent ? '✓' : n}</span>
              {stars > 0 && <span className="lnode-stars">{'★'.repeat(stars)}</span>}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}

function SettingsCluster() {
  const progress = useProgress()
  const [codexOpen, setCodexOpen] = useState(false)

  return (
    <div className="settings-cluster">
      <button
        className="mini-btn tip tip-down"
        data-tip="THE HAND CODEX: every poker hand you've ever made lights up here. Fill all nine!"
        onClick={() => setCodexOpen((o) => !o)}
      >
        📖
      </button>
      <button
        className="mini-btn tip tip-down"
        data-tip={progress.soundOn ? 'Sound is ON — click to mute.' : 'Sound is OFF — click to unmute.'}
        onClick={() => {
          const on = !progress.soundOn
          progress.setSoundOn(on)
          setSoundEnabled(on)
          if (on) sfx.click()
        }}
      >
        {progress.soundOn ? '🔊' : '🔇'}
      </button>
      <button
        className="mini-btn tip tip-down"
        data-tip={`Game speed ×${progress.speed} — click to cycle (×1 → ×1.5 → ×2). Speeds up dealing and bot thinking.`}
        onClick={() => {
          progress.setSpeed(progress.speed === 1 ? 1.5 : progress.speed === 1.5 ? 2 : 1)
          sfx.click()
        }}
      >
        ⏩<span className="mini-tag">×{progress.speed}</span>
      </button>
      <button
        className="mini-btn tip tip-down"
        data-tip="Reset ALL progress and start the school from scratch."
        onClick={() => {
          if (confirm('Reset ALL progress?')) {
            progress.resetAll()
            startLevel(1)
          }
        }}
      >
        ♻︎
      </button>
      {codexOpen && (
        <div className="codex-pop">
          <h3>📖 Hand Codex</h3>
          <div className="codex-row">
            {HAND_CATEGORY_ORDER.map((cat) => (
              <span key={cat} className={`codex-slot ${progress.codexMade.includes(cat) ? 'made' : ''}`}>
                {progress.codexMade.includes(cat) ? '✓ ' : '? '}
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function GameScreen() {
  const levelNumber = useGame((g) => g.levelNumber)
  const run = useGame((g) => g.run)
  const handNumber = useGame((g) => g.handNumber)
  const blinds = useGame((g) => g.blinds)
  const seats = useGame((g) => g.seats)
  if (!levelNumber) return null
  const level = getLevel(levelNumber)
  const hero = seats.find((s) => s.isHero)

  const goal = (() => {
    const w = level.winCondition
    switch (w.type) {
      case 'predictions':
        return `Call ${run.predictionsCorrect}/${w.target} duels`
      case 'hands-won':
        return `Win ${run.handsWon}/${w.target} hands`
      case 'chips':
        return `Reach ${w.target} chips`
      case 'profit':
        return `Finish up after ${w.afterHands} hands`
      case 'tournament':
        return 'Last one standing wins'
    }
  })()

  const goalTip = (() => {
    const w = level.winCondition
    switch (w.type) {
      case 'predictions':
        return `YOUR MISSION: call the result of a duel correctly ${w.target} times — you've got ${run.predictionsCorrect} so far. Wrong guesses cost nothing; you have up to ${level.handsToComplete} duels to get there.`
      case 'hands-won':
        return `YOUR MISSION: win ${w.target} hands (you've won ${run.handsWon}) within ${level.handsToComplete} deals. A hand is won by having the best cards — or being the last one who didn't fold.`
      case 'chips':
        return `YOUR MISSION: grow your chip pile to ${w.target}. You started with ${level.rules.startingStack}. Win pots to grow it; fold bad hands so it doesn't shrink.`
      case 'profit':
        return `YOUR MISSION: after ${w.afterHands} hands, have MORE chips than the ${level.rules.startingStack} you started with. Folding a bad hand SAVES chips — that counts too.`
      case 'tournament':
        return `THIS IS A TOURNAMENT: lose all your chips and you're out. Knock everyone else out to win. If you bust, you get a free ticket to try again.`
    }
  })()

  const questTip = `BONUS QUEST — worth an extra ★ star: “${level.quest.label}”. Totally optional; the level still completes without it. Stars just show off your mastery.`

  const stackTip = `YOUR CHIPS. You started this level with ${level.rules.startingStack}. Bets are paid from here, and every pot you win lands back in it.`

  const levelTip = `You're on hand ${Math.max(1, handNumber)} of this level.${
    blinds
      ? ` “Blinds ${blinds.small}/${blinds.big}” are forced bets two players must post before every deal — they rotate around the table.`
      : ''
  }`

  return (
    <div className="game">
      <header className="topbar">
        <div className="brand tip tip-down" data-tip={levelTip}>
          <div className="brand-kicker">♠ ♥ The Card Parlor ♦ ♣</div>
          <div className="brand-title">{level.title}</div>
          <div className="brand-meta">
            Level {level.levelNumber} · Hand {Math.max(1, handNumber)}
            {blinds ? ` · Blinds ${blinds.small}/${blinds.big}` : ''}
          </div>
        </div>
        <div className="journey">
          <ProgressPane />
        </div>
        <SettingsCluster />
      </header>

      <div className="subhud">
        <div className="hud-pill tip tip-down" data-tip={goalTip}>
          🎯 {goal}
        </div>
        <div className="hud-pill quest tip tip-down" data-tip={questTip}>
          ⭐ {level.quest.label}: <b>{Math.min(run.questProgress, run.questTarget)}/{run.questTarget}</b>
        </div>
        {hero && level.rules.startingStack > 0 && (
          <div className="hud-pill tip tip-down" data-tip={stackTip}>
            🪙 <b>{hero.stack}</b>
          </div>
        )}
      </div>

      <Table />
      <ActionBar />

      <StrengthMeter />
      <RankRibbon />
      <StreetBanner />
      <PredictToast />
      <Celebration />
      <CoachBubble />
      <NewRuleBanner />
      <LevelEndModal />
    </div>
  )
}
