import { describe, expect, it } from 'vitest'
import { computeRisk } from '../utils/computeDashboard'
import { delayMonths, expectedEndDate, frDateToIso, hasFirstRankMortgage, isFullyRepaid, latestNews, stepCounts, tokimoProjectUrl } from '../utils/projectInsights'
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
  lastNewsDate: null,
  lastNewsTitle: null,
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

describe('filtre par étape', () => {
  it("liste les étapes dans l'ordre du cycle de vie, avec leur nombre de projets", () => {
    const steps = ['Remboursement', 'Acquisition', 'Commercialisation', 'Acquisition', 'Travaux', 'Valorisation']
    expect(stepCounts(steps.map(step => ({ step })))).toEqual([
      { step: 'Acquisition', count: 2 },
      { step: 'Valorisation', count: 1 },
      { step: 'Commercialisation', count: 1 },
      { step: 'Remboursement', count: 1 },
      { step: 'Travaux', count: 1 }
    ])
  })
})

describe('projet remboursé mais encore "Financé" chez Tokimo', () => {
  // SANARY - l'OLIVERAIE : émis le 05/11/2024 pour 12 mois, 499,99 € de capital remboursés sur 500 €.
  const sanary = project({ name: "SANARY - l'OLIVERAIE", date_emission: '05/11/2024', durationMonths: 12, amount: 500, status: 'Financé' })
  const today = new Date(2026, 9, 24)

  it("n'est pas signalé en dépassement quand le capital restant est négligeable", () => {
    expect(delayMonths(sanary, today, 0.01)).toBeNull()
    expect(isFullyRepaid(sanary, 0.01)).toBe(true)
  })

  it('reste signalé tant qu’une part significative du capital est due', () => {
    expect(delayMonths(sanary, today, 172.14)).toBe(12)
    expect(isFullyRepaid(sanary, 172.14)).toBe(false)
  })

  it('sort de la liste des dépassements et des projets non évaluables du dashboard', () => {
    const late = project({ name: 'CHAMP DE MARS, PARIS', date_emission: '05/12/2023', durationMonths: 12, amount: 500 })
    const repaid = { ...sanary, durationMonths: null }
    const remaining: Record<string, number> = { "SANARY - l'OLIVERAIE": 0.01, 'CHAMP DE MARS, PARIS': 500 }
    const risk = computeRisk([sanary, late, repaid], p => remaining[p.name]!, today)
    expect(risk.late).toEqual([{ name: 'CHAMP DE MARS, PARIS', delayMonths: 23, remainingCapital: 500, amount: 500 }])
    expect(risk.nbWithoutExpectedEnd).toBe(0)
  })
})

describe('dernières actualités', () => {
  it('liste les actualités renseignées, la plus récente en premier', () => {
    const projects = [
      project({ name: "SANARY - l'OLIVERAIE", lastNewsDate: '02/10/2026', lastNewsTitle: 'Fin du projet' }),
      project({ name: 'CHAMP DE MARS, PARIS', lastNewsDate: '15/01/2026', lastNewsTitle: 'Point travaux' }),
      project({ name: 'LYON 8 FERRET', lastNewsDate: '20/10/2026', lastNewsTitle: 'Acte signé' }),
      project({ name: 'SANS ACTU' })
    ]
    expect(latestNews(projects, 2)).toEqual([
      { name: 'LYON 8 FERRET', date: '20/10/2026', title: 'Acte signé' },
      { name: "SANARY - l'OLIVERAIE", date: '02/10/2026', title: 'Fin du projet' }
    ])
  })

  it('convertit la date au format du champ date et de l’API', () => {
    expect(frDateToIso('02/10/2026')).toBe('2026-10-02')
    expect(frDateToIso(null)).toBeNull()
  })
})
