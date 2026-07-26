import { useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import { useGame, startLevel } from './app/game'
import { useProgress } from './app/progress'
import { LEVELS } from './levels/levels'
import { GameScreen } from './ui/GameScreen'
import { IntroSplash } from './ui/IntroSplash'

export default function App() {
  const levelNumber = useGame((g) => g.levelNumber)
  const seenIntro = useProgress((s) => s.seenIntro)

  // Linear flow: boot straight into the first level not yet completed.
  useEffect(() => {
    if (levelNumber !== null) return
    const done = useProgress.getState().levels
    const first = LEVELS.find((l) => !done[l.levelNumber]?.completed)?.levelNumber ?? LEVELS.length
    startLevel(first)
  }, [levelNumber])

  return (
    <div className="app">
      {levelNumber !== null && <GameScreen />}
      <AnimatePresence>{!seenIntro && <IntroSplash />}</AnimatePresence>
      <div className="vignette" />
    </div>
  )
}
