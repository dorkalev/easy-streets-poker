import { useGame, goToMap } from '../app/game'
import { getLevel } from '../levels/levels'
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

  return (
    <div className="game">
      <div className="hud">
        <button className="hud-back" onClick={goToMap} title="Back to the map">
          ←
        </button>
        <div className="hud-level">
          <span className="t">{level.title}</span>
          <span className="s">
            Level {level.levelNumber} · Hand {Math.max(1, handNumber)}
            {blinds ? ` · Blinds ${blinds.small}/${blinds.big}` : ''}
          </span>
        </div>
        <div className="hud-spacer" />
        <div className="hud-pill">🎯 {goal}</div>
        <div className="hud-pill quest">
          ⭐ {level.quest.label}: <b>{Math.min(run.questProgress, run.questTarget)}/{run.questTarget}</b>
        </div>
        {hero && level.rules.startingStack > 0 && (
          <div className="hud-pill">
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
