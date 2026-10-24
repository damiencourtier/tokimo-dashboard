import { describe, expect, it } from 'vitest'
import { computeDashboard, computeProjectDetail, computeTaxByYear, grossInterestOf } from '../utils/computeDashboard'
import { statusColor, statusLabel } from '../utils/status'
import type { Project, Transaction } from '../types/tokimo'

const tx = (t: Partial<Transaction>): Transaction => ({
  date: '04/08/2026',
  nature: "Versement de l'échéance (montant brut)",
  project: 'VILLA MIREILLE - MANDELIEU',
  amount: 0,
  status: 'Validé',
  echeance: 0,
  capital: 0,
  interest: 0,
  ir: 0,
  csg: 0,
  net: 0,
  ...t
})

const villa: Project = {
  name: 'VILLA MIREILLE - MANDELIEU',
  date_emission: '19/10/2026',
  step: 'Acquisition',
  rate: 11.5,
  amount: 300,
  status: 'Financé',
  paymentType: null,
  durationMonths: null,
  tokimoId: null,
  operator: null,
  guarantees: null,
  rating: null,
  ltv: null
}

// Ligne réelle de l'export : "Part des intérêts" (1,10) un centime sous échéance − capital (1,11).
const echeance = tx({ amount: 0.77, echeance: 1.11, capital: 0, interest: 1.1, ir: 0.14, csg: 0.2, net: 0.76 })
const bonuses = [0.22, 0.11].map(amount =>
  tx({ date: '20/10/2026', nature: 'Bonus – VILLA MIREILLE - MANDELIEU', amount })
)

describe('gains réalisés', () => {
  it('calcule les intérêts bruts comme Tokimo : échéance − capital', () => {
    expect(grossInterestOf(echeance)).toBe(1.11)
    expect(grossInterestOf(tx({ echeance: 50.92, capital: 46.3 }))).toBe(4.62)
  })

  it('en déduit les gains nets, sans y inclure les bonus', () => {
    const { kpis } = computeDashboard([villa], [echeance, ...bonuses], null)
    expect(kpis.grossInterestTotal).toBe(1.11)
    expect(kpis.netInterestTotal).toBe(0.77)
    expect(kpis.bonusTotal).toBe(0.33)
  })

  it('compte les bonus validés seulement, aussi sur la fiche projet', () => {
    const pending = tx({ nature: 'Bonus – VILLA MIREILLE - MANDELIEU', amount: 5, status: 'En attente' })
    expect(computeProjectDetail(villa, [echeance, ...bonuses, pending]).kpis.bonusTotal).toBe(0.33)
  })
})

describe('affichage du statut', () => {
  it('affiche "Clôturé" comme "Financé", comme le site Tokimo', () => {
    expect(statusLabel('Clôturé')).toBe('Financé')
    expect(statusColor('Clôturé')).toBe('success')
    expect(statusLabel('Remboursé')).toBe('Remboursé')
  })

  it('regroupe "Clôturé" avec "Financé" dans la répartition par statut', () => {
    const cloture = { ...villa, name: 'ZONZA CAVU - CORSE', date_emission: null, amount: 100, status: 'Clôturé' }
    expect(computeDashboard([villa, cloture], [], null).statusBreakdown).toEqual({ 'Financé': 400 })
  })
})

describe('récapitulatif fiscal', () => {
  it("regroupe les échéances validées par année de versement, l'année la plus récente en premier", () => {
    const rows = [
      tx({ date: '15/12/2025', echeance: 4.63, capital: 0, interest: 4.62, ir: 0.59, csg: 0.8 }),
      echeance,
      tx({ date: '03/09/2026', echeance: 1.1, interest: 1.1, ir: 0.14, csg: 0.2 }),
      tx({ date: '02/02/2026', echeance: 9, interest: 9, ir: 1, csg: 1, status: 'En attente' }),
      ...bonuses
    ]
    expect(computeTaxByYear(rows)).toEqual([
      { year: '2026', nbEcheances: 2, grossInterest: 2.21, ir: 0.28, csg: 0.4, netInterest: 1.53 },
      { year: '2025', nbEcheances: 1, grossInterest: 4.63, ir: 0.59, csg: 0.8, netInterest: 3.24 }
    ])
  })
})
