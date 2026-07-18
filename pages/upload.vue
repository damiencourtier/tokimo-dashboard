<script setup lang="ts">
import type { Project, Transaction } from '../types/tokimo'

const portfolio = usePortfolio()

const projectsFile = ref<File | null>(null)
const transactionsFile = ref<File | null>(null)

const projectsStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const transactionsStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const projectsMessage = ref('')
const transactionsMessage = ref('')

async function uploadProjects() {
  if (!projectsFile.value) return
  projectsStatus.value = 'loading'
  projectsMessage.value = ''
  try {
    const form = new FormData()
    form.append('file', projectsFile.value)
    const res = await $fetch<{ ok: boolean; count: number; projects: Project[] }>('/api/upload/projects', {
      method: 'POST',
      body: form
    })
    portfolio.value.projects = res.projects
    portfolio.value.updatedAt = new Date().toISOString()
    projectsStatus.value = 'ok'
    projectsMessage.value = `${res.count} lignes importées avec succès.`
  } catch (e: any) {
    projectsStatus.value = 'error'
    projectsMessage.value = e?.data?.statusMessage || e?.message || "Échec de l'import."
  }
}

async function uploadTransactions() {
  if (!transactionsFile.value) return
  transactionsStatus.value = 'loading'
  transactionsMessage.value = ''
  try {
    const form = new FormData()
    form.append('file', transactionsFile.value)
    const res = await $fetch<{ ok: boolean; count: number; transactions: Transaction[] }>('/api/upload/transactions', {
      method: 'POST',
      body: form
    })
    portfolio.value.transactions = res.transactions
    portfolio.value.updatedAt = new Date().toISOString()
    transactionsStatus.value = 'ok'
    transactionsMessage.value = `${res.count} lignes importées avec succès.`
  } catch (e: any) {
    transactionsStatus.value = 'error'
    transactionsMessage.value = e?.data?.statusMessage || e?.message || "Échec de l'import."
  }
}

function onProjectsChange(e: Event) {
  const input = e.target as HTMLInputElement
  projectsFile.value = input.files?.[0] || null
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
        <b>Mon compte → Mes transactions → Exporter les transactions</b>. Dépose les deux fichiers ici : le
        dashboard se met à jour immédiatement. Rien n'est enregistré côté serveur — un rechargement de la
        page efface les données, il faudra réimporter les fichiers.
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
      <div class="flex items-center gap-3">
        <UButton
          :loading="projectsStatus === 'loading'"
          :disabled="!projectsFile"
          @click="uploadProjects"
        >
          Importer
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
        C'est celui qui alimente le cash-flow précis et les prévisions nettes.
      </p>
      <input type="file" accept=".csv" class="text-sm mb-3" @change="onTransactionsChange" />
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
