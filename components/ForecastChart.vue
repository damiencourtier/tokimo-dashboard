<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { computed, ref } from 'vue'
import type { ForecastSeries } from '../utils/forecastSeries'

const props = defineProps<{
  monthlyNetInterest: Record<string, number>
  forecast: ForecastSeries
  monthlyForecastNet: number
}>()

const periods = [
  { label: '6 mois', value: 6 },
  { label: '12 mois', value: 12 },
  { label: '24 mois', value: 24 },
  { label: 'Tout', value: 0 }
]
// 0 = tout l'historique depuis le premier versement.
const period = ref(12)

const timeline = computed(() =>
  buildNetInterestTimeline(props.monthlyNetInterest, props.forecast.byMonth, period.value || null)
)

const chartData = computed(() => ({
  labels: timeline.value.labels,
  datasets: [
    {
      label: 'Intérêts nets réels',
      data: timeline.value.history,
      borderColor: '#6C3EF4',
      backgroundColor: 'transparent',
      tension: 0.25,
      pointRadius: period.value && period.value <= 12 ? 3 : 1.5
    },
    {
      label: 'Prévision nette (théorique)',
      data: timeline.value.forecast,
      borderColor: '#F5A623',
      borderDash: [6, 4],
      backgroundColor: 'transparent',
      tension: 0.1,
      pointRadius: 2
    }
  ]
}))

const chartOptions = {
  plugins: { legend: { position: 'top' as const, labels: { boxWidth: 10, font: { size: 11 } } } },
  scales: {
    x: { ticks: { autoSkip: true, maxRotation: 0, font: { size: 10 } } },
    y: { beginAtZero: true, title: { display: true, text: '€ net / mois' } }
  }
}

// Moyenne sur les 6 derniers mois calendaires (mois sans versement comptés à 0).
const avgLast6 = computed(() => averageLastMonths(props.monthlyNetInterest, 6))
const overdueNet = computed(() => props.forecast.overdueInFine.reduce((a, o) => a + o.netInterest, 0))

defineExpose({ avgLast6 })
</script>

<template>
  <div>
    <div class="flex justify-end mb-2">
      <div class="inline-flex rounded-lg border border-default p-0.5" role="group" aria-label="Période de l'historique">
        <UButton
          v-for="p in periods"
          :key="p.value"
          size="xs"
          :variant="period === p.value ? 'solid' : 'ghost'"
          :color="period === p.value ? 'primary' : 'neutral'"
          :aria-pressed="period === p.value"
          @click="period = p.value"
        >
          {{ p.label }}
        </UButton>
      </div>
    </div>
    <Line :key="$colorMode.value" :data="chartData" :options="chartOptions" />
    <p class="text-xs text-muted mt-3 leading-relaxed">
      Prévision projet par projet, au taux cible sur le capital restant dû : mensualités chaque mois,
      intérêts des in fine en une fois le mois de leur fin prévue. Soit ~{{ (monthlyForecastNet * 12).toFixed(0) }} €
      net sur 12 mois (<b>{{ monthlyForecastNet.toFixed(0) }} €/mois</b> en moyenne), contre
      {{ avgLast6.toFixed(0) }} €/mois en moyenne réelle nette sur les 6 derniers mois.
      <template v-if="forecast.nbEstimated">
        {{ forecast.nbEstimated }} projet(s) sans mode de versement ou durée renseignés sont comptés à la moyenne
        mensuelle.
      </template>
      <template v-if="forecast.overdueInFine.length">
        Non inclus : {{ overdueNet.toFixed(0) }} € net attendus de {{ forecast.overdueInFine.length }} projet(s) in
        fine dont la fin prévue est passée (date de versement inconnue).
      </template>
    </p>
  </div>
</template>
