import { describe, expect, it } from 'vitest'
import { averageLastMonths, buildNetInterestTimeline } from '../utils/netInterestTimeline'

const monthly = { '2026-06': 10, '2026-08': 20, '2026-10': 30 }
const today = new Date(2026, 9, 24) // octobre 2026

describe('historique + prévision des intérêts nets', () => {
  it('affiche un axe continu, les mois sans versement à 0', () => {
    const t = buildNetInterestTimeline(monthly, 5, 6, today, 2)
    expect(t.labels).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'])
    expect(t.history).toEqual([0, 10, 0, 20, 0, 30, null, null])
    expect(t.forecast).toEqual([null, null, null, null, null, 30, 5, 5])
  })

  it("remonte jusqu'au premier versement avec « Tout »", () => {
    const t = buildNetInterestTimeline({ '2023-11': 1, ...monthly }, 5, null, today, 12)
    expect(t.labels[0]).toBe('2023-11')
    expect(t.labels.at(-13)).toBe('2026-10')
    expect(t.labels).toHaveLength(36 + 12)
  })

  it('va jusqu’au mois courant même sans versement récent', () => {
    const t = buildNetInterestTimeline({ '2026-06': 10 }, 5, 6, today, 1)
    expect(t.labels).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(t.forecast.at(-2)).toBe(0)
  })

  it('calcule la moyenne sur des mois calendaires', () => {
    expect(averageLastMonths(monthly, 6, today)).toBe(10) // (0 + 10 + 0 + 20 + 0 + 30) / 6 sur mai→oct
  })
})
