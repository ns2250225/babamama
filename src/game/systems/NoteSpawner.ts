import Phaser from 'phaser'
import { NOTE_PX } from '../art/Textures'
import type { RuntimeNote } from '../types/Beatmap'

export interface TrackLayout {
  judgeX: number
  laneY: number
  leftX: number
  rightX: number
  noteScale: number
}

/**
 * 音符渲染：按音频时钟计算每个音符的横坐标（x = 判定点 + (音符时间 - 当前时间) × 速度），
 * 使用对象池复用精灵，只绘制屏幕内的音符。
 */
export class NoteSpawner {
  private scene: Phaser.Scene
  private notes: RuntimeNote[]
  private pool: Phaser.GameObjects.Image[] = []
  private rollParts: { head: Phaser.GameObjects.Image; body: Phaser.GameObjects.Image; tail: Phaser.GameObjects.Image }[] = []
  private first = 0
  layout!: TrackLayout
  /** 像素/毫秒 */
  speed = 0.5
  depth = 20

  constructor(scene: Phaser.Scene, notes: RuntimeNote[]) {
    this.scene = scene
    this.notes = notes
  }

  setLayout(l: TrackLayout, speedMul: number) {
    this.layout = l
    // 基础速度：音符约 1.6 秒穿过轨道（倍率 1.0）
    const span = l.rightX - l.judgeX
    this.speed = (span / 1600) * speedMul
  }

  private img(i: number): Phaser.GameObjects.Image {
    let o = this.pool[i]
    if (!o) {
      o = this.scene.add.image(0, 0, 'note_don')
      this.pool.push(o)
    }
    return o
  }

  private roll(i: number) {
    let r = this.rollParts[i]
    if (!r) {
      r = {
        body: this.scene.add.image(0, 0, 'roll_body').setOrigin(0, 0.5),
        tail: this.scene.add.image(0, 0, 'roll_tail').setOrigin(0, 0.5),
        head: this.scene.add.image(0, 0, 'roll_head'),
      }
      this.rollParts.push(r)
    }
    return r
  }

  update(t: number, activeRollIndex: number) {
    const l = this.layout
    const sp = this.speed
    const tMin = t - (l.judgeX - l.leftX) / sp - 100
    const tMax = t + (l.rightX - l.judgeX) / sp + 100
    while (this.first < this.notes.length) {
      const n = this.notes[this.first]
      if ((n.time + (n.duration ?? 0)) < tMin) this.first++
      else break
    }
    let used = 0
    let rolls = 0
    const s = l.noteScale
    const len = this.notes.length
    for (let i = this.first; i < len; i++) {
      const n = this.notes[i]
      if (n.time > tMax) break
      const x = l.judgeX + (n.time - t) * sp
      const depth = this.depth + (1 - i / len) * 0.9
      if (n.type === 'roll') {
        const end = l.judgeX + (n.time + (n.duration ?? 0) - t) * sp
        if (end < l.leftX) continue
        const r = this.roll(rolls++)
        const hx = Math.max(x, n.index === activeRollIndex ? l.judgeX : x)
        r.head.setVisible(true).setPosition(hx, l.laneY).setScale(s).setDepth(depth + 0.002)
        r.body.setVisible(true).setPosition(hx, l.laneY).setDepth(depth).setScale(Math.max(0, end - hx) / 4, s)
        r.tail.setVisible(true).setPosition(end, l.laneY).setScale(s).setDepth(depth + 0.001)
        const pulse = n.index === activeRollIndex ? 1 + 0.08 * Math.sin(t / 30) : 1
        r.head.setScale(s * pulse)
        continue
      }
      // 已击中的音符消失；MISS 的音符半透明继续滑过
      if (n.judged && n.result !== 'miss') continue
      const o = this.img(used++)
      o.setTexture(n.type === 'don' ? 'note_don' : 'note_ka')
      o.setVisible(true).setPosition(x, l.laneY).setScale(s).setDepth(depth).setAlpha(n.judged ? 0.4 : 1)
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i].setVisible(false)
    for (let i = rolls; i < this.rollParts.length; i++) {
      const r = this.rollParts[i]
      r.head.setVisible(false)
      r.body.setVisible(false)
      r.tail.setVisible(false)
    }
  }

  static noteScaleFor(laneH: number) {
    return Math.max(1, (laneH * 0.86) / NOTE_PX)
  }
}
