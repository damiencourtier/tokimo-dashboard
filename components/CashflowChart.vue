<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { computed } from 'vue'

const props = defineProps<{
  monthlyNetInterest: Record<string, number>
  monthlyCapitalRepaid: Record<string, number>
}>()

const months = computed(() => Object.keys(props.monthlyNetInterest).sort())

const chartData = computed(() => ({
  labels: months.value,
  datasets: [
    {
      label: 'Intérêts nets',
      data: months.value.map(m => props.monthlyNetInterest[m] || 0),
      backgroundColor: '#6C3EF4',
      stack: 's'
    },
    {
      label: 'Capital remboursé',
      data: months.value.map(m => props.monthlyCapitalRepaid[m] || 0),
      backgroundColor: '#E5E1FA',
      stack: 's'
    }
  ]
}))

const chartOptions = {
  responsive: true,
  scales: {
    x: { stacked: true, ticks: { maxRotation: 90, minRotation: 90, font: { size: 9 } } },
    y: { stacked: true }
  },
  plugins: { legend: { position: 'top' as const, labels: { boxWidth: 10, font: { size: 11 } } } }
}
</script>

<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>
