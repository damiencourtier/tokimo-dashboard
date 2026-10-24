<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Project } from '../types/tokimo'

const props = withDefaults(defineProps<{
  projects: Project[]
  /** Nom du projet -> dates de souscription (dd/mm/yyyy), la plus ancienne en premier. */
  subscriptionDates?: Record<string, string[]>
  /** Nom du projet -> mois au-delà de la durée cible (projets non remboursés uniquement). */
  delays?: Record<string, number>
}>(), { subscriptionDates: () => ({}), delays: () => ({}) })

/** Colonne calculée, absente de Project : première date de souscription. */
type SortKey = keyof Project | 'subscribed_at'

const search = ref('')
const stepFilter = ref<string[]>([])
const stepItems = computed(() =>
  stepCounts(props.projects).map(({ step, count }) => ({ label: `${step} (${count})`, value: step }))
)
const sortKey = ref<SortKey>('date_emission')
const sortDir = ref<1 | -1>(-1)

/** Date d'émission pas encore fixée -> triée comme la plus récente (à venir). */
function parseDate(s: string | null) {
  if (!s) return new Date(8640000000000000)
  const [d, m, y] = s.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

const subscribedAt = (p: Project) => props.subscriptionDates[p.name]?.[0] ?? null

function sortBy(key: SortKey) {
  if (sortKey.value === key) sortDir.value = (sortDir.value * -1) as 1 | -1
  else {
    sortKey.value = key
    sortDir.value = 1
  }
}

const rows = computed(() => {
  const q = search.value.toLowerCase()
  let filtered = props.projects.filter(
    p =>
      (!stepFilter.value.length || stepFilter.value.includes(p.step)) &&
      (p.name.toLowerCase().includes(q) ||
        statusLabel(p.status).toLowerCase().includes(q) ||
        p.step.toLowerCase().includes(q))
  )
  filtered = filtered.slice().sort((a, b) => {
    let av: any = sortKey.value === 'subscribed_at' ? subscribedAt(a) : a[sortKey.value]
    let bv: any = sortKey.value === 'subscribed_at' ? subscribedAt(b) : b[sortKey.value]
    if (sortKey.value === 'date_emission' || sortKey.value === 'subscribed_at') {
      av = parseDate(av)
      bv = parseDate(bv)
    }
    if (av < bv) return -1 * sortDir.value
    if (av > bv) return 1 * sortDir.value
    return 0
  })
  return filtered
})

const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Projet' },
  { key: 'subscribed_at', label: 'Souscription' },
  { key: 'date_emission', label: 'Émission' },
  { key: 'step', label: 'Étape' },
  { key: 'rate', label: 'Taux' },
  { key: 'amount', label: 'Capital' },
  { key: 'status', label: 'Statut' }
]
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row gap-2 mb-3">
      <UInput v-model="search" placeholder="Filtrer (nom, statut...)" icon="i-lucide-search" class="flex-1" />
      <USelectMenu
        v-model="stepFilter"
        :items="stepItems"
        value-key="value"
        multiple
        :search-input="false"
        placeholder="Toutes les étapes"
        icon="i-lucide-list-filter"
        class="sm:w-64"
      />
      <UButton
        v-if="stepFilter.length || search"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        @click="stepFilter = []; search = ''"
      >
        Réinitialiser
      </UButton>
    </div>
    <p v-if="stepFilter.length || search" class="text-xs text-muted mb-2">
      {{ rows.length }} projet(s) sur {{ projects.length }}
    </p>
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
              <a
                v-if="tokimoProjectUrl(p)"
                :href="tokimoProjectUrl(p)!"
                target="_blank"
                rel="noopener"
                class="ml-1 text-muted hover:text-violet-600"
                title="Voir la fiche sur Tokimo"
              >
                <UIcon name="i-lucide-external-link" class="size-3.5 align-[-2px]" />
              </a>
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <template v-if="subscriptionDates[p.name]?.length">
                {{ subscriptionDates[p.name]![0] }}
                <span
                  v-if="subscriptionDates[p.name]!.length > 1"
                  class="text-xs text-muted cursor-help"
                  :title="`Souscrit en ${subscriptionDates[p.name]!.length} fois : ${subscriptionDates[p.name]!.join(', ')}`"
                >+{{ subscriptionDates[p.name]!.length - 1 }}</span>
              </template>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="px-3 py-2">{{ p.date_emission ?? 'À venir' }}</td>
            <td class="px-3 py-2">{{ p.step }}</td>
            <td class="px-3 py-2">{{ p.rate.toFixed(1) }}%</td>
            <td class="px-3 py-2">{{ p.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) }} €</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap items-center gap-1">
                <UBadge :color="statusColor(p.status)" variant="subtle">{{ statusLabel(p.status) }}</UBadge>
                <UBadge
                  v-if="delays[p.name]"
                  color="warning"
                  variant="subtle"
                  :title="`Durée cible dépassée de ${delays[p.name]} mois, capital pas encore entièrement remboursé`"
                >
                  +{{ delays[p.name] }} mois
                </UBadge>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
