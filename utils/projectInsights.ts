import type { Project } from '../types/tokimo'

/** URL de la fiche projet sur Tokimo (connexion requise). */
export function tokimoProjectUrl(p: Pick<Project, 'tokimoId'>): string | null {
  return p.tokimoId ? `https://app.tokimo.eu/projects/${p.tokimoId}` : null
}

/** "dd/mm/yyyy" -> "yyyy-mm-dd" (champ <input type="date">, format attendu par l'API). */
export function frDateToIso(s: string | null): string | null {
  if (!s) return null
  const [d, m, y] = s.split('/')
  return `${y}-${m}-${d}`
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
 * En dessous de ce capital restant dû (€), un projet est considéré comme
 * entièrement remboursé : les parts de capital des échéances sont arrondies au
 * centime (ex. SANARY - l'OLIVERAIE : 499,99 € remboursés sur 500 €), et Tokimo
 * peut mettre du temps à passer le projet au statut "Remboursé".
 */
export const REPAID_TOLERANCE = 1

/** Projet remboursé selon Tokimo, ou dont le capital restant dû est négligeable. */
export function isFullyRepaid(p: Pick<Project, 'status'>, remainingCapital?: number): boolean {
  return p.status === 'Remboursé' || (remainingCapital !== undefined && remainingCapital < REPAID_TOLERANCE)
}

/**
 * Nombre de mois entamés au-delà de la durée cible pour un projet qui n'est pas
 * encore remboursé, ou null s'il est dans les temps / pas évaluable. Passer le
 * capital restant dû pour ne pas signaler un projet déjà remboursé que Tokimo
 * affiche encore "Financé".
 */
export function delayMonths(p: Project, today: Date = new Date(), remainingCapital?: number): number | null {
  if (p.status === 'Annulé' || isFullyRepaid(p, remainingCapital)) return null
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

/** Ordre du cycle de vie d'un projet Tokimo ; une étape inconnue passe après, par ordre alphabétique. */
const STEP_ORDER = ['Acquisition', 'Valorisation', 'Commercialisation', 'Remboursement']

/** Étapes présentes dans les projets, dans l'ordre du cycle de vie, avec le nombre de projets. */
export function stepCounts(projects: Pick<Project, 'step'>[]): { step: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of projects) counts.set(p.step, (counts.get(p.step) ?? 0) + 1)
  const rank = (s: string) => (STEP_ORDER.includes(s) ? STEP_ORDER.indexOf(s) : STEP_ORDER.length)
  return [...counts]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([step, count]) => ({ step, count }))
}

/**
 * Actualités Tokimo les plus récentes parmi les projets donnés (date + titre),
 * de la plus récente à la plus ancienne.
 */
export function latestNews(projects: Project[], limit = 5): { name: string; date: string; title: string }[] {
  return projects
    .filter(p => p.lastNewsDate && p.lastNewsTitle)
    .map(p => ({ name: p.name, date: p.lastNewsDate!, title: p.lastNewsTitle! }))
    .sort((a, b) => parseFrDate(b.date).getTime() - parseFrDate(a.date).getTime())
    .slice(0, limit)
}
