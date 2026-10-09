import Phaser from 'phaser'
import type { Beatmap, Difficulty, GameResult, HitKind, SongMeta } from './types/Beatmap'
import type { SayEvent } from './systems/DialogueSystem'

export interface GameSettings {
  noteSpeed: number
  strictness: 'loose' | 'standard' | 'strict'
  audioOffset: number
  inputOffset: number
  effects: 'low' | 'mid' | 'high'
  vibration: boolean
  dialogue: boolean
  dialogueFreq: number
}

export interface GameConfig {
  song: SongMeta
  beatmap: Beatmap | null
  difficulty: Difficulty
  free: boolean
  buffer: AudioBuffer
  settings: GameSettings
}

export interface HudState {
  score: number
  combo: number
  progress: number
  hits: number
  maxCombo: number
}

export interface HeadLayout {
  mom: { x: number; y: number; w: number }
  dad: { x: number; y: number; w: number }
}

export type GamePhase = 'countdown' | 'playing' | 'paused' | 'resuming' | 'ended' | 'result'

/**
 * Vue 与 Phaser 之间的事件桥：
 *  Vue → 游戏：hit / pause / resume / restart
 *  游戏 → Vue：hud / say / layout / phase / result
 */
export interface BridgeEvents {
  hit: [kind: HitKind, timeStamp: number]
  pause: []
  resume: []
  restart: []
  hud: [HudState]
  say: [SayEvent]
  layout: [HeadLayout]
  phase: [GamePhase]
  result: [GameResult]
}

export class GameBridge extends Phaser.Events.EventEmitter {
  config!: GameConfig
  dpr = 1

  send<K extends keyof BridgeEvents>(event: K, ...args: BridgeEvents[K]) {
    return this.emit(event, ...args)
  }
}
