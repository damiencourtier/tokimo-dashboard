export type StatusColor = 'success' | 'primary' | 'warning' | 'info' | 'neutral'

/**
 * Libellé affiché pour un statut du CSV Tokimo. Le statut brut est conservé en
 * base et dans l'API ; seul l'affichage est aligné sur le site Tokimo, qui
 * montre "Financé" là où l'export dit "Clôturé" (collecte close, émission pas
 * encore datée).
 */
export function statusLabel(status: string): string {
  return status === 'Clôturé' ? 'Financé' : status
}

const colors: Record<string, StatusColor> = {
  'Financé': 'success',
  'Remboursé': 'primary',
  'Publié': 'info'
}

export function statusColor(status: string): StatusColor {
  return colors[statusLabel(status)] || 'neutral'
}
