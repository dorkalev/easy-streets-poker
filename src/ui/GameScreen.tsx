import { Fragment, useState } from 'react'
import { useGame, startLevel, enterPlayMode, exitPlayMode } from '../app/game'
import { useProgress, isLevelUnlocked } from '../app/progress'
import { getLevel, LEVELS } from '../levels/levels'
import { HAND_CATEGORY_ORDER } from '../engine/types'
import { sfx, setSoundEnabled } from '../app/sfx'
import { L, nextLocale, setLocale } from '../i18n'
import { Table } from './Table'
import { ActionBar } from './ActionBar'
import { CreditsModal, GITHUB_URL } from './CreditsModal'
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

/** The linear journey strip: all 18 levels, always visible on top. */
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
          ? L.progress.nodeTip(n, level.title, level.newRules[0], stars, isCurrent)
          : L.progress.lockedTip(n, level.title)
        return (
          <Fragment key={n}>
            {firstOfAct && (
              <span className="act-tick tip tip-down" data-tip={L.progress.actTip(level.act, level.actName)}>
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

function SettingsCluster({ onCredits }: { onCredits: () => void }) {
  const progress = useProgress()
  const playMode = useGame((g) => g.playMode)
  const [codexOpen, setCodexOpen] = useState(false)

  return (
    <div className="settings-cluster">
      <button
        className="mini-btn mode-btn tip tip-down"
        data-tip={playMode ? L.mode.learnTip : L.mode.playTip}
        onClick={() => (playMode ? exitPlayMode() : enterPlayMode())}
      >
        {playMode ? '🎓' : '🎲'}
        <span className="mode-label">{playMode ? L.mode.learn : L.mode.play}</span>
      </button>
      <button
        className="mini-btn tip tip-down"
        data-tip={L.intro.reopenTip}
        onClick={() => progress.setSeenIntro(false)}
      >
        ?
      </button>
      <button className="mini-btn tip tip-down" data-tip={L.credits.tip} onClick={onCredits}>
        ⓘ
      </button>
      <button className="mini-btn tip tip-down" data-tip={L.settings.codexTip} onClick={() => setCodexOpen((o) => !o)}>
        📖
      </button>
      <button
        className="mini-btn tip tip-down"
        data-tip={progress.soundOn ? L.settings.soundOnTip : L.settings.soundOffTip}
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
        data-tip={L.settings.speedTip(progress.speed)}
        onClick={() => {
          progress.setSpeed(progress.speed === 1 ? 1.5 : progress.speed === 1.5 ? 2 : 1)
          sfx.click()
        }}
      >
        ⏩<span className="mini-tag">×{progress.speed}</span>
      </button>
      <button
        className="mini-btn lang-btn tip tip-down"
        data-tip={L.settings.langTip}
        onClick={() => setLocale(nextLocale())}
      >
        {L.settings.langLabel}
      </button>
      <button
        className="mini-btn tip tip-down"
        data-tip={L.settings.resetTip}
        onClick={() => {
          if (confirm(L.settings.resetConfirm)) {
            progress.resetAll()
            startLevel(1)
          }
        }}
      >
        ♻︎
      </button>
      {codexOpen && (
        <div className="codex-pop">
          <h3>{L.settings.codexTitle}</h3>
          <div className="codex-row">
            {HAND_CATEGORY_ORDER.map((cat) => (
              <span key={cat} className={`codex-slot ${progress.codexMade.includes(cat) ? 'made' : ''}`}>
                {progress.codexMade.includes(cat) ? '✓ ' : '? '}
                {L.hands.categories[cat]}
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
  const playMode = useGame((g) => g.playMode)
  const [creditsOpen, setCreditsOpen] = useState(false)
  if (!levelNumber) return null
  const level = getLevel(levelNumber)
  const hero = seats.find((s) => s.isHero)

  const w = level.winCondition
  const goal =
    w.type === 'predictions' ? L.hud.goal.predictions(run.predictionsCorrect, w.target)
    : w.type === 'hands-won' ? L.hud.goal.handsWon(run.handsWon, w.target)
    : w.type === 'chips' ? L.hud.goal.chips(w.target)
    : w.type === 'profit' ? L.hud.goal.profit(w.afterHands)
    : L.hud.goal.tournament()

  const goalTip =
    w.type === 'predictions' ? L.hud.goalTip.predictions(w.target, run.predictionsCorrect, level.handsToComplete)
    : w.type === 'hands-won' ? L.hud.goalTip.handsWon(w.target, run.handsWon, level.handsToComplete)
    : w.type === 'chips' ? L.hud.goalTip.chips(w.target, level.rules.startingStack)
    : w.type === 'profit' ? L.hud.goalTip.profit(w.afterHands, level.rules.startingStack)
    : L.hud.goalTip.tournament()

  return (
    <div className="game">
      <header className="topbar">
        <div className="brand tip tip-down" data-tip={L.hud.levelTip(Math.max(1, handNumber), blinds)}>
          <div className="brand-kicker">{L.brand.kicker}</div>
          <div className="brand-title">{level.title}</div>
          <div className="brand-meta">{L.hud.meta(level.levelNumber, Math.max(1, handNumber), blinds)}</div>
        </div>
        {!playMode && (
          <div className="journey">
            <ProgressPane />
          </div>
        )}
        {playMode && <div className="journey" />}
        <SettingsCluster onCredits={() => setCreditsOpen(true)} />
      </header>

      {!playMode && (
        <div className="subhud">
          <div className="hud-pill tip tip-down" data-tip={goalTip}>
            🎯 {goal}
          </div>
          <div className="hud-pill quest tip tip-down" data-tip={L.hud.questTip(level.quest.label)}>
            ⭐ {level.quest.label}: <b>{Math.min(run.questProgress, run.questTarget)}/{run.questTarget}</b>
          </div>
          {hero && level.rules.startingStack > 0 && (
            <div className="hud-pill tip tip-down" data-tip={L.hud.stackTip(level.rules.startingStack)}>
              🪙 <b>{hero.stack}</b>
            </div>
          )}
        </div>
      )}

      <Table />
      <ActionBar />

      <footer className="site-footer">
        <span className="fbrand">EASY STREETS</span>
        <span className="fsep">·</span>
        <span className="fby">
          {L.credits.footBy}{' '}
          <a href="https://dorkalev.com" target="_blank" rel="noopener noreferrer">Dor Kalev</a>
        </span>
        <span className="fsep">·</span>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">{L.credits.github}</a>
        <span className="fsep">·</span>
        <button className="flink" onClick={() => setCreditsOpen(true)}>
          {L.credits.footLink}
        </button>
      </footer>

      <StrengthMeter />
      <RankRibbon />
      <StreetBanner />
      <PredictToast />
      <Celebration />
      <CoachBubble />
      <NewRuleBanner />
      <LevelEndModal />
      <CreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </div>
  )
}
