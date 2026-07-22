// Procedural WebAudio sound effects — no audio assets needed, crisp and tiny.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.35
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function tone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; delay?: number; gain?: number; slideTo?: number } = {},
): void {
  if (!enabled) return
  const ac = ensure()
  if (!ac || !master) return
  const t0 = ac.currentTime + (opts.delay ?? 0)
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration)
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(opts.gain ?? 0.5, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  osc.connect(gain).connect(master)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

function noise(duration: number, opts: { delay?: number; gain?: number; freq?: number } = {}): void {
  if (!enabled) return
  const ac = ensure()
  if (!ac || !master) return
  const t0 = ac.currentTime + (opts.delay ?? 0)
  const buffer = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = opts.freq ?? 3000
  filter.Q.value = 1
  const gain = ac.createGain()
  gain.gain.setValueAtTime(opts.gain ?? 0.3, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  src.connect(filter).connect(gain).connect(master)
  src.start(t0)
}

export const sfx = {
  deal(): void {
    noise(0.08, { freq: 5000, gain: 0.25 })
  },
  flip(): void {
    noise(0.06, { freq: 4000, gain: 0.2 })
    tone(660, 0.08, { gain: 0.15, delay: 0.03 })
  },
  chip(): void {
    tone(2200, 0.05, { type: 'triangle', gain: 0.25 })
    tone(2600, 0.05, { type: 'triangle', delay: 0.05, gain: 0.2 })
  },
  chips(): void {
    for (let i = 0; i < 4; i++) tone(2000 + i * 180, 0.05, { type: 'triangle', delay: i * 0.045, gain: 0.18 })
  },
  check(): void {
    noise(0.05, { freq: 900, gain: 0.5 })
    noise(0.05, { freq: 900, gain: 0.4, delay: 0.09 })
  },
  fold(): void {
    noise(0.12, { freq: 2200, gain: 0.18 })
    tone(330, 0.15, { gain: 0.1, slideTo: 220 })
  },
  raise(): void {
    tone(392, 0.1, { type: 'square', gain: 0.12 })
    tone(523, 0.12, { type: 'square', delay: 0.08, gain: 0.12 })
  },
  winSmall(): void {
    tone(523, 0.12, { gain: 0.3 })
    tone(659, 0.12, { delay: 0.1, gain: 0.3 })
    tone(784, 0.2, { delay: 0.2, gain: 0.3 })
  },
  winBig(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319]
    notes.forEach((n, i) => tone(n, 0.16, { delay: i * 0.09, gain: 0.3 }))
    tone(1568, 0.5, { delay: notes.length * 0.09, gain: 0.25 })
  },
  lose(): void {
    tone(330, 0.2, { gain: 0.18, slideTo: 262 })
    tone(262, 0.3, { delay: 0.18, gain: 0.15, slideTo: 196 })
  },
  click(): void {
    tone(880, 0.04, { type: 'triangle', gain: 0.15 })
  },
  pop(): void {
    tone(440, 0.06, { type: 'sine', gain: 0.25, slideTo: 880 })
  },
  whoosh(): void {
    noise(0.25, { freq: 1200, gain: 0.15 })
  },
  allIn(): void {
    tone(196, 0.4, { type: 'sawtooth', gain: 0.12, slideTo: 392 })
    noise(0.35, { freq: 2500, gain: 0.12, delay: 0.05 })
  },
  levelUp(): void {
    const notes = [392, 523, 659, 784]
    notes.forEach((n, i) => tone(n, 0.14, { delay: i * 0.11, gain: 0.3, type: 'triangle' }))
    tone(1047, 0.6, { delay: 0.45, gain: 0.28 })
  },
  newRule(): void {
    tone(659, 0.15, { gain: 0.25 })
    tone(880, 0.25, { delay: 0.12, gain: 0.25 })
  },
}
