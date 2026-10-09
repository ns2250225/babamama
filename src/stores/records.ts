import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SONGS } from '../data/songs'
import type { Difficulty, GameResult, Rank } from '../game/types/Beatmap'
import { dbClear, dbGetAll, dbPut } from '../utils/db'

export interface SongRecord {
  id: string // songId:difficulty
  songId: string
  difficulty: Difficulty
  bestScore: number
  bestCombo: number
  bestAccuracy: number
  bestRank: Rank
  plays: number
  cleared: boolean
  fullCombo: boolean
  allPerfect: boolean
  lastPlayed: number
}

const RANK_ORDER: Rank[] = ['D', 'C', 'B', 'A', 'S']
/** C 及以上视为通关，解锁下一首 */
const CLEAR_RANKS: Rank[] = ['C', 'B', 'A', 'S']

export const useRecords = defineStore('records', () => {
  const map = ref<Record<string, SongRecord>>({})
  const loaded = ref(false)

  async function load() {
    const all = await dbGetAll<SongRecord>()
    const m: Record<string, SongRecord> = {}
    for (const r of all) m[r.id] = r
    map.value = m
    loaded.value = true
  }

  function get(songId: string, diff: Difficulty): SongRecord | undefined {
    return map.value[`${songId}:${diff}`]
  }

  /** 保存成绩，返回是否刷新最高分 */
  async function save(r: GameResult): Promise<boolean> {
    if (r.free) return false
    const id = `${r.songId}:${r.difficulty}`
    const old = map.value[id]
    const cleared = CLEAR_RANKS.includes(r.rank)
    const rec: SongRecord = {
      id,
      songId: r.songId,
      difficulty: r.difficulty,
      bestScore: Math.max(old?.bestScore ?? 0, r.score),
      bestCombo: Math.max(old?.bestCombo ?? 0, r.maxCombo),
      bestAccuracy: Math.max(old?.bestAccuracy ?? 0, r.accuracy),
      bestRank: old && RANK_ORDER.indexOf(old.bestRank) > RANK_ORDER.indexOf(r.rank) ? old.bestRank : r.rank,
      plays: (old?.plays ?? 0) + 1,
      cleared: (old?.cleared ?? false) || cleared,
      fullCombo: (old?.fullCombo ?? false) || r.fullCombo,
      allPerfect: (old?.allPerfect ?? false) || r.allPerfect,
      lastPlayed: Date.now(),
    }
    map.value = { ...map.value, [id]: rec }
    await dbPut(JSON.parse(JSON.stringify(rec)))
    return !old || r.score > old.bestScore
  }

  function songCleared(songId: string) {
    return (['easy', 'normal', 'hard'] as Difficulty[]).some((d) => map.value[`${songId}:${d}`]?.cleared)
  }

  /** 前两首默认解锁，之后需通关上一首 */
  const unlocked = computed(() => {
    const res: Record<string, boolean> = {}
    SONGS.forEach((s, i) => {
      res[s.id] = i < 2 || songCleared(SONGS[i - 1].id)
    })
    return res
  })

  async function clearAll() {
    await dbClear()
    map.value = {}
  }

  return { map, loaded, load, get, save, unlocked, clearAll }
})
