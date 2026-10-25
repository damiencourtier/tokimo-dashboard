/** "yyyy-mm" décalé de n mois. */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y!, m! - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface NetInterestTimeline {
  labels: string[]
  /** Intérêts nets réels par mois (0 si aucun versement), null sur la partie prévision. */
  history: (number | null)[]
  /** Prévision mensuelle, raccordée au dernier mois réel, null sur l'historique. */
  forecast: (number | null)[]
}

/**
 * Axe mensuel continu : historique (mois sans versement à 0, fenêtre de
 * `historyMonths` mois jusqu'au mois courant, ou tout depuis le premier
 * versement si null), puis `forecastMonths` mois de prévision ("yyyy-mm" ->
 * intérêts nets prévus, mois absents à 0).
 */
export function buildNetInterestTimeline(
  monthlyNetInterest: Record<string, number>,
  forecastByMonth: Record<string, number>,
  historyMonths: number | null,
  today: Date = new Date(),
  forecastMonths = 12
): NetInterestTimeline {
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const dataMonths = Object.keys(monthlyNetInterest).sort()
  const lastMonth = dataMonths.length && dataMonths[dataMonths.length - 1]! > currentMonth ? dataMonths[dataMonths.length - 1]! : currentMonth

  let firstMonth = historyMonths === null ? dataMonths[0] ?? lastMonth : addMonths(lastMonth, -(historyMonths - 1))
  if (firstMonth > lastMonth) firstMonth = lastMonth

  const histLabels: string[] = []
  for (let m = firstMonth; m <= lastMonth; m = addMonths(m, 1)) histLabels.push(m)
  const foreLabels = Array.from({ length: forecastMonths }, (_, i) => addMonths(lastMonth, i + 1))

  const history = histLabels.map(m => monthlyNetInterest[m] ?? 0)
  return {
    labels: [...histLabels, ...foreLabels],
    history: [...history, ...Array(forecastMonths).fill(null)],
    forecast: [...Array(histLabels.length - 1).fill(null), history[history.length - 1]!, ...foreLabels.map(m => forecastByMonth[m] ?? 0)]
  }
}

/** Moyenne des intérêts nets sur les `n` derniers mois calendaires (mois sans versement comptés à 0). */
export function averageLastMonths(monthlyNetInterest: Record<string, number>, n: number, today: Date = new Date()): number {
  const current = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  let total = 0
  for (let i = 0; i < n; i++) total += monthlyNetInterest[addMonths(current, -i)] ?? 0
  return total / n
}
