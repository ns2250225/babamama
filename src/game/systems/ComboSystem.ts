import type { GameResult, Judgement, Rank } from '../types/Beatmap'

export const BASE_SCORE: Record<Judgement, number> = { perfect: 1000, great: 700, good: 400, miss: 0 }
export const ROLL_SCORE = 100
export const MILESTONES = [10, 30, 50, 100]

export interface ComboEvent {
  comboMilestone?: number
  perfectMilestone?: number
  broke?: number
}

/** 连击、计分与统计 */
export class ComboSystem {
  score = 0
  rollScore = 0
  combo = 0
  maxCombo = 0
  perfectStreak = 0
  missStreak = 0
  rollHits = 0
  hits = 0
  counts: Record<Judgement, number> = { perfect: 0, great: 0, good: 0, miss: 0 }

  add(j: Judgement): ComboEvent {
    const ev: ComboEvent = {}
    this.counts[j]++
    if (j === 'miss') {
      if (this.combo >= 10) ev.broke = this.combo
      this.combo = 0
      this.perfectStreak = 0
      this.missStreak++
      return ev
    }
    this.hits++
    this.missStreak = 0
    this.combo++
    if (this.combo > this.maxCombo) this.maxCombo = this.combo
    // 连击加成：每 10 连击 +5%，最多 +50%
    const bonus = 1 + Math.min(10, Math.floor(this.combo / 10)) * 0.05
    this.score += Math.round(BASE_SCORE[j] * bonus)
    if (j === 'perfect') {
      this.perfectStreak++
      if (MILESTONES.includes(this.perfectStreak)) ev.perfectMilestone = this.perfectStreak
    } else {
      this.perfectStreak = 0
    }
    if (MILESTONES.includes(this.combo) || (this.combo > 100 && this.combo % 50 === 0)) ev.comboMilestone = this.combo
    return ev
  }

  addRoll() {
    this.rollHits++
    this.hits++
    this.rollScore += ROLL_SCORE
    this.score += ROLL_SCORE
  }

  get judgedCount() {
    const c = this.counts
    return c.perfect + c.great + c.good + c.miss
  }

  accuracy(): number {
    const c = this.counts
    const n = this.judgedCount
    if (!n) return 0
    return (c.perfect * 100 + c.great * 70 + c.good * 40) / n
  }

  static rank(acc: number, missRate: number): Rank {
    if (acc >= 95 && missRate <= 0.02) return 'S'
    if (acc >= 85) return 'A'
    if (acc >= 72) return 'B'
    if (acc >= 55) return 'C'
    return 'D'
  }

  result(meta: { songId: string; title: string; difficulty: GameResult['difficulty']; free: boolean; totalNotes: number }): GameResult {
    const acc = this.accuracy()
    const c = this.counts
    const total = meta.totalNotes || 1
    return {
      ...meta,
      score: this.score,
      accuracy: Math.round(acc * 100) / 100,
      perfect: c.perfect,
      great: c.great,
      good: c.good,
      miss: c.miss,
      maxCombo: this.maxCombo,
      rollHits: this.rollHits,
      rank: ComboSystem.rank(acc, c.miss / total),
      fullCombo: meta.totalNotes > 0 && c.miss === 0 && this.judgedCount === meta.totalNotes,
      allPerfect: meta.totalNotes > 0 && c.perfect === meta.totalNotes,
      hits: this.hits,
    }
  }
}
