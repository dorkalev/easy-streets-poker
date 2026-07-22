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
      <div className="hud">
        <button className="hud-back" onClick={goToMap} title="Back to the map">
          ←
        </button>
        <div className="hud-level tip tip-down" data-tip={levelTip}>
          <span className="t">{level.title}</span>
          <span className="s">
            Level {level.levelNumber} · Hand {Math.max(1, handNumber)}
            {blinds ? ` · Blinds ${blinds.small}/${blinds.big}` : ''}
          </span>
        </div>
        <div className="hud-spacer" />
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
