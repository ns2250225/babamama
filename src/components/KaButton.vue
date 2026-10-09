<script setup lang="ts">
import DrumButton from './DrumButton.vue'
defineProps<{ showKeys: boolean; pulse: number }>()
const emit = defineEmits<{ hit: [timeStamp: number] }>()
</script>

<template>
  <DrumButton kind="ka" label="哒" keys="J / K" :show-keys="showKeys" :pulse="pulse" @hit="(t) => emit('hit', t)" />
</template>
