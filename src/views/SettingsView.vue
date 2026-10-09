<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AudioEngine } from '../audio/AudioEngine'
import CalibrationPanel from '../components/CalibrationPanel.vue'
import { useRecords } from '../stores/records'
import { useSettings } from '../stores/settings'

const router = useRouter()
const settings = useSettings()
const records = useRecords()
const s = settings.s
const confirmClear = ref(false)
const vibSupported = 'vibrate' in navigator

function test(kind: 'don' | 'ka') {
  AudioEngine.unlock()
  AudioEngine.play(kind)
}

async function clearData() {
  if (!confirmClear.value) {
    confirmClear.value = true
    setTimeout(() => (confirmClear.value = false), 3000)
    return
  }
  await records.clearAll()
  confirmClear.value = false
}
</script>

<template>
  <div class="page settings">
    <div class="page-head">
      <button class="px-btn ghost small" @click="router.back()">◀ 返回</button>
      <h1 class="px-title">设置</h1>
    </div>
    <div class="grid">
      <section class="px-box">
        <h2>声音</h2>
        <label>音乐音量 <b class="num">{{ Math.round(s.musicVol * 100) }}%</b>
          <input v-model.number="s.musicVol" type="range" min="0" max="1" step="0.05" />
        </label>
        <label>音效音量 <b class="num">{{ Math.round(s.sfxVol * 100) }}%</b>
          <input v-model.number="s.sfxVol" type="range" min="0" max="1" step="0.05" />
        </label>
        <div class="row">
          <button class="px-btn small" @click="test('don')">试听 咚</button>
          <button class="px-btn small blue" @click="test('ka')">试听 哒</button>
        </div>
      </section>

      <section class="px-box">
        <h2>游戏</h2>
        <label>音符速度 <b class="num">{{ s.noteSpeed.toFixed(1) }}x</b>
          <input v-model.number="s.noteSpeed" type="range" min="0.6" max="2.5" step="0.1" />
        </label>
        <div class="opt">
          <span>判定严格度</span>
          <div class="seg">
            <button :class="{ on: s.strictness === 'loose' }" @click="s.strictness = 'loose'">宽松</button>
            <button :class="{ on: s.strictness === 'standard' }" @click="s.strictness = 'standard'">标准</button>
            <button :class="{ on: s.strictness === 'strict' }" @click="s.strictness = 'strict'">严格</button>
          </div>
        </div>
        <p class="hint">标准：PERFECT ±35ms / GREAT ±75ms / GOOD ±120ms（简单难度略宽，困难难度略严）</p>
        <div class="opt">
          <span>按键提示</span>
          <div class="seg">
            <button :class="{ on: s.showKeyHints }" @click="s.showKeyHints = true">显示</button>
            <button :class="{ on: !s.showKeyHints }" @click="s.showKeyHints = false">隐藏</button>
          </div>
        </div>
      </section>

      <section class="px-box">
        <h2>画面与反馈</h2>
        <div class="opt">
          <span>特效强度</span>
          <div class="seg">
            <button :class="{ on: s.effects === 'low' }" @click="s.effects = 'low'">低</button>
            <button :class="{ on: s.effects === 'mid' }" @click="s.effects = 'mid'">中</button>
            <button :class="{ on: s.effects === 'high' }" @click="s.effects = 'high'">高</button>
          </div>
        </div>
        <div class="opt">
          <span>震动反馈{{ vibSupported ? '' : '（当前设备不支持）' }}</span>
          <div class="seg">
            <button :class="{ on: s.vibration }" :disabled="!vibSupported" @click="s.vibration = true">开</button>
            <button :class="{ on: !s.vibration }" @click="s.vibration = false">关</button>
          </div>
        </div>
        <div class="opt">
          <span>爸妈台词</span>
          <div class="seg">
            <button :class="{ on: s.dialogue }" @click="s.dialogue = true">开</button>
            <button :class="{ on: !s.dialogue }" @click="s.dialogue = false">关</button>
          </div>
        </div>
        <label>台词频率 <b class="num">{{ s.dialogueFreq.toFixed(1) }}x</b>
          <input v-model.number="s.dialogueFreq" type="range" min="0.5" max="1.6" step="0.1" :disabled="!s.dialogue" />
        </label>
      </section>

      <section class="px-box">
        <h2>延迟</h2>
        <label>音频偏移 <b class="num">{{ s.audioOffset }} ms</b>
          <input v-model.number="s.audioOffset" type="range" min="-200" max="200" step="5" />
        </label>
        <label>输入延迟 <b class="num">{{ s.inputOffset }} ms</b>
          <input v-model.number="s.inputOffset" type="range" min="-200" max="200" step="1" />
        </label>
        <p class="hint">若总是判为「偏晚」，可增大输入延迟；蓝牙耳机通常需要较大的音频偏移。</p>
      </section>

      <section class="px-box wide">
        <h2>延迟校准</h2>
        <CalibrationPanel />
      </section>

      <section class="px-box wide">
        <h2>数据</h2>
        <p class="hint">所有成绩仅保存在本设备浏览器中（IndexedDB），无需注册账号。</p>
        <div class="row">
          <button class="px-btn small ghost" @click="settings.reset()">恢复默认设置</button>
          <button class="px-btn small" @click="clearData">{{ confirmClear ? '再点一次确认清除' : '清除全部成绩' }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
  max-width: 1000px;
  margin: 0 auto 24px;
}
section {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
section.wide {
  grid-column: 1 / -1;
}
h2 {
  margin: 0;
  font-size: 18px;
  color: var(--yellow);
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}
label b {
  color: var(--ink-light);
  margin-left: 6px;
}
.row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 4px;
}
.opt {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.seg {
  display: flex;
  background: var(--bg-deep);
  padding: 3px;
  gap: 3px;
}
.seg button {
  border: none;
  background: transparent;
  color: var(--muted);
  font-weight: 800;
  padding: 6px 12px;
  cursor: pointer;
}
.seg button.on {
  background: var(--red);
  color: #fff;
}
.seg button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
@media (max-width: 700px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
