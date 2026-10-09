// 谱面生成脚本：根据 songs.json 中的段落结构为每首歌生成 简单/普通/困难 三份 JSON 谱面。
// 用法：node scripts/generate-beatmaps.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const songsDir = join(root, 'src/data/songs')
const songs = JSON.parse(readFileSync(join(songsDir, 'songs.json'), 'utf8'))

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 每小节 16 步：d=咚 k=哒 R=连打开始 '='=连打延续 .=空
const PATTERNS = {
  easy: {
    verse: ['d...d...d...d...', 'd.......k.......', 'd...k...d...k...', 'd...d...k.......', 'd.......d...d...', 'k...k...d.......', 'd...k...k.......'],
    chorus: ['d...k...d.d.k...', 'd.d.k...d...k...', 'd...d...k.k.d...', 'd...k...d...k.k.', 'k...d...k...d...', 'd.d.d...k.......'],
    break: ['R=======........', 'd...........k...', 'R===========....', 'd...k...........'],
    intro: ['................'],
    outro: ['d...k...d.......', 'd...............'],
  },
  normal: {
    verse: ['d.k.d...d.k.d...', 'd...k.k.d...k...', 'd.d.k...d.d.k...', 'd...k...d.k.k...', 'k.d.k.d.d...k...', 'd.k...k.d.k.....'],
    chorus: ['d.k.d.k.d.k.d...', 'd.d.k.d.d.d.k...', 'd.k.k.d.d.k.k.d.', 'dk..dk..d.k.d...', 'd.kkd.k.d.kkd...', 'k.k.d.d.k.k.d...'],
    break: ['R=====..d...k...', 'd.k.d...R=======', 'R=======d.k.d...', 'd...k...d.k.k...'],
    intro: ['................'],
    outro: ['R=======d...k...', 'd...k...d.......'],
  },
  hard: {
    verse: ['d.kdd.k.d.kdk.k.', 'dkd.k.dkd.k.d.k.', 'd.k.dkd.k.d.kkd.', 'ddk.ddk.d.k.dkdk', 'd.kkd.kkd.k.d.kk', 'dk.kd.kdd.k.k.d.'],
    chorus: ['dkdkd.k.dkdkd.k.', 'ddkkddk.dkdkd.k.', 'd.kdk.dkd.kdk.d.', 'dkkddkkd.kd.kd.k', 'dkdkdkd.kdkdkdk.', 'd.dkk.kdd.dkk.k.'],
    break: ['R===....dkdk.k..', 'dkd.R=====..d.k.', 'R=======dkdkdkd.', 'd.k.d.k.R======='],
    intro: ['................'],
    outro: ['R=======dkdkd...', 'dkdkd...d.......'],
  },
}

// 音符最小间隔（毫秒），保证高 BPM 下依旧可玩
const MIN_SPACING = { easy: 300, normal: 160, hard: 100 }

function genChart(song, diff) {
  const rand = mulberry32(song.seed * 31 + diff.length * 7)
  const beatMs = 60000 / song.bpm
  const stepMs = beatMs / 4
  const lib = PATTERNS[diff]
  const notes = []
  let bar = 0
  for (const [type, bars] of song.sections) {
    const pool = lib[type]
    let pairA = null
    for (let i = 0; i < bars; i++) {
      let pat
      if (type === 'outro') {
        pat = i === bars - 1 ? pool[pool.length - 1] : pool[0]
        if (bars > 2 && i < bars - 2) pat = lib.chorus[Math.floor(rand() * lib.chorus.length)]
      } else if (type === 'break') {
        pat = pool[i % pool.length]
      } else if (type === 'intro') {
        pat = pool[0]
      } else {
        // 两小节一组：A A' 结构，便于记忆
        if (i % 2 === 0) {
          pairA = pool[Math.floor(rand() * pool.length)]
          pat = pairA
        } else {
          pat = rand() < 0.55 ? pairA : pool[Math.floor(rand() * pool.length)]
        }
      }
      for (let s = 0; s < 16; s++) {
        const c = pat[s]
        const time = Math.round((bar * 16 + s) * stepMs)
        if (c === 'd') notes.push({ time, type: 'don' })
        else if (c === 'k') notes.push({ time, type: 'ka' })
        else if (c === 'R') {
          let len = 1
          while (s + len < 16 && pat[s + len] === '=') len++
          notes.push({ time, type: 'roll', duration: Math.round(len * stepMs) })
        }
      }
      bar++
    }
  }
  // 间隔过滤
  const out = []
  let lastEnd = -Infinity
  for (const n of notes) {
    if (n.time - lastEnd < MIN_SPACING[diff]) continue
    out.push(n)
    lastEnd = n.time + (n.duration || 0)
  }
  return out
}

for (const song of songs) {
  for (const diff of ['easy', 'normal', 'hard']) {
    const chart = {
      songId: song.id,
      title: song.title,
      bpm: song.bpm,
      audio: `synth://${song.id}`,
      offset: 0,
      difficulty: diff,
      notes: genChart(song, diff),
    }
    writeFileSync(join(songsDir, `${song.id}.${diff}.json`), JSON.stringify(chart, null, 1))
    console.log(song.id, diff, chart.notes.length, 'notes')
  }
}
