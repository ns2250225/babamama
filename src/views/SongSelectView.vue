<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AudioEngine } from '../audio/AudioEngine'
import PixelCharacter from '../components/PixelCharacter.vue'
import { SONGS, getBeatmap, songDurationMs } from '../data/songs'
import { SCENE_NAMES } from '../game/art/BackgroundArt'
import { DIFFICULTY_LABEL, type Difficulty } from '../game/types/Beatmap'
import { useRecords } from '../stores/records'
import { useSession } from '../stores/session'

const route = useRoute()
const router = useRouter()
const records = useRecords()
const session = useSession()

const free = computed(() => route.query.mode === 'free')
const initial = SONGS.findIndex((s) => s.id === session.songId)
const selected = ref(Math.max(0, initial))
const diff = ref<Difficulty>(session.songId ? session.difficulty : SONGS[selected.value].difficulty)
const song = computed(() => SONGS[selected.value])
const locked = computed(() => !free.value && !records.unlocked[song.value.id])
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']

function choose(i: number) {
  AudioEngine.unlock()
  AudioEngine.play('click')
  if (selected.value !== i) {
    selected.value = i
    diff.value = SONGS[i].difficulty
  }
}

function setDiff(d: Difficulty) {
  AudioEngine.play('click')
  diff.value = d
}

function rec(id: string, d: Difficulty) {
  return records.get(id, d)
}

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const noteCount = computed(() => getBeatmap(song.value.id, diff.value).notes.length)

function start() {
  if (locked.value) return
  AudioEngine.unlock()
  AudioEngine.play('select')
  session.select(song.value.id, diff.value, free.value)
  // 移动端尝试全屏并锁定横屏
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (coarse && !document.fullscreenElement) {
    const p = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? (el.webkitRequestFullscreen?.(), undefined)
    Promise.resolve(p)
      .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
      .catch(() => {})
  }
  router.push('/game')
}
</script>

<template>
  <div class="page select">
    <div class="page-head">
      <button class="px-btn ghost small" @click="router.push('/')">◀ 返回</button>
      <h1 class="px-title">{{ free ? '自由演奏 · 选择音乐' : '选择音乐和难度' }}</h1>
    </div>
    <div class="layout">
      <div class="list">
        <button
          v-for="(s, i) in SONGS"
          :key="s.id"
          class="song px-box"
          :class="{ active: i === selected, locked: !free && !records.unlocked[s.id] }"
          @click="choose(i)"
        >
          <span class="idx num">{{ i + 1 }}</span>
          <span class="meta">
            <b>{{ !free && !records.unlocked[s.id] ? '？？？' : s.title }}</b>
            <small>
              <span class="num">BPM {{ s.bpm }}</span> · <span :class="'d-' + s.difficulty">{{ DIFFICULTY_LABEL[s.difficulty] }}</span>
            </small>
          </span>
          <span v-if="!free && !records.unlocked[s.id]" class="lock">🔒</span>
          <span v-else-if="!free" class="ranks">
            <i v-for="d in DIFFS" :key="d" :class="['r', rec(s.id, d)?.bestRank ?? 'none']">{{ rec(s.id, d)?.bestRank ?? '-' }}</i>
          </span>
        </button>
      </div>
      <div class="detail px-box">
        <template v-if="locked">
          <div class="locked-info">
            <div class="big">🔒</div>
            <p>通关上一首「{{ SONGS[selected - 1]?.title }}」（任意难度评级 C 以上）即可解锁</p>
          </div>
        </template>
        <template v-else>
          <div class="title-row">
            <div>
              <h2>{{ song.title }}</h2>
              <p class="desc">{{ song.desc }}</p>
            </div>
            <div class="chars">
              <PixelCharacter who="mom" :scale="2" :bpm="song.bpm" :actions="['swingArms', 'clap', 'kick']" />
              <PixelCharacter who="dad" :scale="2" :bpm="song.bpm" :actions="['march', 'twist', 'raiseHands']" />
            </div>
          </div>
          <div class="info">
            <span>BPM <b class="num">{{ song.bpm }}</b></span>
            <span>时长 <b class="num">{{ fmtTime(songDurationMs(song)) }}</b></span>
            <span>场景 <b>{{ SCENE_NAMES[song.scene] }}</b></span>
            <span v-if="!free">音符 <b class="num">{{ noteCount }}</b></span>
          </div>
          <template v-if="!free">
            <div class="diffs">
              <button v-for="d in DIFFS" :key="d" class="px-btn small" :class="[{ ghost: diff !== d }, d === 'easy' ? 'blue' : d === 'normal' ? 'yellow' : '']" @click="setDiff(d)">
                {{ DIFFICULTY_LABEL[d] }}
              </button>
            </div>
            <div class="best">
              <div><small>最高分</small><b class="num">{{ (rec(song.id, diff)?.bestScore ?? 0).toLocaleString() }}</b></div>
              <div><small>最高连击</small><b class="num">{{ rec(song.id, diff)?.bestCombo ?? 0 }}</b></div>
              <div><small>最佳准确率</small><b class="num">{{ (rec(song.id, diff)?.bestAccuracy ?? 0).toFixed(1) }}%</b></div>
              <div><small>历史评级</small><b class="num rank" :class="rec(song.id, diff)?.bestRank">{{ rec(song.id, diff)?.bestRank ?? '-' }}</b></div>
            </div>
            <div class="badges">
              <span v-if="rec(song.id, diff)?.allPerfect" class="badge gold">全 PERFECT</span>
              <span v-else-if="rec(song.id, diff)?.fullCombo" class="badge">全连击</span>
              <span v-if="rec(song.id, diff)?.cleared" class="badge green">已通关</span>
              <span v-if="rec(song.id, diff)" class="badge ghost">游玩 {{ rec(song.id, diff)?.plays }} 次</span>
            </div>
          </template>
          <p v-else class="desc free-tip">自由演奏不显示谱面，随意敲击「咚」「哒」，爸爸妈妈会跟着你的鼓点做操！</p>
          <button class="px-btn go" @click="start">▶ 开始{{ free ? '演奏' : '挑战' }}</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(300px, 1.4fr);
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
}
.song {
  border: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  color: var(--ink);
}
.song.active {
  background: var(--red);
}
.song.locked {
  opacity: 0.6;
}
.idx {
  font-size: 24px;
  width: 32px;
  text-align: center;
  color: var(--yellow);
}
.song.active .idx {
  color: #fff;
}
.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.meta b {
  font-size: 16px;
}
.meta small {
  color: var(--ink-light);
  font-size: 12px;
}
.d-easy { color: #8fe3ff; }
.d-normal { color: var(--yellow); }
.d-hard { color: #ff9aa8; }
.song.active .meta small span { color: #fff; }
.ranks {
  display: flex;
  gap: 4px;
}
.r {
  font-style: normal;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;
  background: var(--bg-deep);
  color: var(--muted);
}
.r.S { color: var(--yellow); }
.r.A { color: #ff7a59; }
.r.B { color: #6dff8a; }
.r.C { color: #6ec6ff; }
.detail {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: start;
  position: sticky;
  top: 0;
}
.title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.chars {
  display: flex;
  align-items: flex-end;
}
h2 {
  margin: 0;
  font-size: 26px;
}
.desc {
  color: var(--ink-light);
  margin: 6px 0 0;
}
.info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  color: var(--muted);
}
.info b {
  color: var(--ink);
}
.diffs {
  display: flex;
  gap: 16px;
  padding: 4px;
}
.best {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  background: var(--bg-deep);
  padding: 12px;
}
.best div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.best small {
  color: var(--muted);
  font-size: 11px;
}
.best b {
  font-size: 18px;
}
.rank.S { color: var(--yellow); }
.rank.A { color: #ff7a59; }
.rank.B { color: #6dff8a; }
.rank.C { color: #6ec6ff; }
.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 22px;
}
.badge {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 8px;
  background: #ff9f1c;
  color: #2b1d2e;
}
.badge.gold { background: var(--yellow); }
.badge.green { background: #6dff8a; }
.badge.ghost { background: var(--panel-light); color: var(--ink); }
.go {
  font-size: 22px;
  margin: 6px 4px 4px;
}
.locked-info {
  text-align: center;
  padding: 40px 10px;
  color: var(--ink-light);
}
.locked-info .big {
  font-size: 48px;
}
.free-tip {
  background: var(--bg-deep);
  padding: 12px;
}
@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr 1.3fr;
    gap: 14px;
  }
  .song { padding: 8px 10px; }
  .ranks { display: none; }
  .detail { padding: 14px; gap: 10px; }
  .best { grid-template-columns: repeat(2, 1fr); }
  h2 { font-size: 20px; }
  .chars { display: none; }
}
@media (max-height: 460px) {
  .page-head { margin-bottom: 10px; }
  .page-head h1 { font-size: 20px; }
  .list { gap: 10px; }
  .song { padding: 6px 10px; }
  .detail { gap: 8px; }
}
</style>
