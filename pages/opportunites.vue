<script setup lang="ts">
import promptTemplate from '~/docs/prompt-claude-chrome-opportunites.md?raw'
import type { InvestmentCriteria, Opportunity } from '~/types/tokimo'
import type { CriterionStatus } from '~/utils/opportunityCheck'

const api = useApi()
const portfolio = usePortfolio()
const { isAdmin } = useAuth()

const emptyCriteria = (): InvestmentCriteria => ({
  requireFirstRankMortgage: false,
  loansOnly: false,
  excludeOperatorsWithOverdueProjects: false
})

const { data: opportunities, refresh: refreshOpportunities } = useAsyncData<Opportunity[]>(
  'opportunities',
  () => api('/opportunities'),
  { default: () => [] }
)
const { data: savedCriteria, refresh: refreshCriteria } = useAsyncData<InvestmentCriteria>(
  'investment-criteria',
  () => api('/me/criteria'),
  { default: emptyCriteria }
)

const dashboard = computed(() =>
  computeDashboard(portfolio.data.value.projects, portfolio.data.value.transactions, portfolio.data.value.updatedAt)
)
const activeProjects = computed(() =>
  portfolio.data.value.projects.filter(p => p.name in dashboard.value.remainingCapitalByProject)
)
const remainingCapitalOf = (p: { name: string }) => dashboard.value.remainingCapitalByProject[p.name] ?? 0

// --- Critères : formulaire local, appliqué en direct, enregistré à la demande.
const form = reactive<InvestmentCriteria>(emptyCriteria())
const ratingsText = ref('')
function fillForm(c: InvestmentCriteria) {
  for (const key of Object.keys(form) as (keyof InvestmentCriteria)[]) delete form[key]
  Object.assign(form, emptyCriteria(), c)
  delete form.saved
  ratingsText.value = (c.allowedRatings ?? []).join(', ')
}
// Tant que le compte n'a rien enregistré, le formulaire part des repères du
// marché ; le montant envisagé par défaut est le ticket habituel du compte.
const usualTicket = computed(() =>
  medianTicket(portfolio.data.value.projects.filter(p => p.status !== 'Annulé').map(p => p.amount))
)
watch([savedCriteria, usualTicket], ([c, ticket]) => fillForm(initialCriteria(c, ticket)), { immediate: true })
const usingBenchmarks = computed(() => !savedCriteria.value.saved)
function applyBenchmarks() {
  fillForm(benchmarkCriteria(usualTicket.value))
}
watch(ratingsText, (t) => {
  const ratings = t.split(/[\s,;]+/).map(r => r.trim().toUpperCase()).filter(Boolean)
  form.allowedRatings = ratings.length ? [...new Set(ratings)] : null
})
const criteria = computed<InvestmentCriteria>(() => ({ ...form }))
const CRITERIA_KEYS = ['requireFirstRankMortgage', 'loansOnly', 'maxLtv', 'maxLtc', 'allowedRatings', 'minRate', 'maxDurationMonths',
  'minPreSalesPct', 'maxOperatorSharePct', 'excludeOperatorsWithOverdueProjects', 'ticketAmount'] as const
function normalizeCriteria(c: InvestmentCriteria) {
  const full = { ...emptyCriteria(), ...c } as Record<string, unknown>
  return Object.fromEntries(CRITERIA_KEYS.map(k => [k, full[k] ?? null]))
}
const criteriaDirty = computed(() =>
  !savedCriteria.value.saved || JSON.stringify(normalizeCriteria(form)) !== JSON.stringify(normalizeCriteria(savedCriteria.value))
)
const benchmark = (key: keyof InvestmentCriteria) => MARKET_BENCHMARKS[key]
const criteriaSaving = ref(false)
const criteriaError = ref('')
async function saveCriteria() {
  criteriaSaving.value = true
  criteriaError.value = ''
  try {
    await api('/me/criteria', { method: 'PUT', body: normalizeCriteria(form) })
    await refreshCriteria()
  } catch (e: any) {
    criteriaError.value = apiErrorMessage(e, "Échec de l'enregistrement.")
  } finally {
    criteriaSaving.value = false
  }
}
const activeCriteriaCount = computed(() => evaluateOpportunity(
  { tokimoId: 0, name: '', updatedAt: '' }, criteria.value, null, 0
).length)

// --- Opportunités affichées.
const showClosed = ref(false)
const isOpen = (o: Opportunity) => !o.fundingStatus || /en cours/i.test(o.fundingStatus)
const rows = computed(() =>
  opportunities.value
    .filter(o => showClosed.value || isOpen(o))
    .map((o) => {
      const exposure = operatorExposure(o, activeProjects.value, remainingCapitalOf)
      const results = evaluateOpportunity(o, criteria.value, exposure, dashboard.value.kpis.activeCapital)
      return {
        o,
        exposure,
        results,
        ok: results.filter(r => r.status === 'ok').length,
        ko: results.filter(r => r.status === 'ko').length,
        unknown: results.filter(r => r.status === 'unknown').length
      }
    })
)
const closedCount = computed(() => opportunities.value.filter(o => !isOpen(o)).length)

const statusIcon: Record<CriterionStatus, string> = {
  ok: 'i-lucide-circle-check',
  ko: 'i-lucide-circle-x',
  unknown: 'i-lucide-circle-help'
}
const statusClass: Record<CriterionStatus, string> = {
  ok: 'text-emerald-600',
  ko: 'text-red-500',
  unknown: 'text-muted'
}

const fmtEur0 = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'
const fmtPct = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %'
const collectPct = (o: Opportunity) =>
  o.targetAmount && o.collectedAmount !== null && o.collectedAmount !== undefined
    ? Math.min(100, (o.collectedAmount / o.targetAmount) * 100)
    : null
const updatedLabel = (o: Opportunity) => new Date(o.updatedAt).toLocaleDateString('fr-FR')

// --- Admin : prompt Claude in Chrome, import, suppression.
const dashboardUrl = useRuntimeConfig().public.dashboardUrl as string
const prompt = computed(() => buildOpportunitiesPrompt(promptTemplate, opportunities.value.filter(isOpen), dashboardUrl))
const copied = ref(false)
async function copyPrompt() {
  await navigator.clipboard.writeText(prompt.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const importText = ref('')
const importStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const importMessage = ref('')
async function importOpportunities() {
  importStatus.value = 'loading'
  importMessage.value = ''
  let body: unknown
  try {
    body = JSON.parse(importText.value)
  } catch {
    importStatus.value = 'error'
    importMessage.value = 'Ce n’est pas du JSON valide : colle exactement le bloc { "items": [...] } produit par Claude in Chrome.'
    return
  }
  try {
    const res = await api<{ created: number; updated: number }>('/opportunities/import', { method: 'POST', body: body as Record<string, unknown> })
    await refreshOpportunities()
    importStatus.value = 'ok'
    importMessage.value = `${res.created} opportunité(s) créée(s), ${res.updated} mise(s) à jour.`
    importText.value = ''
  } catch (e: any) {
    importStatus.value = 'error'
    importMessage.value = apiErrorMessage(e, "Échec de l'import.")
  }
}

const confirmingDelete = ref<number | null>(null)
async function deleteOpportunity(o: Opportunity) {
  if (confirmingDelete.value !== o.tokimoId) {
    confirmingDelete.value = o.tokimoId
    return
  }
  confirmingDelete.value = null
  await api(`/opportunities/${o.tokimoId}`, { method: 'DELETE' })
  await refreshOpportunities()
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-lg font-bold">Opportunités Tokimo</h2>
      <p class="text-sm text-muted mt-1 leading-relaxed">
        Les données des projets ouverts, relevées sur Tokimo, confrontées à <b>tes propres critères</b> et à ce que
        ton portefeuille contient déjà. Pour chaque critère que tu appliques, le dashboard indique s'il est rempli,
        non rempli ou non renseigné, sans note globale ni recommandation.
      </p>
      <UAlert
        icon="i-lucide-info"
        color="neutral"
        variant="subtle"
        class="mt-3"
        description="Ces informations ne constituent pas un conseil en investissement. Le crowdfunding immobilier comporte un risque de perte en capital et d'illiquidité ; les données proviennent de Tokimo, qui évalue lui-même ses projets."
      />
    </div>

    <!-- Critères -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="font-semibold text-sm">Mes critères</div>
            <div class="text-xs text-muted">
              {{ activeCriteriaCount ? `${activeCriteriaCount} critère(s) appliqué(s)` : 'Aucun critère appliqué : coche ou renseigne ceux qui comptent pour toi.' }}
              · laisser vide = critère non appliqué
            </div>
          </div>
          <UButton :loading="criteriaSaving" :disabled="!criteriaDirty" @click="saveCriteria">
            {{ criteriaDirty ? 'Enregistrer' : 'Enregistré' }}
          </UButton>
        </div>
      </template>
      <p v-if="criteriaError" class="text-sm text-red-500 mb-3 whitespace-pre-line">{{ criteriaError }}</p>
      <UAlert
        v-if="usingBenchmarks"
        icon="i-lucide-scale"
        color="info"
        variant="subtle"
        class="mb-5"
        title="Repères courants du marché appliqués par défaut"
        description="Seuils couramment cités par les guides et plateformes de crowdfunding immobilier (l'AMF ne fixe aucun seuil chiffré). Chaque valeur a sa source ; seule la note Tokimo reste vide, faute de repère externe. Adapte ces valeurs à ta situation, puis enregistre-les."
      />
      <div v-else class="flex justify-end -mt-2 mb-3">
        <UButton size="xs" variant="ghost" icon="i-lucide-rotate-ccw" @click="applyBenchmarks">Revenir aux repères du marché</UButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <UCheckbox v-model="form.requireFirstRankMortgage" label="Exiger une hypothèque de 1er rang" />
          <p class="text-xs text-muted mt-1 leading-relaxed">
            En cas de défaut, le prêteur de 1er rang est remboursé en priorité sur la vente du bien. Une caution
            personnelle dépend de la solvabilité des dirigeants ; une fiducie confie le bien à un tiers de confiance.
          </p>
          <BenchmarkHint :benchmark="benchmark('requireFirstRankMortgage')" />
        </div>
        <div>
          <UCheckbox v-model="form.loansOnly" label="Prêts uniquement (pas d'equity)" />
          <p class="text-xs text-muted mt-1 leading-relaxed">
            L'equity est une prise de participation : pas de taux contractuel ni d'hypothèque, le gain comme la perte
            dépendent du résultat de l'opération.
          </p>
          <BenchmarkHint :benchmark="benchmark('loansOnly')" />
        </div>
        <UFormField label="LTV maximum (%)" description="Montant prêté / valeur estimée du bien. Plus il est bas, plus la marge est grande si le bien doit être vendu.">
          <UInputNumber v-model="form.maxLtv" :min="0" :max="500" :step="1" placeholder="—" class="w-40" />
          <BenchmarkHint :benchmark="benchmark('maxLtv')" />
        </UFormField>
        <UFormField label="LTC maximum (%)" description="Montant prêté / coût total du projet (achat, travaux, frais).">
          <UInputNumber v-model="form.maxLtc" :min="0" :max="500" :step="1" placeholder="—" class="w-40" />
          <BenchmarkHint :benchmark="benchmark('maxLtc')" />
        </UFormField>
        <UFormField label="Notes Tokimo acceptées" description="Lettres séparées par des virgules (ex. A, B). Note attribuée par Tokimo selon sa propre méthode.">
          <UInput v-model="ratingsText" placeholder="ex. A, B" class="w-40" />
          <p class="text-xs mt-1 text-muted">Pas de repère externe : à fixer selon ta lecture de l'échelle Tokimo.</p>
        </UFormField>
        <UFormField label="Taux minimum (%/an)" description="Taux annuel cible, avant prélèvements à la source (IR + CSG).">
          <UInputNumber v-model="form.minRate" :min="0" :max="100" :step="0.25" placeholder="—" class="w-40" />
          <BenchmarkHint :benchmark="benchmark('minRate')" />
        </UFormField>
        <UFormField label="Durée maximum (mois)" description="Durée pendant laquelle le capital est immobilisé ; les prolongations sont fréquentes.">
          <UInputNumber v-model="form.maxDurationMonths" :min="1" :step="1" placeholder="—" class="w-40" />
          <BenchmarkHint :benchmark="benchmark('maxDurationMonths')" />
        </UFormField>
        <UFormField label="Pré-commercialisation minimum (%)" description="Part des lots déjà réservés ou vendus annoncée par l'opérateur : la sortie du projet dépend des ventes.">
          <UInputNumber v-model="form.minPreSalesPct" :min="0" :max="100" :step="5" placeholder="—" class="w-40" />
          <BenchmarkHint :benchmark="benchmark('minPreSalesPct')" />
        </UFormField>
        <div class="space-y-3">
          <UFormField label="Part maximum chez un même opérateur (%)" description="Part de ton capital en cours qui dépendrait du même opérateur, montant envisagé compris.">
            <UInputNumber v-model="form.maxOperatorSharePct" :min="0" :max="100" :step="1" placeholder="—" class="w-40" />
            <BenchmarkHint :benchmark="benchmark('maxOperatorSharePct')" />
          </UFormField>
          <UFormField label="Montant envisagé par projet (€)" description="Sert au calcul de la part ci-dessus. Vide = ticket minimum du projet.">
            <UInputNumber v-model="form.ticketAmount" :min="1" :step="50" placeholder="—" class="w-40" />
            <BenchmarkHint :benchmark="TICKET_BENCHMARK" />
          </UFormField>
        </div>
        <div class="md:col-span-2">
          <UCheckbox
            v-model="form.excludeOperatorsWithOverdueProjects"
            label="Signaler un opérateur dont un projet de mon portefeuille a dépassé sa durée cible"
          />
          <p class="text-xs text-muted mt-1">Nécessite l'opérateur et la durée renseignés sur tes projets (page « Prompt Chrome »).</p>
          <BenchmarkHint :benchmark="benchmark('excludeOperatorsWithOverdueProjects')" />
        </div>
      </div>
    </UCard>

    <!-- Opportunités -->
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-xs font-bold uppercase tracking-wide text-muted">
          {{ rows.length }} opportunité(s){{ showClosed ? '' : ' en cours' }}
        </h3>
        <USwitch v-if="closedCount" v-model="showClosed" :label="`Afficher les clôturées (${closedCount})`" />
      </div>

      <UAlert
        v-if="!rows.length"
        icon="i-lucide-search"
        color="neutral"
        variant="subtle"
        :title="opportunities.length ? 'Aucune opportunité en cours.' : 'Aucune opportunité importée pour l’instant.'"
        :description="isAdmin ? 'Copie le prompt plus bas et colle-le dans Claude in Chrome pour relever les opportunités ouvertes sur Tokimo.' : undefined"
      />

      <UCard v-for="r in rows" :key="r.o.tokimoId">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="font-bold">{{ r.o.name }}</h4>
              <UBadge v-if="r.o.category" :color="isEquity(r.o) ? 'warning' : 'neutral'" variant="subtle">{{ r.o.category }}</UBadge>
              <UBadge v-if="r.o.fundingStatus" :color="isOpen(r.o) ? 'success' : 'neutral'" variant="subtle">{{ r.o.fundingStatus }}</UBadge>
            </div>
            <p class="text-xs text-muted mt-1">
              {{ r.o.city ?? '' }}{{ r.o.city ? ' · ' : '' }}relevé le {{ updatedLabel(r.o) }}
              <template v-if="r.o.bonus"> · {{ r.o.bonus }}</template>
            </p>
          </div>
          <div class="flex items-center gap-1">
            <UButton :to="`https://app.tokimo.eu/projects/${r.o.tokimoId}`" target="_blank" size="xs" variant="ghost" icon="i-lucide-external-link">
              Fiche Tokimo
            </UButton>
            <UButton
              v-if="isAdmin"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              @click="deleteOpportunity(r.o)"
            >
              {{ confirmingDelete === r.o.tokimoId ? 'Confirmer' : '' }}
            </UButton>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Faits -->
          <div class="lg:col-span-2 space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><div class="text-xs text-muted">Taux</div><div class="font-semibold">{{ r.o.rate != null ? `${fmtPct(r.o.rate)}/an` : '—' }}</div></div>
              <div><div class="text-xs text-muted">Durée</div><div class="font-semibold">{{ r.o.durationMonths ? `${r.o.durationMonths} mois` : '—' }}</div></div>
              <div><div class="text-xs text-muted">Versement</div><div class="font-semibold">{{ r.o.paymentType ?? '—' }}</div></div>
              <div><div class="text-xs text-muted">Ticket minimum</div><div class="font-semibold">{{ r.o.minTicket != null ? fmtEur0(r.o.minTicket) : '—' }}</div></div>
              <div><div class="text-xs text-muted">LTV · LTC</div><div class="font-semibold">{{ r.o.ltv != null ? fmtPct(r.o.ltv) : '—' }} · {{ r.o.ltc != null ? fmtPct(r.o.ltc) : '—' }}</div></div>
              <div><div class="text-xs text-muted">Note Tokimo</div><div class="font-semibold">{{ r.o.rating ?? '—' }}<span v-if="r.o.ratingLabel" class="font-normal text-muted"> · {{ r.o.ratingLabel }}</span></div></div>
              <div><div class="text-xs text-muted">Capital propre opérateur</div><div class="font-semibold">{{ r.o.equity != null ? fmtEur0(r.o.equity) : '—' }}</div></div>
              <div><div class="text-xs text-muted">Pré-commercialisation</div><div class="font-semibold">{{ r.o.preSalesPct != null ? fmtPct(r.o.preSalesPct) : '—' }}</div></div>
            </div>

            <div v-if="collectPct(r.o) !== null">
              <div class="flex justify-between text-xs text-muted mb-1">
                <span>Collecte : {{ fmtEur0(r.o.collectedAmount!) }} sur {{ fmtEur0(r.o.targetAmount!) }}</span>
                <span>{{ Math.round(collectPct(r.o)!) }} %</span>
              </div>
              <div class="h-1.5 rounded bg-elevated"><div class="h-1.5 rounded bg-violet-500" :style="{ width: collectPct(r.o) + '%' }" /></div>
            </div>

            <div class="text-sm">
              <div class="text-xs text-muted mb-1">Garanties</div>
              <div v-if="r.o.guarantees?.length" class="flex flex-wrap gap-1">
                <UBadge v-for="g in r.o.guarantees" :key="g" color="neutral" variant="outline">{{ g }}</UBadge>
              </div>
              <span v-else class="text-muted">{{ r.o.guarantees ? 'Aucune' : 'Non renseignées' }}</span>
            </div>

            <div v-if="r.o.subScores && Object.keys(r.o.subScores).length" class="text-sm">
              <div class="text-xs text-muted mb-1">Sous-notes Tokimo (/10)</div>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <span v-for="(score, label) in r.o.subScores" :key="label">{{ label }} <b>{{ score }}</b></span>
              </div>
            </div>

            <div class="text-sm">
              <div class="text-xs text-muted mb-1">Opérateur et ton portefeuille</div>
              <template v-if="!r.o.operator">
                <span class="text-muted">Opérateur non renseigné</span>
              </template>
              <template v-else>
                <b>{{ r.o.operator }}</b> :
                <template v-if="r.exposure?.projects.length">
                  {{ fmtEur0(r.exposure.capital) }} déjà en cours chez cet opérateur
                  ({{ Math.round(r.exposure.capital / Math.max(dashboard.kpis.activeCapital, 1) * 100) }} % de ton capital en cours) :
                  <span v-for="(p, i) in r.exposure.projects" :key="p.name">
                    <NuxtLink :to="`/projects/${encodeURIComponent(p.name)}`" class="text-violet-700 dark:text-violet-400 hover:underline">{{ p.name }}</NuxtLink>
                    <span v-if="p.delayMonths" class="text-amber-600"> (+{{ p.delayMonths }} mois)</span>{{ i < r.exposure.projects.length - 1 ? ', ' : '' }}
                  </span>
                </template>
                <span v-else class="text-muted">aucun projet en cours chez cet opérateur dans ton portefeuille.</span>
              </template>
            </div>
          </div>

          <!-- Critères -->
          <div class="rounded-lg border border-default p-4">
            <div class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Mes critères</div>
            <p v-if="!r.results.length" class="text-sm text-muted">Aucun critère appliqué.</p>
            <template v-else>
              <p class="text-sm mb-3">
                <b>{{ r.ok }}</b> rempli(s) sur {{ r.results.length }}
                <span v-if="r.ko" class="text-red-500"> · {{ r.ko }} non rempli(s)</span>
                <span v-if="r.unknown" class="text-muted"> · {{ r.unknown }} non renseigné(s)</span>
              </p>
              <ul class="space-y-2 text-sm">
                <li v-for="c in r.results" :key="c.key" class="flex gap-2">
                  <UIcon :name="statusIcon[c.status]" class="size-4 mt-0.5 shrink-0" :class="statusClass[c.status]" />
                  <div>
                    <div>{{ c.label }}</div>
                    <div class="text-xs text-muted">{{ c.detail }}</div>
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Admin : relevé via Claude in Chrome -->
    <section v-if="isAdmin" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold text-sm">Prompt Claude in Chrome</div>
            <UButton :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" :color="copied ? 'success' : 'primary'" size="sm" @click="copyPrompt">
              {{ copied ? 'Copié !' : 'Copier le prompt' }}
            </UButton>
          </div>
        </template>
        <p class="text-xs text-muted mb-2">
          Colle-le dans Claude in Chrome : il relève les opportunités ouvertes sur Tokimo, te montre un récapitulatif,
          puis importe le JSON ci-contre après ton accord.
        </p>
        <pre class="text-xs whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-elevated rounded-lg p-3">{{ prompt }}</pre>
      </UCard>

      <UCard>
        <template #header>
          <div class="font-semibold text-sm">Importer des opportunités</div>
        </template>
        <UTextarea
          v-model="importText"
          :rows="8"
          placeholder='{"items": [{"tokimoId": 135, "name": "…", …}]}'
          class="w-full font-mono text-xs"
        />
        <div class="flex items-center gap-3 mt-3">
          <UButton :loading="importStatus === 'loading'" :disabled="!importText.trim()" @click="importOpportunities">Importer</UButton>
          <span v-if="importStatus === 'ok'" class="text-sm text-emerald-600">{{ importMessage }}</span>
        </div>
        <pre v-if="importStatus === 'error'" class="text-xs text-red-500 whitespace-pre-wrap mt-3">{{ importMessage }}</pre>
      </UCard>
    </section>
  </div>
</template>
