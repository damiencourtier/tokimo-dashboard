import type { InvestmentCriteria } from '../types/tokimo'

export interface Benchmark {
  /** Repère tel qu'affiché à côté du critère. */
  text: string
  /** Absente quand le repère est déduit (d'un autre critère ou du portefeuille), pas tiré d'une source. */
  source?: { label: string; url: string }
}

/**
 * Repères couramment cités dans le crowdfunding immobilier, appliqués par
 * défaut tant que l'utilisateur n'a pas enregistré ses propres critères.
 *
 * Ce sont des conventions de marché (guides, plateformes), pas des règles :
 * l'AMF ne fixe aucun seuil chiffré. Chaque valeur a une source vérifiée, ou
 * est explicitement déduite (prêts uniquement, montant envisagé). La note
 * Tokimo reste vide : propre à la plateforme, elle n'a aucun repère externe.
 */
export const MARKET_BENCHMARKS: Partial<Record<keyof InvestmentCriteria, Benchmark & { value: unknown }>> = {
  requireFirstRankMortgage: {
    value: true,
    text: 'hypothèque de 1er rang : priorité sur le produit de la vente, alors que le crowdfunding est souvent en 2nd rang derrière la banque',
    source: { label: 'Le Média de l’Investisseur', url: 'https://lemediadelinvestisseur.fr/immobilier/comment-analyser-projet-crowdfunding-immobilier/' }
  },
  maxLtv: {
    value: 70,
    text: '≤ 70 % (risque faible ; 70–80 % modéré ; > 80 % élevé) : une revente forcée avec 30 % de décote couvre encore le prêt',
    source: { label: 'Sinvestir', url: 'https://sinvestir.fr/choisir-un-projet-de-crowdfunding-immobilier' }
  },
  loansOnly: {
    value: true,
    text: 'déduit du critère hypothèque : une prise de participation (equity) ne comporte ni hypothèque ni taux contractuel'
  },
  maxLtc: {
    value: 80,
    text: '≤ 80 % : les prêteurs préfèrent un LTC de 60 à 80 % (repère du financement immobilier ; au-delà, l’opération est très endettée)',
    source: { label: 'eCapital', url: 'https://ecapital.com/financial-term/loan-to-cost-ltc-ratio/' }
  },
  minRate: {
    value: 8,
    text: '≥ 8 % : les nouveaux projets se situent entre 8 et 12 %. Attention, un taux nettement au-dessus de la moyenne rémunère souvent un risque plus élevé',
    source: { label: 'Auguste Patrimoine', url: 'https://www.auguste-patrimoine.fr/immobilier/investir-en-crowdfunding-immobilier' }
  },
  maxDurationMonths: {
    value: 36,
    text: '≤ 36 mois : les obligations de crowdfunding immobilier ont une durée de 12 à 36 mois (12–18 mois en marchand de biens, 18–36 mois en promotion)',
    source: { label: 'Auguste Patrimoine', url: 'https://www.auguste-patrimoine.fr/immobilier/investir-en-crowdfunding-immobilier' }
  },
  minPreSalesPct: {
    value: 40,
    text: '≥ 40 % de pré-commercialisation souhaitable (certains guides visent plus de 50 %)',
    source: { label: 'Le Média de l’Investisseur', url: 'https://lemediadelinvestisseur.fr/immobilier/comment-analyser-projet-crowdfunding-immobilier/' }
  },
  maxOperatorSharePct: {
    value: 10,
    text: 'au moins 10 projets différents pour diluer le risque, en variant les opérateurs : au plus ~10 % du capital sur un même opérateur',
    source: { label: 'Ramify', url: 'https://www.ramify.fr/gestion-de-patrimoine/crowdfunding-immobilier' }
  },
  excludeOperatorsWithOverdueProjects: {
    value: true,
    text: 'vérifier un historique d’opérations livrées sans incident avant de suivre un opérateur',
    source: { label: 'Le Média de l’Investisseur', url: 'https://lemediadelinvestisseur.fr/immobilier/comment-analyser-projet-crowdfunding-immobilier/' }
  }
}

/** Repère du montant envisagé : ticket habituel de l'utilisateur. */
export const TICKET_BENCHMARK: Benchmark = {
  text: 'ton ticket habituel (médiane de tes souscriptions)'
}

/** Médiane des montants souscrits (souscriptions annulées exclues), arrondie à l'euro. */
export function medianTicket(amounts: number[]): number | null {
  if (!amounts.length) return null
  const sorted = [...amounts].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return Math.round(sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2)
}

/** Critères préremplis avec les repères du marché, et le ticket habituel s'il est connu. */
export function benchmarkCriteria(ticket: number | null = null): InvestmentCriteria {
  const criteria: InvestmentCriteria = { requireFirstRankMortgage: false, loansOnly: false, excludeOperatorsWithOverdueProjects: false }
  for (const [key, b] of Object.entries(MARKET_BENCHMARKS)) {
    (criteria as unknown as Record<string, unknown>)[key] = b!.value
  }
  if (ticket) criteria.ticketAmount = ticket
  return criteria
}

/** Critères de départ du formulaire : ceux enregistrés, sinon les repères du marché. */
export function initialCriteria(saved: InvestmentCriteria, ticket: number | null = null): InvestmentCriteria {
  return saved.saved ? saved : benchmarkCriteria(ticket)
}
