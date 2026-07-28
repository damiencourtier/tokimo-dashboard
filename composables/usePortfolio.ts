import type { Project, Transaction } from '../types/tokimo'

export interface PortfolioState {
  projects: Project[]
  transactions: Transaction[]
  updatedAt: string | null
}

/**
 * Portfolio de l'utilisateur courant, récupéré depuis l'API Symfony externe
 * (/portfolio). Partagé entre les pages via la clé 'portfolio' (Nuxt
 * dédoublonne le fetch). Appeler `refresh()` après un import ou une édition.
 */
export function usePortfolio() {
  const api = useApi()
  return useAsyncData<PortfolioState>(
    'portfolio',
    () => api('/portfolio'),
    { default: () => ({ projects: [], transactions: [], updatedAt: null }) }
  )
}
