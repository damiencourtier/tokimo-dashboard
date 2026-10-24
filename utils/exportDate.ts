/** "liste_projets_du_20261024.csv" -> Date du 24/10/2026 (null si le nom ne suit pas le format Tokimo). */
export function exportDateFromFilename(filename: string): Date | null {
  const m = filename.match(/_du_(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return date.getMonth() === Number(m[2]) - 1 ? date : null
}

/**
 * Message d'alerte si l'export est daté d'un jour antérieur à la dernière mise
 * à jour des données (import d'un vieux fichier par erreur), sinon null.
 */
export function staleExportWarning(filename: string, updatedAt: string | null): string | null {
  const exportDate = exportDateFromFilename(filename)
  if (!exportDate || !updatedAt) return null
  const last = new Date(updatedAt)
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate())
  if (exportDate >= lastDay) return null
  return `Cet export date du ${exportDate.toLocaleDateString('fr-FR')}, plus ancien que ta dernière mise à jour (${lastDay.toLocaleDateString('fr-FR')}). Vérifie que c'est le bon fichier.`
}
