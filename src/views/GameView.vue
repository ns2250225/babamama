<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { AudioEngine } from '../audio/AudioEngine'
import DialogueBubble from '../components/DialogueBubble.vue'
import DonButton from '../components/DonButton.vue'
import KaButton from '../components/KaButton.vue'
import { SONGS, getBeatmap, getSong } from '../data/songs'
import { createGame } from '../game/createGame'
import type { GamePhase, HeadLayout, HudState } from '../game/GameBridge'
import { DIFFICULTY_LABEL, type GameResult, type HitKind } from '../game/types/Beatmap'
import { useRecords } from '../stores/records'
import { useSession } from '../stores/session'
import { useSettings } from '../stores/settings'

const router = useRouter()
const session = useSession()
const settings = useSettings()
const records = useRecords()

const stageEl = ref<HTMLDivElement>()
const handle = shallowRef<ReturnType<typeof createGame> | null>(null)
const loading = ref(true)
const phase = ref<GamePhase>('countdown')
const hud = reactive<HudState>({ score: 0, combo: 0, progress: 0, hits: 0, maxCombo: 0 })
const heads = reactive<HeadLayout>({ mom: { x: 0, y: 0, w: 0 }, dad: { x: 0, y: 0, w: 0 } })
const bubbles = reactive({ mom: { text: '', visible: false, timer: 0 }, dad: { text: '', visible: false, timer: 0 } })
const result = ref<GameResult | null>(null)
const newBest = ref(false)
const pulse = reactive({ don: 0, ka: 0 })

const song = computed(() => (session.songId ? getSong(session.songId) : undefined))
const title = computed(() => song.value?.title ?? '')
const nextSong = computed(() => {
  if (!song.value) return null
  const i = SONGS.findIndex((s) => s.id === song.value!.id)
  const n = SONGS[i + 1]
  if (!n) return null
  return session.free || records.unlocked[n.id] ? n : null
})

function resetUi() {
  Object.assign(hud, { score: 0, combo: 0, progress: 0, hits: 0, maxCombo: 0 })
  bubbles.mom.visible = false
  bubbles.dad.visible = false
  result.value = null
  newBest.value = false
  phase.value = 'countdown'
}

async function boot() {
  const s = song.value
  if (!s) {
    router.replace('/select')
    return
  }
  handle.value?.destroy()
  handle.value = null
  AudioEngine.stopMusic()
  resetUi()
  loading.value = true
  const buffer = await AudioEngine.getSongBuffer(s)
  if (!stageEl.value) return
  const h = createGame(stageEl.value, {
    song: s,
    beatmap: session.free ? null : getBeatmap(s.id, session.difficulty),
    difficulty: session.difficulty,
    free: session.free,
    buffer,
    settings: settings.gameSettings(),
  })
  h.bridge.on('hud', (v: HudState) => Object.assign(hud, v))
  h.bridge.on('layout', (v: HeadLayout) => Object.assign(heads, v))
  h.bridge.on('phase', (p: GamePhase) => (phase.value = p))
  h.bridge.on('say', (e: { who: 'mom' | 'dad'; text: string; duration: number }) => {
    const b = bubbles[e.who]
    b.text = e.text
    b.visible = true
    clearTimeout(b.timer)
    b.timer = window.setTimeout(() => (b.visible = false), e.duration)
  })
  h.bridge.on('result', async (r: GameResult) => {
    result.value = r
    session.lastResult = r
    newBest.value = await records.save(r)
  })
  handle.value = h
  loading.value = false
}

function hit(kind: HitKind, ts: number) {
  if (phase.value === 'result') return
  handle.value?.bridge.send('hit', kind, ts)
}

function pause() {
  AudioEngine.play('click')
  handle.value?.bridge.send('pause')
}
function resume() {
  AudioEngine.play('click')
  handle.value?.bridge.send('resume')
}
function restart() {
  AudioEngine.play('select')
  boot()
}
function toSelect() {
  AudioEngine.play('click')
  router.push({ path: '/select', query: session.free ? { mode: 'free' } : {} })
}
function playNext() {
  const n = nextSong.value
  if (!n) return
  AudioEngine.play('select')
  session.select(n.id, session.free ? session.difficulty : n.difficulty, session.free)
  boot()
}

// ───── 键盘：D/F=咚 J/K=哒，长按不重复触发 ─────
const held = new Set<string>()
const KEYMAP: Record<string, HitKind> = { KeyD: 'don', KeyF: 'don', KeyJ: 'ka', KeyK: 'ka' }
function onKeyDown(e: KeyboardEvent) {
  const kind = KEYMAP[e.code]
  if (kind) {
    e.preventDefault()
    if (e.repeat || held.has(e.code)) return
    held.add(e.code)
    hit(kind, e.timeStamp)
    pulse[kind]++
    return
  }
  if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') {
    e.preventDefault()
    if (e.repeat) return
    if (phase.value === 'paused') resume()
    else if (phase.value === 'playing' || phase.value === 'countdown') pause()
    else if (phase.value === 'result' && e.code === 'Space') restart()
  }
}
function onKeyUp(e: KeyboardEvent) {
  held.delete(e.code)
}
function onBlur() {
  held.clear()
}

onMounted(() => {
  if (!song.value) {
    router.replace('/select')
    return
  }
  AudioEngine.unlock()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  boot()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
  handle.value?.destroy()
  AudioEngine.stopMusic()
  clearTimeout(bubbles.mom.timer)
  clearTimeout(bubbles.dad.timer)
})

const scoreStr = computed(() => String(hud.score).padStart(7, '0').replace(/\B(?=(\d{3})+(?!\d))/g, ','))
</script>

<template>
  <div class="game" @touchmove.prevent @contextmenu.prevent>
    <div ref="stageEl" class="stage">
      <!-- 顶部 HUD -->
      <div class="hud" :class="{ hide: phase === 'result' }">
        <button class="pause-btn" aria-label="暂停" @pointerdown.stop.prevent="pause">❚❚</button>
        <div class="song-name">
          <b>{{ title }}</b>
          <small>{{ session.free ? '自由演奏' : DIFFICULTY_LABEL[session.difficulty] }}</small>
        </div>
        <div class="score">
          <small>{{ session.free ? 'HITS' : '得分' }}</small>
          <b class="num">{{ session.free ? hud.hits : scoreStr }}</b>
        </div>
        <div class="combo">
          <small>COMBO</small>
          <b class="num" :class="{ hot: hud.combo >= 30 }">{{ hud.combo }}</b>
        </div>
        <div class="progress"><i :style="{ width: hud.progress * 100 + '%' }" /></div>
      </div>

      <DialogueBubble who="mom" :text="bubbles.mom.text" :visible="bubbles.mom.visible" :x="heads.mom.x" :y="heads.mom.y" :head-w="heads.mom.w" />
      <DialogueBubble who="dad" :text="bubbles.dad.text" :visible="bubbles.dad.visible" :x="heads.dad.x" :y="heads.dad.y" :head-w="heads.dad.w" />

      <div v-if="newBest && phase === 'result'" class="new-best">NEW RECORD!</div>

      <div v-if="loading" class="loading">
        <div class="spinner"><i /><i /><i /></div>
        <p>爸爸妈妈正在热身……</p>
        <small>正在准备音乐「{{ title }}」</small>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="controls">
      <template v-if="phase !== 'result'">
        <DonButton :show-keys="settings.s.showKeyHints" :pulse="pulse.don" @hit="(t) => hit('don', t)" />
        <div class="gap" />
        <KaButton :show-keys="settings.s.showKeyHints" :pulse="pulse.ka" @hit="(t) => hit('ka', t)" />
      </template>
      <div v-else class="result-actions">
        <button class="px-btn" @click="restart">↻ 重新挑战</button>
        <button class="px-btn blue" :disabled="!nextSong" @click="playNext">{{ nextSong ? '下一首 ▶' : '没有下一首' }}</button>
        <button class="px-btn ghost" @click="toSelect">返回选曲</button>
      </div>
    </div>

    <!-- 暂停菜单 -->
    <div v-if="phase === 'paused'" class="overlay">
      <div class="menu px-box">
        <h2 class="px-title">暂停中</h2>
        <button class="px-btn yellow" @click="resume">▶ 继续</button>
        <button class="px-btn" @click="restart">↻ 重新开始</button>
        <button class="px-btn ghost" @click="toSelect">返回选曲</button>
        <div class="vol">
          <label>音乐 <input v-model.number="settings.s.musicVol" type="range" min="0" max="1" step="0.05" /></label>
          <label>音效 <input v-model.number="settings.s.sfxVol" type="range" min="0" max="1" step="0.05" /></label>
        </div>
        <small>Esc / P / 空格 也可以继续</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-deep);
  touch-action: none;
  overflow: hidden;
}
.stage {
  position: relative;
  flex: 72 1 0;
  min-height: 0;
  overflow: hidden;
}
.stage :deep(canvas) {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
}
.controls {
  flex: 28 1 0;
  min-height: 90px;
  display: flex;
  padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  background: var(--bg-deep);
  position: relative;
  z-index: 5;
}
.gap {
  width: max(10px, 1.5vw);
  background: var(--bg-deep);
}
.hud {
  position: absolute;
  z-index: 10;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: clamp(8px, 2vw, 24px);
  padding: max(6px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) 6px max(10px, env(safe-area-inset-left));
  background: linear-gradient(rgba(27, 17, 38, 0.75), rgba(27, 17, 38, 0));
  pointer-events: none;
  transition: opacity 0.3s;
}
.hud.hide {
  opacity: 0;
}
.pause-btn {
  pointer-events: auto;
  border: none;
  background: var(--panel-light);
  color: #fff;
  width: clamp(34px, 7vh, 46px);
  height: clamp(34px, 7vh, 46px);
  font-size: clamp(12px, 2.6vh, 16px);
  cursor: pointer;
  box-shadow: 0 0 0 3px var(--bg-deep), inset 0 -4px 0 rgba(0, 0, 0, 0.3);
  touch-action: none;
}
.song-name {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  text-shadow: 2px 2px 0 var(--bg-deep);
}
.song-name b {
  font-size: clamp(13px, 3vh, 20px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.song-name small,
.score small,
.combo small {
  font-size: clamp(9px, 1.8vh, 12px);
  color: var(--ink-light);
  font-weight: 800;
  letter-spacing: 1px;
}
.score,
.combo {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-shadow: 2px 2px 0 var(--bg-deep), -2px -2px 0 var(--bg-deep), 2px -2px 0 var(--bg-deep), -2px 2px 0 var(--bg-deep);
}
.score b {
  font-size: clamp(16px, 4.2vh, 30px);
}
.combo {
  min-width: 70px;
}
.combo b {
  font-size: clamp(16px, 4.2vh, 30px);
  color: #fff;
}
.combo b.hot {
  color: var(--yellow);
}
.progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
}
.progress i {
  display: block;
  height: 100%;
  background: var(--yellow);
}
.new-best {
  position: absolute;
  z-index: 15;
  right: 4%;
  top: 2%;
  font-weight: 900;
  font-size: clamp(14px, 3.5vh, 24px);
  color: var(--yellow);
  text-shadow: 3px 3px 0 var(--bg-deep);
  animation: blink 0.6s steps(2) infinite;
}
@keyframes blink {
  50% { opacity: 0.4; }
}
.loading {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.loading p {
  font-weight: 900;
  font-size: 20px;
  margin: 8px 0 0;
}
.loading small {
  color: var(--muted);
}
.spinner {
  display: flex;
  gap: 10px;
}
.spinner i {
  width: 18px;
  height: 18px;
  background: var(--red);
  animation: hop 0.6s ease-in-out infinite alternate;
}
.spinner i:nth-child(2) {
  background: var(--blue);
  animation-delay: 0.2s;
}
.spinner i:nth-child(3) {
  background: var(--yellow);
  animation-delay: 0.4s;
}
@keyframes hop {
  to { transform: translateY(-14px); }
}
.result-actions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 4vw, 40px);
  padding: 10px;
}
.result-actions .px-btn {
  font-size: clamp(14px, 3.4vh, 22px);
}
.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(27, 17, 38, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}
.menu {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 32px;
  min-width: 260px;
  max-height: 92%;
  overflow: auto;
  text-align: center;
}
.menu h2 {
  margin: 0 0 6px;
  font-size: 26px;
}
.menu small {
  color: var(--muted);
}
.vol {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-light);
}
.vol label {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
@media (max-height: 420px) {
  .menu { gap: 9px; padding: 12px 24px; }
  .menu h2 { font-size: 20px; }
  .menu .px-btn { padding: 7px 16px; font-size: 15px; }
}
</style>
