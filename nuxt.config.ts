// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Tokimo Dashboard',
      meta: [
        { name: 'description', content: 'Suivi et prévisions de tes investissements Tokimo' }
      ]
    }
  }
})
