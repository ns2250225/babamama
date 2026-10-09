<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRecords } from './stores/records'

const records = useRecords()
const portrait = ref(false)

function check() {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  portrait.value = coarse && window.innerHeight > window.innerWidth
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`)
}

onMounted(() => {
  records.load()
  check()
  window.addEventListener('resize', check)
  window.addEventListener('orientationchange', check)
  // 禁止双指缩放、长按菜单
  document.addEventListener('gesturestart', (e) => e.preventDefault())
  document.addEventListener('contextmenu', (e) => e.preventDefault())
})
onUnmounted(() => {
  window.removeEventListener('resize', check)
  window.removeEventListener('orientationchange', check)
})
</script>

<template>
  <div class="app-root">
    <router-view />
    <div v-if="portrait" class="rotate-tip">
      <div class="phone">
        <div class="screen" />
      </div>
      <p>请将设备横过来游玩</p>
      <small>横屏能让爸爸妈妈、节奏轨道和按键都有足够空间</small>
    </div>
  </div>
</template>

<style scoped>
.app-root {
  width: 100%;
  height: var(--app-h, 100dvh);
  height: 100dvh;
  overflow: hidden;
  position: relative;
}
.rotate-tip {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
  padding: 24px;
}
.rotate-tip p {
  font-size: 22px;
  font-weight: 900;
}
.rotate-tip small {
  color: var(--muted);
}
.phone {
  width: 60px;
  height: 100px;
  border: 6px solid var(--ink-light);
  border-radius: 10px;
  animation: rot 2s ease-in-out infinite;
  display: flex;
  padding: 6px;
}
.screen {
  flex: 1;
  background: var(--red);
}
@keyframes rot {
  0%, 20% { transform: rotate(0deg); }
  60%, 100% { transform: rotate(-90deg); }
}
</style>
