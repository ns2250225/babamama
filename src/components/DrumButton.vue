<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ kind: 'don' | 'ka'; label: string; keys: string; showKeys: boolean; pulse: number }>()
const emit = defineEmits<{ hit: [timeStamp: number] }>()

const pressed = ref(false)
const bursts = ref<{ id: number; parts: { dx: number; dy: number; s: number }[] }[]>([])
let id = 0
let timer = 0

function press() {
  pressed.value = true
  clearTimeout(timer)
  timer = window.setTimeout(() => (pressed.value = false), 90)
  const n = props.kind === 'don' ? 8 : 10
  const parts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5
    const r = 60 + Math.random() * 50
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.7, s: 6 + Math.floor(Math.random() * 3) * 3 }
  })
  const b = { id: ++id, parts }
  bursts.value.push(b)
  if (bursts.value.length > 4) bursts.value.shift()
  setTimeout(() => {
    bursts.value = bursts.value.filter((x) => x.id !== b.id)
  }, 420)
}

// 键盘触发时也播放按下动画
watch(() => props.pulse, press)

function onDown(e: PointerEvent) {
  e.preventDefault()
  emit('hit', e.timeStamp)
  press()
}
</script>

<template>
  <div class="drum" :class="[kind, { pressed }]" @pointerdown="onDown" @contextmenu.prevent>
    <div class="face">
      <div class="icon" />
      <div class="label px-title">{{ label }}</div>
      <div v-if="showKeys" class="keys">{{ keys }}</div>
    </div>
    <div v-for="b in bursts" :key="b.id" class="burst">
      <span v-for="(p, i) in b.parts" :key="i" :style="{ '--dx': p.dx + 'px', '--dy': p.dy + 'px', width: p.s + 'px', height: p.s + 'px' }" />
      <i v-if="kind === 'don'" class="wave" />
    </div>
  </div>
</template>

<style scoped>
.drum {
  position: relative;
  flex: 1;
  height: 100%;
  touch-action: none;
  cursor: pointer;
  overflow: hidden;
  --c: var(--red);
  --cd: var(--red-dark);
  --cl: #ff7f8f;
}
.drum.ka {
  --c: var(--blue);
  --cd: var(--blue-dark);
  --cl: #7fb2ff;
}
.face {
  position: absolute;
  inset: 0;
  background: var(--c);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4%;
  box-shadow:
    inset 0 -10px 0 0 var(--cd),
    inset 0 6px 0 0 var(--cl),
    inset 6px 0 0 0 rgba(255, 255, 255, 0.12),
    inset -6px 0 0 0 rgba(0, 0, 0, 0.12);
  transition: transform 0.05s;
  background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0 8px, transparent 8px 16px);
}
.pressed .face {
  transform: translateY(6px) scale(0.98);
  filter: brightness(1.25);
  box-shadow:
    inset 0 -3px 0 0 var(--cd),
    inset 0 6px 0 0 rgba(0, 0, 0, 0.2);
}
.icon {
  width: min(14vh, 12vw);
  height: min(14vh, 12vw);
  max-width: 110px;
  max-height: 110px;
  background: #fff;
  box-shadow: 0 0 0 5px var(--bg-deep), inset 0 0 0 9px var(--c), inset 0 0 0 13px #fff;
  image-rendering: pixelated;
}
.don .icon {
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ff9a8a 0 12%, #e8403f 13% 100%);
  box-shadow: 0 0 0 5px var(--bg-deep), 0 0 0 10px #fff, 0 0 0 14px var(--bg-deep);
}
.ka .icon {
  background: linear-gradient(135deg, #9cccff 0 18%, #3a86e8 19% 100%);
  box-shadow: 0 0 0 5px var(--bg-deep), 0 0 0 10px #fff, 0 0 0 14px var(--bg-deep);
  width: min(12vh, 10.5vw);
  height: min(12vh, 10.5vw);
}
.label {
  font-size: min(10vh, 8vw);
  color: #fff;
  line-height: 1;
}
.keys {
  position: absolute;
  bottom: 5%;
  left: 0;
  right: 0;
  text-align: center;
  font-weight: 900;
  font-size: min(3.4vh, 16px);
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 2px;
}
.burst {
  position: absolute;
  left: 50%;
  top: 50%;
  pointer-events: none;
}
.burst span {
  position: absolute;
  background: #fff;
  animation: fly 0.4s ease-out forwards;
}
.ka .burst span {
  background: #bfe0ff;
}
.don .burst span {
  background: #ffd0c8;
}
@keyframes fly {
  from { transform: translate(0, 0); opacity: 1; }
  to { transform: translate(var(--dx), var(--dy)); opacity: 0; }
}
.wave {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 6px solid #fff;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  animation: wave 0.35s ease-out;
}
@keyframes wave {
  from { transform: scale(1); opacity: 0.9; }
  to { transform: scale(7); opacity: 0; }
}
</style>
