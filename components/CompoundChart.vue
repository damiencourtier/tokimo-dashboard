<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { computed } from 'vue'
import type { CompoundPoint } from '../utils/simulate'

const props = defineProps<{ timeline: CompoundPoint[] }>()

const chartData = computed(() => ({
  labels: props.timeline.map(p => `M${p.month}`),
  datasets: [
    {
      label: 'Capital projeté',
      data: props.timeline.map(p => p.capital),
      borderColor: '#6C3EF4',
      backgroundColor: 'rgba(108, 62, 244, 0.12)',
      fill: true,
      tension: 0.2,
      pointRadius: 0
    }
  ]
}))

const chartOptions = {
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { maxTicksLimit: 12, font: { size: 9 } } },
    y: { beginAtZero: true, title: { display: true, text: '€' } }
  }
}
</script>

<template>
  <Line :key="$colorMode.value" :data="chartData" :options="chartOptions" />
</template>
