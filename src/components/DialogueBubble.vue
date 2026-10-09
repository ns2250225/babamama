<script setup lang="ts">
defineProps<{ who: 'mom' | 'dad'; text: string; visible: boolean; x: number; y: number; headW: number }>()
</script>

<template>
  <transition name="pop">
    <div
      v-if="visible"
      class="bubble"
      :class="who"
      :style="{
        left: who === 'mom' ? 'auto' : x + headW * 0.32 + 'px',
        right: who === 'mom' ? `calc(100% - ${x - headW * 0.32}px)` : 'auto',
        top: Math.max(56, y) + 'px',
        maxWidth: who === 'mom' ? `min(36vw, 280px, ${Math.max(90, x - headW * 0.32 - 8)}px)` : `min(36vw, 280px, calc(100vw - ${x + headW * 0.32 + 8}px))`,
      }"
    >
      <span class="name">{{ who === 'mom' ? '妈妈' : '爸爸' }}</span>
      <span class="txt">{{ text }}</span>
      <i class="tail" />
    </div>
  </transition>
</template>

<style scoped>
.bubble {
  position: absolute;
  z-index: 20;
  transform: translateY(-100%);
  background: #fffaf0;
  color: #2b1d2e;
  padding: 6px 10px 7px;
  font-size: clamp(11px, 2.4vh, 17px);
  font-weight: 800;
  line-height: 1.35;
  pointer-events: none;
  box-shadow:
    0 -3px 0 0 #1b1126,
    0 3px 0 0 #1b1126,
    -3px 0 0 0 #1b1126,
    3px 0 0 0 #1b1126,
    inset 0 -3px 0 0 #e7dccb;
  transition: left 0.15s linear, right 0.15s linear, top 0.15s linear;
}
.name {
  display: block;
  font-size: 0.72em;
  letter-spacing: 1px;
  color: #e8435a;
}
.dad .name {
  color: #2a5bb0;
}
.tail {
  position: absolute;
  bottom: -9px;
  width: 9px;
  height: 9px;
  background: #fffaf0;
  box-shadow: 3px 0 0 #1b1126, 0 3px 0 #1b1126, 3px 3px 0 #1b1126;
}
.mom .tail {
  right: 6px;
}
.dad .tail {
  left: 6px;
  box-shadow: -3px 0 0 #1b1126, 0 3px 0 #1b1126, -3px 3px 0 #1b1126;
}
.pop-enter-active {
  animation: pop 0.18s steps(3);
}
.pop-leave-active {
  transition: opacity 0.2s;
}
.pop-leave-to {
  opacity: 0;
}
@keyframes pop {
  from { transform: translateY(-100%) scale(0.4); }
  to { transform: translateY(-100%) scale(1); }
}
</style>
