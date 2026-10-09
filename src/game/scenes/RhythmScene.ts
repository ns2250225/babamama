import Phaser from 'phaser'
import { AudioEngine } from '../../audio/AudioEngine'
import { songDurationMs } from '../../data/songs'
import { registerTextures } from '../art/Textures'
import type { GameBridge, GamePhase } from '../GameBridge'
import { AudioClock } from '../systems/AudioClock'
import { ComboSystem } from '../systems/ComboSystem'
import { DialogueSystem, type LineCategory } from '../systems/DialogueSystem'
import { DIFF_WINDOW_SCALE, JudgeSystem, STRICTNESS } from '../systems/JudgeSystem'
import { NoteSpawner, type TrackLayout } from '../systems/NoteSpawner'
import type { HitKind, Judgement } from '../types/Beatmap'
import { Stage } from './Stage'

const COUNTDOWN_SEC = 3
const FONT = '"Arial Black", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'

const JUDGE_STYLE: Record<Judgement, { text: string; color: string; tint: number }> = {
  perfect: { text: 'PERFECT!', color: '#ffd23f', tint: 0xffd23f },
  great: { text: 'GREAT', color: '#6dff8a', tint: 0x6dff8a },
  good: { text: 'GOOD', color: '#6ec6ff', tint: 0x6ec6ff },
  miss: { text: 'MISS', color: '#b0a8c0', tint: 0x9088a0 },
}

interface Particle {
  img: Phaser.GameObjects.Image
  vx: number
  vy: number
  life: number
  max: number
}

export class RhythmScene extends Phaser.Scene {
  private bridge!: GameBridge
  private stage!: Stage
  private clock!: AudioClock
  private judge!: JudgeSystem
  private combo!: ComboSystem
  private dialogue!: DialogueSystem
  private spawner!: NoteSpawner
  private phase: GamePhase = 'countdown'
  private beatMs = 500
  private duration = 0
  private lastNoteEnd = 0
  private trackG!: Phaser.GameObjects.Graphics
  private panelG!: Phaser.GameObjects.Graphics
  private laneFlash!: Phaser.GameObjects.Rectangle
  private judgeFill!: Phaser.GameObjects.Image
  private judgeRing!: Phaser.GameObjects.Image
  private judgeText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private comboLabel!: Phaser.GameObjects.Text
  private bannerText!: Phaser.GameObjects.Text
  private countText!: Phaser.GameObjects.Text
  private rollText!: Phaser.GameObjects.Text
  private particles: Particle[] = []
  private particlePool: Phaser.GameObjects.Image[] = []
  private track!: TrackLayout & { y: number; h: number; laneH: number; panelW: number }
  private lastCount = 99
  private resumeAt = 0
  private lastHudAt = 0
  private lastLayoutAt = 0
  private rollActiveIndex = -1
  private lastRollIndex = -1
  private currentRollHits = 0
  private dpr = 1
  private lastPerf = 0
  private freeBeatOrigin = 0
  private onVisibility = () => {
    if (document.hidden) this.pauseGame()
  }

  constructor() {
    super('RhythmScene')
  }

  create() {
    this.bridge = this.registry.get('bridge') as GameBridge
    const cfg = this.bridge.config
    this.dpr = this.bridge.dpr
    registerTextures(this)
    this.lastCount = 99
    this.rollActiveIndex = -1
    this.lastRollIndex = -1
    this.currentRollHits = 0
    this.particles = []
    this.particlePool = []
    const ctx = AudioEngine.unlock()
    this.clock = new AudioClock(ctx)
    this.clock.audioOffset = cfg.settings.audioOffset
    this.clock.inputOffset = cfg.settings.inputOffset
    this.beatMs = 60000 / cfg.song.bpm
    this.duration = songDurationMs(cfg.song)

    const w = STRICTNESS[cfg.settings.strictness]
    const k = DIFF_WINDOW_SCALE[cfg.difficulty]
    const notes = cfg.free || !cfg.beatmap ? [] : cfg.beatmap.notes.map((n) => ({ ...n, time: n.time + (cfg.beatmap!.offset || 0) }))
    this.judge = new JudgeSystem(notes, { perfect: w.perfect * k, great: w.great * k, good: w.good * k })
    this.lastNoteEnd = notes.reduce((a, n) => Math.max(a, n.time + (n.duration ?? 0)), 0)
    this.combo = new ComboSystem()
    this.dialogue = new DialogueSystem((e) => this.bridge.send('say', e))
    this.dialogue.enabled = cfg.settings.dialogue
    this.dialogue.frequency = cfg.settings.dialogueFreq

    this.stage = new Stage(this, cfg.song.scene)
    this.stage.effects = cfg.settings.effects
    this.stage.animator.freeMode = cfg.free

    this.trackG = this.add.graphics().setDepth(10)
    this.panelG = this.add.graphics().setDepth(25)
    this.laneFlash = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0, 0).setDepth(11)
    this.judgeFill = this.add.image(0, 0, 'judge_fill').setDepth(12)
    this.judgeRing = this.add.image(0, 0, 'judge_ring').setDepth(30)
    this.spawner = new NoteSpawner(this, this.judge.notes)
    const textStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b1126', strokeThickness: Math.max(3, size / 6), align: 'center',
    })
    this.judgeText = this.add.text(0, 0, '', textStyle(24, '#fff')).setOrigin(0.5).setDepth(40).setAlpha(0)
    this.comboLabel = this.add.text(0, 0, cfg.free ? 'HITS' : 'COMBO', textStyle(12, '#ffe9b0')).setOrigin(0.5).setDepth(41)
    this.comboText = this.add.text(0, 0, '0', textStyle(28, '#ffffff')).setOrigin(0.5).setDepth(41)
    this.bannerText = this.add.text(0, 0, '', textStyle(30, '#ffd23f')).setOrigin(0.5).setDepth(42).setAlpha(0)
    this.countText = this.add.text(0, 0, '', textStyle(80, '#ffffff')).setOrigin(0.5).setDepth(50).setAlpha(0)
    this.rollText = this.add.text(0, 0, '', textStyle(18, '#ffcc1a')).setOrigin(0.5).setDepth(41).setAlpha(0)

    this.doLayout()
    this.scale.on('resize', this.doLayout, this)

    this.bridge.on('hit', this.onHit, this)
    this.bridge.on('pause', this.pauseGame, this)
    this.bridge.on('resume', this.resumeGame, this)
    this.bridge.on('restart', this.restartGame, this)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.events.once('shutdown', this.cleanup, this)
    this.events.once('destroy', this.cleanup, this)

    // 开始：倒计时后播放音乐
    AudioEngine.duckMusic(1, 0.01)
    const when = this.clock.startIn(COUNTDOWN_SEC + 0.15)
    AudioEngine.playMusic(cfg.buffer, when, 0)
    this.setPhase('countdown')
    this.dialogue.both(cfg.free ? 'free' : 'start')
    this.lastPerf = performance.now()
    this.freeBeatOrigin = 0
  }

  private cleanup() {
    this.bridge.off('hit', this.onHit, this)
    this.bridge.off('pause', this.pauseGame, this)
    this.bridge.off('resume', this.resumeGame, this)
    this.bridge.off('restart', this.restartGame, this)
    this.scale.off('resize', this.doLayout, this)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.stage?.destroy()
    this.particles = []
    this.particlePool = []
  }

  private setPhase(p: GamePhase) {
    this.phase = p
    this.bridge.send('phase', p)
  }

  // ───────────────── 布局 ─────────────────
  private doLayout() {
    const W = this.scale.width
    const H = this.scale.height
    const charH = Math.round((H * 50) / 72)
    const trackH = H - charH
    this.stage.layout(0, 0, W, charH)
    const laneH = Math.round(trackH * 0.66)
    const panelW = Math.round(Math.min(W * 0.16, trackH * 1.3))
    const noteScale = NoteSpawner.noteScaleFor(laneH)
    const judgeX = panelW + noteScale * 22 * 0.95
    this.track = {
      y: charH, h: trackH, laneH, panelW,
      judgeX, laneY: charH + trackH / 2, leftX: panelW - 30, rightX: W + 40, noteScale,
    }
    this.spawner.setLayout(this.track, this.bridge.config.settings.noteSpeed)
    this.judgeFill.setPosition(judgeX, this.track.laneY).setScale(noteScale)
    this.judgeRing.setPosition(judgeX, this.track.laneY).setScale(noteScale)
    this.laneFlash.setPosition(panelW, this.track.laneY - laneH / 2).setSize(W - panelW, laneH)
    const fs = Math.max(14, Math.round(trackH * 0.3))
    this.comboText.setFontSize(fs).setPosition(panelW / 2, this.track.laneY + fs * 0.25)
    this.comboLabel.setFontSize(Math.max(9, Math.round(fs * 0.38))).setPosition(panelW / 2, this.track.laneY - fs * 0.55)
    this.judgeText.setFontSize(Math.max(14, Math.round(trackH * 0.24)))
    this.bannerText.setFontSize(Math.max(18, Math.round(charH * 0.09))).setPosition(W / 2, charH * 0.16)
    this.countText.setFontSize(Math.max(40, Math.round(charH * 0.35))).setPosition(W / 2, charH * 0.45)
    this.rollText.setFontSize(Math.max(12, Math.round(trackH * 0.2))).setPosition(judgeX, this.track.y + trackH * 0.12)
    this.drawTrack(0)
    this.emitLayout(true)
  }

  private drawTrack(t: number) {
    const g = this.trackG
    const tr = this.track
    const W = this.scale.width
    g.clear()
    // 轨道底板
    g.fillStyle(0x2b1d3a, 1).fillRect(0, tr.y, W, tr.h)
    g.fillStyle(0x1b1126, 1).fillRect(0, tr.y, W, Math.max(2, this.dpr * 2))
    g.fillStyle(0xffd23f, 1).fillRect(0, tr.y + Math.max(2, this.dpr * 2), W, Math.max(1, this.dpr))
    // 音符通道
    const ly = tr.laneY - tr.laneH / 2
    g.fillStyle(0x3a2a4c, 1).fillRect(tr.panelW, ly, W - tr.panelW, tr.laneH)
    g.fillStyle(0x1b1126, 1).fillRect(tr.panelW, ly - 2 * this.dpr, W - tr.panelW, 2 * this.dpr)
    g.fillRect(tr.panelW, ly + tr.laneH, W - tr.panelW, 2 * this.dpr)
    // 节拍线（随音乐滚动）
    const sp = this.spawner.speed
    if (sp > 0) {
      const firstBeat = Math.floor((t - (tr.judgeX - tr.panelW) / sp) / this.beatMs)
      const lastBeat = Math.ceil((t + (W - tr.judgeX) / sp) / this.beatMs)
      for (let b = Math.max(0, firstBeat); b <= lastBeat; b++) {
        const x = tr.judgeX + (b * this.beatMs - t) * sp
        if (x < tr.panelW) continue
        const bar = b % 4 === 0
        g.fillStyle(bar ? 0x6a5590 : 0x4a3a62, 1).fillRect(Math.round(x), ly + 2, bar ? 2 * this.dpr : this.dpr, tr.laneH - 4)
      }
    }
    // 左侧面板（盖住滑过判定点的音符）
    const pg = this.panelG
    pg.clear()
    pg.fillStyle(0x2b1d3a, 1).fillRect(0, ly - 2 * this.dpr, tr.panelW, tr.laneH + 4 * this.dpr)
    pg.fillStyle(0xe8435a, 1).fillRect(0, ly, tr.panelW, tr.laneH)
    pg.fillStyle(0xb82e44, 1).fillRect(tr.panelW - 4 * this.dpr, ly, 4 * this.dpr, tr.laneH)
    pg.fillStyle(0x1b1126, 1).fillRect(tr.panelW, ly - 2 * this.dpr, 2 * this.dpr, tr.laneH + 4 * this.dpr)
  }

  private emitLayout(force = false) {
    const now = performance.now()
    if (!force && now - this.lastLayoutAt < 100) return
    this.lastLayoutAt = now
    const h = this.stage.heads
    const d = this.dpr
    this.bridge.send('layout', {
      mom: { x: h.mom.x / d, y: h.mom.y / d, w: h.mom.w / d },
      dad: { x: h.dad.x / d, y: h.dad.y / d, w: h.dad.w / d },
    })
  }

  // ───────────────── 输入 ─────────────────
  private onHit(kind: HitKind, timeStamp: number) {
    AudioEngine.play(kind)
    this.hitBurst(kind)
    const cfg = this.bridge.config
    if (this.phase !== 'playing' && this.phase !== 'countdown') return
    if (cfg.settings.vibration && navigator.vibrate) navigator.vibrate(12)
    if (cfg.free) {
      if (this.phase !== 'playing') return
      this.combo.hits++
      this.combo.combo++
      this.combo.maxCombo = Math.max(this.combo.maxCombo, this.combo.combo)
      this.combo.score += 10
      this.stage.animator.onFreeHit(kind)
      this.dialogue.trigger('free', 0)
      this.comboText.setText(String(this.combo.hits))
      this.pushHud(true)
      return
    }
    const t = this.clock.inputTime(timeStamp)
    const r = this.judge.hit(kind, t)
    if (!r) return
    if (r.kind === 'note') {
      this.applyJudgement(r.judgement, true)
    } else {
      this.combo.addRoll()
      this.stage.animator.onRoll()
      if (this.lastRollIndex !== r.note.index) {
        this.lastRollIndex = r.note.index
        this.currentRollHits = 0
        this.dialogue.trigger('roll', 1)
      }
      this.currentRollHits++
      this.rollText.setText(`连打 ${this.currentRollHits}`).setAlpha(1).setScale(1.2)
      this.tweens.add({ targets: this.rollText, scale: 1, duration: 80 })
      AudioEngine.play('roll', 0.5, Math.random() * 200)
      this.pushHud(true)
    }
  }

  private applyJudgement(j: Judgement, hit: boolean) {
    const ev = this.combo.add(j)
    const s = { combo: this.combo.combo, perfectStreak: this.combo.perfectStreak, missStreak: this.combo.missStreak }
    this.stage.animator.onJudge(j, s)
    this.showJudge(j, hit)
    const an = this.stage.animator
    // 台词
    if (j === 'miss') {
      if (this.combo.missStreak === 3) this.dialogue.trigger('missStreak', 1)
      else if (this.combo.missStreak === 6) {
        an.startArgue()
        this.dialogue.duet('argue')
      } else this.dialogue.trigger('miss', 0)
    } else {
      this.dialogue.trigger(j as LineCategory, 0)
    }
    if (an.arguing && this.combo.combo >= 10) {
      an.arguing = false
      an.highFive(2)
      this.dialogue.duet('makeup')
    }
    if (ev.broke) {
      an.onComboBreak(ev.broke)
      this.dialogue.trigger('comboBreak', 1)
    }
    if (ev.perfectMilestone) {
      const n = ev.perfectMilestone
      an.onPerfectMilestone(n)
      this.dialogue.trigger(`perfect${n}` as LineCategory, 2)
      if (n === 50) this.time.delayedCall(2600, () => this.dialogue.duet('highfive'))
    }
    if (ev.comboMilestone) {
      const n = ev.comboMilestone
      AudioEngine.play('milestone', 0.8)
      const tag = n === 10 ? '★ 星光闪闪 ★' : n === 30 ? '爸妈同步啦！' : n === 50 ? '观众欢呼！' : n >= 100 ? '高能健身操！' : ''
      this.banner(`${n} COMBO!${tag ? '\n' + tag : ''}`)
      if (n === 30 && !ev.perfectMilestone) this.dialogue.duet('sync')
    }
    this.comboText.setText(String(this.combo.combo))
    if (j !== 'miss') {
      this.comboText.setScale(1.25)
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 120 })
    }
    this.pushHud(true)
  }

  // ───────────────── 特效 ─────────────────
  private effectMul() {
    const e = this.bridge.config.settings.effects
    return e === 'low' ? 0.3 : e === 'mid' ? 0.65 : 1
  }

  private hitBurst(kind: HitKind) {
    const tr = this.track
    const s = tr.noteScale
    const color = kind === 'don' ? 0xff4d4d : 0x4da3ff
    // 冲击波
    const sh = this.add.image(tr.judgeX, tr.laneY, 'shock').setDepth(31).setTint(color).setScale(s * 0.6)
    this.tweens.add({ targets: sh, scale: s * (kind === 'don' ? 1.6 : 1.2), alpha: 0, duration: 260, onComplete: () => sh.destroy() })
    this.laneFlash.setFillStyle(color, 0.25)
    this.tweens.add({ targets: this.laneFlash, fillAlpha: 0, duration: 160 })
    this.judgeRing.setScale(s * 1.12)
    this.tweens.add({ targets: this.judgeRing, scale: s, duration: 90 })
    // 粒子：咚=红色冲击像素，哒=蓝色碎片
    const n = Math.round((kind === 'don' ? 10 : 14) * this.effectMul())
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4
      const v = (kind === 'don' ? 0.25 : 0.4) * (0.6 + Math.random() * 0.6) * this.dpr
      this.spawnParticle(tr.judgeX, tr.laneY, Math.cos(a) * v, Math.sin(a) * v - (kind === 'ka' ? 0.15 : 0), color, kind === 'ka' ? 2 : 1.5, 350)
    }
  }

  private spawnParticle(x: number, y: number, vx: number, vy: number, tint: number, size: number, life: number) {
    const img = this.particlePool.pop() ?? this.add.image(0, 0, 'px')
    img.setVisible(true).setPosition(x, y).setTint(tint).setScale(size * this.dpr * 1.5).setDepth(35).setAlpha(1)
    this.particles.push({ img, vx, vy, life, max: life })
  }

  private showJudge(j: Judgement, hit: boolean) {
    const st = JUDGE_STYLE[j]
    const tr = this.track
    this.judgeText.setText(st.text).setColor(st.color).setPosition(tr.judgeX, tr.y + tr.h * 0.16).setAlpha(1).setScale(1.3)
    this.tweens.killTweensOf(this.judgeText)
    this.tweens.add({ targets: this.judgeText, scale: 1, y: tr.y + tr.h * 0.1, duration: 140 })
    this.tweens.add({ targets: this.judgeText, alpha: 0, delay: 380, duration: 200 })
    if (!hit && j === 'miss') return
    if (j === 'perfect' || j === 'great') {
      const f = this.add.image(tr.judgeX, tr.laneY, 'flash').setTint(st.tint).setDepth(32).setAlpha(j === 'perfect' ? 0.9 : 0.6).setScale(tr.noteScale * 0.7)
      this.tweens.add({ targets: f, alpha: 0, scale: tr.noteScale * 1.1, duration: 200, onComplete: () => f.destroy() })
    }
    if (j === 'perfect') {
      const n = Math.round(8 * this.effectMul())
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        this.spawnParticle(tr.judgeX, tr.laneY, Math.cos(a) * 0.3 * this.dpr, Math.sin(a) * 0.3 * this.dpr - 0.1, 0xffe14d, 1.5, 420)
      }
    }
  }

  private banner(text: string) {
    this.tweens.killTweensOf(this.bannerText)
    this.bannerText.setText(text).setAlpha(1).setScale(0.6)
    this.tweens.add({ targets: this.bannerText, scale: 1, duration: 200, ease: 'Back.Out' })
    this.tweens.add({ targets: this.bannerText, alpha: 0, delay: 1200, duration: 300 })
  }

  private pushHud(force = false) {
    const now = performance.now()
    if (!force && now - this.lastHudAt < 200) return
    this.lastHudAt = now
    const t = this.clock.now()
    this.bridge.send('hud', {
      score: this.combo.score,
      combo: this.bridge.config.free ? this.combo.hits : this.combo.combo,
      progress: Math.max(0, Math.min(1, t / this.duration)),
      hits: this.combo.hits,
      maxCombo: this.combo.maxCombo,
    })
  }

  // ───────────────── 暂停 / 继续 / 重来 ─────────────────
  private pauseGame() {
    if (this.phase !== 'playing' && this.phase !== 'countdown' && this.phase !== 'resuming') return
    if (this.phase !== 'resuming') this.clock.pause()
    AudioEngine.stopMusic()
    this.countText.setAlpha(0)
    this.setPhase('paused')
    this.dialogue.trigger('pause', 1)
  }

  private resumeGame() {
    if (this.phase !== 'paused') return
    this.resumeAt = performance.now() + COUNTDOWN_SEC * 1000
    this.lastCount = 99
    this.setPhase('resuming')
  }

  private finishResume() {
    const pos = this.clock.rawMs()
    const buf = this.bridge.config.buffer
    if (pos < 0) {
      const r = this.clock.resumeAt(pos)
      AudioEngine.playMusic(buf, r.when - pos / 1000, 0)
      this.setPhase('countdown')
    } else {
      // 回退 0 毫秒，精确从暂停处继续
      const r = this.clock.resumeAt(pos)
      AudioEngine.playMusic(buf, r.when, r.offsetSec)
      this.setPhase('playing')
    }
  }

  private restartGame() {
    AudioEngine.stopMusic()
    this.scene.restart()
  }

  private endGame() {
    if (this.phase === 'ended') return
    this.setPhase('ended')
    AudioEngine.stopMusic()
    const cfg = this.bridge.config
    const result = this.combo.result({
      songId: cfg.song.id, title: cfg.song.title, difficulty: cfg.difficulty, free: cfg.free, totalNotes: this.judge.totalHittable,
    })
    AudioEngine.play('fanfare')
    this.bridge.send('result', result)
    this.time.delayedCall(300, () => this.scene.start('ResultScene', { result }))
  }

  // ───────────────── 主循环 ─────────────────
  update(_time: number, _delta: number) {
    const perf = performance.now()
    const dt = Math.min(100, perf - this.lastPerf)
    this.lastPerf = perf
    const cfg = this.bridge.config

    if (this.phase === 'resuming') {
      const left = Math.ceil((this.resumeAt - perf) / 1000)
      if (left !== this.lastCount && left > 0) {
        this.lastCount = left
        this.popCount(String(left))
      }
      if (perf >= this.resumeAt) this.finishResume()
    }

    const t = this.clock.now()
    if (this.phase === 'countdown') {
      const left = Math.ceil(-t / 1000)
      if (left !== this.lastCount && left > 0 && left <= COUNTDOWN_SEC) {
        this.lastCount = left
        this.popCount(String(left))
        AudioEngine.play('count')
      }
      if (t >= 0) {
        this.lastCount = 0
        this.popCount('GO!')
        AudioEngine.play('go')
        this.setPhase('playing')
      }
    }

    const running = this.phase === 'playing' || this.phase === 'countdown'
    if (running && !cfg.free) {
      for (const _n of this.judge.update(t)) this.applyJudgement('miss', false)
      const roll = this.judge.activeRoll(t)
      this.rollActiveIndex = roll && t >= roll.time ? roll.index : -1
      if (this.rollActiveIndex < 0 && this.rollText.alpha > 0 && this.lastRollIndex >= 0) {
        const last = this.judge.notes[this.lastRollIndex]
        if (t > last.time + (last.duration ?? 0) + 300) this.rollText.setAlpha(Math.max(0, this.rollText.alpha - dt / 300))
      }
    }

    // 角色：节拍由音频时钟驱动
    const beat = t / this.beatMs
    const comboForFx = cfg.free ? Math.floor(this.combo.hits / 2) : this.combo.combo
    this.stage.update(beat, perf, this.phase === 'paused' ? 0 : dt, comboForFx)
    this.spawner.update(t, this.rollActiveIndex)
    this.drawTrack(t)

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        p.img.setVisible(false)
        this.particlePool.push(p.img)
        this.particles.splice(i, 1)
        continue
      }
      p.img.x += p.vx * dt
      p.img.y += p.vy * dt
      p.vy += 0.0006 * dt * this.dpr
      p.img.setAlpha(p.life / p.max)
    }

    this.dialogue.tick(this.phase === 'paused' ? 0 : dt, this.phase === 'playing', this.combo.accuracy() >= 70 || this.combo.judgedCount < 5)
    this.pushHud()
    this.emitLayout()

    if (this.phase === 'playing') {
      const end = cfg.free ? this.duration : Math.max(this.lastNoteEnd + 1500, this.duration)
      if (t > end + 300 && (cfg.free || this.judge.finished)) this.endGame()
    }
  }

  private popCount(s: string) {
    this.tweens.killTweensOf(this.countText)
    this.countText.setText(s).setAlpha(1).setScale(1.4)
    this.tweens.add({ targets: this.countText, scale: 1, duration: 250, ease: 'Back.Out' })
    this.tweens.add({ targets: this.countText, alpha: 0, delay: 600, duration: 250 })
  }
}
