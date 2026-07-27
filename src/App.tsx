import { useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import { useGame, startLevel, startPlay } from './app/game'
import { useProgress } from './app/progress'
import { LEVELS } from './levels/levels'
import { GameScreen } from './ui/GameScreen'
import { IntroSplash } from './ui/IntroSplash'

/** /play (any casing, trailing slash ok) launches free-play mode. */
const IS_PLAY = typeof window !== 'undefined' && /^\/play\/?$/i.test(window.location.pathname)

export default function App() {
  const levelNumber = useGame((g) => g.levelNumber)
  const seenIntro = useProgress((s) => s.seenIntro)

  useEffect(() => {
    if (levelNumber !== null) return
    if (IS_PLAY) {
      startPlay()
      return
    }
    // Linear flow: boot into the first level not yet completed.
    const done = useProgress.getState().levels
    const first = LEVELS.find((l) => !done[l.levelNumber]?.completed)?.levelNumber ?? LEVELS.length
    startLevel(first)
  }, [levelNumber])

  return (
    <div className="app">
      {levelNumber !== null && <GameScreen />}
      <AnimatePresence>{!IS_PLAY && !seenIntro && <IntroSplash />}</AnimatePresence>
      <div className="vignette" />
    </div>
  )
}
