import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { AudioEngine } from '../audio/AudioEngine'
import type { GameSettings } from '../game/GameBridge'

const KEY = 'mmb-settings'

export interface Settings extends GameSettings {
  musicVol: number
  sfxVol: number
  showKeyHints: boolean
}

const DEFAULTS: Settings = {
  musicVol: 0.8,
  sfxVol: 0.9,
  noteSpeed: 1,
  strictness: 'standard',
  audioOffset: 0,
  inputOffset: 0,
  effects: 'high',
  vibration: true,
  dialogue: true,
  dialogueFreq: 1,
  showKeyHints: true,
}

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export const useSettings = defineStore('settings', () => {
  const s = reactive<Settings>(load())
  watch(
    s,
    (v) => {
      localStorage.setItem(KEY, JSON.stringify(v))
      AudioEngine.setVolumes(v.musicVol, v.sfxVol)
    },
    { deep: true, immediate: true },
  )
  function reset() {
    Object.assign(s, DEFAULTS)
  }
  function gameSettings(): GameSettings {
    return {
      noteSpeed: s.noteSpeed,
      strictness: s.strictness,
      audioOffset: s.audioOffset,
      inputOffset: s.inputOffset,
      effects: s.effects,
      vibration: s.vibration,
      dialogue: s.dialogue,
      dialogueFreq: s.dialogueFreq,
    }
  }
  return { s, reset, gameSettings }
})
