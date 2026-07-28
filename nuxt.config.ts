// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  // Le cookie de session (JWT) vit sur le domaine de l'API (IONOS), pas sur
  // celui du frontend (Netlify) : le SSR de Nuxt ne peut jamais le lire (cookies
  // isolés par domaine par le navigateur). Toute la logique d'auth/data doit
  // donc tourner côté client — l'app est une SPA pure.
  ssr: false,
  nitro: {
    // Explicite plutôt que de compter sur l'auto-détection Netlify au build.
    preset: process.env.NETLIFY ? 'netlify' : undefined
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
    }
  },
  app: {
    head: {
      title: 'Tokimo Dashboard',
      meta: [
        { name: 'description', content: 'Suivi et prévisions de tes investissements Tokimo' }
      ]
    }
  }
})
