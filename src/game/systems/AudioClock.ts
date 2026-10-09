/**
 * 音频时钟：所有音符位置与判定都基于 AudioContext 输出时间，
 * 不依赖帧计数，渲染帧率波动不影响判定。
 */
export class AudioClock {
  private ctx: AudioContext
  /** 歌曲 0ms 对应的 AudioContext 时间（秒） */
  private startCtx = 0
  private paused = false
  private frozenMs = 0
  private lastMs = -Infinity
  /** 音频偏移校准（毫秒，正值表示声音更晚被听到） */
  audioOffset = 0
  /** 输入延迟校准（毫秒，正值表示输入更晚到达） */
  inputOffset = 0

  constructor(ctx: AudioContext) {
    this.ctx = ctx
  }

  /** 当前正在被听到的 AudioContext 时间（秒） */
  contextNow(): number {
    const ctx = this.ctx
    const getTs = (ctx as AudioContext & { getOutputTimestamp?: () => AudioTimestamp }).getOutputTimestamp
    if (getTs && ctx.state === 'running') {
      const ts = getTs.call(ctx)
      if (ts.contextTime && ts.performanceTime) {
        const ext = Math.min(0.1, Math.max(0, (performance.now() - ts.performanceTime) / 1000))
        return ts.contextTime + ext
      }
    }
    const lat = (ctx as AudioContext).outputLatency || ctx.baseLatency || 0
    return ctx.currentTime - lat
  }

  /** 把歌曲时间 0 设定为 lead 秒之后 */
  startIn(leadSec: number): number {
    const when = this.ctx.currentTime + leadSec
    // 计划播放时间是基于 currentTime 的，听到时还要加上输出延迟，
    // contextNow() 已经减去了延迟，因此两者在同一基准上
    this.startCtx = when
    this.paused = false
    this.lastMs = -Infinity
    return when
  }

  /** 从歌曲的 posMs 处重新开始（用于暂停后恢复） */
  resumeAt(posMs: number, leadSec = 0.05): { when: number; offsetSec: number } {
    const when = this.ctx.currentTime + leadSec
    this.startCtx = when - posMs / 1000
    this.paused = false
    this.lastMs = -Infinity
    return { when, offsetSec: posMs / 1000 }
  }

  pause() {
    this.frozenMs = this.rawMs()
    this.paused = true
  }

  get isPaused() {
    return this.paused
  }

  rawMs(): number {
    if (this.paused) return this.frozenMs
    return (this.contextNow() - this.startCtx) * 1000
  }

  /** 当前歌曲时间（毫秒），单调不减 */
  now(): number {
    if (this.paused) return this.frozenMs - this.audioOffset
    let ms = this.rawMs()
    if (ms < this.lastMs && this.lastMs - ms < 40) ms = this.lastMs
    this.lastMs = ms
    return ms - this.audioOffset
  }

  /** 将输入事件时间戳换算成歌曲时间 */
  inputTime(eventTimeStamp?: number): number {
    let t = this.now()
    if (eventTimeStamp && eventTimeStamp > 0) {
      const delta = performance.now() - eventTimeStamp
      if (delta > 0 && delta < 100) t -= delta
    }
    return t - this.inputOffset
  }
}
