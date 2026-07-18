<script setup lang="ts">
const portfolio = usePortfolio()

const defaultTaxRate = computed(() => {
  if (portfolio.value.transactions.length === 0) return 30
  const dashboard = computeDashboard(portfolio.value.projects, portfolio.value.transactions, null)
  return dashboard.kpis.effectiveTaxRatePct || 30
})

const paymentTypeItems = [
  { label: "In fine (à l'échéance)", value: 'in_fine' },
  { label: 'Mensuel', value: 'mensuel' }
]

// Simulateur 1 : nouvel investissement
const capital1 = ref(1000)
const rate1 = ref(10)
const duration1 = ref(12)
const paymentType1 = ref<'in_fine' | 'mensuel'>('in_fine')
const taxRate1 = ref(defaultTaxRate.value)

const result1 = computed(() =>
  simulateNewInvestment({
    capital: capital1.value,
    ratePct: rate1.value,
    durationMonths: duration1.value,
    paymentType: paymentType1.value,
    taxRatePct: taxRate1.value
  })
)

const today = new Date()

const schedule1 = computed(() =>
  buildPaymentSchedule({
    capital: capital1.value,
    ratePct: rate1.value,
    durationMonths: duration1.value,
    paymentType: paymentType1.value,
    taxRatePct: taxRate1.value,
    startDate: today
  })
)

// Simulateur 2 : intérêts composés / réinvestissement
const capital2 = ref(5000)
const contribution2 = ref(200)
const rate2 = ref(10)
const durationYears2 = ref(5)
const taxRate2 = ref(defaultTaxRate.value)

const result2 = computed(() =>
  simulateCompound({
    initialCapital: capital2.value,
    monthlyContribution: contribution2.value,
    annualRatePct: rate2.value,
    durationMonths: durationYears2.value * 12,
    taxRatePct: taxRate2.value
  })
)

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtEur0 = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <div>
      <h2 class="text-lg font-bold">Simulateurs</h2>
      <p class="text-sm text-muted mt-1">
        Estimations théoriques indépendantes de ton portefeuille réel — rien n'est enregistré.
      </p>
    </div>

    <UCard>
      <template #header>
        <div class="font-semibold text-sm">Simulateur de nouvel investissement</div>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <UFormField label="Capital investi (€)">
          <UInputNumber v-model="capital1" :min="0" :step="100" class="w-full" />
        </UFormField>
        <UFormField label="Taux ciblé (%/an)">
          <UInputNumber v-model="rate1" :min="0" :max="30" :step="0.5" class="w-full" />
        </UFormField>
        <UFormField label="Durée (mois)">
          <UInputNumber v-model="duration1" :min="1" :step="1" class="w-full" />
        </UFormField>
        <UFormField label="Taux de prélèvement (%)">
          <UInputNumber v-model="taxRate1" :min="0" :max="100" :step="0.5" class="w-full" />
        </UFormField>
        <UFormField label="Type de versement" class="sm:col-span-2">
          <URadioGroup v-model="paymentType1" :items="paymentTypeItems" orientation="horizontal" />
        </UFormField>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard label="Gain brut" :value="fmtEur(result1.grossGain)" />
        <KpiCard label="Gain net" :value="fmtEur(result1.netGain)" sub="après prélèvement" />
        <KpiCard
          v-if="paymentType1 === 'in_fine'"
          label="Total perçu à l'échéance"
          :value="fmtEur(result1.totalNetReceived)"
        />
        <KpiCard
          v-else
          label="Versement mensuel net"
          :value="fmtEur(result1.monthlyNetPayment || 0)"
          :sub="`sur ${duration1} mois`"
        />
      </div>

      <div class="mt-6">
        <div class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
          Échéancier prévisionnel ({{ schedule1.length }} {{ schedule1.length > 1 ? 'échéances' : 'échéance' }})
        </div>
        <ScheduleTable :entries="schedule1" />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="font-semibold text-sm">Simulateur d'intérêts composés (réinvestissement)</div>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <UFormField label="Capital de départ (€)">
          <UInputNumber v-model="capital2" :min="0" :step="500" class="w-full" />
        </UFormField>
        <UFormField label="Apport mensuel (€)">
          <UInputNumber v-model="contribution2" :min="0" :step="50" class="w-full" />
        </UFormField>
        <UFormField label="Taux annuel moyen (%)">
          <UInputNumber v-model="rate2" :min="0" :max="30" :step="0.5" class="w-full" />
        </UFormField>
        <UFormField label="Durée (années)">
          <UInputNumber v-model="durationYears2" :min="1" :max="40" :step="1" class="w-full" />
        </UFormField>
        <UFormField label="Taux de prélèvement (%)" class="sm:col-span-2">
          <UInputNumber v-model="taxRate2" :min="0" :max="100" :step="0.5" class="w-full" />
        </UFormField>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Capital final" :value="fmtEur0(result2.finalCapital)" />
        <KpiCard label="Total versé" :value="fmtEur0(result2.totalContributions)" sub="capital initial + apports" />
        <KpiCard label="Gains nets cumulés" :value="fmtEur0(result2.totalNetGains)" />
      </div>

      <ClientOnly>
        <CompoundChart :timeline="result2.timeline" />
      </ClientOnly>

      <p class="text-xs text-muted mt-3 leading-relaxed">
        Estimation théorique : suppose que les intérêts nets sont réinvestis chaque mois au même taux
        constant, sans tenir compte des délais réels de versement, des retards de chantier ni des variations
        de taux entre projets.
      </p>
    </UCard>
  </div>
</template>
