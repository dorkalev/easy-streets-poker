// Deterministic, serializable RNG (mulberry32). State is a single uint32 that
// lives inside GameState, so replays and rigged decks stay stable.

export function seedFrom(...parts: number[]): number {
  let h = 0x811c9dc5
  for (const p of parts) {
    h ^= p >>> 0
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Returns [value in [0,1), nextState]. */
export function rngNext(state: number): [number, number] {
  let a = (state + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, a]
}

/** Returns [int in [0, n), nextState]. */
export function rngInt(state: number, n: number): [number, number] {
  const [v, s] = rngNext(state)
  return [Math.floor(v * n), s]
}

/** Fisher–Yates. Returns [shuffled copy, nextState]. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const arr = items.slice()
  let s = state
  for (let i = arr.length - 1; i > 0; i--) {
    let j: number
    ;[j, s] = rngInt(s, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return [arr, s]
}

/** Independent stream derived from a base seed (e.g. per-bot randomness). */
export function forkRng(base: number, streamId: number): number {
  return seedFrom(base, 0x9e3779b9, streamId)
}
