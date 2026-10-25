import type { Project } from '../types/tokimo'
import { addMonths } from './netInterestTimeline'
import { expectedEndDate, isFullyRepaid } from './projectInsights'

export interface ForecastSeries {
  /** "yyyy-mm" -> intérêts nets prévus, sur les mois suivant le mois courant. */
  byMonth: Record<string, number>
  /** In fine dont la fin prévue est passée : intérêts nets attendus, date de versement inconnue. */
  overdueInFine: { name: string; netInterest: number }[]
  /** Projets sans mode de versement ou sans fin prévue, étalés à la moyenne mensuelle. */
  nbEstimated: number
}

const round2 = (n: number) => Math.round(n * 100) / 100
const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/**
 * Prévision des intérêts nets mois par mois, projet par projet, sur le capital
 * restant dû et au taux cible :
 * - mensuel : intérêts chaque mois jusqu'à la fin prévue, et au-delà pour un
 *   projet en retard (le capital reste dû et continue de porter intérêts) ;
 * - in fine : tous les intérêts de la durée cible le mois de la fin prévue ;
 *   si elle est passée, exclus de la courbe (date de versement inconnue) ;
 * - mode de versement ou fin prévue inconnus : moyenne mensuelle chaque mois.
 */
export function buildForecastSeries(
  projects: Project[],
  remainingCapitalByProject: Record<string, number>,
  taxRatePct: number,
  today: Date = new Date(),
  months = 12
): ForecastSeries {
  const current = ymOf(today)
  const window = Array.from({ length: months }, (_, i) => addMonths(current, i + 1))
  const totals = new Map(window.map(m => [m, 0]))
  const add = (month: string, n: number) => {
    if (totals.has(month)) totals.set(month, totals.get(month)! + n)
  }
  const net = (gross: number) => gross * (1 - taxRatePct / 100)

  const overdueInFine: ForecastSeries['overdueInFine'] = []
  let nbEstimated = 0

  for (const p of projects) {
    const capital = remainingCapitalByProject[p.name] ?? 0
    if (isFullyRepaid(p, capital)) continue
    const monthly = net((capital * p.rate) / 100 / 12)
    const end = expectedEndDate(p)

    if (!p.paymentType || !end) {
      nbEstimated++
      for (const m of window) add(m, monthly)
    } else if (p.paymentType === 'in_fine') {
      const interest = net((capital * p.rate) / 100 * (p.durationMonths! / 12))
      if (ymOf(end) <= current) overdueInFine.push({ name: p.name, netInterest: round2(interest) })
      else add(ymOf(end), interest)
    } else {
      const last = ymOf(end) <= current ? window[window.length - 1]! : ymOf(end)
      for (const m of window) if (m <= last) add(m, monthly)
    }
  }

  return {
    byMonth: Object.fromEntries([...totals].map(([m, n]) => [m, round2(n)])),
    overdueInFine,
    nbEstimated
  }
}
