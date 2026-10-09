<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { AudioEngine } from '../audio/AudioEngine'
import { AudioClock } from '../game/systems/AudioClock'
import { useSettings } from '../stores/settings'

const settings = useSettings()
const BPM = 100
const BEAT = 60000 / BPM
const TOTAL = 16
const WARMUP = 4

const mode = ref<'idle' | 'input' | 'visual'>('idle')
const beatIdx = ref(-1)
const taps = ref<number[]>([])
const resultMs = ref<number | null>(null)
const flash = ref(false)
let clock: AudioClock | null = null
let raf = 0
let timers: number[] = []
let clickSources: AudioBufferSourceNode[] = []

function makeClick(ctx: AudioContext) {
  const len = Math.floor(ctx.sampleRate * 0.05)
  const b = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.sin((2 * Math.PI * 1500 * i) / ctx.sampleRate) * Math.exp(-i / (ctx.sampleRate * 0.008)) * 0.8
  return b
}

function scheduleClicks(ctx: AudioContext, count: number, startDelay: number) {
  const buf = makeClick(ctx)
  clock = new AudioClock(ctx)
  const t0 = clock.startIn(startDelay)
  for (let i = 0; i < count; i++) {
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.connect(ctx.destination)
    s.start(t0 + (i * BEAT) / 1000)
    clickSources.push(s)
  }
}

function stop() {
  cancelAnimationFrame(raf)
  timers.forEach(clearTimeout)
  timers = []
  clickSources.forEach((s) => {
    try {
      s.stop()
    } catch {
      /* noop */
    }
  })
  clickSources = []
  mode.value = 'idle'
  beatIdx.value = -1
}

function startInput() {
  stop()
  const ctx = AudioEngine.unlock()
  taps.value = []
  resultMs.value = null
  mode.value = 'input'
  scheduleClicks(ctx, TOTAL, 0.6)
  // 已有的音频偏移会参与游戏判定，这里一并计入，测得的余量即为输入延迟
  clock!.audioOffset = settings.s.audioOffset
  const loop = () => {
    if (!clock) return
    const t = clock.now()
    beatIdx.value = Math.floor((t + BEAT / 2) / BEAT)
    if (t > (TOTAL - 0.5) * BEAT + 400) {
      finishInput()
      return
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

function tap(e: Event) {
  if (mode.value !== 'input' || !clock) return
  // 原始输入时间（不含已有输入校准）
  const t = clock.inputTime(e.timeStamp) + clock.inputOffset
  const n = Math.round(t / BEAT)
  if (n < WARMUP || n >= TOTAL) return
  taps.value.push(t - n * BEAT)
}

function finishInput() {
  const d = taps.value.slice().sort((a, b) => a - b)
  stop()
  if (d.length < 4) {
    resultMs.value = NaN
    return
  }
  // 去掉最大最小各 1 个后取平均
  const trimmed = d.length > 6 ? d.slice(1, -1) : d
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
  resultMs.value = Math.round(avg)
}

function applyInput() {
  if (resultMs.value === null || Number.isNaN(resultMs.value)) return
  settings.s.inputOffset = Math.max(-200, Math.min(200, resultMs.value))
  AudioEngine.play('select')
}

function startVisual() {
  stop()
  const ctx = AudioEngine.unlock()
  mode.value = 'visual'
  scheduleClicks(ctx, 64, 0.4)
  const loop = () => {
    if (!clock) return
    clock.audioOffset = settings.s.audioOffset
    const t = clock.now()
    const phase = ((t % BEAT) + BEAT) % BEAT
    flash.value = t >= 0 && phase < 90
    beatIdx.value = Math.floor(t / BEAT)
    if (t > 64 * BEAT) {
      stop()
      return
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

function onKey(e: KeyboardEvent) {
  if (e.repeat) return
  if (mode.value === 'input' && ['KeyD', 'KeyF', 'KeyJ', 'KeyK', 'Space'].includes(e.code)) {
    e.preventDefault()
    tap(e)
  }
}
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  stop()
})
</script>

<template>
  <div class="calib">
    <div class="block">
      <h3>① 输入延迟校准</h3>
      <p>点击开始后会响起 {{ TOTAL }} 声节拍，前 {{ WARMUP }} 声为预备。请跟着声音敲击下方鼓面（或按 D/F/J/K/空格）。</p>
      <div class="row">
        <button class="px-btn small" @click="mode === 'input' ? stop() : startInput()">{{ mode === 'input' ? '停止' : '开始测试' }}</button>
        <div class="dots">
          <i v-for="i in TOTAL" :key="i" :class="{ on: beatIdx === i - 1, warm: i <= WARMUP, done: beatIdx > i - 1 }" />
        </div>
      </div>
      <div class="tap-pad" :class="{ active: mode === 'input' }" @pointerdown.prevent="tap">
        {{ mode === 'input' ? `跟着节拍敲这里！（已记录 ${taps.length} 次）` : '测试时在此敲击' }}
      </div>
      <p v-if="resultMs !== null" class="res">
        <template v-if="Number.isNaN(resultMs)">有效敲击太少，请重试。</template>
        <template v-else>
          测得平均偏差：<b class="num">{{ resultMs > 0 ? '+' : '' }}{{ resultMs }} ms</b>（{{ resultMs > 0 ? '偏晚' : resultMs < 0 ? '偏早' : '准确' }}）
          <button class="px-btn yellow small" @click="applyInput">应用为输入延迟</button>
        </template>
      </p>
    </div>
    <div class="block">
      <h3>② 音画同步校准</h3>
      <p>开始后方块会随节拍闪烁。拖动「音频偏移」滑块，直到闪烁与「嗒」声完全同时。</p>
      <div class="row">
        <button class="px-btn small blue" @click="mode === 'visual' ? stop() : startVisual()">{{ mode === 'visual' ? '停止' : '开始测试' }}</button>
        <div class="flash" :class="{ on: flash }" />
      </div>
      <label class="slider">
        音频偏移 <b class="num">{{ settings.s.audioOffset }} ms</b>
        <input v-model.number="settings.s.audioOffset" type="range" min="-200" max="200" step="5" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.calib {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.block h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: var(--yellow);
}
.block p {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--ink-light);
  line-height: 1.5;
}
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 6px 4px 12px;
}
.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.dots i {
  width: 10px;
  height: 10px;
  background: var(--bg-deep);
}
.dots i.warm {
  background: #4a3a62;
}
.dots i.done {
  background: var(--blue);
}
.dots i.on {
  background: var(--yellow);
  transform: scale(1.3);
}
.tap-pad {
  height: 80px;
  display: grid;
  place-items: center;
  background: var(--red-dark);
  font-weight: 800;
  cursor: pointer;
  touch-action: none;
  margin: 0 4px;
}
.tap-pad.active {
  background: var(--red);
}
.tap-pad:active {
  filter: brightness(1.3);
}
.res {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 12px !important;
}
.flash {
  width: 60px;
  height: 60px;
  background: var(--bg-deep);
  box-shadow: 0 0 0 4px var(--panel-light);
}
.flash.on {
  background: var(--yellow);
}
.slider {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
@media (max-width: 760px) {
  .calib {
    grid-template-columns: 1fr;
  }
}
</style>
