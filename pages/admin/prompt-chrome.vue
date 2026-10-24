<script setup lang="ts">
import template from '~/docs/prompt-claude-chrome-fiches-tokimo.md?raw'
import type { PromptScope } from '~/utils/chromePrompt'

definePageMeta({
  middleware: [
    () => {
      const { isAdmin } = useAuth()
      if (!isAdmin.value) {
        return navigateTo('/')
      }
    }
  ]
})

const portfolio = usePortfolio()

const scope = ref<PromptScope>('active_missing')
const selection = ref<string[]>([])

const allNames = computed(() =>
  [...new Set(portfolio.data.value.projects.filter(p => p.status !== 'Annulé').map(p => p.name))].sort()
)
const count = (s: PromptScope) => new Set(projectsForScope(portfolio.data.value.projects, s).map(p => p.name)).size
const scopeItems = computed(() => [
  { value: 'active_missing', label: `Projets en cours sans fiche Tokimo (${count('active_missing')})` },
  { value: 'all_missing', label: `Tous les projets sans fiche Tokimo, remboursés compris (${count('all_missing')})` },
  { value: 'all', label: `Tous les projets, pour tout mettre à jour (${count('all')})` },
  { value: 'selection', label: 'Seulement les projets que je choisis' }
])

const targets = computed(() => projectsForScope(portfolio.data.value.projects, scope.value, selection.value))
const prompt = computed(() => buildChromePrompt(template, targets.value, window.location.origin))

const copied = ref(false)
const copyError = ref(false)
async function copy() {
  copyError.value = false
  try {
    await navigator.clipboard.writeText(prompt.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copyError.value = true
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div>
      <h2 class="text-lg font-bold">Prompt Claude in Chrome : fiches Tokimo</h2>
      <p class="text-sm text-muted mt-1">
        Copie ce prompt et colle-le dans Claude in Chrome. Il lit les fiches projet sur Tokimo (opérateur,
        garanties, note, LTV, durée, type de versement), te montre un récapitulatif à valider, puis remplit les
        fiches projet de ce dashboard. La liste des projets ci-dessous est calculée à partir de tes données.
      </p>
    </div>

    <UCard>
      <UFormField label="Projets à traiter">
        <URadioGroup v-model="scope" :items="scopeItems" />
      </UFormField>
      <UFormField v-if="scope === 'selection'" label="Projets" class="mt-4">
        <USelectMenu
          v-model="selection"
          :items="allNames"
          multiple
          placeholder="Choisir des projets…"
          class="w-full"
        />
      </UFormField>
    </UCard>

    <UAlert
      v-if="!targets.length"
      icon="i-lucide-circle-check"
      color="success"
      variant="subtle"
      :title="scope === 'selection' ? 'Choisis au moins un projet.' : 'Rien à traiter : tous ces projets ont déjà leur fiche Tokimo.'"
    />

    <UCard v-else>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="font-semibold text-sm">Prompt ({{ new Set(targets.map(p => p.name)).size }} projet(s))</div>
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            :color="copied ? 'success' : 'primary'"
            @click="copy"
          >
            {{ copied ? 'Copié !' : 'Copier le prompt' }}
          </UButton>
        </div>
      </template>
      <p v-if="copyError" class="text-sm text-red-500 mb-2">
        Copie automatique impossible : sélectionne le texte ci-dessous et copie-le manuellement.
      </p>
      <pre class="text-xs whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto bg-elevated rounded-lg p-4 select-all">{{ prompt }}</pre>
    </UCard>

    <p class="text-xs text-muted">
      Le texte du prompt se modifie dans <code>docs/prompt-claude-chrome-fiches-tokimo.md</code>.
    </p>
  </div>
</template>
