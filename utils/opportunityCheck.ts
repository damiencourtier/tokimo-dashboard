import type { InvestmentCriteria, Opportunity, Project } from '../types/tokimo'
import { delayMonths, hasFirstRankMortgage } from './projectInsights'

export type CriterionStatus = 'ok' | 'ko' | 'unknown'

export interface CriterionResult {
  key: string
  label: string
  status: CriterionStatus
  /** Valeur constatée, pour comprendre le résultat sans ouvrir la fiche. */
  detail: string
}

/** Ce que le portefeuille contient déjà chez l'opérateur de l'opportunité. */
export interface OperatorExposure {
  /** Capital en cours (restant dû) chez cet opérateur. */
  capital: number
  projects: { name: string; remainingCapital: number; delayMonths: number | null }[]
}

const normalizeOperator = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
const round2 = (n: number) => Math.round(n * 100) / 100
const fmtPct = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
const fmtEur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`

export function isEquity(o: Pick<Opportunity, 'category'>): boolean | null {
  return o.category ? /equity/i.test(o.category) : null
}

/** Projets non remboursés du portefeuille portés par l'opérateur de l'opportunité. */
export function operatorExposure(
  o: Pick<Opportunity, 'operator'>,
  activeProjects: Project[],
  remainingCapitalOf: (p: Project) => number,
  today: Date = new Date()
): OperatorExposure | null {
  if (!o.operator) return null
  const operator = normalizeOperator(o.operator)
  const projects = activeProjects
    .filter(p => p.operator && normalizeOperator(p.operator) === operator)
    .map(p => {
      const remainingCapital = remainingCapitalOf(p)
      return { name: p.name, remainingCapital, delayMonths: delayMonths(p, today, remainingCapital) }
    })
  return { capital: round2(projects.reduce((a, p) => a + p.remainingCapital, 0)), projects }
}

/** Montant envisagé : celui des critères, sinon le ticket minimum, sinon 100 €. */
export function plannedTicket(o: Pick<Opportunity, 'minTicket'>, criteria: InvestmentCriteria): number {
  return criteria.ticketAmount ?? o.minTicket ?? 100
}

/**
 * Confronte une opportunité aux critères choisis par l'utilisateur : un
 * résultat par critère appliqué (rempli, non rempli, ou donnée manquante).
 * Aucune pondération ni note globale : la décision reste à l'utilisateur.
 */
export function evaluateOpportunity(
  o: Opportunity,
  criteria: InvestmentCriteria,
  exposure: OperatorExposure | null,
  activeCapital: number
): CriterionResult[] {
  const results: CriterionResult[] = []
  const add = (key: string, label: string, status: CriterionStatus, detail: string) =>
    results.push({ key, label, status, detail })
  const unknown = 'non renseigné'

  if (criteria.loansOnly) {
    const equity = isEquity(o)
    add('loansOnly', 'Prêt (pas d’equity)', equity === null ? 'unknown' : equity ? 'ko' : 'ok', o.category ?? unknown)
  }
  if (criteria.requireFirstRankMortgage) {
    const mortgage = hasFirstRankMortgage({ guarantees: o.guarantees ?? null })
    add('requireFirstRankMortgage', 'Hypothèque de 1er rang', mortgage === null ? 'unknown' : mortgage ? 'ok' : 'ko',
      o.guarantees ? o.guarantees.join(' · ') || 'aucune garantie' : unknown)
  }
  const max = (key: string, label: string, value: number | null | undefined, limit: number | null | undefined, fmt: (n: number) => string) => {
    if (limit === null || limit === undefined) return
    add(key, `${label} ≤ ${fmt(limit)}`, value === null || value === undefined ? 'unknown' : value <= limit ? 'ok' : 'ko',
      value === null || value === undefined ? unknown : fmt(value))
  }
  max('maxLtv', 'LTV', o.ltv, criteria.maxLtv, fmtPct)
  max('maxLtc', 'LTC', o.ltc, criteria.maxLtc, fmtPct)
  max('maxDurationMonths', 'Durée', o.durationMonths, criteria.maxDurationMonths, n => `${n} mois`)

  if (criteria.minRate !== null && criteria.minRate !== undefined) {
    add('minRate', `Taux ≥ ${fmtPct(criteria.minRate)}`,
      o.rate === null || o.rate === undefined ? 'unknown' : o.rate >= criteria.minRate ? 'ok' : 'ko',
      o.rate === null || o.rate === undefined ? unknown : fmtPct(o.rate))
  }
  if (criteria.minPreSalesPct !== null && criteria.minPreSalesPct !== undefined) {
    add('minPreSalesPct', `Pré-commercialisation ≥ ${fmtPct(criteria.minPreSalesPct)}`,
      o.preSalesPct === null || o.preSalesPct === undefined ? 'unknown' : o.preSalesPct >= criteria.minPreSalesPct ? 'ok' : 'ko',
      o.preSalesPct === null || o.preSalesPct === undefined ? unknown : fmtPct(o.preSalesPct))
  }
  if (criteria.allowedRatings?.length) {
    const rating = o.rating?.toUpperCase()
    add('allowedRatings', `Note Tokimo parmi ${criteria.allowedRatings.join(', ')}`,
      !rating ? 'unknown' : criteria.allowedRatings.includes(rating) ? 'ok' : 'ko', rating ?? unknown)
  }
  if (criteria.maxOperatorSharePct !== null && criteria.maxOperatorSharePct !== undefined) {
    const label = `Part chez l’opérateur ≤ ${fmtPct(criteria.maxOperatorSharePct)}`
    if (!exposure) {
      add('maxOperatorSharePct', label, 'unknown', 'opérateur non renseigné')
    } else {
      const ticket = plannedTicket(o, criteria)
      const share = round2(((exposure.capital + ticket) / (activeCapital + ticket)) * 100)
      add('maxOperatorSharePct', label, share <= criteria.maxOperatorSharePct ? 'ok' : 'ko',
        `${fmtPct(share)} après ${fmtEur(ticket)} (déjà ${fmtEur(exposure.capital)})`)
    }
  }
  if (criteria.excludeOperatorsWithOverdueProjects) {
    const label = 'Opérateur sans projet au-delà de sa durée cible'
    if (!exposure) {
      add('excludeOperatorsWithOverdueProjects', label, 'unknown', 'opérateur non renseigné')
    } else {
      const overdue = exposure.projects.filter(p => p.delayMonths)
      add('excludeOperatorsWithOverdueProjects', label, overdue.length ? 'ko' : 'ok',
        overdue.length ? overdue.map(p => `${p.name} (+${p.delayMonths} mois)`).join(', ') : exposure.projects.length ? 'aucun dépassement' : 'aucun projet de cet opérateur en portefeuille')
    }
  }

  return results
}
