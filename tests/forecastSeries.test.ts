import { describe, expect, it } from 'vitest'
import { buildForecastSeries } from '../utils/forecastSeries'
import type { Project } from '../types/tokimo'

const project = (p: Partial<Project>): Project => ({
  name: 'P',
  date_emission: '15/01/2026',
  step: 'Acquisition',
  rate: 12,
  amount: 1000,
  status: 'Financé',
  paymentType: 'mensuel',
  durationMonths: 12,
  tokimoId: null,
  operator: null,
  guarantees: null,
  rating: null,
  ltv: null,
  lastNewsDate: null,
  lastNewsTitle: null,
  ...p
})

const today = new Date(2026, 9, 25) // octobre 2026 : prévision de 2026-11 à 2027-10

describe('prévision nette par projet', () => {
  it('couvre les 12 mois suivant le mois courant', () => {
    const f = buildForecastSeries([], {}, 0, today)
    expect(Object.keys(f.byMonth)).toEqual([
      '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04',
      '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10'
    ])
    expect(Object.values(f.byMonth).every(v => v === 0)).toBe(true)
  })

  it('verse les intérêts mensuels jusqu’à la fin prévue, nets d’impôt', () => {
    // fin prévue le 15/01/2027 ; 1000 € à 12 % = 10 €/mois brut, 7 € net à 30 %
    const f = buildForecastSeries([project({})], { P: 1000 }, 30, today)
    expect(f.byMonth['2026-11']).toBe(7)
    expect(f.byMonth['2027-01']).toBe(7)
    expect(f.byMonth['2027-02']).toBe(0)
    expect(f.nbEstimated).toBe(0)
  })

  it('verse tous les intérêts d’un in fine le mois de sa fin prévue', () => {
    // fin prévue le 15/03/2027
    const f = buildForecastSeries(
      [project({ paymentType: 'in_fine', durationMonths: 14 })],
      { P: 1000 },
      30,
      today
    )
    expect(f.byMonth['2027-03']).toBe(98) // 1000 × 12 % × 14/12 × 0,7
    expect(Object.values(f.byMonth).reduce((a, b) => a + b, 0)).toBe(98)
  })

  it('exclut un in fine dont la fin prévue est passée, sans date de versement connue', () => {
    const f = buildForecastSeries(
      [project({ paymentType: 'in_fine', durationMonths: 6 })],
      { P: 1000 },
      30,
      today
    )
    expect(Object.values(f.byMonth).every(v => v === 0)).toBe(true)
    expect(f.overdueInFine).toEqual([{ name: 'P', netInterest: 42 }])
  })

  it('continue les mensualités d’un projet mensuel en retard (capital toujours dû)', () => {
    const f = buildForecastSeries([project({ durationMonths: 6 })], { P: 1000 }, 30, today)
    expect(f.byMonth['2027-10']).toBe(7)
  })

  it('étale à la moyenne mensuelle un projet sans mode de versement ou sans durée', () => {
    const f = buildForecastSeries(
      [project({ name: 'A', paymentType: null }), project({ name: 'B', durationMonths: null })],
      { A: 1000, B: 500 },
      30,
      today
    )
    expect(f.byMonth['2027-10']).toBe(10.5)
    expect(f.nbEstimated).toBe(2)
  })

  it('ignore les projets sans capital restant dû', () => {
    const f = buildForecastSeries([project({}), project({ name: 'Q', status: 'Remboursé' })], { P: 0.5, Q: 1000 }, 0, today)
    expect(Object.values(f.byMonth).every(v => v === 0)).toBe(true)
  })
})
