import type { Opportunity, Project } from '../types/tokimo'

export type PromptScope = 'active_missing' | 'all_missing' | 'active' | 'all' | 'selection'

/** Projets à traiter selon la portée choisie (jamais les souscriptions annulées). */
export function projectsForScope(projects: Project[], scope: PromptScope, selection: string[] = []): Project[] {
  const subscribed = projects.filter(p => p.status !== 'Annulé')
  switch (scope) {
    case 'active_missing':
      return subscribed.filter(p => p.status !== 'Remboursé' && !p.tokimoId)
    case 'all_missing':
      return subscribed.filter(p => !p.tokimoId)
    case 'active':
      return subscribed.filter(p => p.status !== 'Remboursé')
    case 'all':
      return subscribed
    case 'selection':
      return subscribed.filter(p => selection.includes(p.name))
  }
}

/**
 * Remplit le modèle docs/prompt-claude-chrome-fiches-tokimo.md : liste exacte
 * des projets (un par ligne, leurs noms peuvent contenir des virgules) et
 * adresse du dashboard en cours d'utilisation.
 */
export function buildChromePrompt(template: string, projects: Project[], dashboardUrl: string): string {
  const names = [...new Set(projects.map(p => p.name))]
  const list = `les ${names.length} projet(s) suivant(s), noms exacts tels qu'affichés dans le dashboard :\n\n${names.map(n => `- ${n}`).join('\n')}`
  return template
    .replaceAll('{{PROJETS}}', list)
    .replaceAll('{{DASHBOARD_URL}}', dashboardUrl.replace(/\/$/, ''))
}

/**
 * Remplit le modèle docs/prompt-claude-chrome-opportunites.md : adresse du
 * dashboard et opportunités déjà connues comme "En cours", dont le statut est
 * à revérifier même si elles ont quitté l'onglet "En cours" de Tokimo.
 */
export function buildOpportunitiesPrompt(
  template: string,
  knownOpen: Pick<Opportunity, 'tokimoId' | 'name'>[],
  dashboardUrl: string
): string {
  const known = knownOpen.length
    ? knownOpen.map(o => `- ${o.name} : https://app.tokimo.eu/projects/${o.tokimoId}`).join('\n')
    : '(aucune pour l’instant)'
  return template
    .replaceAll('{{OPPORTUNITES_CONNUES}}', known)
    .replaceAll('{{DASHBOARD_URL}}', dashboardUrl.replace(/\/$/, ''))
}
