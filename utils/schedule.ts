export interface ScheduleEntry {
  month: number
  date: string
  grossInterest: number
  netInterest: number
  capitalRepaid: number
  totalNet: number
}

export interface ScheduleInput {
  capital: number
  ratePct: number
  durationMonths: number
  paymentType: 'in_fine' | 'mensuel'
  taxRatePct: number
  startDate: Date
}

/**
 * Simple fixed-rate schedule: interest accrues on the full capital until it's
 * repaid in one shot (in fine) or spread monthly with capital repaid at the
 * last installment (mensuel) — matches how Tokimo's crowdfunding loans work.
 */
export function buildPaymentSchedule(input: ScheduleInput): ScheduleEntry[] {
  if (input.paymentType === 'in_fine') {
    const grossInterest = round2(input.capital * (input.ratePct / 100) * (input.durationMonths / 12))
    const netInterest = round2(grossInterest * (1 - input.taxRatePct / 100))
    return [
      {
        month: input.durationMonths,
        date: formatDate(addMonths(input.startDate, input.durationMonths)),
        grossInterest,
        netInterest,
        capitalRepaid: input.capital,
        totalNet: round2(netInterest + input.capital)
      }
    ]
  }

  const monthlyGross = round2((input.capital * (input.ratePct / 100)) / 12)
  const monthlyNet = round2(monthlyGross * (1 - input.taxRatePct / 100))

  const entries: ScheduleEntry[] = []
  for (let m = 1; m <= input.durationMonths; m++) {
    const capitalRepaid = m === input.durationMonths ? input.capital : 0
    entries.push({
      month: m,
      date: formatDate(addMonths(input.startDate, m)),
      grossInterest: monthlyGross,
      netInterest: monthlyNet,
      capitalRepaid,
      totalNet: round2(monthlyNet + capitalRepaid)
    })
  }
  return entries
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}
function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR')
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
