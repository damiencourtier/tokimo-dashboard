<script setup lang="ts">
import type { ScheduleEntry } from '../utils/schedule'

defineProps<{ entries: ScheduleEntry[] }>()

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
</script>

<template>
  <div class="max-h-[420px] overflow-y-auto rounded-lg border border-default">
    <table class="w-full text-sm">
      <thead class="sticky top-0 bg-elevated">
        <tr>
          <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Échéance</th>
          <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Intérêts bruts</th>
          <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Intérêts nets</th>
          <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Capital remboursé</th>
          <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Total net</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in entries" :key="e.month" class="border-t border-default">
          <td class="px-3 py-2">{{ e.date }}</td>
          <td class="px-3 py-2">{{ fmtEur(e.grossInterest) }}</td>
          <td class="px-3 py-2">{{ fmtEur(e.netInterest) }}</td>
          <td class="px-3 py-2">{{ e.capitalRepaid ? fmtEur(e.capitalRepaid) : '—' }}</td>
          <td class="px-3 py-2 font-semibold">{{ fmtEur(e.totalNet) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
