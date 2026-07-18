import type { Project, Transaction } from '../types/tokimo'

export interface PortfolioState {
  projects: Project[]
  transactions: Transaction[]
  updatedAt: string | null
}

/** In-memory only: resets on every full page reload, nothing is persisted. */
export function usePortfolio() {
  return useState<PortfolioState>('portfolio', () => ({
    projects: [],
    transactions: [],
    updatedAt: null
  }))
}
