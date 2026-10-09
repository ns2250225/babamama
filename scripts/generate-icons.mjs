// 生成 PWA 图标（像素风咚/哒），无需外部依赖
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const MAP = [
  '................',
  '................',
  '...kkkk.........',
  '..krrrrk........',
  '.krrwrrrk.......',
  '.krwrrrrk.......',
  '.krrrrrrk..kkkkk',
  '.krrrrrrk..kbbbk',
  '..krrrrk...kbwbk',
  '...kkkk....kbbbk',
  '...........kkkkk',
  '..yyyyyyyyyyyy..',
  '..yooooooooooy..',
  '..yyyyyyyyyyyy..',
  '................',
  '................',
]
const COLORS = {
  '.': [43, 29, 58, 255],
  k: [20, 12, 28, 255],
  r: [232, 64, 64, 255],
  w: [255, 240, 220, 255],
  b: [56, 132, 236, 255],
  y: [255, 204, 51, 255],
  o: [255, 150, 30, 255],
}

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size) {
  const scale = size / 16
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const ch = MAP[Math.floor(y / scale)][Math.floor(x / scale)]
      const c = COLORS[ch]
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = c[3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
writeFileSync(join(pub, 'icon-192.png'), png(192))
writeFileSync(join(pub, 'icon-512.png'), png(512))

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">`
MAP.forEach((row, y) => [...row].forEach((ch, x) => {
  const c = COLORS[ch]
  svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${c[0]},${c[1]},${c[2]})"/>`
}))
svg += '</svg>'
writeFileSync(join(pub, 'icon.svg'), svg)
console.log('icons generated')
