import type { Project } from '../types/tokimo'

/** URL de la fiche projet sur Tokimo (connexion requise). */
export function tokimoProjectUrl(p: Pick<Project, 'tokimoId'>): string | null {
  return p.tokimoId ? `https://app.tokimo.eu/projects/${p.tokimoId}` : null
}

/** dd/mm/yyyy -> Date */
function parseFrDate(s: string): Date {
  const [d, m, y] = s.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

/** Fin prévue = date d'émission + durée cible ; null si l'une des deux manque. */
export function expectedEndDate(p: Pick<Project, 'date_emission' | 'durationMonths'>): Date | null {
  if (!p.date_emission || !p.durationMonths) return null
  const start = parseFrDate(p.date_emission)
  const end = new Date(start.getFullYear(), start.getMonth() + p.durationMonths, 1)
  // Garde le jour d'émission, borné au dernier jour du mois (31/01 + 1 mois -> 28/02).
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  end.setDate(Math.min(start.getDate(), lastDay))
  return end
}

/**
 * Nombre de mois entamés de retard d'un projet encore en cours (fin prévue
 * dépassée), ou null s'il n'est pas en retard / pas évaluable.
 */
export function delayMonths(p: Project, today: Date = new Date()): number | null {
  if (p.status === 'Remboursé' || p.status === 'Annulé') return null
  const end = expectedEndDate(p)
  if (!end || today <= end) return null
  const months = (today.getFullYear() - end.getFullYear()) * 12 + (today.getMonth() - end.getMonth())
  return today.getDate() > end.getDate() ? months + 1 : Math.max(months, 1)
}

/** Garantie la plus protectrice pour un investisseur : hypothèque de 1er rang. */
export function hasFirstRankMortgage(p: Pick<Project, 'guarantees'>): boolean | null {
  if (!p.guarantees) return null
  return p.guarantees.some(g => /hypoth[eè]que/i.test(g) && /1(er|ère)?\s*rang|premier rang/i.test(g))
}
