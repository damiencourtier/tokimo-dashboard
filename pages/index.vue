<script setup lang="ts">
const portfolio = usePortfolio()

const data = computed(() => {
  if (portfolio.data.value.projects.length === 0) return null
  return computeDashboard(portfolio.data.value.projects, portfolio.data.value.transactions, portfolio.data.value.updatedAt)
})

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtEur0 = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'

const updatedAtLabel = computed(() => {
  if (!data.value?.updatedAt) return null
  return new Date(data.value.updatedAt).toLocaleString('fr-FR')
})
</script>

<template>
  <div>
    <div v-if="!data?.hasProjects" class="py-16">
      <UAlert
        icon="i-lucide-upload"
        color="warning"
        variant="subtle"
        title="Aucune donnée pour l'instant"
        description="Commence par uploader tes exports Tokimo (souscriptions + transactions) pour voir ton dashboard."
      />
      <div class="mt-6 text-center">
        <UButton to="/upload" size="lg" color="primary">Uploader mes fichiers</UButton>
      </div>
    </div>

    <div v-else class="space-y-8">
      <div class="flex items-center justify-between">
        <p v-if="updatedAtLabel" class="text-xs text-muted">Données mises à jour le {{ updatedAtLabel }}</p>
        <UButton to="/upload" size="xs" variant="ghost" icon="i-lucide-upload">Importer d'autres fichiers</UButton>
      </div>

      <section>
        <h2 class="text-xs font-bold uppercase tracking-wide text-muted mb-3">Vue d'ensemble</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Capital investi (total)" :value="fmtEur0(data!.kpis.totalInvested)" :sub="`${data!.kpis.nbProjectsTotal} projets`" />
          <KpiCard label="Capital en cours" :value="fmtEur0(data!.kpis.activeCapital)" :sub="`${data!.kpis.nbProjectsActive} projets actifs`" />
          <KpiCard label="Capital remboursé" :value="fmtEur0(data!.kpis.reimbursedCapital)" />
          <KpiCard label="Taux cible moyen" :value="`${data!.kpis.avgRateWeightedActive.toFixed(2)} %`" sub="pondéré, capital actif" />
          <KpiCard label="Gains nets réalisés" :value="fmtEur(data!.kpis.netInterestTotal)" sub="après IR + CSG" />
          <KpiCard label="Prévision nette / mois" :value="fmtEur(data!.kpis.monthlyForecastNet)" sub="12 prochains mois" />
        </div>
      </section>

      <section v-if="data!.hasTransactions">
        <h2 class="text-xs font-bold uppercase tracking-wide text-muted mb-3">Fiscalité</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <UCard>
            <template #header>
              <div class="font-semibold text-sm">Intérêts bruts → nets</div>
            </template>
            <div class="flex h-9 rounded-lg overflow-hidden text-xs font-semibold text-white mb-3">
              <div
                class="flex items-center justify-center bg-[#1DAA6B]"
                :style="{ width: (data!.kpis.netInterestTotal / data!.kpis.grossInterestTotal * 100) + '%' }"
              >
                Net {{ fmtEur(data!.kpis.netInterestTotal) }}
              </div>
              <div
                class="flex items-center justify-center bg-[#E5484D]"
                :style="{ width: (data!.kpis.irTotal / data!.kpis.grossInterestTotal * 100) + '%' }"
              >
                IR
              </div>
              <div
                class="flex items-center justify-center bg-[#F5A623]"
                :style="{ width: (data!.kpis.csgTotal / data!.kpis.grossInterestTotal * 100) + '%' }"
              >
                CSG
              </div>
            </div>
            <p class="text-xs text-muted leading-relaxed">
              Intérêts bruts cumulés : {{ fmtEur(data!.kpis.grossInterestTotal) }} · Taux de prélèvement
              effectif : <b>{{ data!.kpis.effectiveTaxRatePct.toFixed(2) }} %</b> · Capital remboursé (hors
              intérêts) : {{ fmtEur(data!.kpis.capitalRepaidTotal) }}
            </p>
          </UCard>
          <UCard>
            <template #header>
              <div class="font-semibold text-sm">Dépôts vs capital recyclé</div>
            </template>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <KpiCard label="Dépôts bancaires" :value="fmtEur0(data!.kpis.depositsTotal)" />
              <KpiCard label="Retraits" :value="fmtEur0(data!.kpis.withdrawalsTotal)" negative />
            </div>
            <p class="text-xs text-muted leading-relaxed">
              {{ fmtEur0(data!.kpis.totalInvested) }} investis au total pour
              {{ fmtEur0(data!.kpis.depositsTotal) }} déposés depuis ta banque : la différence vient du
              capital remboursé réinvesti automatiquement.
            </p>
          </UCard>
        </div>
      </section>

      <section v-if="data!.hasTransactions">
        <h2 class="text-xs font-bold uppercase tracking-wide text-muted mb-3">Performance &amp; répartition</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <UCard class="lg:col-span-2">
            <template #header>
              <div class="font-semibold text-sm">Cash-flow mensuel</div>
            </template>
            <ClientOnly>
              <CashflowChart
                :monthly-net-interest="data!.monthlyNetInterest"
                :monthly-capital-repaid="data!.monthlyCapitalRepaid"
              />
            </ClientOnly>
          </UCard>
          <UCard>
            <template #header>
              <div class="font-semibold text-sm">Répartition par statut</div>
            </template>
            <ClientOnly>
              <StatusChart :status-breakdown="data!.statusBreakdown" />
            </ClientOnly>
          </UCard>
        </div>
      </section>

      <section>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <UCard>
            <template #header>
              <div class="font-semibold text-sm">Répartition par taux ciblé</div>
            </template>
            <ClientOnly>
              <RateChart :rate-breakdown="data!.rateBreakdown" />
            </ClientOnly>
          </UCard>
          <UCard v-if="data!.hasTransactions" class="lg:col-span-2">
            <template #header>
              <div class="font-semibold text-sm">Prévision d'intérêts nets — 12 prochains mois</div>
            </template>
            <ClientOnly>
              <ForecastChart
                :monthly-net-interest="data!.monthlyNetInterest"
                :monthly-forecast-net="data!.kpis.monthlyForecastNet"
              />
            </ClientOnly>
          </UCard>
        </div>
      </section>

      <section>
        <UCard>
          <template #header>
            <div class="font-semibold text-sm">Détail des {{ data!.kpis.nbProjectsTotal }} souscriptions</div>
          </template>
          <ProjectsTable :projects="data!.projects" />
        </UCard>
      </section>
    </div>
  </div>
</template>
