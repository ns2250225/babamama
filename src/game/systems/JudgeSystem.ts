import type { HitKind, Judgement, NoteData, RuntimeNote } from '../types/Beatmap'

export interface JudgeWindows {
  perfect: number
  great: number
  good: number
}

export const STRICTNESS: Record<'loose' | 'standard' | 'strict', JudgeWindows> = {
  loose: { perfect: 45, great: 90, good: 140 },
  standard: { perfect: 35, great: 75, good: 120 },
  strict: { perfect: 28, great: 60, good: 100 },
}

export const DIFF_WINDOW_SCALE = { easy: 1.15, normal: 1, hard: 0.92 }

export type HitResult =
  | { kind: 'note'; note: RuntimeNote; judgement: Judgement; delta: number }
  | { kind: 'roll'; note: RuntimeNote }
  | null

/**
 * 节奏判定：红色只能由「咚」判定，蓝色只能由「哒」判定；
 * 黄色连打期间两键均有效，单独计数，不参与 PERFECT/GREAT 判定。
 */
export class JudgeSystem {
  readonly notes: RuntimeNote[]
  readonly hittable: RuntimeNote[]
  readonly rolls: RuntimeNote[]
  private head = 0
  private rollHead = 0
  w: JudgeWindows

  constructor(notes: NoteData[], w: JudgeWindows) {
    this.notes = notes.map((n, i) => ({ ...n, index: i, judged: false, rollHits: 0 }))
    this.hittable = this.notes.filter((n) => n.type !== 'roll')
    this.rolls = this.notes.filter((n) => n.type === 'roll')
    this.w = w
  }

  get totalHittable() {
    return this.hittable.length
  }

  /** 过早按下但仍在此窗口内，判为 MISS（防止乱按） */
  private get badEarly() {
    return this.w.good + 35
  }

  judgeDelta(delta: number): Judgement {
    const a = Math.abs(delta)
    if (a <= this.w.perfect) return 'perfect'
    if (a <= this.w.great) return 'great'
    if (a <= this.w.good) return 'good'
    return 'miss'
  }

  activeRoll(t: number): RuntimeNote | null {
    while (this.rollHead < this.rolls.length && this.rolls[this.rollHead].time + (this.rolls[this.rollHead].duration ?? 0) < t - 40) this.rollHead++
    for (let i = this.rollHead; i < this.rolls.length; i++) {
      const r = this.rolls[i]
      if (r.time - 40 > t) break
      if (t <= r.time + (r.duration ?? 0) + 40) return r
    }
    return null
  }

  hit(kind: HitKind, t: number): HitResult {
    for (let i = this.head; i < this.hittable.length; i++) {
      const n = this.hittable[i]
      if (n.time - t > this.badEarly) break
      if (n.judged || n.type !== kind) continue
      const delta = t - n.time
      if (delta > this.w.good) continue
      const j = delta < -this.w.good ? 'miss' : this.judgeDelta(delta)
      n.judged = true
      n.result = j
      this.advance()
      return { kind: 'note', note: n, judgement: j, delta }
    }
    const roll = this.activeRoll(t)
    if (roll) {
      roll.rollHits = (roll.rollHits ?? 0) + 1
      return { kind: 'roll', note: roll }
    }
    return null
  }

  /** 返回本帧超时未击打的音符（判 MISS） */
  update(t: number): RuntimeNote[] {
    const missed: RuntimeNote[] = []
    for (let i = this.head; i < this.hittable.length; i++) {
      const n = this.hittable[i]
      if (n.time + this.w.good >= t) break
      if (!n.judged) {
        n.judged = true
        n.result = 'miss'
        missed.push(n)
      }
    }
    this.advance()
    return missed
  }

  private advance() {
    while (this.head < this.hittable.length && this.hittable[this.head].judged) this.head++
  }

  get finished() {
    return this.head >= this.hittable.length
  }
}
