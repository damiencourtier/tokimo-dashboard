export interface Project {
  name: string
  date_emission: string // dd/mm/yyyy
  step: string
  rate: number
  amount: number
  status: string
}

export interface Transaction {
  date: string // dd/mm/yyyy
  nature: string
  project: string
  amount: number
  status: string
  echeance: number
  capital: number
  interest: number
  ir: number
  csg: number
  net: number
}

export interface ProjectDetail {
  project: Project
  transactions: Transaction[]
  kpis: {
    grossInterestTotal: number
    netInterestTotal: number
    irTotal: number
    csgTotal: number
    effectiveTaxRatePct: number
    capitalRepaidTotal: number
    remainingCapital: number
  }
  monthlyNetInterest: Record<string, number>
  monthlyCapitalRepaid: Record<string, number>
}

export interface DashboardData {
  updatedAt: string | null
  hasProjects: boolean
  hasTransactions: boolean
  projects: Project[]
  kpis: {
    totalInvested: number
    activeCapital: number
    reimbursedCapital: number
    nbProjectsTotal: number
    nbProjectsActive: number
    avgRateWeightedActive: number
    grossInterestTotal: number
    netInterestTotal: number
    irTotal: number
    csgTotal: number
    effectiveTaxRatePct: number
    depositsTotal: number
    withdrawalsTotal: number
    capitalRepaidTotal: number
    monthlyForecastGross: number
    monthlyForecastNet: number
  }
  statusBreakdown: Record<string, number>
  rateBreakdown: Record<string, number>
  monthlyNetInterest: Record<string, number>
  monthlyCapitalRepaid: Record<string, number>
  monthlyDeposits: Record<string, number>
}
