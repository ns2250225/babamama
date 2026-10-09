import type { SongMeta } from '../game/types/Beatmap'
import { MusicSynth } from './MusicSynth'

export type SfxName = 'don' | 'ka' | 'roll' | 'count' | 'go' | 'click' | 'tick' | 'milestone' | 'fanfare' | 'miss' | 'select'

/**
 * 全局音频引擎（单例）：
 * - 首次用户交互时创建并解锁 AudioContext（移动端必需）
 * - 预合成低延迟击打音效
 * - 音乐缓冲合成与缓存
 */
class AudioEngineImpl {
  ctx: AudioContext | null = null
  private master!: GainNode
  private musicGain!: GainNode
  private sfxGain!: GainNode
  private sfx = new Map<SfxName, AudioBuffer>()
  private songCache = new Map<string, AudioBuffer>()
  private musicSource: AudioBufferSourceNode | null = null
  private musicVol = 0.8
  private sfxVol = 0.9

  /** 必须在用户手势回调中调用 */
  unlock(): AudioContext {
    if (!this.ctx) {
      const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      let ctx: AudioContext
      try {
        ctx = new AC({ latencyHint: 'interactive' })
      } catch {
        ctx = new AC()
      }
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.connect(ctx.destination)
      this.musicGain = ctx.createGain()
      this.musicGain.gain.value = this.musicVol
      this.musicGain.connect(this.master)
      this.sfxGain = ctx.createGain()
      this.sfxGain.gain.value = this.sfxVol
      this.sfxGain.connect(this.master)
      this.buildSfx()
      // iOS 解锁：播放一段静音
      const b = ctx.createBuffer(1, 1, ctx.sampleRate)
      const s = ctx.createBufferSource()
      s.buffer = b
      s.connect(ctx.destination)
      s.start(0)
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  get ready() {
    return !!this.ctx
  }

  setVolumes(music: number, sfx: number) {
    this.musicVol = music
    this.sfxVol = sfx
    if (this.ctx) {
      this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime)
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime)
    }
  }

  async getSongBuffer(song: SongMeta): Promise<AudioBuffer> {
    const ctx = this.unlock()
    const cached = this.songCache.get(song.id)
    if (cached) return cached
    // 让出主线程以便加载界面先渲染
    await new Promise((r) => setTimeout(r, 30))
    const synth = new MusicSynth(ctx.sampleRate)
    const buf = synth.render(ctx, song)
    this.songCache.set(song.id, buf)
    return buf
  }

  /** 在指定的 AudioContext 时间开始播放音乐，offsetSec 为从音乐内哪一秒开始 */
  playMusic(buffer: AudioBuffer, when: number, offsetSec = 0, onEnded?: () => void) {
    const ctx = this.unlock()
    this.stopMusic()
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.musicGain)
    if (onEnded) src.onended = () => { if (this.musicSource === src) onEnded() }
    src.start(Math.max(when, ctx.currentTime), Math.max(0, offsetSec))
    this.musicSource = src
    return src
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.onended = null
        this.musicSource.stop()
      } catch {
        /* 已停止 */
      }
      this.musicSource.disconnect()
      this.musicSource = null
    }
  }

  /** 音乐闪避（台词或结算时降低音量） */
  duckMusic(amount: number, time = 0.3) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.musicGain.gain.cancelScheduledValues(t)
    this.musicGain.gain.setTargetAtTime(this.musicVol * amount, t, time / 3)
  }

  play(name: SfxName, vol = 1, detune = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return
    const buf = this.sfx.get(name)
    if (!buf) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    if (detune) src.playbackRate.value = Math.pow(2, detune / 1200)
    if (vol !== 1) {
      const g = this.ctx.createGain()
      g.gain.value = vol
      src.connect(g)
      g.connect(this.sfxGain)
    } else {
      src.connect(this.sfxGain)
    }
    src.start()
  }

  async suspend() {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend()
  }

  async resume() {
    if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume()
  }

  private buildSfx() {
    const ctx = this.ctx!
    const sr = ctx.sampleRate
    const make = (dur: number, fn: (x: number, i: number) => number) => {
      const len = Math.floor(dur * sr)
      const b = ctx.createBuffer(1, len, sr)
      const d = b.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = fn(i / sr, i)
      // 末尾淡出防爆音
      for (let i = Math.max(0, len - 64); i < len; i++) d[i] *= (len - i) / 64
      return b
    }
    let seed = 99
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296 * 2 - 1
    }
    // 咚：鼓面低音
    let ph = 0
    this.sfx.set('don', make(0.32, (x) => {
      const f = 70 + 110 * Math.exp(-x * 25)
      ph += (2 * Math.PI * f) / sr
      return Math.sin(ph) * Math.exp(-x * 9) * 0.95 + rnd() * Math.exp(-x * 60) * 0.25
    }))
    // 哒：清脆鼓边
    let prev = 0
    this.sfx.set('ka', make(0.12, (x) => {
      const n = rnd()
      const hp = n - prev
      prev = n
      return (hp * 0.45 * Math.exp(-x * 45) + Math.sin(2 * Math.PI * 1150 * x) * 0.4 * Math.exp(-x * 55) + Math.sin(2 * Math.PI * 2300 * x) * 0.15 * Math.exp(-x * 80))
    }))
    // 连打：短促鼓点
    ph = 0
    this.sfx.set('roll', make(0.14, (x) => {
      const f = 150 + 200 * Math.exp(-x * 40)
      ph += (2 * Math.PI * f) / sr
      return Math.sin(ph) * Math.exp(-x * 25) * 0.6 + rnd() * Math.exp(-x * 80) * 0.2
    }))
    const beep = (f: number, dur: number, v: number) => make(dur, (x) => (((x * f) % 1) < 0.5 ? 1 : -1) * v * Math.exp(-x * 4) * (x < 0.005 ? x / 0.005 : 1))
    this.sfx.set('count', beep(880, 0.15, 0.25))
    this.sfx.set('go', beep(1320, 0.35, 0.28))
    this.sfx.set('click', beep(660, 0.05, 0.18))
    this.sfx.set('select', beep(990, 0.07, 0.18))
    this.sfx.set('tick', make(0.05, (x) => Math.sin(2 * Math.PI * 1600 * x) * Math.exp(-x * 90) * 0.7))
    this.sfx.set('miss', make(0.25, (x) => (((x * (220 - x * 300)) % 1) < 0.5 ? 1 : -1) * 0.08 * Math.exp(-x * 8)))
    // 连击里程碑：上行琶音
    const arp = [784, 988, 1175, 1568]
    this.sfx.set('milestone', make(0.5, (x) => {
      const k = Math.min(3, Math.floor(x / 0.08))
      const lx = x - k * 0.08
      return (((x * arp[k]) % 1) < 0.25 ? 1 : -1) * 0.12 * Math.exp(-lx * 10)
    }))
    const fan = [523, 659, 784, 1047, 784, 1047]
    this.sfx.set('fanfare', make(1.3, (x) => {
      const k = Math.min(5, Math.floor(x / 0.13))
      const lx = x - k * 0.13
      const env = k === 5 ? Math.exp(-lx * 2.5) : Math.exp(-lx * 8)
      return (((x * fan[k]) % 1) < 0.5 ? 1 : -1) * 0.14 * env
    }))
  }
}

export const AudioEngine = new AudioEngineImpl()
