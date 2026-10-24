/** Champs tels qu'exportés par le CSV Tokimo "liste_projets". */
export interface ProjectCsvRow {
  name: string
  date_emission: string | null // dd/mm/yyyy, null si "Non déterminé" chez Tokimo
  step: string
  rate: number
  amount: number
  status: string
}

export interface Project extends ProjectCsvRow {
  /** Champs éditables manuellement, jamais fournis par Tokimo. */
  paymentType: 'in_fine' | 'mensuel' | null
  durationMonths: number | null
  /** Infos des fiches Tokimo (app.tokimo.eu/projects/{tokimoId}), renseignées par un admin. */
  tokimoId: number | null
  operator: string | null
  guarantees: string[] | null
  rating: string | null
  ltv: number | null
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
    bonusTotal: number
    capitalRepaidTotal: number
    remainingCapital: number
  }
  monthlyNetInterest: Record<string, number>
  monthlyCapitalRepaid: Record<string, number>
}

/** Totaux d'une année civile (date de versement de l'échéance), pour la déclaration de revenus. */
export interface TaxYearSummary {
  year: string
  nbEcheances: number
  grossInterest: number
  ir: number
  csg: number
  netInterest: number
}

/** Répartition du capital en cours (restant dû) selon les infos des fiches Tokimo. */
export interface RiskBreakdown {
  byOperator: Record<string, number>
  byRating: Record<string, number>
  firstRankMortgage: { covered: number; notCovered: number; unknown: number }
  /** LTV moyen pondéré par le capital en cours, sur les projets où il est renseigné. */
  avgLtvWeighted: number | null
  /** Projets en cours en retard (fin prévue dépassée), du plus en retard au moins. */
  late: { name: string; delayMonths: number; remainingCapital: number }[]
  /** Projets en cours sans date d'émission ou sans durée : retard non évaluable. */
  nbWithoutExpectedEnd: number
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
    bonusTotal: number
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
  taxByYear: TaxYearSummary[]
  /** Nom du projet -> dates de souscription (dd/mm/yyyy), de la plus ancienne à la plus récente. */
  subscriptionDates: Record<string, string[]>
  risk: RiskBreakdown
}
