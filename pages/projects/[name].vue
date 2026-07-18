<script setup lang="ts">
const route = useRoute()
const portfolio = usePortfolio()

const projectName = computed(() => decodeURIComponent(route.params.name as string))
const project = computed(() => portfolio.value.projects.find(p => p.name === projectName.value) || null)
const detail = computed(() => (project.value ? computeProjectDetail(project.value, portfolio.value.transactions) : null))

const statusColor: Record<string, 'success' | 'primary' | 'warning' | 'info' | 'neutral'> = {
  'Financé': 'success',
  'Remboursé': 'primary',
  'Clôturé': 'warning',
  'Publié': 'info'
}

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtEur0 = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'

const paymentTypeItems = [
  { label: "In fine (à l'échéance)", value: 'in_fine' },
  { label: 'Mensuel', value: 'mensuel' }
]

// Une échéance mensuelle "intérêts seuls" (capital = 0) déjà versée suggère un
// versement mensuel en cours plutôt qu'un remboursement in fine.
const inferredPaymentType: 'in_fine' | 'mensuel' = detail.value?.transactions.some(
  t => t.nature === "Versement de l'échéance (montant brut)" && t.capital === 0 && t.interest > 0
)
  ? 'mensuel'
  : 'in_fine'

const remainingMonths = ref(6)
const schedulePaymentType = ref<'in_fine' | 'mensuel'>(inferredPaymentType)
const scheduleTaxRate = ref(detail.value?.kpis.grossInterestTotal ? detail.value.kpis.effectiveTaxRatePct : 30)

const today = new Date()

const schedule = computed(() => {
  if (!detail.value) return []
  const capital = Math.max(0, detail.value.kpis.remainingCapital)
  return buildPaymentSchedule({
    capital,
    ratePct: project.value!.rate,
    durationMonths: remainingMonths.value,
    paymentType: schedulePaymentType.value,
    taxRatePct: scheduleTaxRate.value,
    startDate: today
  })
})
</script>

<template>
  <div>
    <UButton to="/" variant="ghost" color="neutral" icon="i-lucide-arrow-left" class="mb-4">
      Retour au dashboard
    </UButton>

    <div v-if="!project" class="py-16">
      <UAlert
        icon="i-lucide-info"
        color="warning"
        variant="subtle"
        title="Projet introuvable"
        description="Ce projet n'est pas dans les données actuellement chargées. Rappel : rien n'est persisté — si tu as rechargé la page, réimporte tes fichiers."
      />
    </div>

    <div v-else class="space-y-8">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold">{{ project.name }}</h2>
          <p class="text-sm text-muted mt-1">Émission le {{ project.date_emission }} · {{ project.step }}</p>
        </div>
        <UBadge :color="statusColor[project.status] || 'neutral'" variant="subtle">{{ project.status }}</UBadge>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="Capital investi" :value="fmtEur0(project.amount)" />
        <KpiCard label="Taux ciblé" :value="`${project.rate.toFixed(2)} %`" />
        <KpiCard label="Capital remboursé" :value="fmtEur0(detail!.kpis.capitalRepaidTotal)" />
        <KpiCard label="Capital restant" :value="fmtEur0(detail!.kpis.remainingCapital)" />
        <KpiCard label="Gains nets" :value="fmtEur(detail!.kpis.netInterestTotal)" sub="après IR + CSG" />
      </div>

      <section v-if="detail!.transactions.length">
        <UCard>
          <template #header>
            <div class="font-semibold text-sm">Cash-flow du projet</div>
          </template>
          <ClientOnly>
            <CashflowChart
              :monthly-net-interest="detail!.monthlyNetInterest"
              :monthly-capital-repaid="detail!.monthlyCapitalRepaid"
            />
          </ClientOnly>
        </UCard>
      </section>

      <section v-if="detail!.kpis.remainingCapital > 0">
        <UCard>
          <template #header>
            <div class="font-semibold text-sm">Échéancier prévisionnel</div>
          </template>

          <p class="text-xs text-muted mb-4 leading-relaxed">
            Tokimo n'exporte pas la durée restante ni le type de versement dans les CSV : ajuste ces champs
            pour qu'ils correspondent à ton projet. Calculé sur le capital restant dû ({{ fmtEur0(detail!.kpis.remainingCapital) }}).
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <UFormField label="Mois restants">
              <UInputNumber v-model="remainingMonths" :min="1" :step="1" class="w-full" />
            </UFormField>
            <UFormField label="Taux de prélèvement (%)">
              <UInputNumber v-model="scheduleTaxRate" :min="0" :max="100" :step="0.5" class="w-full" />
            </UFormField>
            <UFormField label="Type de versement">
              <URadioGroup v-model="schedulePaymentType" :items="paymentTypeItems" orientation="horizontal" />
            </UFormField>
          </div>

          <ScheduleTable :entries="schedule" />
        </UCard>
      </section>

      <section>
        <UCard>
          <template #header>
            <div class="font-semibold text-sm">Historique des transactions ({{ detail!.transactions.length }})</div>
          </template>

          <div v-if="!detail!.transactions.length" class="text-sm text-muted py-6 text-center">
            Aucune transaction pour ce projet dans les données importées.
          </div>

          <div v-else class="max-h-[420px] overflow-y-auto rounded-lg border border-default">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-elevated">
                <tr>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Nature</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Montant</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Capital</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Intérêts</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">IR</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">CSG</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Net</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in detail!.transactions" :key="i" class="border-t border-default">
                  <td class="px-3 py-2">{{ t.date }}</td>
                  <td class="px-3 py-2">{{ t.nature }}</td>
                  <td class="px-3 py-2">{{ fmtEur(t.amount) }}</td>
                  <td class="px-3 py-2">{{ fmtEur(t.capital) }}</td>
                  <td class="px-3 py-2">{{ fmtEur(t.interest) }}</td>
                  <td class="px-3 py-2">{{ fmtEur(t.ir) }}</td>
                  <td class="px-3 py-2">{{ fmtEur(t.csg) }}</td>
                  <td class="px-3 py-2">{{ fmtEur(t.net) }}</td>
                  <td class="px-3 py-2">{{ t.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </section>
    </div>
  </div>
</template>
