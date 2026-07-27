import { useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import { useGame, startLevel, startPlay, enterPlayMode, exitPlayMode, firstUnclearedLevel } from './app/game'
import { useProgress } from './app/progress'
import { GameScreen } from './ui/GameScreen'
import { IntroSplash } from './ui/IntroSplash'

const isPlayPath = () => typeof window !== 'undefined' && /^\/play\/?$/i.test(window.location.pathname)

export default function App() {
  const levelNumber = useGame((g) => g.levelNumber)
  const seenIntro = useProgress((s) => s.seenIntro)

  useEffect(() => {
    if (levelNumber !== null) return
    if (isPlayPath()) startPlay()
    else startLevel(firstUnclearedLevel())
  }, [levelNumber])

  // Keep mode in sync with the browser's back/forward navigation.
  useEffect(() => {
    const onPop = () => (isPlayPath() ? enterPlayMode() : exitPlayMode())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="app">
      {levelNumber !== null && <GameScreen />}
      <AnimatePresence>{!isPlayPath() && !seenIntro && <IntroSplash />}</AnimatePresence>
      <div className="vignette" />
    </div>
  )
}
