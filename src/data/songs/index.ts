import type { Beatmap, Difficulty, SongMeta } from '../../game/types/Beatmap'
import songsJson from './songs.json'

export const SONGS = songsJson as unknown as SongMeta[]

const charts = import.meta.glob('./*.*.json', { eager: true, import: 'default' }) as Record<string, Beatmap>

export function getSong(id: string): SongMeta | undefined {
  return SONGS.find((s) => s.id === id)
}

export function getBeatmap(id: string, diff: Difficulty): Beatmap {
  const chart = charts[`./${id}.${diff}.json`]
  if (!chart) throw new Error(`谱面不存在: ${id}.${diff}`)
  return chart
}

/** 歌曲总时长（毫秒） */
export function songDurationMs(song: SongMeta): number {
  const bars = song.sections.reduce((a, s) => a + s[1], 0)
  return (bars * 4 * 60000) / song.bpm
}
