<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { computed } from 'vue'

const props = defineProps<{
  statusBreakdown: Record<string, number>
}>()

const colors: Record<string, string> = {
  'Financé': '#1DAA6B',
  'Remboursé': '#6C3EF4',
  'Clôturé': '#F5A623',
  'Publié': '#2563EB'
}

const labels = computed(() => Object.keys(props.statusBreakdown))

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      data: labels.value.map(s => props.statusBreakdown[s]),
      backgroundColor: labels.value.map(s => colors[s] || '#B9A3F8')
    }
  ]
}))

const chartOptions = {
  // Hauteur fixée par le conteneur (même hauteur que le graphique voisin).
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 } } } }
}
</script>

<template>
  <div class="h-[280px]">
    <Doughnut :key="$colorMode.value" :data="chartData" :options="chartOptions" />
  </div>
</template>
