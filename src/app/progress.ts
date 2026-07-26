import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HandCategory } from '../engine/types'

export interface LevelResult {
  stars: number // 0..3
  completed: boolean
  bestProfit: number
}

interface ProgressState {
  levels: Record<number, LevelResult>
  /** Hand Codex: categories the hero has made, in any level. */
  codexMade: HandCategory[]
  coachFiredIds: string[]
  soundOn: boolean
  speed: 1 | 1.5 | 2
  recordResult: (levelNumber: number, result: LevelResult) => void
  recordCodex: (category: HandCategory) => void
  setCoachFired: (ids: string[]) => void
  setSoundOn: (on: boolean) => void
  setSpeed: (speed: 1 | 1.5 | 2) => void
  resetAll: () => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      levels: {},
      codexMade: [],
      coachFiredIds: [],
      soundOn: true,
      speed: 1,
      recordResult: (levelNumber, result) => {
        const prev = get().levels[levelNumber]
        set({
          levels: {
            ...get().levels,
            [levelNumber]: {
              stars: Math.max(prev?.stars ?? 0, result.stars),
              completed: (prev?.completed ?? false) || result.completed,
              bestProfit: Math.max(prev?.bestProfit ?? 0, result.bestProfit),
            },
          },
        })
      },
      recordCodex: (category) => {
        if (get().codexMade.includes(category)) return
        set({ codexMade: [...get().codexMade, category] })
      },
      setCoachFired: (ids) => set({ coachFiredIds: ids }),
      setSoundOn: (on) => set({ soundOn: on }),
      setSpeed: (speed) => set({ speed }),
      resetAll: () => set({ levels: {}, codexMade: [], coachFiredIds: [] }),
    }),
    {
      name: 'poker-tutor/v1',
      version: 1,
      // v0 → v1: level 11 was split into 11 + 12, shifting old levels 12–17
      // to 13–18. Remap saved completions so nobody loses progress.
      migrate: (persisted, version) => {
        const state = persisted as Partial<ProgressState>
        if (version === 0 && state.levels) {
          const remapped: Record<number, LevelResult> = {}
          for (const [key, result] of Object.entries(state.levels)) {
            const n = Number(key)
            remapped[n >= 12 ? n + 1 : n] = result
          }
          state.levels = remapped
        }
        return state as ProgressState
      },
    },
  ),
)

export function isLevelUnlocked(levelNumber: number, levels: Record<number, LevelResult>): boolean {
  if (levelNumber === 1) return true
  return levels[levelNumber - 1]?.completed ?? false
}
