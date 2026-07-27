import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// A single global tooltip for any element carrying `data-tip`. Unlike a CSS
// ::after tooltip, this measures the bubble and CLAMPS it to the viewport, so
// it can never spill off-screen regardless of where the trigger sits. Disabled
// on touch devices (no real hover there).

interface Pos {
  left: number
  top: number
  arrow: number
  below: boolean
}

export function Tooltip() {
  const [text, setText] = useState<string | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const elRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return
    let timer: ReturnType<typeof setTimeout>

    const show = (t: HTMLElement) => {
      targetRef.current = t
      setPos(null)
      setText(t.getAttribute('data-tip'))
    }
    const hide = () => {
      targetRef.current = null
      setText(null)
      setPos(null)
    }
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement)?.closest?.('[data-tip]') as HTMLElement | null
      if (!t || t === targetRef.current) return
      clearTimeout(timer)
      timer = setTimeout(() => show(t), 120)
    }
    const out = (e: PointerEvent) => {
      const t = (e.target as HTMLElement)?.closest?.('[data-tip]')
      if (t && t === targetRef.current) {
        const rel = e.relatedTarget as HTMLElement | null
        if (rel && (t as HTMLElement).contains(rel)) return
        clearTimeout(timer)
        hide()
      }
    }
    document.addEventListener('pointerover', over, true)
    document.addEventListener('pointerout', out, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerover', over, true)
      document.removeEventListener('pointerout', out, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [])

  useLayoutEffect(() => {
    if (!text || !elRef.current || !targetRef.current) return
    const el = elRef.current
    const tr = targetRef.current.getBoundingClientRect()
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const M = 8 // viewport margin
    const centerX = tr.left + tr.width / 2
    const left = Math.max(M, Math.min(centerX - w / 2, vw - w - M))
    const below = tr.bottom + 9 + h <= vh - M
    const top = below ? tr.bottom + 9 : Math.max(M, tr.top - 9 - h)
    const arrow = Math.max(left + 12, Math.min(centerX, left + w - 12)) - left
    setPos({ left, top, arrow, below })
  }, [text])

  if (!text) return null
  return (
    <div
      ref={elRef}
      className={`jstip ${pos?.below ? 'below' : 'above'}`}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, opacity: pos ? 1 : 0 }}
    >
      {text}
      {pos && <span className="jstip-arrow" style={{ left: pos.arrow }} />}
    </div>
  )
}
