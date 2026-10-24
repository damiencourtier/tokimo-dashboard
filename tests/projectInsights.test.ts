import { describe, expect, it } from 'vitest'
import { computeRisk } from '../utils/computeDashboard'
import { delayMonths, expectedEndDate, hasFirstRankMortgage, tokimoProjectUrl } from '../utils/projectInsights'
import type { Project } from '../types/tokimo'

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
  operator: 'SAS HDB INVEST',
  guarantees: ['Hypothèque inscrite de 1er rang', 'Caution personnelle des associés de la société'],
  rating: 'A',
  ltv: 27,
  ...p
})

describe('fin prévue et retard', () => {
  it("calcule la fin prévue à partir de la date d'émission et de la durée", () => {
    expect(expectedEndDate(project({}))?.toLocaleDateString('fr-FR')).toBe('08/10/2027')
    expect(expectedEndDate(project({ date_emission: '31/01/2026', durationMonths: 1 }))?.toLocaleDateString('fr-FR')).toBe('28/02/2026')
  })

  it("n'évalue pas le retard sans date d'émission ou sans durée", () => {
    expect(expectedEndDate(project({ date_emission: null }))).toBeNull()
    expect(expectedEndDate(project({ durationMonths: null }))).toBeNull()
  })

  it('compte les mois de retard entamés, seulement pour un projet en cours', () => {
    const p = project({ date_emission: '05/12/2023', durationMonths: 12 }) // fin prévue 05/12/2024
    expect(delayMonths(p, new Date(2024, 11, 5))).toBeNull()
    expect(delayMonths(p, new Date(2024, 11, 6))).toBe(1)
    expect(delayMonths(p, new Date(2026, 9, 24))).toBe(23)
    expect(delayMonths({ ...p, status: 'Remboursé' }, new Date(2026, 9, 24))).toBeNull()
    expect(delayMonths({ ...p, status: 'Annulé' }, new Date(2026, 9, 24))).toBeNull()
  })
})

describe('infos des fiches Tokimo', () => {
  it('construit le lien vers la fiche', () => {
    expect(tokimoProjectUrl(project({}))).toBe('https://app.tokimo.eu/projects/126')
    expect(tokimoProjectUrl(project({ tokimoId: null }))).toBeNull()
  })

  it("reconnaît l'hypothèque de 1er rang", () => {
    expect(hasFirstRankMortgage(project({}))).toBe(true)
    expect(hasFirstRankMortgage(project({ guarantees: ['Hypothèque de premier rang'] }))).toBe(true)
    expect(hasFirstRankMortgage(project({ guarantees: ['Hypothèque de 2nd rang', 'Fiducie'] }))).toBe(false)
    expect(hasFirstRankMortgage(project({ guarantees: [] }))).toBe(false)
    expect(hasFirstRankMortgage(project({ guarantees: null }))).toBeNull()
  })

  it('répartit le capital en cours par opérateur, note et garantie', () => {
    const projects = [
      project({ name: 'PORTICCIO - T1', amount: 500, operator: 'OPÉRATEUR CORSE', rating: 'B', ltv: 60 }),
      project({ name: 'PORTICCIO - T2', amount: 300, operator: 'OPÉRATEUR CORSE', rating: 'B', ltv: 60, guarantees: ['Fiducie'] }),
      project({ amount: 200, ltv: 30 }),
      project({ name: 'INCONNU', amount: 100, operator: null, rating: null, guarantees: null, ltv: null, durationMonths: null })
    ]
    const risk = computeRisk(projects, p => p.amount, new Date(2026, 9, 24))
    expect(risk.byOperator).toEqual({ 'OPÉRATEUR CORSE': 800, 'SAS HDB INVEST': 200, 'Non renseigné': 100 })
    expect(Object.keys(risk.byOperator)[0]).toBe('OPÉRATEUR CORSE')
    expect(risk.byRating).toEqual({ A: 200, B: 800, 'Non renseignée': 100 })
    expect(risk.firstRankMortgage).toEqual({ covered: 700, notCovered: 300, unknown: 100 })
    expect(risk.avgLtvWeighted).toBe(54) // (60×800 + 30×200) / 1000
    expect(risk.nbWithoutExpectedEnd).toBe(1)
    expect(risk.late).toEqual([])
  })
})
