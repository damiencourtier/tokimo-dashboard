<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { computed } from 'vue'

const props = defineProps<{
  monthlyNetInterest: Record<string, number>
  monthlyForecastNet: number
}>()

const months = computed(() => Object.keys(props.monthlyNetInterest).sort())
const lastMonths = computed(() => months.value.slice(-6))

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const forecastLabels = computed(() => {
  const last = months.value[months.value.length - 1]
  if (!last) return []
  return Array.from({ length: 12 }, (_, i) => addMonths(last, i + 1))
})

const allLabels = computed(() => lastMonths.value.concat(forecastLabels.value))

const histSeries = computed(() =>
  lastMonths.value.map(m => props.monthlyNetInterest[m] || 0).concat(Array(12).fill(null))
)

const foreSeries = computed(() => {
  const bridge = lastMonths.value.length
    ? props.monthlyNetInterest[lastMonths.value[lastMonths.value.length - 1]] || 0
    : 0
  return Array(Math.max(lastMonths.value.length - 1, 0))
    .fill(null)
    .concat([bridge])
    .concat(Array(12).fill(props.monthlyForecastNet))
})

const chartData = computed(() => ({
  labels: allLabels.value,
  datasets: [
    {
      label: 'Intérêts nets réels',
      data: histSeries.value,
      borderColor: '#6C3EF4',
      backgroundColor: 'transparent',
      tension: 0.25,
      pointRadius: 3
    },
    {
      label: 'Prévision nette (théorique)',
      data: foreSeries.value,
      borderColor: '#F5A623',
      borderDash: [6, 4],
      backgroundColor: 'transparent',
      tension: 0.1,
      pointRadius: 3
    }
  ]
}))

const chartOptions = {
  plugins: { legend: { position: 'top' as const, labels: { boxWidth: 10, font: { size: 11 } } } },
  scales: { y: { beginAtZero: true, title: { display: true, text: '€ net / mois' } } }
}

const avgLast6 = computed(() => {
  if (!lastMonths.value.length) return 0
  const total = lastMonths.value.reduce((s, m) => s + (props.monthlyNetInterest[m] || 0), 0)
  return total / lastMonths.value.length
})

defineExpose({ avgLast6 })
</script>

<template>
  <div>
    <Line :key="$colorMode.value" :data="chartData" :options="chartOptions" />
    <p class="text-xs text-muted mt-3 leading-relaxed">
      Estimation : environ <b>{{ monthlyForecastNet.toFixed(0) }} € net/mois</b> d'intérêts
      (soit ~{{ (monthlyForecastNet * 12).toFixed(0) }} €/an net) sur le capital actuellement actif,
      si tous les projets tiennent leur taux cible. Moyenne réelle nette des 6 derniers mois :
      {{ avgLast6.toFixed(0) }} €/mois. L'écart vient des gros remboursements ponctuels (sorties de
      projets) qui ne se répètent pas chaque mois.
    </p>
  </div>
</template>
