import { AnimatePresence, motion } from 'motion/react'
import type { SeatView } from '../app/game'
import { useGame } from '../app/game'
import { PlayingCard } from './PlayingCard'
import { cardId } from '../engine/deck'
import { L } from '../i18n'

interface Pos {
  x: number
  y: number
}

const HERO_POS: Pos = { x: 50, y: 88 }
const CENTER: Pos = { x: 50, y: 44 }

// Top-arc y values keep each seat's avatar (which sits on the point, so its
// top half extends ~29px above the anchor) fully inside the felt.
const BOT_LAYOUTS: Record<number, Pos[]> = {
  1: [{ x: 50, y: 16 }],
  2: [{ x: 26, y: 18 }, { x: 74, y: 18 }],
  3: [{ x: 14, y: 38 }, { x: 50, y: 15 }, { x: 86, y: 38 }],
  4: [{ x: 13, y: 46 }, { x: 31, y: 16 }, { x: 69, y: 16 }, { x: 87, y: 46 }],
  5: [{ x: 11, y: 50 }, { x: 24, y: 18 }, { x: 50, y: 14 }, { x: 76, y: 18 }, { x: 89, y: 50 }],
}

function seatPos(seat: SeatView, botCount: number, botIndex: number): Pos {
  if (seat.isHero) return HERO_POS
  return BOT_LAYOUTS[botCount]?.[botIndex] ?? { x: 50, y: 8 }
}

function lerp(a: Pos, b: Pos, t: number): Pos {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function Table() {
  const seats = useGame((g) => g.seats)
  const community = useGame((g) => g.community)
  const pot = useGame((g) => g.pot)
  const carryPot = useGame((g) => g.carryPot)
  const stoplight = useGame((g) => g.stoplight)

  const bots = seats.filter((s) => !s.isHero)

  return (
    <div className="table-wrap">
      <div className="table">
        <div className="table-logo">{L.brand.tableLogo}</div>

        {/* committed chips, floated toward the pot */}
        {seats.map((seat) => {
          if (seat.committed <= 0) return null
          const botIndex = bots.findIndex((b) => b.playerId === seat.playerId)
          const pos = lerp(seatPos(seat, bots.length, botIndex), CENTER, 0.42)
          return (
            <motion.div
              key={`c-${seat.playerId}`}
              className="committed"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              <span className="chip-dot" />
              {seat.committed}
            </motion.div>
          )
        })}

        {/* seats */}
        {seats.map((seat) => {
          const botIndex = bots.findIndex((b) => b.playerId === seat.playerId)
          const pos = seatPos(seat, bots.length, botIndex)
          return (
            <Seat
              key={seat.playerId}
              seat={seat}
              pos={pos}
              // Hero vertical position is media-query-tunable (phones pull the
              // hero inside the felt so cards never hang into the dock).
              topOverride={seat.isHero ? 'var(--hero-y, 85%)' : undefined}
              stoplight={seat.isHero ? stoplight : null}
            />
          )
        })}

        {/* center: community + pot */}
        <div className="center">
          <div className="community">
            <AnimatePresence>
              {community.map((card, i) => (
                <PlayingCard key={cardId(card)} card={card} dealDelay={i * 0.12} />
              ))}
            </AnimatePresence>
          </div>
          <motion.div
            layout
            className={`pot tip tip-up ${pot > 0 ? '' : 'empty'}`}
            data-tip={L.table.potTip}
          >
            {L.table.pot(pot)}
            {carryPot > 0 && <span className="carry-tag">{L.table.carried}</span>}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function Seat({
  seat,
  pos,
  stoplight,
  topOverride,
}: {
  seat: SeatView
  pos: Pos
  stoplight: 'green' | 'yellow' | 'red' | null
  topOverride?: string
}) {
  const classes = [
    'seat',
    seat.isHero ? 'hero' : '',
    seat.status === 'folded' ? 'folded' : '',
    seat.status === 'busted' ? 'busted' : '',
    seat.acting ? 'acting' : '',
    seat.winner ? 'winner' : '',
    seat.tell ? 'telling' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showBack = !seat.isHero && !seat.revealed && seat.cardCount > 0 && seat.status !== 'folded'
  const showFace = (seat.isHero || seat.revealed) && seat.cards.length > 0 && seat.status !== 'folded'

  return (
    <div className={classes} style={{ left: `${pos.x}%`, top: topOverride ?? `${pos.y}%` }}>
      <AnimatePresence>
        {seat.speech && (
          <motion.div
            className="bubble"
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            style={{ transform: 'translateX(-24px)' }}
          >
            {seat.speech.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {seat.lastAction && !seat.speech && (
          <motion.div
            className="seat-action"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {seat.lastAction}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="avatar-wrap">
        <div className="avatar" style={{ ['--seat-color' as string]: seat.color }}>
          {seat.emoji}
        </div>
        {seat.isButton && (
          <div className="dealer-chip tip tip-up" data-tip={L.table.dealerTip}>
            D
          </div>
        )}
      </div>

      <div className="seat-name">{seat.name}</div>
      {seat.stack > 0 || seat.committed > 0 ? (
        <div className="seat-stack">🪙 {seat.stack}</div>
      ) : seat.status === 'busted' ? (
        <div className="seat-stack">💀</div>
      ) : null}

      <div className="seat-cards">
        {showFace &&
          seat.cards.map((card, i) => (
            <PlayingCard
              key={cardId(card)}
              card={card}
              size={seat.isHero ? 'normal' : 'small'}
              highlighted={seat.bestCardIds.includes(cardId(card))}
              dim={seat.bestCardIds.length > 0 && !seat.bestCardIds.includes(cardId(card))}
              stoplight={stoplight}
              dealDelay={i * 0.15}
            />
          ))}
        {showBack &&
          Array.from({ length: seat.cardCount }, (_, i) => (
            <PlayingCard key={`b${i}`} size="small" dealDelay={i * 0.15} />
          ))}
      </div>

      <AnimatePresence>
        {seat.handLabel && (
          <motion.div
            className="seat-hand-label"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
          >
            {seat.handLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
