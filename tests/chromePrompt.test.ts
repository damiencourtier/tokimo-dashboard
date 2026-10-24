import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildChromePrompt, buildOpportunitiesPrompt, projectsForScope } from '../utils/chromePrompt'
import type { Project } from '../types/tokimo'

const project = (name: string, status: string, tokimoId: number | null = null): Project => ({
  name,
  date_emission: '01/01/2026',
  step: 'Acquisition',
  rate: 11,
  amount: 100,
  status,
  paymentType: null,
  durationMonths: null,
  tokimoId,
  operator: null,
  guarantees: null,
  rating: null,
  ltv: null,
  lastNewsDate: null,
  lastNewsTitle: null
})

const projects = [
  project('CHAMP DE MARS, PARIS', 'Financé'),
  project('ZONZA CAVU - CORSE', 'Clôturé'),
  project('MONTEREAU - DEUX RIVES', 'Financé', 126),
  project('LA CIOTAT', 'Remboursé'),
  project('BANDOL - 87 CAPELAN', 'Annulé')
]
const names = (ps: Project[]) => ps.map(p => p.name)

describe('prompt Claude in Chrome', () => {
  it('choisit les projets selon la portée, sans jamais les souscriptions annulées', () => {
    expect(names(projectsForScope(projects, 'active_missing'))).toEqual(['CHAMP DE MARS, PARIS', 'ZONZA CAVU - CORSE'])
    expect(names(projectsForScope(projects, 'all_missing'))).toEqual(['CHAMP DE MARS, PARIS', 'ZONZA CAVU - CORSE', 'LA CIOTAT'])
    expect(projectsForScope(projects, 'all')).toHaveLength(4)
    expect(names(projectsForScope(projects, 'active'))).toEqual(['CHAMP DE MARS, PARIS', 'ZONZA CAVU - CORSE', 'MONTEREAU - DEUX RIVES'])
    expect(names(projectsForScope(projects, 'selection', ['LA CIOTAT', 'BANDOL - 87 CAPELAN']))).toEqual(['LA CIOTAT'])
  })

  it('remplit le vrai modèle avec la liste des projets et l’adresse du dashboard', () => {
    const template = readFileSync(new URL('../docs/prompt-claude-chrome-fiches-tokimo.md', import.meta.url), 'utf8')
    const prompt = buildChromePrompt(template, projectsForScope(projects, 'active_missing'), 'https://tokimo-dashboard.netlify.app/')

    expect(prompt).not.toMatch(/\{\{\w+\}\}/)
    expect(prompt).toContain('les 2 projet(s) suivant(s)')
    expect(prompt).toContain('- CHAMP DE MARS, PARIS\n- ZONZA CAVU - CORSE')
    expect(prompt).toContain('Ouvre https://tokimo-dashboard.netlify.app (je suis connecté')
    expect(prompt).toContain('`https://tokimo-dashboard.netlify.app/projects/<nom')
  })
})

describe('prompt des opportunités', () => {
  const template = readFileSync(new URL('../docs/prompt-claude-chrome-opportunites.md', import.meta.url), 'utf8')

  it('liste les opportunités déjà connues comme en cours, avec le lien de leur fiche', () => {
    const prompt = buildOpportunitiesPrompt(template, [{ tokimoId: 135, name: 'ISSY-LES-MOULINEAUX - RODIN' }], 'https://tokimo-dashboard.netlify.app')
    expect(prompt).not.toMatch(/\{\{\w+\}\}/)
    expect(prompt).toContain('- ISSY-LES-MOULINEAUX - RODIN : https://app.tokimo.eu/projects/135')
    expect(prompt).toContain('Ouvre https://tokimo-dashboard.netlify.app/opportunites')
  })

  it('le signale quand il n’y en a aucune', () => {
    expect(buildOpportunitiesPrompt(template, [], 'https://x.test')).toContain('(aucune pour l’instant)')
  })
})
