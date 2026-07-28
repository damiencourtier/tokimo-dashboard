/**
 * Instance $fetch pointée sur l'API Symfony externe (tokimo-api), avec les
 * cookies inclus — indispensable puisque le cookie de session JWT vit sur le
 * domaine de l'API, pas sur celui du frontend.
 */
export function useApi() {
  const config = useRuntimeConfig()
  return $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include'
  })
}

/** Message d'erreur lisible depuis une erreur $fetch (l'API renvoie `detail`). */
export function apiErrorMessage(e: any, fallback: string): string {
  return e?.data?.detail || e?.data?.violations?.[0]?.message || e?.message || fallback
}
