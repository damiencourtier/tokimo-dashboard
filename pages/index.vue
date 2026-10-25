<script setup lang="ts">
const portfolio = usePortfolio()

const data = computed(() => {
  if (portfolio.data.value.projects.length === 0) return null
  return computeDashboard(portfolio.data.value.projects, portfolio.data.value.transactions, portfolio.data.value.updatedAt)
})

// Actualités des projets pas encore clos (les souscriptions annulées ou
// remboursées n'apportent plus d'information utile).
const news = computed(() =>
  data.value ? latestNews(data.value.projects.filter(p => p.status !== 'Remboursé' && p.status !== 'Annulé')) : []
)

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
          <KpiCard
            label="Gains nets réalisés"
            :value="fmtEur(data!.kpis.netInterestTotal)"
            :sub="data!.kpis.bonusTotal ? `après IR + CSG · + ${fmtEur(data!.kpis.bonusTotal)} de bonus` : 'après IR + CSG'"
          />
          <KpiCard label="Prévision nette / mois" :value="fmtEur(data!.kpis.monthlyForecastNet)" sub="12 prochains mois" />
        </div>
      </section>

      <section v-if="data!.kpis.activeCapital > 0">
        <h2 class="text-xs font-bold uppercase tracking-wide text-muted mb-3">Risque</h2>
        <UAlert
          v-if="data!.risk.late.length"
          icon="i-lucide-clock-alert"
          color="warning"
          variant="subtle"
          class="mb-4"
          :title="`${data!.risk.late.length} projet(s) au-delà de leur durée cible · ${fmtEur0(data!.risk.late.reduce((a, l) => a + l.remainingCapital, 0))} restant à rembourser`"
        >
          <template #description>
            <ul class="mt-1 space-y-0.5">
              <li v-for="l in data!.risk.late" :key="l.name">
                <NuxtLink :to="`/projects/${encodeURIComponent(l.name)}`" class="hover:underline">{{ l.name }}</NuxtLink>
                — dépassée de {{ l.delayMonths }} mois, reste {{ fmtEur0(l.remainingCapital) }} sur {{ fmtEur0(l.amount) }}
              </li>
            </ul>
          </template>
        </UAlert>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <UCard>
            <template #header>
              <div class="font-semibold text-sm">Concentration par opérateur</div>
            </template>
            <ul class="space-y-2 text-sm">
              <li v-for="[name, amount] in Object.entries(data!.risk.byOperator).slice(0, 6)" :key="name">
                <div class="flex justify-between gap-2">
                  <span class="truncate" :class="{ 'text-muted': name === 'Non renseigné' }">{{ name }}</span>
                  <span class="font-medium whitespace-nowrap">
                    {{ fmtEur0(amount) }} · {{ Math.round(amount / data!.kpis.activeCapital * 100) }} %
                  </span>
                </div>
                <div class="h-1.5 rounded bg-elevated mt-1">
                  <div class="h-1.5 rounded bg-violet-500" :style="{ width: (amount / data!.kpis.activeCapital * 100) + '%' }" />
                </div>
              </li>
            </ul>
          </UCard>
          <UCard>
            <template #header>
              <div class="font-semibold text-sm">Garanties</div>
            </template>
            <div class="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <div class="text-lg font-bold text-emerald-600">{{ fmtEur0(data!.risk.firstRankMortgage.covered) }}</div>
                <div class="text-xs text-muted">hypothèque 1er rang</div>
              </div>
              <div>
                <div class="text-lg font-bold text-amber-600">{{ fmtEur0(data!.risk.firstRankMortgage.notCovered) }}</div>
                <div class="text-xs text-muted">sans</div>
              </div>
              <div>
                <div class="text-lg font-bold text-muted">{{ fmtEur0(data!.risk.firstRankMortgage.unknown) }}</div>
                <div class="text-xs text-muted">non renseigné</div>
              </div>
            </div>
            <p class="text-xs text-muted leading-relaxed">
              LTV moyen pondéré :
              <b>{{ data!.risk.avgLtvWeighted !== null ? `${data!.risk.avgLtvWeighted.toFixed(1)} %` : '—' }}</b>
              (sur les projets où il est renseigné).
            </p>
          </UCard>
          <UCard>
            <template #header>
              <div class="font-semibold text-sm">Note Tokimo</div>
            </template>
            <ul class="space-y-1.5 text-sm">
              <li v-for="[rating, amount] in Object.entries(data!.risk.byRating)" :key="rating" class="flex justify-between">
                <span :class="{ 'text-muted': rating === 'Non renseignée' }">{{ rating }}</span>
                <span class="font-medium">{{ fmtEur0(amount) }} · {{ Math.round(amount / data!.kpis.activeCapital * 100) }} %</span>
              </li>
            </ul>
            <p v-if="data!.risk.nbWithoutExpectedEnd" class="text-xs text-muted leading-relaxed mt-3">
              {{ data!.risk.nbWithoutExpectedEnd }} projet(s) en cours sans date d'émission ou durée : retard non
              évaluable.
            </p>
          </UCard>
        </div>
      </section>

      <section v-if="news.length">
        <h2 class="text-xs font-bold uppercase tracking-wide text-muted mb-3">Dernières actualités</h2>
        <UCard>
          <ul class="divide-y divide-default text-sm -my-2">
            <li v-for="n in news" :key="n.name" class="py-2 flex flex-col sm:flex-row sm:items-baseline gap-x-3">
              <span class="text-xs text-muted whitespace-nowrap w-20">{{ n.date }}</span>
              <NuxtLink :to="`/projects/${encodeURIComponent(n.name)}`" class="font-medium hover:underline whitespace-nowrap">
                {{ n.name }}
              </NuxtLink>
              <span class="text-muted">{{ n.title }}</span>
            </li>
          </ul>
        </UCard>
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
          <UCard class="lg:col-span-2">
            <template #header>
              <div class="font-semibold text-sm">Récapitulatif fiscal par année</div>
            </template>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th class="px-3 py-2">Année</th>
                    <th class="px-3 py-2 text-right">Échéances</th>
                    <th class="px-3 py-2 text-right">Intérêts bruts</th>
                    <th class="px-3 py-2 text-right">IR prélevé</th>
                    <th class="px-3 py-2 text-right">CSG prélevée</th>
                    <th class="px-3 py-2 text-right">Net perçu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="y in data!.taxByYear" :key="y.year" class="border-t border-default">
                    <td class="px-3 py-2 font-semibold">{{ y.year }}</td>
                    <td class="px-3 py-2 text-right">{{ y.nbEcheances }}</td>
                    <td class="px-3 py-2 text-right">{{ fmtEur(y.grossInterest) }}</td>
                    <td class="px-3 py-2 text-right">{{ fmtEur(y.ir) }}</td>
                    <td class="px-3 py-2 text-right">{{ fmtEur(y.csg) }}</td>
                    <td class="px-3 py-2 text-right">{{ fmtEur(y.netInterest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-muted leading-relaxed mt-3">
              Par année de versement, hors bonus. Montants indicatifs, à rapprocher de l'IFU envoyé par Tokimo
              (en général : intérêts bruts en case 2TR, IR déjà prélevé en case 2CK).
            </p>
          </UCard>
        </div>
      </section>

      <section>
        <h2 class="text-xs font-bold uppercase tracking-wide text-muted mb-3">Performance &amp; répartition</h2>
        <div class="space-y-5">
          <UCard v-if="data!.hasTransactions">
            <template #header>
              <div class="font-semibold text-sm">Intérêts nets : historique et prévision sur 12 mois</div>
            </template>
            <ClientOnly>
              <ForecastChart
                :monthly-net-interest="data!.monthlyNetInterest"
                :forecast="data!.forecast"
                :monthly-forecast-net="data!.kpis.monthlyForecastNet"
              />
            </ClientOnly>
          </UCard>
          <UCard v-if="data!.hasTransactions">
            <template #header>
              <div class="font-semibold text-sm">Cash-flow</div>
            </template>
            <ClientOnly>
              <CashflowChart :transactions="portfolio.data.value.transactions" />
            </ClientOnly>
          </UCard>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <UCard v-if="data!.hasTransactions">
              <template #header>
                <div class="font-semibold text-sm">Répartition par statut</div>
              </template>
              <ClientOnly>
                <StatusChart :status-breakdown="data!.statusBreakdown" />
              </ClientOnly>
            </UCard>
            <UCard>
              <template #header>
                <div class="font-semibold text-sm">Répartition par taux ciblé</div>
              </template>
              <ClientOnly>
                <RateChart :rate-breakdown="data!.rateBreakdown" />
              </ClientOnly>
            </UCard>
          </div>
        </div>
      </section>

      <section>
        <UCard>
          <template #header>
            <div class="font-semibold text-sm">Détail des {{ data!.kpis.nbProjectsTotal }} souscriptions</div>
          </template>
          <ProjectsTable
            :projects="data!.projects"
            :subscription-dates="data!.subscriptionDates"
            :delays="Object.fromEntries(data!.risk.late.map(l => [l.name, l.delayMonths]))"
          />
        </UCard>
      </section>
    </div>
  </div>
</template>
