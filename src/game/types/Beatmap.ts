export type NoteType = 'don' | 'ka' | 'roll'
export type Difficulty = 'easy' | 'normal' | 'hard'
export type Judgement = 'perfect' | 'great' | 'good' | 'miss'
export type HitKind = 'don' | 'ka'
export type SceneKey = 'livingRoom' | 'plaza' | 'plazaNight' | 'disco' | 'field' | 'fieldNight'
export type SectionType = 'intro' | 'verse' | 'chorus' | 'break' | 'outro'

export interface NoteData {
  time: number
  type: NoteType
  duration?: number
}

export interface Beatmap {
  songId: string
  title: string
  bpm: number
  audio: string
  offset: number
  difficulty?: Difficulty
  notes: NoteData[]
}

export interface MusicParams {
  root: number
  mode: 'major' | 'minor' | 'dorian' | 'pentatonic'
  progression: number[]
  drums: string
  bass: string
  lead: number
  arp: boolean
  swing: number
}

export interface SongMeta {
  id: string
  title: string
  desc: string
  bpm: number
  difficulty: Difficulty
  scene: SceneKey
  seed: number
  sections: [SectionType, number][]
  music: MusicParams
}

export interface RuntimeNote extends NoteData {
  index: number
  judged: boolean
  result?: Judgement
  rollHits?: number
}

export interface GameResult {
  songId: string
  title: string
  difficulty: Difficulty
  free: boolean
  score: number
  accuracy: number
  perfect: number
  great: number
  good: number
  miss: number
  maxCombo: number
  rollHits: number
  totalNotes: number
  rank: Rank
  fullCombo: boolean
  allPerfect: boolean
  hits: number
}

export type Rank = 'S' | 'A' | 'B' | 'C' | 'D'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}
