<script setup lang="ts">
defineProps<{
  label: string
  value: string
  sub?: string
  negative?: boolean
}>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <div class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{{ label }}</div>
    <div class="text-2xl font-bold" :class="negative ? 'text-red-500' : 'text-violet-700 dark:text-violet-400'">
      {{ value }}
    </div>
    <div v-if="sub" class="text-xs text-muted mt-1">{{ sub }}</div>
  </UCard>
</template>
