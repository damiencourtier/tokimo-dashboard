<script setup lang="ts">
const { isAdmin, logout: doLogout } = useAuth()

async function logout() {
  await doLogout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-[var(--ui-bg)]">
    <header class="bg-gradient-to-r from-violet-600 to-violet-800 text-white">
      <div class="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">Portefeuille Tokimo</h1>
          <p class="text-sm text-violet-100">Suivi et prévisions de tes investissements</p>
        </div>
        <nav class="flex gap-2 items-center">
          <UButton to="/" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Dashboard
          </UButton>
          <UButton to="/simulateur" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Simulateur
          </UButton>
          <UButton to="/opportunites" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Opportunités
          </UButton>
          <UButton to="/upload" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Mettre à jour les données
          </UButton>
          <UButton v-if="isAdmin" to="/admin/users" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Comptes
          </UButton>
          <UButton v-if="isAdmin" to="/admin/prompt-chrome" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Prompt Chrome
          </UButton>
          <ColorModeToggle class="text-white hover:bg-white/10" />
          <UButton variant="ghost" color="neutral" icon="i-lucide-log-out" class="text-white hover:bg-white/10" @click="logout">
            Déconnexion
          </UButton>
        </nav>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-6 py-8">
      <slot />
    </main>
  </div>
</template>
