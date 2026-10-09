import Phaser from 'phaser'
import { ACTIONS, FRAMES_PER_ACTION } from '../art/CharacterArt'
import { characterTransforms } from '../art/Textures'
import type { HitKind, Judgement } from '../types/Beatmap'

type Who = 'mom' | 'dad'

interface Override {
  action: string
  start: number
  until: number
  face?: number
  approach?: boolean
}

interface CharState {
  sprite: Phaser.GameObjects.Sprite
  routine: string
  routineStart: number
  lag: number
  override: Override | null
  face: number
  dx: number
  lastAction: string
}

export interface PlayState {
  combo: number
  perfectStreak: number
  missStreak: number
}

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

const POOL = {
  perfect: ['raiseHands', 'kick', 'sideRaise', 'kneeUp'],
  great: ['swingArms', 'twist', 'march', 'clap'],
  start: ['march', 'swingArms', 'clap', 'idle'],
  advanced: ['crossStep', 'jumpingJack', 'armCircle', 'hop', 'turn'],
  funny: ['sameSide', 'cramp', 'spin', 'wrongClap', 'panic', 'freeze'],
}

/**
 * 爸妈动画控制器：节拍驱动帧序号，根据击打结果、连击、连打等状态切换动作，
 * 并处理双人互动（同步、互看、击掌、吐槽）。
 */
export class CharacterAnimator {
  private c: Record<Who, CharState>
  private baseX: Record<Who, number> = { mom: 0, dad: 0 }
  private floorY = 0
  private scale = 1
  private lastBar = -1
  private recent: Judgement[] = []
  private lastRollAt = -99999
  private lastFreeHits: number[] = []
  private state: PlayState = { combo: 0, perfectStreak: 0, missStreak: 0 }
  private ending: string | null = null
  private endStart = 0
  private beat = 0
  private now = 0
  arguing = false
  freeMode = false
  speed = 1

  constructor(mom: Phaser.GameObjects.Sprite, dad: Phaser.GameObjects.Sprite) {
    const mk = (s: Phaser.GameObjects.Sprite): CharState => ({ sprite: s, routine: 'idle', routineStart: 0, lag: 0, override: null, face: 1, dx: 0, lastAction: '' })
    this.c = { mom: mk(mom), dad: mk(dad) }
    mom.setOrigin(0.5, 1)
    dad.setOrigin(0.5, 1)
  }

  setLayout(momX: number, dadX: number, floorY: number, scale: number) {
    this.baseX = { mom: momX, dad: dadX }
    this.floorY = floorY
    this.scale = scale
  }

  get headPositions() {
    const h = 64 * this.scale
    return {
      mom: { x: this.c.mom.sprite.x, y: this.floorY - h * 0.78, w: 48 * this.scale },
      dad: { x: this.c.dad.sprite.x, y: this.floorY - h * 0.78, w: 48 * this.scale },
    }
  }

  private quality(): 'perfect' | 'great' | 'good' | 'none' {
    if (!this.recent.length) return 'none'
    const v = this.recent.reduce((a, j) => a + (j === 'perfect' ? 3 : j === 'great' ? 2 : j === 'good' ? 1 : 0), 0) / this.recent.length
    return v >= 2.5 ? 'perfect' : v >= 1.7 ? 'great' : 'good'
  }

  private set(who: Who, action: string, beats: number, opts: Partial<Override> = {}) {
    this.c[who].override = { action, start: this.beat, until: this.beat + beats, ...opts }
  }

  onJudge(j: Judgement, s: PlayState) {
    this.state = s
    this.recent.push(j)
    if (this.recent.length > 8) this.recent.shift()
    if (this.freeMode) return
    if (j === 'miss') {
      if (s.missStreak >= 3) return // 由连续失误的情绪状态接管
      if (Math.random() < 0.4) {
        // 爸爸跳错方向，妈妈转头看爸爸
        this.set('dad', pick(['panic', 'sameSide', 'wrongClap']), 2, { face: -1 })
        this.set('mom', 'lookOver', 2)
      } else {
        this.set('mom', 'facepalm', 2)
        this.set('dad', 'panic', 2)
      }
    } else if (j === 'good') {
      if (!this.c.mom.override) this.set('mom', 'stumble', 2)
      if (!this.c.dad.override) {
        this.set('dad', 'lateSwing', 2)
        this.c.dad.lag = 0.5
      }
    }
  }

  onComboBreak(prev: number) {
    if (prev >= 20 && Math.random() < 0.6) this.set('dad', 'fall', 3.5)
  }

  onRoll() {
    this.lastRollAt = this.now
  }

  onPerfectMilestone(n: number) {
    if (n === 10) {
      if (this.arguing) {
        this.arguing = false
        this.highFive(2)
      } else {
        this.set('mom', 'clap', 2)
        this.set('dad', 'clap', 2)
      }
    } else if (n === 30) {
      this.set('mom', 'syncWave', 2)
      this.set('dad', 'syncWave', 2, { face: -1 })
    } else if (n === 50) {
      this.highFive(2)
    } else if (n >= 100) {
      this.set('mom', 'cheer', 2)
      this.set('dad', 'cheer', 2)
    }
  }

  highFive(beats: number) {
    this.set('mom', 'highFive', beats, { approach: true })
    this.set('dad', 'highFive', beats, { approach: true, face: -1 })
  }

  startArgue() {
    this.arguing = true
  }

  onFreeHit(kind: HitKind) {
    this.lastFreeHits.push(this.now)
    while (this.lastFreeHits.length && this.now - this.lastFreeHits[0] > 1000) this.lastFreeHits.shift()
    if (this.lastFreeHits.length >= 5) {
      this.lastRollAt = this.now
      return
    }
    const pool = kind === 'don' ? ['raiseHands', 'kick', 'jumpingJack', 'clap', 'kneeUp'] : ['sideRaise', 'twist', 'armCircle', 'hop', 'crossStep']
    const a = pick(pool)
    this.set('mom', a, 2)
    this.set('dad', Math.random() < 0.25 ? pick(POOL.funny) : a, 2)
  }

  /** 歌曲结束演出 */
  playEnding(kind: 'high' | 'mid' | 'low' | 'allPerfect') {
    this.ending = kind
    this.endStart = this.beat
    this.c.mom.override = null
    this.c.dad.override = null
  }

  private endingAction(who: Who): { action: string; start: number; face?: number; approach?: boolean } {
    const t = this.beat - this.endStart
    const s = this.endStart
    switch (this.ending) {
      case 'allPerfect':
        if (t < 4) return { action: 'highFive', start: s, face: who === 'dad' ? -1 : 1, approach: true }
        if (t < 8) return { action: 'cheer', start: s + 4 }
        if (t < 12) return { action: 'heart', start: s + 8 }
        return { action: 'bow', start: s + 12 + Math.floor((t - 12) / 6) * 6 }
      case 'high':
      case 'mid':
        if (who === 'mom') return t < 6 ? { action: 'bow', start: s } : t < 10 ? { action: 'clap', start: s + 6 } : { action: 'bow', start: s + 10 + Math.floor((t - 10) / 6) * 6 }
        return t < 4 ? { action: 'wipeSweat', start: s } : { action: 'thumbsUp', start: s + 4 }
      default:
        if (who === 'mom') return t < 4 ? { action: 'shrug', start: s } : { action: 'clap', start: s + 4 }
        return t < 4 ? { action: 'pant', start: s } : { action: 'holdWaist', start: s + 4 }
    }
  }

  private chooseRoutine() {
    const s = this.state
    const q = this.quality()
    let pool: string[]
    if (q === 'none') pool = POOL.start
    else if (q === 'perfect') pool = POOL.perfect
    else if (q === 'great') pool = POOL.great
    else pool = POOL.great
    if (s.combo >= 10) pool = pool.concat(POOL.advanced)
    if (s.combo >= 30) pool = POOL.advanced.concat(POOL.perfect)
    const mom = this.c.mom
    const dad = this.c.dad
    let next = pick(pool)
    if (next === mom.routine) next = pick(pool)
    mom.routine = next
    mom.routineStart = this.lastBar * 4
    if (s.combo >= 30) {
      // 30 COMBO 起两人同步做操
      dad.routine = next
      dad.routineStart = mom.routineStart
      dad.lag = 0
    } else {
      dad.routine = Math.random() < 0.6 ? next : pick(pool)
      dad.routineStart = mom.routineStart
      dad.lag = s.combo >= 10 ? 0.08 : q === 'good' ? 0.4 : 0.2
    }
    if (s.perfectStreak >= 20) {
      mom.routine = 'superAerobic'
      dad.routine = s.combo >= 100 ? 'superAerobic' : 'tryAerobic'
    }
  }

  private resolve(who: Who): { action: string; start: number; face: number; approach: boolean; lag: number } {
    const ch = this.c[who]
    if (this.ending) {
      const e = this.endingAction(who)
      return { action: e.action, start: e.start, face: e.face ?? 1, approach: !!e.approach, lag: 0 }
    }
    if (ch.override && this.beat < ch.override.until) {
      const o = ch.override
      return { action: o.action, start: o.start, face: o.face ?? 1, approach: !!o.approach, lag: 0 }
    }
    ch.override = null
    // 连打中
    if (this.now - this.lastRollAt < 350) {
      return { action: who === 'mom' ? 'rollWave' : 'rollStomp', start: 0, face: 1, approach: false, lag: 0 }
    }
    const s = this.state
    if (!this.freeMode) {
      if (this.arguing || s.missStreak >= 6) {
        // 吐槽状态：互相看对方、动作相反
        const bar = Math.floor(this.beat / 4)
        if (who === 'mom') return { action: bar % 2 ? 'argue' : 'lookOver', start: bar * 4, face: 1, approach: false, lag: 0 }
        const funny = POOL.funny[Math.abs(bar) % POOL.funny.length]
        return { action: bar % 2 ? 'argue' : funny, start: bar * 4, face: -1, approach: false, lag: 0 }
      }
      if (s.missStreak >= 3) {
        return { action: who === 'mom' ? 'handsOnHips' : 'pant', start: 0, face: 1, approach: false, lag: 0 }
      }
    } else if (this.now - (this.lastFreeHits[this.lastFreeHits.length - 1] ?? -99999) > 4000) {
      return { action: 'idle', start: 0, face: 1, approach: false, lag: 0 }
    }
    return { action: ch.routine, start: ch.routineStart, face: 1, approach: false, lag: ch.lag }
  }

  update(beat: number, nowMs: number, dt: number) {
    this.beat = beat
    this.now = nowMs
    const bar = Math.floor(beat / 4)
    if (bar !== this.lastBar) {
      this.lastBar = bar
      if (!this.ending) this.chooseRoutine()
    }
    const gap = this.baseX.dad - this.baseX.mom
    const meet = Math.max(0, (gap - 30 * this.scale) / 2)
    for (const who of ['mom', 'dad'] as Who[]) {
      const ch = this.c[who]
      const r = this.resolve(who)
      const def = ACTIONS[r.action] ?? ACTIONS.idle
      const beats = def.beats * (this.state.combo >= 100 && !this.ending ? 0.75 : 1) / this.speed
      const local = Math.max(0, beat - r.lag - r.start)
      let frame: number
      if (def.loop) frame = Math.floor(((local / beats) % 1) * FRAMES_PER_ACTION)
      else frame = Math.min(FRAMES_PER_ACTION - 1, Math.floor((local / beats) * FRAMES_PER_ACTION))
      frame = Math.max(0, Math.min(FRAMES_PER_ACTION - 1, frame))
      ch.sprite.setFrame(`${r.action}_${frame}`)
      const tf = characterTransforms[who][r.action]?.[frame] ?? { angle: 0, sx: 1, dx: 0, dy: 0 }
      const targetDx = r.approach ? (who === 'mom' ? meet : -meet) : 0
      ch.dx += (targetDx - ch.dx) * Math.min(1, dt * 0.008)
      const face = r.face
      ch.face = face
      ch.sprite.x = Math.round(this.baseX[who] + ch.dx + tf.dx * this.scale * face)
      ch.sprite.y = Math.round(this.floorY + tf.dy * this.scale)
      ch.sprite.setAngle(tf.angle * face)
      ch.sprite.setScale(this.scale * tf.sx * face, this.scale)
      ch.lastAction = r.action
    }
  }

  get currentActions() {
    return { mom: this.c.mom.lastAction, dad: this.c.dad.lastAction }
  }
}
