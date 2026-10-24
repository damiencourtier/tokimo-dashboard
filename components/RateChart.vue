<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { computed } from 'vue'

const props = defineProps<{
  rateBreakdown: Record<string, number>
}>()

const labels = computed(() => Object.keys(props.rateBreakdown).sort())

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Capital (€)',
      data: labels.value.map(r => props.rateBreakdown[r]),
      backgroundColor: '#6C3EF4',
      borderRadius: 6
    }
  ]
}))

const chartOptions = {
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } }
}
</script>

<template>
  <Bar :key="$colorMode.value" :data="chartData" :options="chartOptions" />
</template>
