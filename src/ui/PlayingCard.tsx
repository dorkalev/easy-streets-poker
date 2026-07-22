import { motion } from 'motion/react'
import type { Card } from '../engine/types'
import { rankShort, suitSymbol, cardId } from '../engine/deck'

interface Props {
  card?: Card // undefined = face-down
  size?: 'small' | 'normal' | 'big'
  highlighted?: boolean
  dim?: boolean
  stoplight?: 'green' | 'yellow' | 'red' | null
  dealDelay?: number
}

export function PlayingCard({ card, size = 'normal', highlighted, dim, stoplight, dealDelay = 0 }: Props) {
  const faceUp = card !== undefined
  const red = card ? card.suit === 'h' || card.suit === 'd' : false
  const classes = [
    'card',
    size === 'small' ? 'small' : size === 'big' ? 'big' : '',
    highlighted ? 'highlighted' : '',
    dim ? 'dim' : '',
    stoplight ? `stop-${stoplight}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.div
      className={classes}
      layout
      initial={{ y: -30, opacity: 0, rotateY: 180, scale: 0.7 }}
      animate={{ y: 0, opacity: 1, rotateY: faceUp ? 0 : 180, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, delay: dealDelay }}
      key={card ? cardId(card) : 'back'}
    >
      <div className={`card-face card-front ${red ? 'red' : ''}`}>
        {card && (
          <>
            <div className="card-corner">
              {rankShort(card.rank)}
              <span className="suit">{suitSymbol(card.suit)}</span>
            </div>
            <div className="card-pip">{suitSymbol(card.suit)}</div>
          </>
        )}
      </div>
      <div className="card-face card-back-face" />
    </motion.div>
  )
}
