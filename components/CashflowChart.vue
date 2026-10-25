<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { computed, ref } from 'vue'
import type { Transaction } from '../types/tokimo'
import type { CashflowGranularity } from '../utils/cashflowSeries'

const props = defineProps<{
  /** Transactions (toutes, ou celles d'un projet) : seules les échéances et dépôts validés sont pris en compte. */
  transactions: Transaction[]
}>()

const granularities: { label: string; value: CashflowGranularity }[] = [
  { label: 'Jour', value: 'day' },
  { label: 'Mois', value: 'month' },
  { label: 'Année', value: 'year' }
]
const granularity = ref<CashflowGranularity>('month')

const series = computed(() => buildCashflowSeries(props.transactions, granularity.value))
const sum = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) * 100) / 100
const fmtEur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
// Les transactions d'un projet n'ont pas de dépôt : la barre n'est alors pas affichée.
const hasDeposits = computed(() => series.value.deposits.some(d => d !== 0))

const chartData = computed(() => ({
  labels: series.value.labels,
  datasets: [
    {
      label: 'Intérêts nets',
      data: series.value.netInterest,
      backgroundColor: '#6C3EF4',
      stack: 's'
    },
    {
      label: 'Capital remboursé',
      data: series.value.capitalRepaid,
      backgroundColor: '#E5E1FA',
      stack: 's'
    },
    ...(hasDeposits.value
      ? [{ label: 'Dépôts bancaires', data: series.value.deposits, backgroundColor: '#1DAA6B', stack: 'd' }]
      : [])
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  scales: {
    x: {
      stacked: true,
      ticks: granularity.value === 'year'
        ? { font: { size: 11 } }
        : { maxRotation: 90, minRotation: 90, font: { size: 9 } }
    },
    y: { stacked: true }
  },
  plugins: {
    legend: { position: 'top' as const, labels: { boxWidth: 10, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        // Total des versements reçus, hors dépôts (pile à part).
        footer: (items: { parsed: { y: number }; dataset: { stack?: string } }[]) =>
          `Total versé : ${fmtEur(items.filter(i => i.dataset.stack === 's').reduce((a, i) => a + i.parsed.y, 0))}`
      }
    }
  }
}))
</script>

<template>
  <div>
    <div class="flex justify-end mb-2">
      <div class="inline-flex rounded-lg border border-default p-0.5" role="group" aria-label="Regroupement du cash-flow">
        <UButton
          v-for="g in granularities"
          :key="g.value"
          size="xs"
          :variant="granularity === g.value ? 'solid' : 'ghost'"
          :color="granularity === g.value ? 'primary' : 'neutral'"
          :aria-pressed="granularity === g.value"
          @click="granularity = g.value"
        >
          {{ g.label }}
        </UButton>
      </div>
    </div>
    <Bar :key="`${$colorMode.value}-${granularity}`" :data="chartData" :options="chartOptions" />
    <p v-if="series.labels.length" class="text-xs text-muted mt-3">
      Total : {{ fmtEur(sum(series.netInterest)) }} d'intérêts nets + {{ fmtEur(sum(series.capitalRepaid)) }} de capital remboursé
      <template v-if="hasDeposits"> · {{ fmtEur(sum(series.deposits)) }} déposés depuis ta banque</template>
      <template v-if="granularity === 'day'"> · seuls les jours avec un versement sont affichés</template>
    </p>
  </div>
</template>
