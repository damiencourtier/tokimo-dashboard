import type { Project } from '../types/tokimo'

export type PromptScope = 'active_missing' | 'all_missing' | 'all' | 'selection'

/** Projets à traiter selon la portée choisie (jamais les souscriptions annulées). */
export function projectsForScope(projects: Project[], scope: PromptScope, selection: string[] = []): Project[] {
  const subscribed = projects.filter(p => p.status !== 'Annulé')
  switch (scope) {
    case 'active_missing':
      return subscribed.filter(p => p.status !== 'Remboursé' && !p.tokimoId)
    case 'all_missing':
      return subscribed.filter(p => !p.tokimoId)
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
