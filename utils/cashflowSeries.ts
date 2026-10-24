import type { Transaction } from '../types/tokimo'
import { grossInterestOf } from './computeDashboard'
import { addMonths } from './netInterestTimeline'

export type CashflowGranularity = 'day' | 'month' | 'year'

export interface CashflowSeries {
  labels: string[]
  netInterest: number[]
  capitalRepaid: number[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** dd/mm/yyyy -> clé triable selon la granularité. */
function keyOf(date: string, granularity: CashflowGranularity): string {
  const [d, m, y] = date.split('/')
  if (granularity === 'year') return y!
  if (granularity === 'month') return `${y}-${m}`
  return `${y}-${m}-${d}`
}

/**
 * Cash-flow des échéances validées (intérêts nets, calculés comme Tokimo, et
 * capital remboursé), regroupé par jour, mois ou année.
 * - mois / année : axe continu, les périodes sans versement à 0 ;
 * - jour : seulement les jours avec un versement (un axe continu jour par jour
 *   serait illisible sur plusieurs années), libellés "dd/mm/yyyy".
 */
export function buildCashflowSeries(transactions: Transaction[], granularity: CashflowGranularity): CashflowSeries {
  const net = new Map<string, number>()
  const capital = new Map<string, number>()
  for (const t of transactions) {
    if (t.status !== 'Validé' || t.nature !== "Versement de l'échéance (montant brut)") continue
    const key = keyOf(t.date, granularity)
    net.set(key, round2((net.get(key) ?? 0) + grossInterestOf(t) - t.ir - t.csg))
    capital.set(key, round2((capital.get(key) ?? 0) + t.capital))
  }

  const present = [...net.keys()].sort()
  let keys = present
  if (present.length && granularity !== 'day') {
    keys = []
    const last = present[present.length - 1]!
    for (let k = present[0]!; k <= last; k = granularity === 'month' ? addMonths(k, 1) : String(Number(k) + 1)) keys.push(k)
  }

  return {
    labels: granularity === 'day' ? keys.map(k => k.split('-').reverse().join('/')) : keys,
    netInterest: keys.map(k => net.get(k) ?? 0),
    capitalRepaid: keys.map(k => capital.get(k) ?? 0)
  }
}
