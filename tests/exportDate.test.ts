import { describe, expect, it } from 'vitest'
import { exportDateFromFilename, staleExportWarning } from '../utils/exportDate'

describe("date d'export Tokimo", () => {
  it('lit la date dans le nom de fichier', () => {
    expect(exportDateFromFilename('liste_projets_du_20261024.csv')?.toLocaleDateString('fr-FR')).toBe('24/10/2026')
    expect(exportDateFromFilename('liste_transactions_du_20261024 (1).csv')).not.toBeNull()
    expect(exportDateFromFilename('export.csv')).toBeNull()
    expect(exportDateFromFilename('liste_projets_du_20261399.csv')).toBeNull()
  })

  it("alerte seulement si l'export est antérieur au jour de la dernière mise à jour", () => {
    const lastUpdate = '2026-10-24T18:46:00+02:00'
    expect(staleExportWarning('liste_projets_du_20260512.csv', lastUpdate)).toContain('12/05/2026')
    expect(staleExportWarning('liste_projets_du_20261024.csv', lastUpdate)).toBeNull()
    expect(staleExportWarning('liste_projets_du_20261025.csv', lastUpdate)).toBeNull()
    expect(staleExportWarning('liste_projets_du_20260512.csv', null)).toBeNull()
    expect(staleExportWarning('mon_fichier.csv', lastUpdate)).toBeNull()
  })
})
