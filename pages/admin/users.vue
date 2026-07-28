<script setup lang="ts">
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

interface UserRow {
  id: number
  email: string
  role: 'user' | 'admin'
  createdAt: string
}

const { user: currentUser } = useAuth()
const api = useApi()
const { data: accounts, refresh } = useAsyncData<UserRow[]>(
  'admin-users',
  () => api('/admin/users'),
  { default: () => [] }
)

const email = ref('')
const password = ref('')
const isAdminAccount = ref(false)
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')

async function createAccount() {
  status.value = 'loading'
  errorMessage.value = ''
  try {
    await api('/admin/users', {
      method: 'POST',
      body: { email: email.value, plainPassword: password.value, role: isAdminAccount.value ? 'admin' : 'user' }
    })
    email.value = ''
    password.value = ''
    isAdminAccount.value = false
    status.value = 'idle'
    await refresh()
  } catch (e: any) {
    status.value = 'error'
    errorMessage.value = apiErrorMessage(e, 'Échec de la création.')
  }
}

const rowLoading = ref<Record<number, boolean>>({})
const rowError = ref<Record<number, string>>({})
const resettingId = ref<number | null>(null)
const newPassword = ref('')

const patchHeaders = { 'Content-Type': 'application/merge-patch+json' }

async function toggleRole(row: UserRow) {
  const nextRole = row.role === 'admin' ? 'user' : 'admin'
  rowLoading.value[row.id] = true
  rowError.value[row.id] = ''
  try {
    await api(`/admin/users/${row.id}`, { method: 'PATCH', headers: patchHeaders, body: { role: nextRole } })
    await refresh()
  } catch (e: any) {
    rowError.value[row.id] = apiErrorMessage(e, 'Échec de la mise à jour.')
  } finally {
    rowLoading.value[row.id] = false
  }
}

function startPasswordReset(row: UserRow) {
  resettingId.value = row.id
  newPassword.value = ''
  rowError.value[row.id] = ''
}

function cancelPasswordReset() {
  resettingId.value = null
  newPassword.value = ''
}

async function confirmPasswordReset(row: UserRow) {
  rowLoading.value[row.id] = true
  rowError.value[row.id] = ''
  try {
    await api(`/admin/users/${row.id}`, { method: 'PATCH', headers: patchHeaders, body: { plainPassword: newPassword.value } })
    cancelPasswordReset()
  } catch (e: any) {
    rowError.value[row.id] = apiErrorMessage(e, 'Échec de la mise à jour.')
  } finally {
    rowLoading.value[row.id] = false
  }
}

async function deleteAccount(row: UserRow) {
  if (!confirm(`Supprimer le compte ${row.email} ? Ses souscriptions et transactions seront aussi supprimées.`)) {
    return
  }
  rowLoading.value[row.id] = true
  rowError.value[row.id] = ''
  try {
    await api(`/admin/users/${row.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    rowError.value[row.id] = apiErrorMessage(e, 'Échec de la suppression.')
  } finally {
    rowLoading.value[row.id] = false
  }
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div>
      <h2 class="text-lg font-bold">Comptes</h2>
      <p class="text-sm text-muted mt-1">
        Créer, éditer ou supprimer des comptes. Réservé aux admins — les nouveaux comptes n'ont accès qu'à
        leurs propres données (projets, souscriptions, transactions), sauf s'ils sont eux-mêmes admins.
      </p>
    </div>

    <UCard>
      <template #header>
        <div class="font-semibold text-sm">Nouveau compte</div>
      </template>
      <form class="space-y-4" @submit.prevent="createAccount">
        <UFormField label="Email">
          <UInput v-model="email" type="email" autocomplete="off" required class="w-full" />
        </UFormField>
        <UFormField label="Mot de passe">
          <UInput v-model="password" type="password" autocomplete="new-password" required class="w-full" />
        </UFormField>
        <UCheckbox v-model="isAdminAccount" label="Compte admin" />

        <UAlert v-if="status === 'error'" color="error" variant="subtle" :description="errorMessage" />

        <UButton type="submit" :loading="status === 'loading'">Créer le compte</UButton>
      </form>
    </UCard>

    <UCard>
      <template #header>
        <div class="font-semibold text-sm">Comptes existants ({{ accounts.length }})</div>
      </template>
      <div class="rounded-lg border border-default overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-elevated">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Email</th>
              <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Rôle</th>
              <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Créé le</th>
              <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="a in accounts" :key="a.id">
              <tr class="border-t border-default">
                <td class="px-3 py-2">
                  {{ a.email }}
                  <span v-if="a.id === currentUser?.id" class="text-xs text-muted">(toi)</span>
                </td>
                <td class="px-3 py-2">
                  <UBadge :color="a.role === 'admin' ? 'primary' : 'neutral'" variant="subtle">{{ a.role }}</UBadge>
                </td>
                <td class="px-3 py-2">{{ fmtDate(a.createdAt) }}</td>
                <td class="px-3 py-2">
                  <div class="flex flex-wrap gap-2">
                    <UButton
                      size="xs"
                      variant="outline"
                      color="neutral"
                      :loading="rowLoading[a.id]"
                      @click="toggleRole(a)"
                    >
                      {{ a.role === 'admin' ? 'Rétrograder' : 'Passer admin' }}
                    </UButton>
                    <UButton
                      size="xs"
                      variant="outline"
                      color="neutral"
                      :disabled="rowLoading[a.id]"
                      @click="startPasswordReset(a)"
                    >
                      Mot de passe
                    </UButton>
                    <UButton
                      size="xs"
                      variant="outline"
                      color="error"
                      :loading="rowLoading[a.id]"
                      @click="deleteAccount(a)"
                    >
                      Supprimer
                    </UButton>
                  </div>
                </td>
              </tr>
              <tr v-if="resettingId === a.id" class="border-t border-default">
                <td colspan="4" class="px-3 py-3 bg-elevated">
                  <div class="flex items-end gap-3">
                    <UFormField label="Nouveau mot de passe" class="flex-1 max-w-xs">
                      <UInput v-model="newPassword" type="password" autocomplete="new-password" class="w-full" />
                    </UFormField>
                    <UButton size="xs" :loading="rowLoading[a.id]" @click="confirmPasswordReset(a)">
                      Enregistrer
                    </UButton>
                    <UButton size="xs" variant="ghost" color="neutral" @click="cancelPasswordReset">
                      Annuler
                    </UButton>
                  </div>
                </td>
              </tr>
              <tr v-if="rowError[a.id]" class="border-t border-default">
                <td colspan="4" class="px-3 py-2">
                  <UAlert color="error" variant="subtle" :description="rowError[a.id]" />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
