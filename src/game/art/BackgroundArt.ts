import { PixelCanvas, hex, type RGBA } from './PixelCanvas'
import type { SceneKey } from '../types/Beatmap'

/** 程序化像素场景背景，按逻辑分辨率 (w,h) 生成，自适应任意屏幕比例 */

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const shade = (c: RGBA, k: number): RGBA => [Math.max(0, Math.min(255, c[0] * k)), Math.max(0, Math.min(255, c[1] * k)), Math.max(0, Math.min(255, c[2] * k)), 255]

function sky(pc: PixelCanvas, h: number, top: RGBA, bottom: RGBA, bands = 6) {
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1)
    const c: RGBA = [top[0] + (bottom[0] - top[0]) * t, top[1] + (bottom[1] - top[1]) * t, top[2] + (bottom[2] - top[2]) * t, 255]
    pc.rect(0, Math.floor((h * i) / bands), pc.w, Math.ceil(h / bands) + 1, c)
  }
}

function cloud(pc: PixelCanvas, x: number, y: number, s: number, c: RGBA) {
  pc.disc(x, y, 3 * s, c)
  pc.disc(x + 4 * s, y - 1 * s, 4 * s, c)
  pc.disc(x + 9 * s, y, 3 * s, c)
  pc.rect(x - 2 * s, y, 13 * s, 3 * s, c)
}

function buildings(pc: PixelCanvas, base: number, r: () => number, night: boolean) {
  let x = -4
  while (x < pc.w) {
    const bw = 14 + Math.floor(r() * 16)
    const bh = 18 + Math.floor(r() * (base * 0.55))
    const col = night ? hex(['#2a2f5a', '#33386a', '#262a50'][Math.floor(r() * 3)]) : hex(['#e9b6a0', '#d8c3a5', '#c9d6df', '#f1d4a8'][Math.floor(r() * 4)])
    pc.rect(x, base - bh, bw, bh, col)
    pc.rect(x, base - bh, bw, 2, shade(col, 0.85))
    for (let wy = base - bh + 4; wy < base - 4; wy += 6)
      for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        const lit = night ? r() < 0.55 : r() < 0.2
        pc.rect(wx, wy, 3, 3, night ? (lit ? hex('#ffe08a') : hex('#1c2040')) : lit ? hex('#ffffff') : hex('#7aa7c7'))
      }
    x += bw + 2
  }
}

function tree(pc: PixelCanvas, x: number, base: number, s: number, dark: boolean) {
  pc.rect(x - 1, base - 10 * s, 3, 10 * s, hex('#7a4b2a'))
  const g = dark ? hex('#2f5d44') : hex('#4caf50')
  pc.disc(x, base - 14 * s, 6 * s, g)
  pc.disc(x - 4 * s, base - 11 * s, 4 * s, shade(g, 0.85))
  pc.disc(x + 4 * s, base - 11 * s, 4 * s, shade(g, 1.1))
}

function lamp(pc: PixelCanvas, x: number, base: number, h: number, on: boolean) {
  pc.rect(x, base - h, 2, h, hex('#3b3b4f'))
  pc.rect(x - 3, base - h - 2, 8, 3, hex('#3b3b4f'))
  pc.rect(x - 2, base - h + 1, 6, 2, on ? hex('#ffe9a0') : hex('#c8c8d0'))
}

function speaker(pc: PixelCanvas, x: number, base: number, s: number) {
  pc.rect(x, base - 16 * s, 11 * s, 16 * s, hex('#26222e'))
  pc.disc(x + 5.5 * s, base - 11 * s, 3 * s, hex('#55506a'))
  pc.disc(x + 5.5 * s, base - 11 * s, 1.5 * s, hex('#1a1722'))
  pc.disc(x + 5.5 * s, base - 4 * s, 2 * s, hex('#55506a'))
}

function crowdStands(pc: PixelCanvas, top: number, bottom: number, r: () => number, night: boolean) {
  pc.rect(0, top, pc.w, bottom - top, night ? hex('#3a3355') : hex('#9aa5b8'))
  for (let y = top + 2; y < bottom - 2; y += 4) {
    pc.rect(0, y + 3, pc.w, 1, night ? hex('#2a2440') : hex('#7c879b'))
    for (let x = 1; x < pc.w; x += 3) {
      if (r() < 0.75) {
        const c = hex(['#e8435a', '#3d7fe0', '#ffd23f', '#4caf50', '#ffffff', '#ff9f1c'][Math.floor(r() * 6)])
        pc.rect(x, y, 2, 2, night ? shade(c, 0.6) : c)
        pc.set(x, y - 1, night ? hex('#a07a64') : hex('#f6c29b'))
      }
    }
  }
}

export function drawBackground(key: SceneKey, w: number, h: number): HTMLCanvasElement {
  const pc = new PixelCanvas(w, h)
  const r = rng(key.length * 977 + 13)
  const floorY = Math.round(h * 0.74)
  switch (key) {
    case 'livingRoom': {
      pc.rect(0, 0, w, floorY, hex('#f6dcae'))
      for (let x = 0; x < w; x += 8) pc.rect(x, 0, 3, floorY, hex('#f0d19c'))
      pc.rect(0, floorY - 4, w, 4, hex('#c98d5a'))
      // 地板
      pc.rect(0, floorY, w, h - floorY, hex('#b8784a'))
      for (let y = floorY + 4; y < h; y += 5) pc.rect(0, y, w, 1, hex('#9e623a'))
      for (let y = floorY; y < h; y += 5) for (let x = ((y / 5) % 2) * 12; x < w; x += 24) pc.rect(x, y, 1, 5, hex('#9e623a'))
      // 窗户
      const wx = Math.round(w * 0.08), wy = Math.round(h * 0.12), ww = Math.round(Math.min(46, w * 0.18)), wh = Math.round(h * 0.4)
      pc.rect(wx - 2, wy - 2, ww + 4, wh + 4, hex('#ffffff'))
      pc.rect(wx, wy, ww, wh, hex('#9bd6ff'))
      pc.disc(wx + ww * 0.7, wy + wh * 0.3, 4, hex('#fff2a8'))
      cloud(pc, wx + 4, wy + wh * 0.65, 1, hex('#ffffff'))
      pc.rect(wx + ww / 2 - 1, wy, 2, wh, hex('#ffffff'))
      pc.rect(wx, wy + wh / 2 - 1, ww, 2, hex('#ffffff'))
      pc.rect(wx - 6, wy - 4, 7, wh + 10, hex('#e8435a'))
      pc.rect(wx + ww - 1, wy - 4, 7, wh + 10, hex('#e8435a'))
      pc.rect(wx - 8, wy - 6, ww + 16, 3, hex('#8a5a3a'))
      // 挂钟
      const cx = Math.round(w * 0.5)
      pc.disc(cx, h * 0.14, 6, hex('#8a5a3a'))
      pc.disc(cx, h * 0.14, 5, hex('#fffaf0'))
      pc.rect(cx, h * 0.14 - 4, 1, 4, hex('#2b1d2e'))
      pc.rect(cx, h * 0.14, 3, 1, hex('#2b1d2e'))
      // 全家福
      const px = Math.round(w * 0.7)
      pc.rect(px, h * 0.1, 22, 16, hex('#8a5a3a'))
      pc.rect(px + 2, h * 0.1 + 2, 18, 12, hex('#bfe7ff'))
      pc.disc(px + 7, h * 0.1 + 8, 2.5, hex('#e8435a'))
      pc.disc(px + 14, h * 0.1 + 8, 2.5, hex('#3d7fe0'))
      // 沙发
      const sx = Math.round(w * 0.76), sw = Math.round(Math.min(70, w * 0.22))
      pc.rect(sx, floorY - 22, sw, 18, hex('#5e8f6e'))
      pc.rect(sx - 4, floorY - 14, 6, 14, hex('#4d7a5c'))
      pc.rect(sx + sw - 2, floorY - 14, 6, 14, hex('#4d7a5c'))
      pc.rect(sx, floorY - 10, sw, 8, hex('#6ea37e'))
      pc.rect(sx + 4, floorY - 2, 3, 3, hex('#3a2a1e'))
      pc.rect(sx + sw - 7, floorY - 2, 3, 3, hex('#3a2a1e'))
      // 电视柜
      const tx = Math.round(w * 0.04)
      pc.rect(tx, floorY - 10, 34, 10, hex('#8a5a3a'))
      pc.rect(tx + 4, floorY - 30, 26, 18, hex('#26222e'))
      pc.rect(tx + 6, floorY - 28, 22, 14, hex('#4f8fbf'))
      pc.rect(tx + 15, floorY - 12, 4, 2, hex('#26222e'))
      // 绿植
      const gx = Math.round(w * 0.95)
      pc.rect(gx - 4, floorY - 8, 8, 8, hex('#c0603a'))
      pc.disc(gx, floorY - 14, 5, hex('#4caf50'))
      pc.disc(gx - 3, floorY - 18, 3, hex('#3d8f40'))
      // 地毯
      pc.rect(Math.round(w * 0.25), Math.round(h * 0.84), Math.round(w * 0.5), Math.round(h * 0.12), hex('#d9534f'))
      pc.rect(Math.round(w * 0.25) + 2, Math.round(h * 0.84) + 2, Math.round(w * 0.5) - 4, Math.round(h * 0.12) - 4, hex('#f2a65a'))
      break
    }
    case 'plaza':
    case 'plazaNight': {
      const night = key === 'plazaNight'
      sky(pc, floorY, night ? hex('#141838') : hex('#6ec6ff'), night ? hex('#3b2c6b') : hex('#d6f1ff'))
      if (night) {
        for (let i = 0; i < w / 6; i++) pc.set(r() * w, r() * floorY * 0.6, hex('#ffffff'))
        pc.disc(w * 0.85, h * 0.15, 6, hex('#fff6c8'))
        pc.disc(w * 0.85 + 2, h * 0.15 - 1, 5, hex('#141838'))
      } else {
        cloud(pc, w * 0.15, h * 0.15, 1, hex('#ffffff'))
        cloud(pc, w * 0.6, h * 0.1, 1, hex('#ffffff'))
        pc.disc(w * 0.9, h * 0.13, 6, hex('#fff2a8'))
      }
      buildings(pc, floorY - 6, r, night)
      for (let x = 6; x < w; x += 34) tree(pc, x + r() * 10, floorY, 1, night)
      // 地砖
      pc.rect(0, floorY, w, h - floorY, night ? hex('#5a5270') : hex('#e2d1b0'))
      for (let y = floorY; y < h; y += 6) pc.rect(0, y, w, 1, night ? hex('#4a4360') : hex('#c9b590'))
      for (let y = floorY; y < h; y += 6) for (let x = ((y / 6) % 2) * 6; x < w; x += 12) pc.rect(x, y, 1, 6, night ? hex('#4a4360') : hex('#c9b590'))
      lamp(pc, Math.round(w * 0.2), floorY + 2, 30, night)
      lamp(pc, Math.round(w * 0.8), floorY + 2, 30, night)
      speaker(pc, Math.round(w * 0.06), floorY + 4, 1)
      speaker(pc, Math.round(w * 0.9), floorY + 4, 1)
      if (night) {
        // 彩灯串
        for (let x = 0; x < w; x += 4) {
          const y = Math.round(h * 0.2 + Math.sin((x / w) * Math.PI * 3) * 4)
          pc.set(x, y, hex('#555'))
          if (x % 8 === 0) pc.rect(x, y + 1, 2, 2, hex(['#ff5c7a', '#ffe14d', '#5cd2ff', '#7dff8a'][(x / 8) % 4]))
        }
      }
      break
    }
    case 'disco': {
      pc.rect(0, 0, w, floorY, hex('#1c0f30'))
      for (let x = 0; x < w; x += 10) pc.rect(x, 0, 1, floorY, hex('#24143c'))
      // 光束
      const beams = ['#ff4fa3', '#4fd1ff', '#ffe14d', '#8a6bff']
      for (let b = 0; b < 4; b++) {
        const ox = w * (0.15 + b * 0.23)
        const c = hex(beams[b])
        for (let y = 4; y < floorY; y++) {
          const spread = (y / floorY) * 10
          for (let x = -spread; x <= spread; x += 2) if ((x + y) % 4 === 0) pc.set(ox + x + (b % 2 ? y * 0.3 : -y * 0.3), y, shade(c, 0.55))
        }
      }
      // 迪斯科球
      const bx = Math.round(w / 2)
      pc.rect(bx, 0, 1, 6, hex('#999'))
      pc.disc(bx, 11, 6, hex('#c0c8d8'))
      for (let y = 6; y < 17; y += 2) for (let x = bx - 6; x < bx + 6; x += 2) if (pc.alpha(x, y)) pc.set(x, y, hex('#ffffff'))
      // 舞池地板（静态底色，动画由场景叠加）
      pc.rect(0, floorY, w, h - floorY, hex('#2a1a44'))
      const ts = 8
      for (let y = floorY; y < h; y += ts) for (let x = 0; x < w; x += ts) pc.rect(x + 1, y + 1, ts - 2, ts - 2, hex('#3a2660'))
      speaker(pc, Math.round(w * 0.03), floorY + 6, 1.4)
      speaker(pc, Math.round(w * 0.92), floorY + 6, 1.4)
      break
    }
    case 'field':
    case 'fieldNight': {
      const night = key === 'fieldNight'
      sky(pc, Math.round(h * 0.3), night ? hex('#0e1230') : hex('#5fb8ff'), night ? hex('#25235a') : hex('#bfe7ff'), 4)
      if (night) for (let i = 0; i < w / 8; i++) pc.set(r() * w, r() * h * 0.25, hex('#ffffff'))
      else cloud(pc, w * 0.3, h * 0.1, 1, hex('#ffffff'))
      crowdStands(pc, Math.round(h * 0.28), Math.round(h * 0.55), r, night)
      // 彩旗
      for (let x = 0; x < w; x += 6) {
        const y = Math.round(h * 0.3 + Math.sin((x / w) * Math.PI * 4) * 2)
        pc.rect(x, y, 6, 1, hex('#ffffff'))
        pc.rect(x + 1, y + 1, 3, 2, hex(['#e8435a', '#ffd23f', '#3d7fe0', '#4caf50'][(x / 6) % 4]))
      }
      // 记分牌
      const sbx = Math.round(w * 0.5 - 20)
      pc.rect(sbx, Math.round(h * 0.04), 40, 14, hex('#26222e'))
      pc.rect(sbx + 2, Math.round(h * 0.04) + 2, 36, 10, night ? hex('#132a13') : hex('#1f3d1f'))
      pc.rect(sbx + 6, Math.round(h * 0.04) + 5, 10, 4, hex('#ffe14d'))
      pc.rect(sbx + 24, Math.round(h * 0.04) + 5, 10, 4, hex('#ff5c7a'))
      if (night) {
        for (const lx of [w * 0.1, w * 0.9]) {
          pc.rect(lx, h * 0.04, 2, h * 0.24, hex('#555a70'))
          pc.rect(lx - 6, h * 0.02, 14, 6, hex('#555a70'))
          pc.rect(lx - 5, h * 0.02 + 1, 12, 4, hex('#fffbe0'))
        }
      }
      // 草地 + 跑道
      pc.rect(0, Math.round(h * 0.55), w, floorY - Math.round(h * 0.55), night ? hex('#2e6b3a') : hex('#5cbf5c'))
      for (let x = 0; x < w; x += 10) pc.rect(x, Math.round(h * 0.55), 5, floorY - Math.round(h * 0.55), night ? hex('#2a6236') : hex('#54b354'))
      pc.rect(0, floorY, w, h - floorY, night ? hex('#8e3f30') : hex('#c8553d'))
      for (let y = floorY + 5; y < h; y += 6) pc.rect(0, y, w, 1, hex('#f5efe6'))
      break
    }
  }
  return pc.toCanvas()
}

export const SCENE_NAMES: Record<SceneKey, string> = {
  livingRoom: '家庭客厅',
  plaza: '社区广场',
  plazaNight: '夜晚广场',
  disco: '复古舞厅',
  field: '运动会现场',
  fieldNight: '夜间运动场',
}
