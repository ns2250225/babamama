import Phaser from 'phaser'
import { PixelCanvas, hex } from './PixelCanvas'
import { buildCharacterSheet, type SpriteTf } from './CharacterArt'

/** 在 Phaser 中注册所有程序化纹理（只生成一次） */

const OUT = hex('#1b1126')
const WHITE = hex('#ffffff')

export const NOTE_PX = 22 // 音符逻辑像素尺寸

export const characterTransforms: Record<'mom' | 'dad', Record<string, Required<SpriteTf>[]>> = { mom: {}, dad: {} }

function add(scene: Phaser.Scene, key: string, pc: PixelCanvas) {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  scene.textures.addCanvas(key, pc.toCanvas())
}

export function registerTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('mom')) {
    for (const who of ['mom', 'dad'] as const) {
      const sheet = buildCharacterSheet(who)
      const tex = scene.textures.addCanvas(who, sheet.canvas)!
      for (const f of sheet.frames) tex.add(f.name, 0, f.x, f.y, 48, 64)
      characterTransforms[who] = sheet.transforms
    }
  }
  if (scene.textures.exists('note_don')) return

  const N = NOTE_PX
  const c = N / 2
  // 咚：红色圆形
  let pc = new PixelCanvas(N, N)
  pc.disc(c - 0.5, c - 0.5, c - 1, WHITE)
  pc.disc(c - 0.5, c - 0.5, c - 3, hex('#e8403f'))
  pc.disc(c - 3, c - 3.5, 2, hex('#ff8a7a'))
  pc.rect(c - 6, c + 3, 2, 1, hex('#b02a2a'))
  pc.outline(OUT)
  add(scene, 'note_don', pc)
  // 大号咚（判定框内显示的高光版本）
  // 哒：蓝色正方形
  pc = new PixelCanvas(N, N)
  pc.rect(1, 1, N - 2, N - 2, WHITE)
  pc.rect(3, 3, N - 6, N - 6, hex('#3a86e8'))
  pc.rect(5, 5, 4, 2, hex('#8cc4ff'))
  pc.rect(5, 7, 2, 2, hex('#8cc4ff'))
  pc.rect(N - 7, N - 6, 3, 1, hex('#1f5cb3'))
  pc.outline(OUT)
  add(scene, 'note_ka', pc)
  // 连打头/尾/身
  pc = new PixelCanvas(N, N)
  pc.disc(c - 0.5, c - 0.5, c - 1, WHITE)
  pc.disc(c - 0.5, c - 0.5, c - 3, hex('#ffcc1a'))
  pc.disc(c - 3, c - 3.5, 2, hex('#fff2a0'))
  pc.outline(OUT)
  add(scene, 'roll_head', pc)
  pc = new PixelCanvas(4, N)
  pc.rect(0, 3, 4, N - 6, WHITE)
  pc.rect(0, 5, 4, N - 10, hex('#ffcc1a'))
  pc.rect(0, 6, 4, 2, hex('#fff2a0'))
  for (let x = 0; x < 4; x++) {
    pc.set(x, 2, OUT)
    pc.set(x, N - 3, OUT)
  }
  add(scene, 'roll_body', pc)
  pc = new PixelCanvas(N / 2, N)
  pc.disc(-0.5, c - 0.5, c - 4, WHITE)
  pc.disc(-0.5, c - 0.5, c - 6, hex('#ffcc1a'))
  pc.outline(OUT)
  add(scene, 'roll_tail', pc)

  // 判定圈
  pc = new PixelCanvas(N + 6, N + 6)
  pc.ring((N + 6) / 2 - 0.5, (N + 6) / 2 - 0.5, c + 2, 2, hex('#fff4d6'))
  pc.ring((N + 6) / 2 - 0.5, (N + 6) / 2 - 0.5, c - 3, 1, hex('#bfa98a'))
  add(scene, 'judge_ring', pc)
  pc = new PixelCanvas(N + 6, N + 6)
  pc.disc((N + 6) / 2 - 0.5, (N + 6) / 2 - 0.5, c + 1, hex('#3a2a4c'))
  add(scene, 'judge_fill', pc)

  // 冲击波环
  pc = new PixelCanvas(32, 32)
  pc.ring(15.5, 15.5, 15, 2, WHITE)
  add(scene, 'shock', pc)
  // 实心光圈
  pc = new PixelCanvas(32, 32)
  pc.disc(15.5, 15.5, 15, WHITE)
  add(scene, 'flash', pc)
  // 粒子
  pc = new PixelCanvas(2, 2)
  pc.rect(0, 0, 2, 2, WHITE)
  add(scene, 'px', pc)
  // 星星
  pc = new PixelCanvas(7, 7)
  const Y = hex('#ffe14d')
  pc.rect(3, 0, 1, 7, Y)
  pc.rect(0, 3, 7, 1, Y)
  pc.rect(2, 2, 3, 3, Y)
  pc.set(3, 3, WHITE)
  add(scene, 'star', pc)
  // 光环
  pc = new PixelCanvas(48, 48)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    for (let rr = 12; rr < 23; rr++) if (rr % 2 === 0) pc.set(23.5 + Math.cos(a) * rr, 23.5 + Math.sin(a) * rr, hex('#ffe14d', 200))
  }
  add(scene, 'aura', pc)
  // 彩纸
  pc = new PixelCanvas(3, 2)
  pc.rect(0, 0, 3, 2, WHITE)
  add(scene, 'confetti', pc)

  // 观众（2 帧：放下手/举手）×4 种配色
  const shirts = ['#ff9f1c', '#4caf50', '#a66cff', '#ff5c7a', '#29b6f6', '#ffd23f']
  const hairs = ['#26202e', '#5b3423', '#9e9e9e', '#c77d2e']
  for (let v = 0; v < 6; v++) {
    for (let f = 0; f < 2; f++) {
      pc = new PixelCanvas(14, 20)
      const skin = hex(v % 2 ? '#f6c29b' : '#ffd2b0')
      const shirt = hex(shirts[v])
      pc.rect(4, 12, 6, 7, shirt)
      pc.rect(4, 18, 2, 2, hex('#3c3f5c'))
      pc.rect(8, 18, 2, 2, hex('#3c3f5c'))
      pc.disc(6.5, 8, 3.2, skin)
      pc.rect(4, 4, 6, 2, hex(hairs[v % 4]))
      pc.set(5, 8, hex('#2b1d2e'))
      pc.set(8, 8, hex('#2b1d2e'))
      pc.rect(6, 10, 2, 1, hex('#b0303a'))
      if (f === 0) {
        pc.rect(2, 12, 2, 5, shirt)
        pc.rect(10, 12, 2, 5, shirt)
      } else {
        pc.rect(2, 6, 2, 7, shirt)
        pc.rect(10, 6, 2, 7, shirt)
        pc.rect(2, 4, 2, 2, skin)
        pc.rect(10, 4, 2, 2, skin)
      }
      pc.outline(OUT)
      add(scene, `fan${v}_${f}`, pc)
    }
  }
}
