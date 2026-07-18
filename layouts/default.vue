<template>
  <div class="min-h-screen bg-[var(--ui-bg)]">
    <header class="bg-gradient-to-r from-violet-600 to-violet-800 text-white">
      <div class="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">Portefeuille Tokimo</h1>
          <p class="text-sm text-violet-100">Suivi et prévisions de tes investissements</p>
        </div>
        <nav class="flex gap-2">
          <UButton to="/" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Dashboard
          </UButton>
          <UButton to="/simulateur" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Simulateur
          </UButton>
          <UButton to="/upload" variant="ghost" color="neutral" class="text-white hover:bg-white/10">
            Mettre à jour les données
          </UButton>
        </nav>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-6 py-8">
      <slot />
    </main>
  </div>
</template>
