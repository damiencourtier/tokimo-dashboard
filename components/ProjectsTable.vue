<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Project } from '../types/tokimo'

const props = defineProps<{ projects: Project[] }>()

const search = ref('')
const sortKey = ref<keyof Project>('date_emission')
const sortDir = ref<1 | -1>(-1)

function parseDate(s: string) {
  const [d, m, y] = s.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function sortBy(key: keyof Project) {
  if (sortKey.value === key) sortDir.value = (sortDir.value * -1) as 1 | -1
  else {
    sortKey.value = key
    sortDir.value = 1
  }
}

const statusColor: Record<string, 'success' | 'primary' | 'warning' | 'info' | 'neutral'> = {
  'Financé': 'success',
  'Remboursé': 'primary',
  'Clôturé': 'warning',
  'Publié': 'info'
}

const rows = computed(() => {
  const q = search.value.toLowerCase()
  let filtered = props.projects.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      p.step.toLowerCase().includes(q)
  )
  filtered = filtered.slice().sort((a, b) => {
    let av: any = a[sortKey.value]
    let bv: any = b[sortKey.value]
    if (sortKey.value === 'date_emission') {
      av = parseDate(av)
      bv = parseDate(bv)
    }
    if (av < bv) return -1 * sortDir.value
    if (av > bv) return 1 * sortDir.value
    return 0
  })
  return filtered
})

const columns: { key: keyof Project; label: string }[] = [
  { key: 'name', label: 'Projet' },
  { key: 'date_emission', label: 'Émission' },
  { key: 'step', label: 'Étape' },
  { key: 'rate', label: 'Taux' },
  { key: 'amount', label: 'Capital' },
  { key: 'status', label: 'Statut' }
]
</script>

<template>
  <div>
    <UInput v-model="search" placeholder="Filtrer (nom, statut...)" class="mb-3" icon="i-lucide-search" />
    <div class="max-h-[420px] overflow-y-auto rounded-lg border border-default">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-elevated">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted cursor-pointer select-none hover:text-violet-600"
              @click="sortBy(col.key)"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in rows" :key="i" class="border-t border-default">
            <td class="px-3 py-2">
              <NuxtLink :to="`/projects/${encodeURIComponent(p.name)}`" class="text-violet-700 dark:text-violet-400 hover:underline">
                {{ p.name }}
              </NuxtLink>
            </td>
            <td class="px-3 py-2">{{ p.date_emission }}</td>
            <td class="px-3 py-2">{{ p.step }}</td>
            <td class="px-3 py-2">{{ p.rate.toFixed(1) }}%</td>
            <td class="px-3 py-2">{{ p.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) }} €</td>
            <td class="px-3 py-2">
              <UBadge :color="statusColor[p.status] || 'neutral'" variant="subtle">{{ p.status }}</UBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
