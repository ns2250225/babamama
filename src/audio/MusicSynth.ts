import type { SongMeta, SectionType } from '../game/types/Beatmap'

/**
 * 程序化芯片音乐合成器：根据歌曲参数直接合成 PCM 采样，生成 AudioBuffer。
 * 音乐与谱面共用同一段落结构和节拍网格，保证节奏严格对齐。
 */

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
}

// 鼓组：16 步，K=底鼓 S=军鼓 H=闭镲 O=开镲 C=拍手
const DRUMS: Record<string, { k: string; s: string; h: string; o?: string; c?: string }> = {
  march: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  dongci: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', c: '....x.......x...' },
  disco: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.' },
  rock: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  electro: { k: 'x...x...x...x.x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', c: '....x..x....x...' },
  breakbeat: { k: 'x.....x...x.....', s: '....x..x.x..x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
}

// 贝斯：R=根音 F=五度 O=八度 .=休止
const BASS: Record<string, string> = {
  march: 'R...F...R...F...',
  offbeat: '..R...R...R...R.',
  octave: 'R.O.R.O.R.O.R.O.',
  eighth: 'R.R.R.R.R.R.F.F.',
  sync: 'R..R..R.R..R..O.',
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

interface NoteEv {
  t: number // 秒
  d: number // 秒
  f: number
  v: number
}

export class MusicSynth {
  private sr: number
  private buf!: Float32Array
  private noise: Float32Array

  constructor(sampleRate: number) {
    this.sr = sampleRate
    const rand = mulberry32(12345)
    this.noise = new Float32Array(sampleRate)
    for (let i = 0; i < this.noise.length; i++) this.noise[i] = rand() * 2 - 1
  }

  render(ctx: BaseAudioContext, song: SongMeta): AudioBuffer {
    const sr = this.sr
    const beat = 60 / song.bpm
    const step = beat / 4
    const totalBars = song.sections.reduce((a, s) => a + s[1], 0)
    const length = Math.ceil((totalBars * 4 * beat + 2.5) * sr)
    this.buf = new Float32Array(length)
    const rand = mulberry32(song.seed)
    const m = song.music
    const scale = SCALES[m.mode] ?? SCALES.major
    const drums = DRUMS[m.drums] ?? DRUMS.march
    const bassPat = BASS[m.bass] ?? BASS.march
    const isPenta = scale.length === 5

    // 和弦：以七声音阶度数构造三和弦
    const full = isPenta ? SCALES.major : scale
    const chordOf = (deg: number) => {
      const d = deg - 1
      return [0, 2, 4].map((o) => {
        const idx = d + o
        return m.root + full[idx % 7] + 12 * Math.floor(idx / 7)
      })
    }
    const scaleNote = (idx: number) => {
      const n = scale.length
      const oct = Math.floor(idx / n)
      return m.root + 12 + scale[((idx % n) + n) % n] + 12 * oct
    }

    // 为 verse / chorus 各生成一段 2 小节旋律动机，重复使用
    const motifs: Record<string, { s: number; len: number; deg: number }[][]> = {}
    const makeMotif = (dense: number) => {
      const phrases: { s: number; len: number; deg: number }[][] = []
      for (let p = 0; p < 4; p++) {
        const ev: { s: number; len: number; deg: number }[] = []
        let pos = 0
        let deg = Math.floor(rand() * scale.length)
        while (pos < 32) {
          const r = rand()
          let len = r < dense ? 2 : r < dense + 0.35 ? 4 : r < 0.92 ? 6 : 8
          if (pos + len > 32) len = 32 - pos
          const rest = rand() < 0.12
          if (!rest) ev.push({ s: pos, len, deg })
          pos += len
          const jump = rand()
          deg += jump < 0.4 ? 1 : jump < 0.75 ? -1 : jump < 0.88 ? 2 : -2
          deg = Math.max(-2, Math.min(scale.length + 3, deg))
        }
        phrases.push(ev)
      }
      // A A' B A 结构
      phrases[1] = phrases[0].map((e, i, arr) => (i === arr.length - 1 ? { ...e, deg: e.deg + 1 } : e))
      phrases[3] = phrases[0].slice()
      return phrases
    }
    motifs.verse = makeMotif(0.3)
    motifs.chorus = makeMotif(0.5)

    const lead: NoteEv[] = []
    const harm: NoteEv[] = []
    const bass: NoteEv[] = []

    let bar = 0
    for (const [type, bars] of song.sections) {
      for (let i = 0; i < bars; i++) {
        const barT = bar * 4 * beat
        const deg = m.progression[bar % m.progression.length]
        const chord = chordOf(deg)
        const intensity = this.intensity(type, i, bars)

        // 鼓
        this.drumBar(drums, barT, step, type, i, bars, intensity)

        // 贝斯
        if (type !== 'intro' || i >= bars - 2) {
          for (let s = 0; s < 16; s++) {
            const c = bassPat[s]
            if (c === '.') continue
            if (type === 'break' && s % 8 !== 0) continue
            const n = c === 'R' ? chord[0] - 24 : c === 'F' ? chord[0] - 24 + 7 : chord[0] - 12
            bass.push({ t: barT + s * step, d: step * (type === 'break' ? 7 : 1.8), f: mtof(n), v: 0.32 })
          }
        }

        // 和声琶音 / 柱式和弦
        if (type === 'chorus' || (type === 'verse' && m.arp)) {
          if (m.arp) {
            for (let s = 0; s < 16; s += type === 'chorus' ? 1 : 2) {
              const n = chord[s % 3] + (s % 6 < 3 ? 0 : 12)
              harm.push({ t: barT + s * step, d: step * 0.9, f: mtof(n), v: type === 'chorus' ? 0.07 : 0.05 })
            }
          } else {
            for (let s = 0; s < 16; s += 4) {
              for (const n of chord) harm.push({ t: barT + s * step + step * 2, d: step * 1.5, f: mtof(n + 12), v: 0.045 })
            }
          }
        } else if (type === 'break' || type === 'intro') {
          for (const n of chord) harm.push({ t: barT, d: beat * 3.8, f: mtof(n + 12), v: 0.04 })
        }

        // 主旋律
        if (type === 'verse' || type === 'chorus') {
          const phrase = motifs[type][Math.floor(i / 2) % 4]
          const half = i % 2
          const octave = type === 'chorus' ? 7 : 0
          for (const e of phrase) {
            if (Math.floor(e.s / 16) !== half) continue
            // 强拍贴合和弦音
            let note = scaleNote(e.deg + (isPenta ? Math.round(octave * 5 / 7) : octave))
            if (e.s % 8 === 0) note = this.snapToChord(note, chord)
            lead.push({ t: barT + (e.s % 16) * step, d: e.len * step * 0.92, f: mtof(note), v: type === 'chorus' ? 0.14 : 0.12 })
          }
        }
        if (type === 'outro' && i === bars - 1) {
          const root = chordOf(1)
          for (const n of root) lead.push({ t: barT, d: beat * 3.5, f: mtof(n + 12), v: 0.09 })
          this.crash(barT, 0.4)
        }
        bar++
      }
    }

    for (const n of bass) this.tri(n)
    for (const n of harm) this.square(n, 0.5, 0.004, 0.25)
    for (const n of lead) this.square(n, m.lead, 0.006, 0.5, true)

    // 母带：软削波 + 归一化
    let peak = 0
    const b = this.buf
    for (let i = 0; i < b.length; i++) {
      const v = Math.tanh(b[i] * 1.2)
      b[i] = v
      const a = Math.abs(v)
      if (a > peak) peak = a
    }
    const g = peak > 0 ? 0.9 / peak : 1
    const out = ctx.createBuffer(2, length, sr)
    const L = out.getChannelData(0)
    const R = out.getChannelData(1)
    for (let i = 0; i < length; i++) {
      L[i] = b[i] * g
      R[i] = b[i] * g
    }
    return out
  }

  private intensity(type: SectionType, i: number, bars: number): number {
    if (type === 'intro') return i < bars / 2 ? 0.3 : 0.6
    if (type === 'verse') return 0.8
    if (type === 'chorus') return 1
    if (type === 'break') return 0.5
    return 0.7
  }

  private snapToChord(note: number, chord: number[]): number {
    let best = note
    let bd = 99
    for (const c of chord) {
      for (let o = -24; o <= 36; o += 12) {
        const d = Math.abs(c + o - note)
        if (d < bd) {
          bd = d
          best = c + o
        }
      }
    }
    return best
  }

  private drumBar(
    p: { k: string; s: string; h: string; o?: string; c?: string },
    barT: number,
    step: number,
    type: SectionType,
    i: number,
    bars: number,
    inten: number,
  ) {
    const lastBar = i === bars - 1
    for (let s = 0; s < 16; s++) {
      const t = barT + s * step
      if (type === 'intro' && i < bars / 2) {
        if (s % 4 === 0) this.hat(t, 0.08)
        continue
      }
      if (type === 'break') {
        if (s === 0) this.kick(t, 0.8)
        if (s % 4 === 2) this.hat(t, 0.06)
        // 段落末尾军鼓滚奏，为下一段蓄力
        if (lastBar && s >= 8) this.snare(t, 0.15 + (s - 8) * 0.04)
        continue
      }
      if (p.k[s] === 'x') this.kick(t, 0.9 * inten + 0.1)
      if (p.s[s] === 'x') this.snare(t, 0.4 * inten)
      if (p.h[s] === 'x') this.hat(t, (s % 4 === 0 ? 0.09 : 0.06) * inten)
      if (p.o && p.o[s] === 'x') this.hat(t, 0.08 * inten, true)
      if (p.c && p.c[s] === 'x' && type === 'chorus') this.clap(t, 0.25)
      if (type === 'chorus' && i === 0 && s === 0) this.crash(t, 0.3)
      if (lastBar && type !== 'outro' && s >= 12 && type === 'chorus') this.snare(t, 0.2)
    }
  }

  private idx(t: number) {
    return Math.floor(t * this.sr)
  }

  private kick(t: number, v: number) {
    const sr = this.sr
    const start = this.idx(t)
    const len = Math.floor(0.28 * sr)
    let phase = 0
    for (let i = 0; i < len && start + i < this.buf.length; i++) {
      const x = i / sr
      const f = 45 + 120 * Math.exp(-x * 30)
      phase += (2 * Math.PI * f) / sr
      const env = Math.exp(-x * 9)
      this.buf[start + i] += Math.sin(phase) * env * v * 0.9
    }
  }

  private snare(t: number, v: number) {
    const sr = this.sr
    const start = this.idx(t)
    const len = Math.floor(0.18 * sr)
    let prev = 0
    for (let i = 0; i < len && start + i < this.buf.length; i++) {
      const x = i / sr
      const n = this.noise[(start + i) % this.noise.length]
      const hp = n - prev
      prev = n
      const tone = Math.sin(2 * Math.PI * 185 * x) * Math.exp(-x * 30)
      this.buf[start + i] += (hp * 0.5 * Math.exp(-x * 18) + tone * 0.5) * v
    }
  }

  private clap(t: number, v: number) {
    const sr = this.sr
    const start = this.idx(t)
    const len = Math.floor(0.12 * sr)
    let prev = 0
    for (let i = 0; i < len && start + i < this.buf.length; i++) {
      const x = i / sr
      const n = this.noise[(start * 3 + i) % this.noise.length]
      const hp = n - prev
      prev = n
      const env = x < 0.03 ? Math.exp(-((x * 1000) % 10) * 0.3) : Math.exp(-(x - 0.03) * 25)
      this.buf[start + i] += hp * env * v * 0.6
    }
  }

  private hat(t: number, v: number, open = false) {
    const sr = this.sr
    const start = this.idx(t)
    const dur = open ? 0.18 : 0.04
    const len = Math.floor(dur * sr)
    let prev = 0
    for (let i = 0; i < len && start + i < this.buf.length; i++) {
      const x = i / sr
      const n = this.noise[(start * 7 + i) % this.noise.length]
      const hp = n - prev
      prev = n
      this.buf[start + i] += hp * Math.exp(-x * (open ? 16 : 90)) * v
    }
  }

  private crash(t: number, v: number) {
    const sr = this.sr
    const start = this.idx(t)
    const len = Math.floor(1.2 * sr)
    let prev = 0
    for (let i = 0; i < len && start + i < this.buf.length; i++) {
      const x = i / sr
      const n = this.noise[(start * 5 + i) % this.noise.length]
      const hp = n - prev
      prev = n
      this.buf[start + i] += hp * Math.exp(-x * 3.5) * v * 0.5
    }
  }

  private tri(n: NoteEv) {
    const sr = this.sr
    const start = this.idx(n.t)
    const len = Math.floor(n.d * sr)
    let ph = 0
    const inc = n.f / sr
    for (let i = 0; i < len && start + i < this.buf.length; i++) {
      ph = (ph + inc) % 1
      const tri = 4 * Math.abs(ph - 0.5) - 1
      const rel = len - i < 400 ? (len - i) / 400 : 1
      const att = i < 80 ? i / 80 : 1
      this.buf[start + i] += tri * n.v * rel * att
    }
  }

  private square(n: NoteEv, duty: number, attack: number, decay: number, vibrato = false) {
    const sr = this.sr
    const start = this.idx(n.t)
    const len = Math.floor(n.d * sr)
    const att = Math.max(1, Math.floor(attack * sr))
    let ph = 0
    let lp = 0
    for (let i = 0; i < len && start + i < this.buf.length; i++) {
      const x = i / sr
      const vib = vibrato && x > 0.15 ? 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * x) : 1
      ph = (ph + (n.f * vib) / sr) % 1
      const sq = ph < duty ? 1 : -1
      lp += (sq - lp) * 0.35
      const env = (i < att ? i / att : 1) * (0.55 + 0.45 * Math.exp(-x / decay))
      const rel = len - i < 300 ? (len - i) / 300 : 1
      this.buf[start + i] += lp * n.v * env * rel
    }
  }
}
