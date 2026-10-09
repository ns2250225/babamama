import Phaser from 'phaser'
import { drawBackground } from '../art/BackgroundArt'
import { CharacterAnimator } from '../systems/CharacterAnimator'
import type { SceneKey } from '../types/Beatmap'

/**
 * 角色舞台：场景背景 + 爸爸妈妈 + 连击演出（星星、观众、光环）。
 * RhythmScene 与 ResultScene 共用。
 */
export class Stage {
  readonly scene: Phaser.Scene
  readonly sceneKey: SceneKey
  bg!: Phaser.GameObjects.Image
  mom: Phaser.GameObjects.Sprite
  dad: Phaser.GameObjects.Sprite
  animator: CharacterAnimator
  private floorFx: Phaser.GameObjects.Graphics
  private stars: Phaser.GameObjects.Image[] = []
  private fans: { img: Phaser.GameObjects.Image; v: number; baseY: number; phase: number }[] = []
  private auras: Phaser.GameObjects.Image[] = []
  private glow: Phaser.GameObjects.Rectangle
  private area = { x: 0, y: 0, w: 1, h: 1 }
  private bgPx = 2
  private floorY = 0
  charScale = 2
  private lastBeatInt = -1
  private starLevel = 0
  private fanLevel = 0
  private auraLevel = 0
  private bgKey: string
  effects: 'low' | 'mid' | 'high' = 'high'

  constructor(scene: Phaser.Scene, sceneKey: SceneKey) {
    this.scene = scene
    this.sceneKey = sceneKey
    this.bgKey = `bg_${sceneKey}_${Math.random().toString(36).slice(2, 7)}`
    this.bg = scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(0)
    this.floorFx = scene.add.graphics().setDepth(1)
    this.glow = scene.add.rectangle(0, 0, 10, 10, 0xffe14d, 0).setOrigin(0, 0).setDepth(1.5)
    for (let i = 0; i < 14; i++) this.stars.push(scene.add.image(0, 0, 'star').setDepth(2).setAlpha(0))
    for (let i = 0; i < 2; i++) this.auras.push(scene.add.image(0, 0, 'aura').setDepth(4).setAlpha(0))
    for (let i = 0; i < 10; i++) {
      const v = i % 6
      this.fans.push({ img: scene.add.image(0, 0, `fan${v}_0`).setOrigin(0.5, 1).setDepth(3).setVisible(false), v, baseY: 0, phase: Math.random() })
    }
    this.mom = scene.add.sprite(0, 0, 'mom', 'idle_0').setDepth(5)
    this.dad = scene.add.sprite(0, 0, 'dad', 'idle_0').setDepth(5)
    this.animator = new CharacterAnimator(this.mom, this.dad)
  }

  /** 设置舞台区域（设备像素），charCenter 为两人中心横坐标比例 */
  layout(x: number, y: number, w: number, h: number, opts: { momX?: number; dadX?: number; floor?: number; scaleH?: number } = {}) {
    this.area = { x, y, w, h }
    const scaleH = opts.scaleH ?? h
    let s = (scaleH * 0.62) / 64
    s = Math.max(1, Math.floor(s * 2) / 2)
    this.charScale = s
    this.bgPx = Math.max(2, Math.round(s))
    const lw = Math.ceil(w / this.bgPx)
    const lh = Math.ceil(h / this.bgPx)
    if (this.scene.textures.exists(this.bgKey)) this.scene.textures.remove(this.bgKey)
    this.scene.textures.addCanvas(this.bgKey, drawBackground(this.sceneKey, lw, lh))
    this.bg.setTexture(this.bgKey).setPosition(x, y).setScale(this.bgPx)
    const floorLogical = Math.round(lh * 0.74)
    this.floorY = y + h * (opts.floor ?? 0.93)
    const momX = x + w * (opts.momX ?? 0.4)
    const dadX = x + w * (opts.dadX ?? 0.6)
    this.animator.setLayout(momX, dadX, this.floorY, s)
    this.glow.setPosition(x, y).setSize(w, h)
    // 星星分布在上半区域
    this.stars.forEach((st, i) => {
      st.setPosition(x + w * ((i * 0.137 + 0.05) % 1), y + h * (0.06 + ((i * 0.31) % 0.4)))
      st.setScale(this.bgPx * (i % 3 === 0 ? 1.4 : 1))
    })
    // 观众站两侧
    this.fans.forEach((f, i) => {
      const left = i % 2 === 0
      const k = Math.floor(i / 2)
      const fx = left ? x + w * (0.04 + k * 0.055) : x + w * (0.96 - k * 0.055)
      f.baseY = y + floorLogical * this.bgPx + (k % 2) * this.bgPx * 3 + this.bgPx * 6
      f.img.setPosition(fx, f.baseY).setScale(s * 0.9).setFlipX(!left)
    })
    this.auras.forEach((a) => a.setScale(s * 1.6))
    this.floorLogical = floorLogical
  }

  private floorLogical = 0

  get heads() {
    return this.animator.headPositions
  }

  /** combo 驱动演出强度 */
  update(beat: number, nowMs: number, dt: number, combo: number) {
    this.animator.update(beat, nowMs, dt)
    const eff = this.effects
    const t = nowMs / 1000
    // 10 COMBO：星星
    this.starLevel += ((combo >= 10 && eff !== 'low' ? 1 : 0) - this.starLevel) * Math.min(1, dt * 0.004)
    this.stars.forEach((st, i) => st.setAlpha(this.starLevel * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7))))
    // 50 COMBO：观众欢呼
    const maxFans = eff === 'low' ? 4 : eff === 'mid' ? 6 : 10
    this.fanLevel += ((combo >= 50 ? 1 : 0) - this.fanLevel) * Math.min(1, dt * 0.005)
    const bi = Math.floor(beat)
    this.fans.forEach((f, i) => {
      f.img.setVisible(this.fanLevel > 0.03 && i < maxFans)
      if (!f.img.visible) return
      const up = (bi + i) % 2 === 0
      f.img.setTexture(`fan${f.v}_${up ? 1 : 0}`)
      const hop = Math.max(0, Math.sin(((beat + f.phase) % 1) * Math.PI)) * this.bgPx * 2
      f.img.y = f.baseY + (1 - this.fanLevel) * 40 * this.bgPx - hop
    })
    // 100 COMBO：高能光环
    this.auraLevel += ((combo >= 100 && eff !== 'low' ? 1 : 0) - this.auraLevel) * Math.min(1, dt * 0.004)
    const heads = this.heads
    this.auras[0].setPosition(heads.mom.x, heads.mom.y + 10 * this.charScale).setAngle(t * 40).setAlpha(this.auraLevel * (0.6 + 0.3 * Math.sin(t * 8)))
    this.auras[1].setPosition(heads.dad.x, heads.dad.y + 10 * this.charScale).setAngle(-t * 40).setAlpha(this.auraLevel * (0.6 + 0.3 * Math.sin(t * 8)))
    this.glow.setFillStyle(0xffe14d, this.auraLevel * 0.08 * (0.5 + 0.5 * Math.sin(beat * Math.PI * 2)))
    // 舞厅地板灯
    if (this.sceneKey === 'disco' && bi !== this.lastBeatInt) {
      this.lastBeatInt = bi
      this.drawDiscoFloor(bi)
    }
  }

  private drawDiscoFloor(bi: number) {
    const g = this.floorFx
    g.clear()
    if (this.effects === 'low') return
    const ts = 8 * this.bgPx
    const top = this.area.y + this.floorLogical * this.bgPx
    const cols = [0xff4fa3, 0x4fd1ff, 0xffe14d, 0x8a6bff, 0x7dff8a]
    const mod = (a: number, n: number) => ((a % n) + n) % n
    let k = 0
    for (let y = top; y < this.area.y + this.area.h; y += ts) {
      for (let x = this.area.x; x < this.area.x + this.area.w; x += ts) {
        k++
        if (mod(k * 7 + bi * 3, 5) > 1) continue
        g.fillStyle(cols[mod(k + bi, cols.length)], 0.55)
        g.fillRect(x + this.bgPx, y + this.bgPx, ts - this.bgPx * 2, ts - this.bgPx * 2)
      }
    }
  }

  destroy() {
    if (this.scene.textures.exists(this.bgKey)) this.scene.textures.remove(this.bgKey)
  }
}
