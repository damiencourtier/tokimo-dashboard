<script setup lang="ts">
const portfolio = usePortfolio()
const api = useApi()

const projectsFile = ref<File | null>(null)
const transactionsFile = ref<File | null>(null)

const projectsStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const transactionsStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const projectsMessage = ref('')
const transactionsMessage = ref('')

interface UploadResult {
  ok: boolean
  count: number
  dryRun: boolean
  created: string[]
  removed: string[]
  restored: string[]
}

// Aperçu de l'import des projets (dry run côté API, rien n'est enregistré) :
// affiché avant confirmation, surtout pour les souscriptions qui seraient
// marquées annulées parce qu'absentes du fichier.
const projectsPreview = ref<UploadResult | null>(null)
const previewLoading = ref(false)

// Dernière mise à jour connue à l'arrivée sur la page : figée, pour qu'importer
// les projets ne fasse pas ensuite passer l'export des transactions pour périmé.
const lastUpdateBeforeImport = ref<string | null>(null)
watch(
  () => portfolio.data.value.updatedAt,
  v => { lastUpdateBeforeImport.value ??= v },
  { immediate: true }
)
const projectsStaleWarning = computed(() =>
  projectsFile.value ? staleExportWarning(projectsFile.value.name, lastUpdateBeforeImport.value) : null
)
const transactionsStaleWarning = computed(() =>
  transactionsFile.value ? staleExportWarning(transactionsFile.value.name, lastUpdateBeforeImport.value) : null
)

function projectsForm() {
  const form = new FormData()
  form.append('file', projectsFile.value!)
  return form
}

async function previewProjects() {
  if (!projectsFile.value) return
  previewLoading.value = true
  projectsPreview.value = null
  try {
    projectsPreview.value = await api<UploadResult>('/upload/projects', {
      method: 'POST',
      query: { dryRun: 1 },
      body: projectsForm()
    })
  } catch (e: any) {
    projectsStatus.value = 'error'
    projectsMessage.value = apiErrorMessage(e, "Impossible de lire le fichier.")
  } finally {
    previewLoading.value = false
  }
}

function summarize(res: UploadResult): string {
  const parts = [`${res.count} lignes importées avec succès.`]
  if (res.created.length) parts.push(`${res.created.length} nouvelle(s) souscription(s).`)
  if (res.removed.length) parts.push(`Marquée(s) annulée(s) : ${res.removed.join(', ')}.`)
  if (res.restored.length) parts.push(`Réactivée(s) : ${res.restored.join(', ')}.`)
  return parts.join(' ')
}

async function uploadProjects() {
  if (!projectsFile.value) return
  projectsStatus.value = 'loading'
  projectsMessage.value = ''
  try {
    const res = await api<UploadResult>('/upload/projects', {
      method: 'POST',
      body: projectsForm()
    })
    await portfolio.refresh()
    projectsStatus.value = 'ok'
    projectsMessage.value = summarize(res)
    projectsPreview.value = null
  } catch (e: any) {
    projectsStatus.value = 'error'
    projectsMessage.value = apiErrorMessage(e, "Échec de l'import.")
  }
}

async function uploadTransactions() {
  if (!transactionsFile.value) return
  transactionsStatus.value = 'loading'
  transactionsMessage.value = ''
  try {
    const form = new FormData()
    form.append('file', transactionsFile.value)
    const res = await api<{ ok: boolean; count: number }>('/upload/transactions', {
      method: 'POST',
      body: form
    })
    await portfolio.refresh()
    transactionsStatus.value = 'ok'
    transactionsMessage.value = `${res.count} lignes importées avec succès.`
  } catch (e: any) {
    transactionsStatus.value = 'error'
    transactionsMessage.value = apiErrorMessage(e, "Échec de l'import.")
  }
}

function onProjectsChange(e: Event) {
  const input = e.target as HTMLInputElement
  projectsFile.value = input.files?.[0] || null
  projectsStatus.value = 'idle'
  projectsMessage.value = ''
  previewProjects()
}
function onTransactionsChange(e: Event) {
  const input = e.target as HTMLInputElement
  transactionsFile.value = input.files?.[0] || null
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div>
      <h2 class="text-lg font-bold">Mettre à jour les données</h2>
      <p class="text-sm text-muted mt-1">
        Sur Tokimo, va dans <b>Tableau de bord → Vos souscriptions → Exporter les projets</b>, puis dans
        <b>Mon compte → Mes transactions → Exporter les transactions</b>. Dépose les deux fichiers ici : les
        données sont enregistrées en base et mettent à jour ton dashboard. Réimporter les mêmes fichiers plus
        tard met simplement à jour les lignes existantes (aucun doublon), sans jamais écraser le type de
        versement que tu as choisi sur un projet.
      </p>
    </div>

    <UCard>
      <template #header>
        <div class="font-semibold text-sm">1. Liste des projets (souscriptions)</div>
      </template>
      <p class="text-xs text-muted mb-3">
        Fichier <code>liste_projets_du_*.csv</code> — le détail de tes souscriptions (taux, capital, statut).
      </p>
      <input type="file" accept=".csv" class="text-sm mb-3" @change="onProjectsChange" />
      <UAlert
        v-if="projectsStaleWarning"
        icon="i-lucide-calendar-clock"
        color="warning"
        variant="subtle"
        :description="projectsStaleWarning"
        class="mb-3"
      />
      <div v-if="previewLoading" class="text-xs text-muted mb-3">Analyse du fichier…</div>
      <div v-else-if="projectsPreview" class="mb-3 space-y-2">
        <p class="text-sm">
          <b>{{ projectsPreview.count }}</b> souscriptions dans le fichier
          <span v-if="projectsPreview.created.length"> · {{ projectsPreview.created.length }} nouvelle(s)</span>
          <span v-if="!projectsPreview.removed.length && !projectsPreview.restored.length"> · aucune souscription retirée</span>
        </p>
        <UAlert
          v-if="projectsPreview.removed.length"
          icon="i-lucide-circle-x"
          color="warning"
          variant="subtle"
          :title="`${projectsPreview.removed.length} souscription(s) absente(s) du fichier seront marquées annulées`"
          :description="projectsPreview.removed.join(', ')"
        />
        <UAlert
          v-if="projectsPreview.restored.length"
          icon="i-lucide-rotate-ccw"
          color="info"
          variant="subtle"
          :title="`${projectsPreview.restored.length} souscription(s) annulée(s) seront réactivées`"
          :description="projectsPreview.restored.join(', ')"
        />
      </div>
      <div class="flex items-center gap-3">
        <UButton
          :loading="projectsStatus === 'loading'"
          :disabled="!projectsFile || previewLoading"
          @click="uploadProjects"
        >
          {{ projectsPreview?.removed.length ? 'Confirmer l\'import' : 'Importer' }}
        </UButton>
        <span v-if="projectsMessage" :class="projectsStatus === 'error' ? 'text-red-500' : 'text-emerald-600'" class="text-sm">
          {{ projectsMessage }}
        </span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="font-semibold text-sm">2. Liste des transactions</div>
      </template>
      <p class="text-xs text-muted mb-3">
        Fichier <code>liste_transactions_du_*.csv</code> — l'historique complet (dépôts, échéances, IR/CSG).
        C'est celui qui alimente le cash-flow précis et les prévisions nettes. Importe-le après le fichier
        des projets (les transactions sont rattachées aux projets déjà en base).
      </p>
      <input type="file" accept=".csv" class="text-sm mb-3" @change="onTransactionsChange" />
      <UAlert
        v-if="transactionsStaleWarning"
        icon="i-lucide-calendar-clock"
        color="warning"
        variant="subtle"
        :description="transactionsStaleWarning"
        class="mb-3"
      />
      <div class="flex items-center gap-3">
        <UButton
          :loading="transactionsStatus === 'loading'"
          :disabled="!transactionsFile"
          @click="uploadTransactions"
        >
          Importer
        </UButton>
        <span
          v-if="transactionsMessage"
          :class="transactionsStatus === 'error' ? 'text-red-500' : 'text-emerald-600'"
          class="text-sm"
        >
          {{ transactionsMessage }}
        </span>
      </div>
    </UCard>

    <div class="text-center">
      <UButton to="/" variant="outline">Voir le dashboard</UButton>
    </div>
  </div>
</template>
