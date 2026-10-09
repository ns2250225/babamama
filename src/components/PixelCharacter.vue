<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ACTIONS, FRAMES_PER_ACTION, buildCharacterSheet, type CharacterSheet } from '../game/art/CharacterArt'

const props = withDefaults(defineProps<{ who: 'mom' | 'dad'; actions?: string[]; bpm?: number; scale?: number; flip?: boolean }>(), {
  actions: () => ['swingArms', 'raiseHands', 'kick', 'clap'],
  bpm: 110,
  scale: 3,
  flip: false,
})

const sheets: Partial<Record<'mom' | 'dad', { sheet: CharacterSheet; idx: Map<string, { x: number; y: number }> }>> =
  ((globalThis as unknown as { __mmbSheets?: object }).__mmbSheets ??= {}) as never

function getSheet(who: 'mom' | 'dad') {
  if (!sheets[who]) {
    const sheet = buildCharacterSheet(who)
    const idx = new Map(sheet.frames.map((f) => [f.name, { x: f.x, y: f.y }]))
    sheets[who] = { sheet, idx }
  }
  return sheets[who]!
}

const cv = ref<HTMLCanvasElement>()
let raf = 0
const start = performance.now()

function draw() {
  const c = cv.value
  if (c) {
    const ctx = c.getContext('2d')!
    const { sheet, idx } = getSheet(props.who)
    const beat = ((performance.now() - start) / 60000) * props.bpm
    const action = props.actions[Math.floor(beat / 4) % props.actions.length]
    const def = ACTIONS[action]
    const local = beat % 4
    const frame = def.loop ? Math.floor(((local / def.beats) % 1) * FRAMES_PER_ACTION) : Math.min(FRAMES_PER_ACTION - 1, Math.floor((local / def.beats) * FRAMES_PER_ACTION))
    const f = idx.get(`${action}_${frame}`)
    ctx.clearRect(0, 0, 48, 64)
    if (f) ctx.drawImage(sheet.canvas, f.x, f.y, 48, 64, 0, 0, 48, 64)
  }
  raf = requestAnimationFrame(draw)
}

onMounted(() => {
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas ref="cv" width="48" height="64" :style="{ width: 48 * scale + 'px', height: 64 * scale + 'px', transform: flip ? 'scaleX(-1)' : undefined }" />
</template>
