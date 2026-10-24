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
  /** Dernière actualité Tokimo du projet : date (dd/mm/yyyy) et titre, jamais le contenu. */
  lastNewsDate: string | null
  lastNewsTitle: string | null
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
  /**
   * Projets pas encore remboursés dont la durée cible est dépassée, du plus long
   * dépassement au plus court (les projets au capital déjà remboursé en sont exclus).
   */
  late: { name: string; delayMonths: number; remainingCapital: number; amount: number }[]
  /** Projets non remboursés sans date d'émission ou sans durée : dépassement non évaluable. */
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
  /** Capital restant dû des projets non remboursés (souscriptions annulées exclues). */
  remainingCapitalByProject: Record<string, number>
}

/** Opportunité ouverte sur Tokimo, relevée par Claude in Chrome (données factuelles). */
export interface Opportunity {
  tokimoId: number
  name: string
  city?: string | null
  category?: string | null
  fundingStatus?: string | null
  rate?: number | null
  durationMonths?: number | null
  paymentType?: string | null
  targetAmount?: number | null
  collectedAmount?: number | null
  minTicket?: number | null
  guarantees?: string[] | null
  ltv?: number | null
  ltc?: number | null
  equity?: number | null
  rating?: string | null
  ratingLabel?: string | null
  subScores?: Record<string, number> | null
  operator?: string | null
  preSalesPct?: number | null
  bonus?: string | null
  updatedAt: string
}

/** Critères d'investissement du compte : null / false = critère non appliqué. */
export interface InvestmentCriteria {
  /** Lecture seule (API) : critères déjà enregistrés par le compte. */
  saved?: boolean
  requireFirstRankMortgage: boolean
  loansOnly: boolean
  maxLtv?: number | null
  maxLtc?: number | null
  allowedRatings?: string[] | null
  minRate?: number | null
  maxDurationMonths?: number | null
  minPreSalesPct?: number | null
  maxOperatorSharePct?: number | null
  excludeOperatorsWithOverdueProjects: boolean
  ticketAmount?: number | null
}
