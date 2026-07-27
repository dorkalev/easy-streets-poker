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

export const GITHUB_URL = 'https://github.com/dorkalev/easy-streets-poker'

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

            <a className="credits-source" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <span className="gh-mark" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
              </span>
              {L.credits.source}
            </a>

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
