import dialogues from '../../data/dialogues.json'

export type Speaker = 'mom' | 'dad'
export type LineCategory = Exclude<keyof typeof dialogues, 'duets'>
export type DuetCategory = keyof typeof dialogues.duets

export interface SayEvent {
  who: Speaker
  text: string
  duration: number
}

type LineTable = Record<Speaker, string[]>

/**
 * 自动说话系统：预设台词 + 条件触发 + 随机选择。
 * - 普通事件受冷却限制，避免频繁击打时刷屏
 * - 高优先级事件（里程碑、双人对话等）可即时打断
 * - 同一角色避免连续重复，默认轮流发言
 */
export class DialogueSystem {
  private time = 0
  private lastSayAt = -99999
  private busyUntil = 0
  private lastSpeaker: Speaker = 'dad'
  private lastLine: Record<Speaker, string> = { mom: '', dad: '' }
  private queue: { at: number; who: Speaker; text: string }[] = []
  private nextAmbient = 8000
  private categoryCooldown = new Map<string, number>()
  enabled = true
  /** 台词频率倍率（设置项） */
  frequency = 1

  constructor(private onSay: (e: SayEvent) => void) {}

  private duration(text: string) {
    return Math.max(1500, Math.min(3000, 1200 + text.length * 120))
  }

  private pick(who: Speaker, cat: LineCategory): string {
    const lines = (dialogues[cat] as LineTable)[who]
    if (!lines || !lines.length) return ''
    let text = lines[Math.floor(Math.random() * lines.length)]
    if (lines.length > 1 && text === this.lastLine[who]) text = lines[(lines.indexOf(text) + 1) % lines.length]
    return text
  }

  private emit(who: Speaker, text: string) {
    if (!text) return
    const duration = this.duration(text)
    this.lastLine[who] = text
    this.lastSpeaker = who
    this.lastSayAt = this.time
    this.busyUntil = this.time + duration * 0.7
    this.onSay({ who, text, duration })
  }

  /**
   * 触发一类台词
   * @param priority 0=普通（受冷却与概率限制） 1=重要 2=立即
   */
  trigger(cat: LineCategory, priority = 0, who?: Speaker) {
    if (!this.enabled) return
    const gap = this.time - this.lastSayAt
    if (priority === 0) {
      const cd = this.categoryCooldown.get(cat) ?? -99999
      if (gap < 3200 / this.frequency || this.time - cd < 6000 / this.frequency || this.queue.length) return
      if (Math.random() > 0.55 * this.frequency) return
    } else if (priority === 1) {
      if (this.time < this.busyUntil || this.queue.length) return
    } else {
      this.queue = []
    }
    this.categoryCooldown.set(cat, this.time)
    const speaker = who ?? (this.lastSpeaker === 'mom' ? 'dad' : 'mom')
    this.emit(speaker, this.pick(speaker, cat))
    this.nextAmbient = this.time + 7000
  }

  /** 双方都说一句（如游戏开始、结算） */
  both(cat: LineCategory, first: Speaker = 'mom') {
    if (!this.enabled) return
    this.queue = []
    const second: Speaker = first === 'mom' ? 'dad' : 'mom'
    this.emit(first, this.pick(first, cat))
    this.queue.push({ at: this.time + 1300, who: second, text: this.pick(second, cat) })
    this.nextAmbient = this.time + 9000
  }

  duet(cat: DuetCategory) {
    if (!this.enabled) return
    const list = dialogues.duets[cat] as [Speaker, string][][]
    const d = list[Math.floor(Math.random() * list.length)]
    this.queue = []
    d.forEach(([who, text], i) => {
      if (i === 0) this.emit(who, text)
      else this.queue.push({ at: this.time + 1400 * i, who, text })
    })
    this.nextAmbient = this.time + 9000
  }

  /** 每帧调用；doingWell 用于选择闲聊台词 */
  tick(dtMs: number, playing: boolean, doingWell: boolean) {
    this.time += dtMs
    while (this.queue.length && this.queue[0].at <= this.time) {
      const q = this.queue.shift()!
      this.emit(q.who, q.text)
    }
    if (playing && this.enabled && this.time > this.nextAmbient && this.time - this.lastSayAt > 5000) {
      this.nextAmbient = this.time + (7000 + Math.random() * 4000) / this.frequency
      const who: Speaker = this.lastSpeaker === 'mom' ? 'dad' : 'mom'
      this.emit(who, this.pick(who, doingWell ? 'idleGood' : 'idleBad'))
    }
  }

  reset() {
    this.queue = []
    this.lastSayAt = -99999
    this.busyUntil = 0
    this.nextAmbient = this.time + 8000
  }
}
