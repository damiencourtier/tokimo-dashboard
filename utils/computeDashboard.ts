import type { Project, Transaction, DashboardData, ProjectDetail, RiskBreakdown, TaxYearSummary } from '../types/tokimo'
import { delayMonths, expectedEndDate, hasFirstRankMortgage } from './projectInsights'
import { statusLabel } from './status'

/**
 * Statut renvoyé par l'API pour une souscription disparue du dernier export
 * Tokimo (annulée/remboursée) : exclue de tous les totaux.
 */
export const STATUS_CANCELLED = 'Annulé'

export function isCancelled(p: Project): boolean {
  return p.status === STATUS_CANCELLED
}

/**
 * Intérêts bruts d'une échéance = montant de l'échéance − part de capital,
 * comme le calcule Tokimo. La colonne "Part des intérêts" de l'export est
 * parfois arrondie 1 centime en dessous (83 lignes sur l'export du 24/10/2026,
 * soit 0,83 € d'écart avec le tableau de bord Tokimo).
 */
export function grossInterestOf(t: Transaction): number {
  return round2(t.echeance - t.capital)
}

const isBonus = (t: Transaction) => t.nature.startsWith('Bonus')

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

  const grossInterestTotal = round2(sum(echeances.map(grossInterestOf)))
  const capitalRepaidTotal = round2(sum(echeances.map(t => t.capital)))
  const irTotal = round2(sum(echeances.map(t => t.ir)))
  const csgTotal = round2(sum(echeances.map(t => t.csg)))
  const netInterestTotal = round2(grossInterestTotal - irTotal - csgTotal)
  const effectiveTaxRatePct = grossInterestTotal ? round2(((irTotal + csgTotal) / grossInterestTotal) * 100) : 0
  const bonusTotal = round2(sum(valid.filter(isBonus).map(t => t.amount)))
  const remainingCapital = isCancelled(project) ? 0 : round2(project.amount - capitalRepaidTotal)

  const monthlyNetInterest: Record<string, number> = {}
  const monthlyCapitalRepaid: Record<string, number> = {}
  for (const t of echeances) {
    const key = monthKey(t.date)
    monthlyNetInterest[key] = round2((monthlyNetInterest[key] || 0) + (grossInterestOf(t) - t.ir - t.csg))
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
      bonusTotal,
      capitalRepaidTotal,
      remainingCapital
    },
    monthlyNetInterest: sortObj(monthlyNetInterest),
    monthlyCapitalRepaid: sortObj(monthlyCapitalRepaid)
  }
}

/**
 * Dates de souscription par projet (dd/mm/yyyy, de la plus ancienne à la plus
 * récente), tirées des transactions "Souscription" validées : l'export
 * "liste_projets" ne les contient pas. Plusieurs dates quand le projet a été
 * souscrit en plusieurs fois.
 */
export function subscriptionDatesByProject(transactions: Transaction[]): Record<string, string[]> {
  const byProject: Record<string, string[]> = {}
  const subscriptions = transactions
    .filter(t => t.status === 'Validé' && t.nature === 'Souscription' && t.project)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
  for (const t of subscriptions) {
    (byProject[t.project] ??= []).push(t.date)
  }
  return byProject
}

/**
 * Récapitulatif fiscal par année civile de versement : intérêts bruts (calculés
 * comme Tokimo), IR et CSG retenus à la source. Les bonus n'y figurent pas.
 * Années les plus récentes en premier.
 */
export function computeTaxByYear(transactions: Transaction[]): TaxYearSummary[] {
  const byYear = new Map<string, TaxYearSummary>()
  for (const t of transactions) {
    if (t.status !== 'Validé' || t.nature !== "Versement de l'échéance (montant brut)") continue
    const year = t.date.split('/')[2]!
    const row = byYear.get(year) ?? { year, nbEcheances: 0, grossInterest: 0, ir: 0, csg: 0, netInterest: 0 }
    row.nbEcheances++
    row.grossInterest = round2(row.grossInterest + grossInterestOf(t))
    row.ir = round2(row.ir + t.ir)
    row.csg = round2(row.csg + t.csg)
    row.netInterest = round2(row.grossInterest - row.ir - row.csg)
    byYear.set(year, row)
  }
  return [...byYear.values()].sort((a, b) => b.year.localeCompare(a.year))
}

export function computeRisk(
  activeProjects: Project[],
  remainingCapitalOf: (p: Project) => number,
  today: Date = new Date()
): RiskBreakdown {
  const add = (obj: Record<string, number>, key: string, n: number) => {
    obj[key] = round2((obj[key] || 0) + n)
  }
  const byOperator: Record<string, number> = {}
  const byRating: Record<string, number> = {}
  const firstRankMortgage = { covered: 0, notCovered: 0, unknown: 0 }
  const late: RiskBreakdown['late'] = []
  let ltvWeighted = 0
  let ltvCapital = 0
  let nbWithoutExpectedEnd = 0

  for (const p of activeProjects) {
    const capital = remainingCapitalOf(p)
    add(byOperator, p.operator ?? 'Non renseigné', capital)
    add(byRating, p.rating ?? 'Non renseignée', capital)
    const mortgage = hasFirstRankMortgage(p)
    const key = mortgage === null ? 'unknown' : mortgage ? 'covered' : 'notCovered'
    firstRankMortgage[key] = round2(firstRankMortgage[key] + capital)
    if (p.ltv !== null && p.ltv !== undefined) {
      ltvWeighted += p.ltv * capital
      ltvCapital += capital
    }
    if (!expectedEndDate(p)) nbWithoutExpectedEnd++
    const delay = delayMonths(p, today)
    if (delay) late.push({ name: p.name, delayMonths: delay, remainingCapital: capital })
  }

  return {
    byOperator: sortByValueDesc(byOperator),
    byRating: sortObj(byRating),
    firstRankMortgage,
    avgLtvWeighted: ltvCapital ? round2(ltvWeighted / ltvCapital) : null,
    late: late.sort((a, b) => b.delayMonths - a.delayMonths),
    nbWithoutExpectedEnd
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

  // Les souscriptions annulées restent listées (fiche projet consultable) mais
  // ne comptent ni dans le capital investi, ni dans le capital en cours.
  const subscribed = projects.filter(p => !isCancelled(p))
  const totalInvested = round2(sum(subscribed.map(p => p.amount)))
  const reimbursedCapital = round2(sum(subscribed.filter(p => p.status === 'Remboursé').map(p => p.amount)))
  const activeProjects = subscribed.filter(p => p.status !== 'Remboursé')
  const activeCapital = round2(sum(activeProjects.map(remainingCapitalOf)))
  const nbProjectsActive = activeProjects.length

  const avgRateWeightedActive = activeCapital
    ? round2(sum(activeProjects.map(p => p.rate * remainingCapitalOf(p))) / activeCapital)
    : 0

  const grossInterestTotal = round2(sum(echeances.map(grossInterestOf)))
  const capitalRepaidTotal = round2(sum(echeances.map(t => t.capital)))
  const irTotal = round2(sum(echeances.map(t => t.ir)))
  const csgTotal = round2(sum(echeances.map(t => t.csg)))
  const netInterestTotal = round2(grossInterestTotal - irTotal - csgTotal)
  const effectiveTaxRatePct = grossInterestTotal ? round2(((irTotal + csgTotal) / grossInterestTotal) * 100) : 0
  // Bonus Tokimo : comptés à part, pas dans les gains réalisés (Tokimo ne les y inclut pas).
  const bonusTotal = round2(sum(valid.filter(isBonus).map(t => t.amount)))

  const depositsTotal = round2(sum(valid.filter(t => t.nature === 'Crédit du compte').map(t => t.amount)))
  const withdrawalsTotal = round2(-sum(valid.filter(t => t.nature === "Retrait de l'épargne").map(t => t.amount)))

  const monthlyNetInterest: Record<string, number> = {}
  const monthlyCapitalRepaid: Record<string, number> = {}
  const monthlyDeposits: Record<string, number> = {}

  for (const t of echeances) {
    const key = monthKey(t.date)
    monthlyNetInterest[key] = round2((monthlyNetInterest[key] || 0) + (grossInterestOf(t) - t.ir - t.csg))
    monthlyCapitalRepaid[key] = round2((monthlyCapitalRepaid[key] || 0) + t.capital)
  }
  for (const t of valid.filter(t => t.nature === 'Crédit du compte')) {
    const key = monthKey(t.date)
    monthlyDeposits[key] = round2((monthlyDeposits[key] || 0) + t.amount)
  }

  const statusBreakdown: Record<string, number> = {}
  for (const p of subscribed) {
    const label = statusLabel(p.status)
    statusBreakdown[label] = round2((statusBreakdown[label] || 0) + p.amount)
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
      nbProjectsTotal: subscribed.length,
      nbProjectsActive,
      avgRateWeightedActive,
      grossInterestTotal,
      netInterestTotal,
      irTotal,
      csgTotal,
      effectiveTaxRatePct,
      bonusTotal,
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
    monthlyDeposits: sortObj(monthlyDeposits),
    taxByYear: computeTaxByYear(transactions),
    subscriptionDates: subscriptionDatesByProject(transactions),
    risk: computeRisk(activeProjects, remainingCapitalOf)
  }
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function sortByValueDesc(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).sort(([, a], [, b]) => b - a))
}
function sortObj(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}
