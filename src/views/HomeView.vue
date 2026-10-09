<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AudioEngine } from '../audio/AudioEngine'
import PixelCharacter from '../components/PixelCharacter.vue'

const router = useRouter()

function go(path: string, query?: Record<string, string>) {
  AudioEngine.unlock()
  AudioEngine.play('select')
  router.push({ path, query })
}
</script>

<template>
  <div class="page home">
    <div class="sky">
      <i v-for="n in 12" :key="n" class="star" :style="{ left: (n * 37) % 100 + '%', top: (n * 23) % 45 + '%', animationDelay: n * 0.3 + 's' }" />
    </div>
    <div class="content">
      <div class="logo">
        <h1 class="px-title">
          <span class="r">爸</span><span class="b">妈</span><span class="y">节</span><span class="r">奏</span><span class="b">操</span>
        </h1>
        <p class="tag">你负责打节奏，爸妈负责做操！</p>
      </div>
      <div class="stage">
        <PixelCharacter who="mom" :scale="4" :actions="['swingArms', 'raiseHands', 'jumpingJack', 'kick', 'clap', 'armCircle']" :bpm="112" />
        <div class="notes">
          <span class="n don" /><span class="n ka" /><span class="n don" /><span class="n roll" />
        </div>
        <PixelCharacter who="dad" :scale="4" :actions="['swingArms', 'sameSide', 'jumpingJack', 'kick', 'panic', 'armCircle']" :bpm="112" />
      </div>
      <div class="menu">
        <button class="px-btn" @click="go('/select')">开始游戏</button>
        <button class="px-btn blue" @click="go('/select', { mode: 'free' })">自由演奏</button>
        <button class="px-btn yellow" @click="go('/settings')">设置</button>
        <button class="px-btn ghost" @click="go('/help')">游玩说明</button>
      </div>
      <p class="foot">键盘 D/F = 咚 · J/K = 哒 · 支持触屏与鼠标 · 可离线游玩</p>
    </div>
    <div class="floor" />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(#2b1d3a 0 60%, #3a2a4c 60% 100%);
}
.sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.star {
  position: absolute;
  width: 6px;
  height: 6px;
  background: var(--yellow);
  animation: tw 1.6s steps(2) infinite;
}
@keyframes tw {
  50% { opacity: 0.2; }
}
.floor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40%;
  background: repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.12) 0 40px, transparent 40px 80px);
  pointer-events: none;
}
.content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto auto;
  grid-template-areas: 'logo stage' 'menu stage' 'foot foot';
  gap: 12px 48px;
  align-items: center;
  max-width: 1000px;
}
.logo {
  grid-area: logo;
}
.logo h1 {
  font-size: clamp(36px, 9vh, 72px);
  margin: 0;
}
.logo h1 span {
  display: inline-block;
  animation: bounce 0.55s ease-in-out infinite alternate;
}
.logo h1 span:nth-child(2n) {
  animation-delay: 0.27s;
}
.r { color: var(--red); }
.b { color: var(--blue); }
.y { color: var(--yellow); }
@keyframes bounce {
  to { transform: translateY(-6px); }
}
.tag {
  margin: 8px 0 0;
  color: var(--ink-light);
  font-weight: 700;
  font-size: clamp(13px, 2.8vh, 18px);
}
.stage {
  grid-area: stage;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 40px;
}
.n {
  width: 28px;
  height: 28px;
  border: 4px solid #fff;
  box-shadow: 0 0 0 3px var(--bg-deep);
  animation: bounce 0.4s steps(2) infinite alternate;
}
.n.don { background: #e8403f; border-radius: 50%; }
.n.ka { background: #3a86e8; }
.n.roll { background: #ffcc1a; border-radius: 14px; width: 48px; }
.menu {
  grid-area: menu;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  max-width: 420px;
}
.menu .px-btn {
  font-size: clamp(14px, 3.2vh, 20px);
  padding: clamp(8px, 2.2vh, 14px) 16px;
}
.foot {
  grid-area: foot;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  margin: 8px 0 0;
}
@media (max-height: 420px) {
  .stage :deep(canvas) {
    width: 120px !important;
    height: 160px !important;
  }
  .content { gap: 8px 24px; }
}
@media (max-width: 640px) and (orientation: portrait) {
  .content {
    grid-template-columns: 1fr;
    grid-template-areas: 'logo' 'stage' 'menu' 'foot';
    justify-items: center;
    text-align: center;
  }
}
</style>
