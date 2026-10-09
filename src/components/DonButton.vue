<script setup lang="ts">
import DrumButton from './DrumButton.vue'
defineProps<{ showKeys: boolean; pulse: number }>()
const emit = defineEmits<{ hit: [timeStamp: number] }>()
</script>

<template>
  <DrumButton kind="don" label="咚" keys="D / F" :show-keys="showKeys" :pulse="pulse" @hit="(t) => emit('hit', t)" />
</template>
