import type { Project, Transaction, DashboardData, ProjectDetail } from '../types/tokimo'

/** dd/mm/yyyy -> "yyyy-mm" */
function monthKey(dateStr: string): string {
  const [d, m, y] = dateStr.split('/')
  return `${y}-${m}`
}

/** dd/mm/yyyy -> Date, for chronological sorting */
function parseDate(dateStr: string): Date {
  const [d, m, y] = dateStr.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

export function computeProjectDetail(project: Project, transactions: Transaction[]): ProjectDetail {
  const projectTransactions = transactions
    .filter(t => t.project === project.name)
    .slice()
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())

  const valid = projectTransactions.filter(t => t.status === 'Validé')
  const echeances = valid.filter(t => t.nature === "Versement de l'échéance (montant brut)")

  const grossInterestTotal = round2(sum(echeances.map(t => t.interest)))
  const capitalRepaidTotal = round2(sum(echeances.map(t => t.capital)))
  const irTotal = round2(sum(echeances.map(t => t.ir)))
  const csgTotal = round2(sum(echeances.map(t => t.csg)))
  const netInterestTotal = round2(grossInterestTotal - irTotal - csgTotal)
  const effectiveTaxRatePct = grossInterestTotal ? round2(((irTotal + csgTotal) / grossInterestTotal) * 100) : 0
  const remainingCapital = round2(project.amount - capitalRepaidTotal)

  const monthlyNetInterest: Record<string, number> = {}
  const monthlyCapitalRepaid: Record<string, number> = {}
  for (const t of echeances) {
    const key = monthKey(t.date)
    monthlyNetInterest[key] = round2((monthlyNetInterest[key] || 0) + (t.interest - t.ir - t.csg))
    monthlyCapitalRepaid[key] = round2((monthlyCapitalRepaid[key] || 0) + t.capital)
  }

  return {
    project,
    transactions: projectTransactions,
    kpis: {
      grossInterestTotal,
      netInterestTotal,
      irTotal,
      csgTotal,
      effectiveTaxRatePct,
      capitalRepaidTotal,
      remainingCapital
    },
    monthlyNetInterest: sortObj(monthlyNetInterest),
    monthlyCapitalRepaid: sortObj(monthlyCapitalRepaid)
  }
}

export function computeDashboard(
  projects: Project[],
  transactions: Transaction[],
  updatedAt: string | null
): DashboardData {
  const valid = transactions.filter(t => t.status === 'Validé')
  const echeances = valid.filter(t => t.nature === "Versement de l'échéance (montant brut)")

  // Capital déjà remboursé par projet (échéances avec part de capital), pour
  // calculer le capital *restant dû* d'un projet actif plutôt que son montant
  // initial investi (un projet en mensualités rembourse du capital avant même
  // d'être soldé — Tokimo affiche déjà ce restant dû dans son "capital en cours").
  const capitalRepaidByProject = new Map<string, number>()
  for (const t of echeances) {
    capitalRepaidByProject.set(t.project, round2((capitalRepaidByProject.get(t.project) || 0) + t.capital))
  }
  const remainingCapitalOf = (p: Project) => Math.max(0, round2(p.amount - (capitalRepaidByProject.get(p.name) || 0)))

  const totalInvested = round2(sum(projects.map(p => p.amount)))
  const reimbursedCapital = round2(sum(projects.filter(p => p.status === 'Remboursé').map(p => p.amount)))
  const activeProjects = projects.filter(p => p.status !== 'Remboursé')
  const activeCapital = round2(sum(activeProjects.map(remainingCapitalOf)))
  const nbProjectsActive = activeProjects.length

  const avgRateWeightedActive = activeCapital
    ? round2(sum(activeProjects.map(p => p.rate * remainingCapitalOf(p))) / activeCapital)
    : 0

  const grossInterestTotal = round2(sum(echeances.map(t => t.interest)))
  const capitalRepaidTotal = round2(sum(echeances.map(t => t.capital)))
  const irTotal = round2(sum(echeances.map(t => t.ir)))
  const csgTotal = round2(sum(echeances.map(t => t.csg)))
  const netInterestTotal = round2(grossInterestTotal - irTotal - csgTotal)
  const effectiveTaxRatePct = grossInterestTotal ? round2(((irTotal + csgTotal) / grossInterestTotal) * 100) : 0

  const depositsTotal = round2(sum(valid.filter(t => t.nature === 'Crédit du compte').map(t => t.amount)))
  const withdrawalsTotal = round2(-sum(valid.filter(t => t.nature === "Retrait de l'épargne").map(t => t.amount)))

  const monthlyNetInterest: Record<string, number> = {}
  const monthlyCapitalRepaid: Record<string, number> = {}
  const monthlyDeposits: Record<string, number> = {}

  for (const t of echeances) {
    const key = monthKey(t.date)
    monthlyNetInterest[key] = round2((monthlyNetInterest[key] || 0) + (t.interest - t.ir - t.csg))
    monthlyCapitalRepaid[key] = round2((monthlyCapitalRepaid[key] || 0) + t.capital)
  }
  for (const t of valid.filter(t => t.nature === 'Crédit du compte')) {
    const key = monthKey(t.date)
    monthlyDeposits[key] = round2((monthlyDeposits[key] || 0) + t.amount)
  }

  const statusBreakdown: Record<string, number> = {}
  for (const p of projects) {
    statusBreakdown[p.status] = round2((statusBreakdown[p.status] || 0) + p.amount)
  }

  const rateBreakdown: Record<string, number> = {}
  for (const p of activeProjects) {
    const key = `${p.rate.toFixed(1)}%`
    rateBreakdown[key] = round2((rateBreakdown[key] || 0) + remainingCapitalOf(p))
  }

  const monthlyForecastGross = round2((activeCapital * avgRateWeightedActive) / 100 / 12)
  const monthlyForecastNet = round2(monthlyForecastGross * (1 - effectiveTaxRatePct / 100))

  return {
    updatedAt,
    hasProjects: projects.length > 0,
    hasTransactions: transactions.length > 0,
    projects,
    kpis: {
      totalInvested,
      activeCapital,
      reimbursedCapital,
      nbProjectsTotal: projects.length,
      nbProjectsActive,
      avgRateWeightedActive,
      grossInterestTotal,
      netInterestTotal,
      irTotal,
      csgTotal,
      effectiveTaxRatePct,
      depositsTotal,
      withdrawalsTotal,
      capitalRepaidTotal,
      monthlyForecastGross,
      monthlyForecastNet
    },
    statusBreakdown,
    rateBreakdown,
    monthlyNetInterest: sortObj(monthlyNetInterest),
    monthlyCapitalRepaid: sortObj(monthlyCapitalRepaid),
    monthlyDeposits: sortObj(monthlyDeposits)
  }
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function sortObj(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}
