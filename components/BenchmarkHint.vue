<script setup lang="ts">
import type { Benchmark } from '../utils/marketBenchmarks'

defineProps<{ benchmark?: Benchmark }>()
</script>

<template>
  <p v-if="benchmark" class="text-xs mt-1 leading-relaxed text-violet-700 dark:text-violet-400">
    {{ benchmark.source ? 'Repère du marché' : 'Par défaut' }} : {{ benchmark.text }}
    <template v-if="benchmark.source">
      (<a :href="benchmark.source.url" target="_blank" rel="noopener" class="underline">{{ benchmark.source.label }}</a>)
    </template>
  </p>
</template>
