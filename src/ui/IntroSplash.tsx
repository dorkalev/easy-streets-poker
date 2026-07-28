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

// The climb, shown purely in cards: a lone high card growing hand-by-hand up
// to a royal flush. No emoji, no labels — just the ascent.
const HANDS: string[][] = [
  ['A♠'],
  ['9♥', '9♦'],
  ['Q♠', 'Q♥', 'Q♦'],
  ['J♠', 'J♥', 'J♦', 'J♣'],
  ['10♠', 'J♠', 'Q♠', 'K♠', 'A♠'],
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

        <div className="splash-climb" role="img" aria-label={L.intro.steps.join(' → ')}>
          {HANDS.map((cards, i) => (
            <div key={i} className="climb-hand" style={{ ['--i' as string]: i }}>
              {cards.map((c, j) => (
                <MiniCard key={j} label={c} />
              ))}
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
