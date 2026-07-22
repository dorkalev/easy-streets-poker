import { useGame } from './app/game'
import { LevelMap } from './ui/LevelMap'
import { GameScreen } from './ui/GameScreen'

export default function App() {
  const screen = useGame((g) => g.screen)
  return (
    <div className="app">
      {screen === 'map' ? <LevelMap /> : <GameScreen />}
      <div className="vignette" />
    </div>
  )
}
