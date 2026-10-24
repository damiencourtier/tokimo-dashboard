import { describe, expect, it } from 'vitest'
import { buildCashflowSeries } from '../utils/cashflowSeries'
import type { Transaction } from '../types/tokimo'

const echeance = (date: string, t: Partial<Transaction> = {}): Transaction => ({
  date,
  nature: "Versement de l'échéance (montant brut)",
  project: 'P',
  amount: 0,
  status: 'Validé',
  echeance: 1.11,
  capital: 0,
  interest: 1.1,
  ir: 0.14,
  csg: 0.2,
  net: 0.76,
  ...t
})

const rows = [
  echeance('04/08/2026'), // net 0,77 (échéance − capital − IR − CSG)
  echeance('04/08/2026', { echeance: 376.31, capital: 327.86, interest: 48.45, ir: 6.2, csg: 9.01 }), // net 33,24
  echeance('01/10/2026'),
  echeance('15/12/2024'),
  echeance('20/10/2026', { status: 'En attente' }),
  { ...echeance('20/10/2026'), nature: 'Bonus – P', amount: 0.22, echeance: 0 }
]

describe('cash-flow par période', () => {
  it('regroupe par jour, seulement les jours avec versement', () => {
    expect(buildCashflowSeries(rows, 'day')).toEqual({
      labels: ['15/12/2024', '04/08/2026', '01/10/2026'],
      netInterest: [0.77, 34.01, 0.77],
      capitalRepaid: [0, 327.86, 0]
    })
  })

  it('regroupe par mois sur un axe continu', () => {
    const s = buildCashflowSeries(rows, 'month')
    expect(s.labels[0]).toBe('2024-12')
    expect(s.labels.at(-1)).toBe('2026-10')
    expect(s.labels).toHaveLength(23)
    expect(s.netInterest[s.labels.indexOf('2026-08')]).toBe(34.01)
    expect(s.netInterest[s.labels.indexOf('2026-09')]).toBe(0)
  })

  it('regroupe par année, années sans versement comprises', () => {
    expect(buildCashflowSeries(rows, 'year')).toEqual({
      labels: ['2024', '2025', '2026'],
      netInterest: [0.77, 0, 34.78],
      capitalRepaid: [0, 0, 327.86]
    })
  })

  it('renvoie des séries vides sans échéance', () => {
    expect(buildCashflowSeries([], 'month')).toEqual({ labels: [], netInterest: [], capitalRepaid: [] })
  })
})
