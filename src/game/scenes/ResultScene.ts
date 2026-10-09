import Phaser from 'phaser'
import { registerTextures } from '../art/Textures'
import type { GameBridge } from '../GameBridge'
import { DialogueSystem } from '../systems/DialogueSystem'
import { DIFFICULTY_LABEL, type GameResult } from '../types/Beatmap'
import { Stage } from './Stage'

const FONT = '"Arial Black", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
const RANK_COLOR: Record<string, string> = { S: '#ffd23f', A: '#ff7a59', B: '#6dff8a', C: '#6ec6ff', D: '#b0a8c0' }

/** 结算场景：爸妈结算动作与台词 + 成绩面板 */
export class ResultScene extends Phaser.Scene {
  private bridge!: GameBridge
  private stage!: Stage
  private result!: GameResult
  private dialogue!: DialogueSystem
  private panel!: Phaser.GameObjects.Graphics
  private texts: Phaser.GameObjects.Text[] = []
  private rankText!: Phaser.GameObjects.Text
  private startPerf = 0
  private lastPerf = 0
  private confetti: { img: Phaser.GameObjects.Image; vx: number; vy: number; spin: number }[] = []
  private dpr = 1
  private scoreText!: Phaser.GameObjects.Text
  private lastLayoutAt = 0

  constructor() {
    super('ResultScene')
  }

  init(data: { result: GameResult }) {
    this.result = data.result
  }

  create() {
    this.bridge = this.registry.get('bridge') as GameBridge
    this.dpr = this.bridge.dpr
    registerTextures(this)
    const cfg = this.bridge.config
    this.stage = new Stage(this, cfg.song.scene)
    this.stage.effects = cfg.settings.effects
    this.panel = this.add.graphics().setDepth(20)
    this.texts = []
    this.confetti = []
    this.dialogue = new DialogueSystem((e) => this.bridge.send('say', e))
    this.dialogue.enabled = cfg.settings.dialogue

    const r = this.result
    const kind = r.free ? 'high' : r.allPerfect ? 'allPerfect' : r.rank === 'S' || r.rank === 'A' ? 'high' : r.rank === 'B' || r.rank === 'C' ? 'mid' : 'low'
    this.stage.animator.playEnding(kind)
    this.time.delayedCall(500, () => {
      if (r.free) this.dialogue.both('resultHigh')
      else this.dialogue.both(kind === 'allPerfect' ? 'resultAllPerfect' : kind === 'high' ? 'resultHigh' : kind === 'mid' ? 'resultMid' : 'resultLow')
    })
    if (kind === 'allPerfect' || r.rank === 'S') this.spawnConfetti()

    this.buildPanel()
    this.scale.on('resize', this.layout, this)
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this)
      this.stage.destroy()
    })
    this.startPerf = performance.now()
    this.lastPerf = this.startPerf
    this.bridge.send('phase', 'result')
  }

  private buildPanel() {
    const r = this.result
    const st = (color = '#fff4e6'): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: FONT, fontSize: '16px', color, stroke: '#1b1126', strokeThickness: 4 })
    const mk = (s: string, color?: string) => {
      const t = this.add.text(0, 0, s, st(color)).setDepth(21)
      this.texts.push(t)
      return t
    }
    mk(`${r.title}  ·  ${r.free ? '自由演奏' : DIFFICULTY_LABEL[r.difficulty]}`, '#ffe9b0')
    this.scoreText = mk('0', '#ffffff')
    if (r.free) {
      mk(`敲击次数  ${r.hits}`)
      mk(`最高连续  ${r.maxCombo}`)
      mk('自由演奏不计入成绩', '#b0a8c0')
    } else {
      mk(`准确率  ${r.accuracy.toFixed(2)}%`)
      mk(`PERFECT  ${r.perfect}`, '#ffd23f')
      mk(`GREAT  ${r.great}`, '#6dff8a')
      mk(`GOOD  ${r.good}`, '#6ec6ff')
      mk(`MISS  ${r.miss}`, '#b0a8c0')
      mk(`最高 COMBO  ${r.maxCombo}`)
      mk(`黄色连打  ${r.rollHits} 次`, '#ffcc1a')
      if (r.allPerfect) mk('★ 全 PERFECT ★', '#ffd23f')
      else if (r.fullCombo) mk('★ 全连击 FULL COMBO ★', '#ff9f1c')
    }
    this.rankText = this.add.text(0, 0, r.free ? '♪' : r.rank, { fontFamily: FONT, fontSize: '80px', color: RANK_COLOR[r.rank] ?? '#fff', stroke: '#1b1126', strokeThickness: 10 })
      .setOrigin(0.5).setDepth(22).setAlpha(0)
    this.layout()
    this.texts.forEach((t, i) => {
      t.setAlpha(0)
      this.tweens.add({ targets: t, alpha: 1, x: t.x, delay: 150 + i * 90, duration: 200 })
    })
    this.tweens.add({ targets: this.rankText, alpha: 1, scale: { from: 3, to: 1 }, angle: { from: -30, to: -8 }, delay: 300 + this.texts.length * 90, duration: 350, ease: 'Back.Out' })
  }

  private layout() {
    const W = this.scale.width
    const H = this.scale.height
    const charW = Math.round(W * 0.46)
    this.stage.layout(0, 0, W, H, { momX: 0.17, dadX: 0.33, floor: 0.92, scaleH: H * 0.75 })
    const px = charW + W * 0.02
    const pw = W - px - W * 0.03
    const py = H * 0.07
    const ph = H * 0.86
    const g = this.panel
    const u = Math.max(2, Math.round(this.dpr * 3))
    g.clear()
    g.fillStyle(0x1b1126, 0.92).fillRect(px - u, py - u, pw + 2 * u, ph + 2 * u)
    g.fillStyle(0x2b1d3a, 0.95).fillRect(px, py, pw, ph)
    g.fillStyle(0xffd23f, 1).fillRect(px, py, pw, u)
    const lines = this.texts.length
    const lh = Math.min((ph * 0.86) / (lines + 1.2), H * 0.08)
    const fs = Math.max(11, Math.round(lh * 0.62))
    this.texts.forEach((t, i) => {
      const big = i === 1
      t.setFontSize(big ? Math.round(fs * 1.9) : fs)
      t.setStroke('#1b1126', Math.max(3, fs / 4))
      const y = py + ph * 0.06 + (i === 0 ? 0 : i === 1 ? lh * 0.9 : lh * (i + 1.1))
      t.setPosition(px + pw * 0.06, y)
    })
    this.rankText.setFontSize(Math.round(Math.min(pw * 0.32, ph * 0.42))).setPosition(px + pw * 0.78, py + ph * 0.55)
    this.rankText.setStroke('#1b1126', Math.max(6, this.dpr * 6))
  }

  private spawnConfetti() {
    const cols = [0xff4d4d, 0x4da3ff, 0xffd23f, 0x6dff8a, 0xff8fd8]
    for (let i = 0; i < 70; i++) {
      const img = this.add.image(Math.random() * this.scale.width, -Math.random() * this.scale.height * 0.6, 'confetti')
        .setTint(cols[i % cols.length]).setScale(this.dpr * 3).setDepth(15)
      this.confetti.push({ img, vx: (Math.random() - 0.5) * 0.05 * this.dpr, vy: (0.05 + Math.random() * 0.08) * this.dpr, spin: (Math.random() - 0.5) * 0.6 })
    }
  }

  update() {
    const perf = performance.now()
    const dt = Math.min(100, perf - this.lastPerf)
    this.lastPerf = perf
    const bpm = this.bridge.config.song.bpm
    const beat = ((perf - this.startPerf) / 60000) * Math.min(bpm, 120)
    this.stage.update(beat, perf, dt, 0)
    // 分数滚动
    const p = Math.min(1, (perf - this.startPerf - 300) / 1200)
    if (p > 0) this.scoreText.setText(Math.round(this.result.score * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US').padStart(7, '0'))
    for (const c of this.confetti) {
      c.img.x += c.vx * dt
      c.img.y += c.vy * dt
      c.img.angle += c.spin * dt
      if (c.img.y > this.scale.height + 10) c.img.y = -10
    }
    this.dialogue.tick(dt, false, true)
    if (perf - this.lastLayoutAt > 100) {
      this.lastLayoutAt = perf
      const h = this.stage.heads
      const d = this.dpr
      this.bridge.send('layout', { mom: { x: h.mom.x / d, y: h.mom.y / d, w: h.mom.w / d }, dad: { x: h.dad.x / d, y: h.dad.y / d, w: h.dad.w / d } })
    }
  }
}
