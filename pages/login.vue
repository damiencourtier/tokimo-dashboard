<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()

const email = ref('')
const password = ref('')
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')

async function onSubmit() {
  status.value = 'loading'
  errorMessage.value = ''
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  } catch (e: any) {
    status.value = 'error'
    errorMessage.value = apiErrorMessage(e, 'Échec de la connexion.')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--ui-bg)] px-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="font-semibold text-lg">Portefeuille Tokimo</div>
        <p class="text-sm text-muted mt-1">Connecte-toi pour accéder au dashboard.</p>
      </template>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormField label="Email">
          <UInput v-model="email" type="email" autocomplete="username" required class="w-full" />
        </UFormField>
        <UFormField label="Mot de passe">
          <UInput v-model="password" type="password" autocomplete="current-password" required class="w-full" />
        </UFormField>

        <UAlert v-if="status === 'error'" color="error" variant="subtle" :description="errorMessage" />

        <UButton type="submit" block :loading="status === 'loading'">
          Se connecter
        </UButton>
      </form>
    </UCard>
  </div>
</template>
