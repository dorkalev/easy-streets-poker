import { AnimatePresence, motion } from 'motion/react'
import { L } from '../i18n'

interface Dep {
  name: string
  license: string
  href: string
}

const DEPS: Dep[] = [
  { name: 'React · React DOM', license: 'MIT', href: 'https://github.com/facebook/react/blob/main/LICENSE' },
  { name: 'Zustand', license: 'MIT', href: 'https://github.com/pmndrs/zustand/blob/main/LICENSE' },
  { name: 'Motion', license: 'MIT', href: 'https://github.com/motiondivision/motion/blob/main/LICENSE.md' },
]

const FONTS = 'Fraunces · Nunito · Frank Ruhl Libre · Assistant · Amiri · Cairo'

export function CreditsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay-dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="credits"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <h2 className="credits-title">{L.credits.title}</h2>
            <p className="credits-mit">{L.credits.mit}</p>

            <div className="credits-by">
              {L.credits.builtBy}{' '}
              <a href="https://dorkalev.com" target="_blank" rel="noopener noreferrer">Dor Kalev</a>
            </div>

            <div className="credits-section">
              <div className="credits-label">{L.credits.builtWith}</div>
              <ul className="credits-list">
                {DEPS.map((d) => (
                  <li key={d.name}>
                    <a href={d.href} target="_blank" rel="noopener noreferrer">{d.name}</a>
                    <span className="credits-lic">{d.license}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="credits-section">
              <div className="credits-label">{L.credits.fonts}</div>
              <div className="credits-fonts">
                <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer">{FONTS}</a>
              </div>
            </div>

            <p className="credits-original">{L.credits.original}</p>

            <button className="btn-secondary credits-close" onClick={onClose}>
              {L.credits.close}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
