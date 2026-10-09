import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Difficulty, GameResult } from '../game/types/Beatmap'

export const useSession = defineStore('session', () => {
  const songId = ref<string | null>(null)
  const difficulty = ref<Difficulty>('easy')
  const free = ref(false)
  const lastResult = ref<GameResult | null>(null)
  const newBest = ref(false)

  function select(id: string, diff: Difficulty, isFree: boolean) {
    songId.value = id
    difficulty.value = diff
    free.value = isFree
  }
  return { songId, difficulty, free, lastResult, newBest, select }
})
