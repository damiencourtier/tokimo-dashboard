import { describe, expect, it } from 'vitest'
import { evaluateOpportunity, operatorExposure, plannedTicket } from '../utils/opportunityCheck'
import type { InvestmentCriteria, Opportunity, Project } from '../types/tokimo'

const noCriteria: InvestmentCriteria = { requireFirstRankMortgage: false, loansOnly: false, excludeOperatorsWithOverdueProjects: false }

const issy: Opportunity = {
  tokimoId: 135,
  name: 'ISSY-LES-MOULINEAUX - RODIN',
  category: 'Résidentiel',
  rate: 11.5,
  durationMonths: 15,
  guarantees: ['Hypothèque inscrite de 1er rang', 'Caution personnelle des associés'],
  ltv: 78,
  ltc: null,
  rating: 'a',
  operator: 'SAS HDB INVEST',
  minTicket: 100,
  updatedAt: '2026-10-24T00:00:00+00:00'
}

const project = (p: Partial<Project>): Project => ({
  name: 'MONTEREAU - DEUX RIVES',
  date_emission: '08/10/2026',
  step: 'Acquisition',
  rate: 11.5,
  amount: 100,
  status: 'Financé',
  paymentType: 'in_fine',
  durationMonths: 12,
  tokimoId: 126,
  operator: 'SAS HDB Invest ',
  guarantees: null,
  rating: 'A',
  ltv: 27,
  lastNewsDate: null,
  lastNewsTitle: null,
  ...p
})

describe('exposition à l’opérateur', () => {
  const today = new Date(2026, 9, 24)
  const projects = [
    project({}),
    project({ name: 'MONTEREAU - LIBERATION', amount: 500, date_emission: '31/07/2025', durationMonths: 12 }),
    project({ name: 'AUTRE', operator: 'AUTRE SAS', amount: 1000 })
  ]

  it('retrouve les projets du même opérateur (casse et espaces ignorés) et leurs dépassements', () => {
    expect(operatorExposure(issy, projects, p => p.amount, today)).toEqual({
      capital: 600,
      projects: [
        { name: 'MONTEREAU - DEUX RIVES', remainingCapital: 100, delayMonths: null },
        { name: 'MONTEREAU - LIBERATION', remainingCapital: 500, delayMonths: 3 }
      ]
    })
  })

  it('ne peut rien dire sans opérateur renseigné', () => {
    expect(operatorExposure({ operator: null }, projects, p => p.amount, today)).toBeNull()
  })
})

describe('confrontation aux critères de l’utilisateur', () => {
  it("n'évalue que les critères appliqués", () => {
    expect(evaluateOpportunity(issy, noCriteria, null, 1000)).toEqual([])
  })

  it('indique rempli / non rempli / non renseigné pour chaque critère, avec la valeur constatée', () => {
    const criteria: InvestmentCriteria = {
      requireFirstRankMortgage: true,
      loansOnly: true,
      maxLtv: 70,
      maxLtc: 80,
      allowedRatings: ['A', 'B'],
      minRate: 11,
      maxDurationMonths: 24,
      maxOperatorSharePct: 10,
      excludeOperatorsWithOverdueProjects: true,
      ticketAmount: 200
    }
    const exposure = { capital: 600, projects: [{ name: 'MONTEREAU - LIBERATION', remainingCapital: 500, delayMonths: 3 }] }
    const results = evaluateOpportunity(issy, criteria, exposure, 9800)
    expect(results.map(r => [r.key, r.status, r.detail])).toEqual([
      ['loansOnly', 'ok', 'Résidentiel'],
      ['requireFirstRankMortgage', 'ok', 'Hypothèque inscrite de 1er rang · Caution personnelle des associés'],
      ['maxLtv', 'ko', '78 %'],
      ['maxLtc', 'unknown', 'non renseigné'],
      ['maxDurationMonths', 'ok', '15 mois'],
      ['minRate', 'ok', '11,5 %'],
      ['allowedRatings', 'ok', 'A'],
      ['maxOperatorSharePct', 'ok', '8 % après 200 € (déjà 600 €)'],
      ['excludeOperatorsWithOverdueProjects', 'ko', 'MONTEREAU - LIBERATION (+3 mois)']
    ])
  })

  it("signale l'equity quand on veut des prêts uniquement", () => {
    const morzine = { ...issy, name: 'CO-INVEST MORZINE', category: 'Equity', guarantees: null }
    const results = evaluateOpportunity(morzine, { ...noCriteria, loansOnly: true, requireFirstRankMortgage: true }, null, 1000)
    expect(results.map(r => r.status)).toEqual(['ko', 'unknown'])
  })

  it('prend le ticket minimum quand aucun montant envisagé n’est défini', () => {
    expect(plannedTicket({ minTicket: 500 }, noCriteria)).toBe(500)
    expect(plannedTicket({ minTicket: null }, noCriteria)).toBe(100)
  })
})
