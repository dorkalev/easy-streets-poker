import { motion } from 'motion/react'
import { useProgress } from '../app/progress'
import { enterPlayMode } from '../app/game'
import { L, getLocale, setLocale, type Locale } from '../i18n'
import { sfx } from '../app/sfx'

const LANGS: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'he', label: 'עברית' },
  { code: 'ar', label: 'العربية' },
]

// The climb, shown as a rising staircase of poker stages. Uses mini card
// glyphs and emoji — self-contained, no engine coupling.
interface Stage {
  cards?: string[]
  emoji?: string
}
const STAGES: Stage[] = [
  { cards: ['A♠'] },
  { cards: ['9♥', '9♦'] },
  { cards: ['K♣', '7♦', '2♠'] },
  { emoji: '🪙' },
  { emoji: '🏆' },
]

function MiniCard({ label }: { label: string }) {
  const red = label.includes('♥') || label.includes('♦')
  return <span className={`splash-card ${red ? 'red' : ''}`}>{label}</span>
}

export function IntroSplash() {
  const dismiss = () => {
    sfx.levelUp()
    useProgress.getState().setSeenIntro(true)
  }
  const skipToPlay = () => {
    sfx.click()
    useProgress.getState().setSeenIntro(true)
    enterPlayMode() // straight to full-poker free play (/play)
  }
  const current = getLocale()

  return (
    <motion.div
      className="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="splash-vignette" />
      <motion.div
        className="splash-card-panel"
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <div className="splash-langs">
          {LANGS.map((lng) => (
            <button
              key={lng.code}
              className={`splash-lang ${lng.code === current ? 'active' : ''}`}
              onClick={() => lng.code !== current && setLocale(lng.code)}
            >
              {lng.label}
            </button>
          ))}
        </div>
        <div className="splash-kicker">{L.intro.kicker}</div>
        <h1 className="splash-title">
          {L.brand.tableLogo}
        </h1>
        <div className="splash-headline">{L.intro.title}</div>

        <div className="splash-stairs" role="img" aria-label={L.intro.steps.join(' → ')}>
          {STAGES.map((s, i) => (
            <div key={i} className="stair" style={{ ['--i' as string]: i }}>
              <div className="stair-scene">
                {s.cards
                  ? s.cards.map((c, j) => <MiniCard key={j} label={c} />)
                  : <span className="stair-emoji">{s.emoji}</span>}
              </div>
              <div className="stair-label">{L.intro.steps[i]}</div>
              {i < STAGES.length - 1 && <span className="stair-arrow">→</span>}
            </div>
          ))}
        </div>

        <p className="splash-body">{L.intro.body}</p>

        <button className="btn-play splash-cta" onClick={dismiss}>
          {L.intro.cta}
        </button>

        <div className="splash-skip">
          <span className="splash-skip-q">{L.intro.skipPrompt}</span>
          <button className="splash-skip-btn" onClick={skipToPlay}>
            {L.intro.skipCta}
          </button>
        </div>

        <div className="splash-foot">{L.intro.foot}</div>
      </motion.div>
    </motion.div>
  )
}
