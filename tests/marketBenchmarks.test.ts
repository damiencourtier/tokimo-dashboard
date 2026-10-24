import { describe, expect, it } from 'vitest'
import { benchmarkCriteria, initialCriteria, MARKET_BENCHMARKS, medianTicket } from '../utils/marketBenchmarks'
import { evaluateOpportunity } from '../utils/opportunityCheck'
import type { Opportunity } from '../types/tokimo'

describe('repères du marché', () => {
  it('préremplit les critères avec un repère sourcé ou déduit, la note Tokimo exceptée', () => {
    expect(benchmarkCriteria(200)).toEqual({
      requireFirstRankMortgage: true,
      loansOnly: true,
      maxLtv: 70,
      maxLtc: 80,
      minRate: 8,
      maxDurationMonths: 36,
      minPreSalesPct: 40,
      maxOperatorSharePct: 10,
      excludeOperatorsWithOverdueProjects: true,
      ticketAmount: 200
    })
    // Chaque repère chiffré a une source ; seul « prêts uniquement » est déduit.
    for (const [key, b] of Object.entries(MARKET_BENCHMARKS)) {
      if (key !== 'loansOnly') expect(b!.source?.url).toMatch(/^https:\/\//)
    }
  })

  it("s'appliquent tant que le compte n'a rien enregistré, puis laissent place à ses critères", () => {
    const empty = { saved: false, requireFirstRankMortgage: false, loansOnly: false, excludeOperatorsWithOverdueProjects: false }
    expect(initialCriteria(empty).maxLtv).toBe(70)
    const mine = { ...empty, saved: true, maxLtv: 80 }
    expect(initialCriteria(mine)).toBe(mine)
  })

  it('évaluent la pré-commercialisation', () => {
    const o: Opportunity = { tokimoId: 126, name: 'MONTEREAU - DEUX RIVES', preSalesPct: 39.39, updatedAt: '' }
    const pre = evaluateOpportunity(o, benchmarkCriteria(), null, 1000).find(r => r.key === 'minPreSalesPct')
    expect(pre).toMatchObject({ status: 'ko', detail: '39,4 %' })
  })
})

describe('ticket habituel', () => {
  it('prend la médiane des montants souscrits', () => {
    expect(medianTicket([100, 500, 200])).toBe(200)
    expect(medianTicket([100, 200, 500, 600])).toBe(350)
    expect(medianTicket([])).toBeNull()
  })
})
