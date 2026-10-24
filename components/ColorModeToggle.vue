<script setup lang="ts">
// Bascule clair / sombre. Le choix est mémorisé par @nuxtjs/color-mode (fourni
// par Nuxt UI) ; tant qu'il n'y en a pas, le thème suit celui du système.
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
    :aria-label="isDark ? 'Passer en mode clair' : 'Passer en mode sombre'"
    :title="isDark ? 'Mode clair' : 'Mode sombre'"
    v-bind="$attrs"
    @click="toggle"
  />
</template>
