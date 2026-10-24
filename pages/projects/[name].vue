<script setup lang="ts">
const route = useRoute()
const portfolio = usePortfolio()
const api = useApi()
const { isAdmin } = useAuth()

const projectName = computed(() => decodeURIComponent(route.params.name as string))
const project = computed(() => portfolio.data.value.projects.find(p => p.name === projectName.value) || null)
const detail = computed(() => (project.value ? computeProjectDetail(project.value, portfolio.data.value.transactions) : null))

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtEur0 = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'

const paymentTypeItems = [
  { label: "In fine (à l'échéance)", value: 'in_fine' },
  { label: 'Mensuel', value: 'mensuel' }
]
const paymentTypeLabel = computed(
  () => paymentTypeItems.find(i => i.value === schedulePaymentType.value)?.label ?? '—'
)

// Une échéance mensuelle "intérêts seuls" (capital = 0) déjà versée suggère un
// versement mensuel en cours plutôt qu'un remboursement in fine — utilisé tant
// que le projet n'a pas de type de versement enregistré explicitement.
const inferredPaymentType = computed<'in_fine' | 'mensuel'>(() =>
  detail.value?.transactions.some(
    t => t.nature === "Versement de l'échéance (montant brut)" && t.capital === 0 && t.interest > 0
  )
    ? 'mensuel'
    : 'in_fine'
)

const remainingMonths = ref(6)
const schedulePaymentType = ref<'in_fine' | 'mensuel'>('in_fine')
const scheduleTaxRate = ref(detail.value?.kpis.grossInterestTotal ? detail.value.kpis.effectiveTaxRatePct : 30)
const paymentTypeSaving = ref(false)
const paymentTypeError = ref('')

const durationMonths = ref<number | null>(null)
const durationSaving = ref(false)
const durationError = ref('')

const rate = ref(0)
const rateSaving = ref(false)
const rateError = ref('')

watch(project, (p) => {
  if (p) {
    schedulePaymentType.value = p.paymentType ?? inferredPaymentType.value
    durationMonths.value = p.durationMonths
    rate.value = p.rate
  }
}, { immediate: true })

async function onPaymentTypeChange(value: 'in_fine' | 'mensuel') {
  const previous = schedulePaymentType.value
  schedulePaymentType.value = value
  if (!project.value) return
  paymentTypeSaving.value = true
  paymentTypeError.value = ''
  try {
    await api(`/projects/${encodeURIComponent(project.value.name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: { paymentType: value }
    })
    await portfolio.refresh()
  } catch (e: any) {
    schedulePaymentType.value = previous
    paymentTypeError.value = apiErrorMessage(e, "Échec de l'enregistrement.")
  } finally {
    paymentTypeSaving.value = false
  }
}

async function onDurationMonthsChange() {
  if (!project.value) return
  const value = durationMonths.value
  if (value !== null && (!Number.isInteger(value) || value <= 0)) {
    durationError.value = 'Doit être un nombre entier positif.'
    return
  }
  durationSaving.value = true
  durationError.value = ''
  try {
    await api(`/projects/${encodeURIComponent(project.value.name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: { durationMonths: value }
    })
    await portfolio.refresh()
  } catch (e: any) {
    durationError.value = apiErrorMessage(e, "Échec de l'enregistrement.")
  } finally {
    durationSaving.value = false
  }
}

async function onRateChange() {
  if (!project.value) return
  if (!Number.isFinite(rate.value) || rate.value <= 0 || rate.value > 100) {
    rateError.value = 'Doit être un nombre entre 0 et 100.'
    return
  }
  rateSaving.value = true
  rateError.value = ''
  try {
    await api(`/projects/${encodeURIComponent(project.value.name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: { rate: rate.value }
    })
    await portfolio.refresh()
  } catch (e: any) {
    rateError.value = apiErrorMessage(e, "Échec de l'enregistrement.")
  } finally {
    rateSaving.value = false
  }
}

// Infos des fiches Tokimo (lien, opérateur, garanties, note, LTV) : un seul
// enregistrement générique, chaque champ étant envoyé seul au PATCH admin.
type SheetField = 'tokimoId' | 'operator' | 'guarantees' | 'rating' | 'ltv'
const sheet = reactive({
  tokimoId: null as number | null,
  operator: '',
  guarantees: '',
  rating: '',
  ltv: null as number | null
})
const sheetSaving = ref<SheetField | null>(null)
const sheetError = ref<Partial<Record<SheetField, string>>>({})

watch(project, (p) => {
  if (!p) return
  sheet.tokimoId = p.tokimoId
  sheet.operator = p.operator ?? ''
  sheet.guarantees = (p.guarantees ?? []).join('\n')
  sheet.rating = p.rating ?? ''
  sheet.ltv = p.ltv
}, { immediate: true })

function sheetValue(field: SheetField) {
  switch (field) {
    case 'guarantees': {
      const lines = sheet.guarantees.split('\n').map(l => l.trim()).filter(Boolean)
      return lines.length ? lines : null
    }
    case 'operator':
    case 'rating':
      return sheet[field].trim() || null
    default:
      return sheet[field]
  }
}

async function saveSheetField(field: SheetField) {
  if (!project.value) return
  const value = sheetValue(field)
  if (JSON.stringify(value) === JSON.stringify(project.value[field] ?? null)) return
  sheetSaving.value = field
  sheetError.value = { ...sheetError.value, [field]: undefined }
  try {
    await api(`/projects/${encodeURIComponent(project.value.name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: { [field]: value }
    })
    await portfolio.refresh()
  } catch (e: any) {
    sheetError.value = { ...sheetError.value, [field]: apiErrorMessage(e, "Échec de l'enregistrement.") }
  } finally {
    sheetSaving.value = null
  }
}

const projectDelay = computed(() => (project.value ? delayMonths(project.value) : null))
const projectEnd = computed(() => (project.value ? expectedEndDate(project.value) : null))

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
        description="Ce projet n'existe pas dans les données importées."
      />
    </div>

    <div v-else class="space-y-8">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold">{{ project.name }}</h2>
          <p class="text-sm text-muted mt-1">{{ project.date_emission ? `Émission le ${project.date_emission}` : 'Émission à venir' }} · {{ project.step }}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <UBadge :color="statusColor(project.status)" variant="subtle">{{ statusLabel(project.status) }}</UBadge>
          <UButton
            v-if="tokimoProjectUrl(project)"
            :to="tokimoProjectUrl(project)!"
            target="_blank"
            size="xs"
            variant="ghost"
            icon="i-lucide-external-link"
          >
            Fiche Tokimo
          </UButton>
        </div>
      </div>

      <UAlert
        v-if="projectDelay"
        icon="i-lucide-clock-alert"
        color="error"
        variant="subtle"
        :title="`En retard de ${projectDelay} mois`"
        :description="`Fin prévue le ${projectEnd!.toLocaleDateString('fr-FR')} (émission + ${project.durationMonths} mois), projet toujours en cours.`"
      />
      <p v-else-if="projectEnd && project.status !== 'Remboursé' && project.status !== 'Annulé'" class="text-xs text-muted -mt-4">
        Fin prévue le {{ projectEnd.toLocaleDateString('fr-FR') }}
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="Capital investi" :value="fmtEur0(project.amount)" />
        <KpiCard label="Taux ciblé" :value="`${project.rate.toFixed(2)} %`" />
        <KpiCard label="Capital remboursé" :value="fmtEur0(detail!.kpis.capitalRepaidTotal)" />
        <KpiCard label="Capital restant" :value="fmtEur0(detail!.kpis.remainingCapital)" />
        <KpiCard
          label="Gains nets"
          :value="fmtEur(detail!.kpis.netInterestTotal)"
          :sub="detail!.kpis.bonusTotal ? `après IR + CSG · + ${fmtEur(detail!.kpis.bonusTotal)} de bonus` : 'après IR + CSG'"
        />
      </div>

      <UCard>
        <template #header>
          <div class="font-semibold text-sm">Infos complémentaires{{ isAdmin ? ' (admin)' : '' }}</div>
        </template>
        <p class="text-xs text-muted mb-3 leading-relaxed">
          Absentes des exports Tokimo, communes à tous les comptes ayant souscrit à ce projet.
          <template v-if="isAdmin">
            Modifiables ici et enregistrées immédiatement ; un réimport du fichier "liste_projets" ne les
            écrase jamais une fois définies.
          </template>
        </p>

        <div v-if="isAdmin" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Taux (%)" :error="rateError || undefined">
            <UInputNumber
              v-model="rate"
              :min="0"
              :max="100"
              :step="0.1"
              :disabled="rateSaving"
              class="w-full sm:w-40"
              @blur="onRateChange"
            />
          </UFormField>
          <UFormField label="Durée du prêt (mois)" :error="durationError || undefined">
            <UInputNumber
              v-model="durationMonths"
              :min="1"
              :step="1"
              :disabled="durationSaving"
              class="w-full sm:w-40"
              @blur="onDurationMonthsChange"
            />
          </UFormField>
          <UFormField label="Type de versement" :error="paymentTypeError || undefined">
            <URadioGroup
              :model-value="schedulePaymentType"
              :items="paymentTypeItems"
              :disabled="paymentTypeSaving"
              orientation="horizontal"
              @update:model-value="onPaymentTypeChange"
            />
          </UFormField>
        </div>

        <div v-if="isAdmin" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-default">
          <UFormField label="N° de fiche Tokimo" hint="app.tokimo.eu/projects/…" :error="sheetError.tokimoId">
            <UInputNumber
              v-model="sheet.tokimoId"
              :min="1"
              :step="1"
              :disabled="sheetSaving === 'tokimoId'"
              class="w-full sm:w-40"
              @blur="saveSheetField('tokimoId')"
            />
          </UFormField>
          <UFormField label="Opérateur" :error="sheetError.operator">
            <UInput v-model="sheet.operator" :disabled="sheetSaving === 'operator'" class="w-full" @blur="saveSheetField('operator')" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Note Tokimo" :error="sheetError.rating">
              <UInput v-model="sheet.rating" :disabled="sheetSaving === 'rating'" class="w-full" @blur="saveSheetField('rating')" />
            </UFormField>
            <UFormField label="LTV (%)" :error="sheetError.ltv">
              <UInputNumber
                v-model="sheet.ltv"
                :min="0"
                :max="200"
                :step="0.1"
                :disabled="sheetSaving === 'ltv'"
                class="w-full"
                @blur="saveSheetField('ltv')"
              />
            </UFormField>
          </div>
          <UFormField label="Garanties" hint="une par ligne" :error="sheetError.guarantees" class="sm:col-span-3">
            <UTextarea
              v-model="sheet.guarantees"
              :rows="2"
              autoresize
              :disabled="sheetSaving === 'guarantees'"
              class="w-full"
              @blur="saveSheetField('guarantees')"
            />
          </UFormField>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div class="text-xs text-muted mb-1">Opérateur</div>
            <div class="text-sm font-medium">{{ project.operator ?? 'Non renseigné' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">Note Tokimo · LTV</div>
            <div class="text-sm font-medium">
              {{ project.rating ?? '—' }} · {{ project.ltv !== null ? `${project.ltv} %` : '—' }}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">Garanties</div>
            <div class="text-sm font-medium">{{ project.guarantees?.join(' · ') || 'Non renseignées' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">Taux</div>
            <div class="text-sm font-medium">{{ project.rate.toFixed(2) }} %</div>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">Durée du prêt</div>
            <div class="text-sm font-medium">{{ durationMonths ? `${durationMonths} mois` : 'Non renseignée' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">Type de versement</div>
            <div class="text-sm font-medium">{{ paymentTypeLabel }}</div>
          </div>
        </div>
      </UCard>

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
            Tokimo n'exporte pas la durée restante dans les CSV : ajuste ce champ pour qu'il corresponde à
            ton projet (type de versement réglable plus haut). Calculé sur le capital restant dû
            ({{ fmtEur0(detail!.kpis.remainingCapital) }}).
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <UFormField label="Mois restants">
              <UInputNumber v-model="remainingMonths" :min="1" :step="1" class="w-full" />
            </UFormField>
            <UFormField label="Taux de prélèvement (%)">
              <UInputNumber v-model="scheduleTaxRate" :min="0" :max="100" :step="0.5" class="w-full" />
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
                  <td class="px-3 py-2">{{ fmtEur(grossInterestOf(t)) }}</td>
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
