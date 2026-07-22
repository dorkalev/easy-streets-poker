import { motion } from 'motion/react'
import { LEVELS } from '../levels/levels'
import { startLevel } from '../app/game'
import { useProgress, isLevelUnlocked } from '../app/progress'
import { CATEGORY_LABELS } from '../engine/describe'
import { HAND_CATEGORY_ORDER } from '../engine/types'
import { sfx, setSoundEnabled } from '../app/sfx'

export function LevelMap() {
  const progress = useProgress()
  const acts = [...new Set(LEVELS.map((l) => l.act))]

  return (
    <div className="map fade-scroll">
      <div className="map-inner">
        <motion.header
          className="map-header"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="map-kicker">♠ ♥ The Card Parlor ♦ ♣</div>
          <h1 className="map-title">
            Poker <em>School</em>
          </h1>
          <p className="map-sub">
            From one card to the Main Event — learn the whole game by playing it.
          </p>
        </motion.header>

        {acts.map((act) => {
          const actLevels = LEVELS.filter((l) => l.act === act)
          return (
            <section key={act}>
              <div className="act">
                <span className="act-num">
                  Act {act} — {actLevels[0].actName}
                </span>
                <span className="act-line" />
              </div>
              <div className="levels-grid">
                {actLevels.map((level, i) => {
                  const unlocked = isLevelUnlocked(level.levelNumber, progress.levels)
                  const result = progress.levels[level.levelNumber]
                  return (
                    <motion.button
                      key={level.levelNumber}
                      className={`level-card ${unlocked ? '' : 'locked'} ${result?.completed ? 'done' : ''}`}
                      onClick={() => {
                        if (!unlocked) return
                        sfx.click()
                        startLevel(level.levelNumber)
                      }}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="level-no">LEVEL {level.levelNumber}</div>
                      <div className="level-name">{level.title}</div>
                      <div className="level-sub">{level.subtitle}</div>
                      <div className="level-newrule">＋ {level.newRules[0]}</div>
                      {unlocked ? (
                        <div className="level-stars">
                          {[1, 2, 3].map((s) => (
                            <span key={s} className={s <= (result?.stars ?? 0) ? 'star-on' : 'star-off'}>
                              ★
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="level-lock">🔒</div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </section>
          )
        })}

        <div className="codex">
          <h3>📖 Hand Codex — every hand you have ever made</h3>
          <div className="codex-row">
            {HAND_CATEGORY_ORDER.map((cat) => (
              <span key={cat} className={`codex-slot ${progress.codexMade.includes(cat) ? 'made' : ''}`}>
                {progress.codexMade.includes(cat) ? '✓ ' : '? '}
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
        </div>

        <div className="map-footer">
          <button
            onClick={() => {
              const on = !progress.soundOn
              progress.setSoundOn(on)
              setSoundEnabled(on)
              if (on) sfx.click()
            }}
          >
            {progress.soundOn ? '🔊 Sound on' : '🔇 Sound off'}
          </button>
          <button
            onClick={() => {
              const next = progress.speed === 1 ? 1.5 : progress.speed === 1.5 ? 2 : 1
              progress.setSpeed(next)
              sfx.click()
            }}
          >
            ⏩ Speed ×{progress.speed}
          </button>
          <button
            onClick={() => {
              if (confirm('Reset ALL progress?')) progress.resetAll()
            }}
          >
            ♻︎ Reset progress
          </button>
        </div>
      </div>
    </div>
  )
}
