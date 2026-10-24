import { describe, expect, it } from 'vitest'
import { computeDashboard, computeProjectDetail, STATUS_CANCELLED } from '../utils/computeDashboard'
import type { Project, Transaction } from '../types/tokimo'

const project = (name: string, amount: number, status: string, date_emission: string | null = '01/01/2026'): Project => ({
  name,
  date_emission,
  step: 'Acquisition',
  rate: 11,
  amount,
  status,
  paymentType: null,
  durationMonths: null,
  tokimoId: null,
  operator: null,
  guarantees: null,
  rating: null,
  ltv: null
})

const projects: Project[] = [
  project('LA CIOTAT', 500, 'Remboursé'),
  project('GUJAN-MESTRAS', 600, 'Financé'),
  project('ZONZA CAVU - CORSE', 100, 'Clôturé', null),
  project('BANDOL - 87 CAPELAN', 600, STATUS_CANCELLED, null)
]

describe('computeDashboard — souscriptions annulées', () => {
  const { kpis, statusBreakdown, rateBreakdown } = computeDashboard(projects, [], null)

  it('exclut les souscriptions annulées du capital investi', () => {
    expect(kpis.totalInvested).toBe(1200)
    expect(kpis.nbProjectsTotal).toBe(3)
  })

  it('exclut les souscriptions annulées du capital en cours, mais garde les "Clôturé" sans date', () => {
    expect(kpis.activeCapital).toBe(700)
    expect(kpis.nbProjectsActive).toBe(2)
    expect(kpis.reimbursedCapital).toBe(500)
  })

  it('ne les fait apparaître dans aucune répartition', () => {
    expect(statusBreakdown).not.toHaveProperty(STATUS_CANCELLED)
    expect(Object.values(rateBreakdown).reduce((a, b) => a + b, 0)).toBe(700)
  })

  it("n'affiche aucun capital restant sur la fiche d'un projet annulé", () => {
    const refunds: Transaction[] = [200, 300, 100].map(amount => ({
      date: '28/09/2026',
      nature: 'Remboursement de la souscription au projet BANDOL - 87 CAPELAN',
      project: 'BANDOL - 87 CAPELAN',
      amount,
      status: 'Validé',
      echeance: 0,
      capital: 0,
      interest: 0,
      ir: 0,
      csg: 0,
      net: 0
    }))
    expect(computeProjectDetail(projects[3]!, refunds).kpis.remainingCapital).toBe(0)
  })
})
