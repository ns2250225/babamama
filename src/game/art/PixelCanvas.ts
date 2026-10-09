/** 像素画布工具：所有绘制均为整数像素，不使用抗锯齿 */
export type RGBA = [number, number, number, number]

export function hex(c: string, a = 255): RGBA {
  const v = parseInt(c.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, a]
}

export class PixelCanvas {
  readonly w: number
  readonly h: number
  readonly data: Uint8ClampedArray<ArrayBuffer>

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.data = new Uint8ClampedArray(w * h * 4)
  }

  set(x: number, y: number, c: RGBA) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = (y * this.w + x) * 4
    this.data[i] = c[0]
    this.data[i + 1] = c[1]
    this.data[i + 2] = c[2]
    this.data[i + 3] = c[3]
  }

  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0
    return this.data[(y * this.w + x) * 4 + 3]
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA) {
    x = Math.round(x)
    y = Math.round(y)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }

  disc(cx: number, cy: number, r: number, c: RGBA) {
    const r2 = r * r + r * 0.6
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const dx = x - cx + 0.5
        const dy = y - cy + 0.5
        if (dx * dx + dy * dy <= r2) this.set(x, y, c)
      }
  }

  ring(cx: number, cy: number, r: number, t: number, c: RGBA) {
    const o2 = r * r + r * 0.6
    const ir = Math.max(0, r - t)
    const i2 = ir * ir + ir * 0.6
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const dx = x - cx + 0.5
        const dy = y - cy + 0.5
        const d = dx * dx + dy * dy
        if (d <= o2 && d > i2) this.set(x, y, c)
      }
  }

  /** 粗线：沿 Bresenham 路径盖方块 */
  line(x0: number, y0: number, x1: number, y1: number, size: number, c: RGBA) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    const off = Math.floor((size - 1) / 2)
    for (;;) {
      this.rect(x0 - off, y0 - off, size, size, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  /** 描边：透明且与不透明像素四邻接的点涂成描边色 */
  outline(c: RGBA) {
    const mark: number[] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue
        if (this.alpha(x - 1, y) || this.alpha(x + 1, y) || this.alpha(x, y - 1) || this.alpha(x, y + 1)) mark.push(x, y)
      }
    for (let i = 0; i < mark.length; i += 2) this.set(mark[i], mark[i + 1], c)
  }

  blitTo(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    const img = new ImageData(this.data, this.w, this.h)
    ctx.putImageData(img, ox, oy)
  }

  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas')
    cv.width = this.w
    cv.height = this.h
    this.blitTo(cv.getContext('2d')!, 0, 0)
    return cv
  }
}
