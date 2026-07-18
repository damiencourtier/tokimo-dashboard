export interface NewInvestmentInput {
  capital: number
  ratePct: number
  durationMonths: number
  paymentType: 'in_fine' | 'mensuel'
  taxRatePct: number
}

export interface NewInvestmentResult {
  grossGain: number
  netGain: number
  totalNetReceived: number
  monthlyNetPayment: number | null
}

export function simulateNewInvestment(input: NewInvestmentInput): NewInvestmentResult {
  const years = input.durationMonths / 12
  const grossGain = round2(input.capital * (input.ratePct / 100) * years)
  const netGain = round2(grossGain * (1 - input.taxRatePct / 100))
  const totalNetReceived = round2(input.capital + netGain)
  const monthlyNetPayment =
    input.paymentType === 'mensuel' && input.durationMonths > 0 ? round2(netGain / input.durationMonths) : null

  return { grossGain, netGain, totalNetReceived, monthlyNetPayment }
}

export interface CompoundInput {
  initialCapital: number
  monthlyContribution: number
  annualRatePct: number
  durationMonths: number
  taxRatePct: number
}

export interface CompoundPoint {
  month: number
  capital: number
}

export interface CompoundResult {
  timeline: CompoundPoint[]
  finalCapital: number
  totalContributions: number
  totalNetGains: number
}

/** Monthly compounding, reinvesting net-of-tax interest each month. */
export function simulateCompound(input: CompoundInput): CompoundResult {
  const monthlyNetRate = (input.annualRatePct / 100 / 12) * (1 - input.taxRatePct / 100)

  let capital = input.initialCapital
  const timeline: CompoundPoint[] = [{ month: 0, capital: round2(capital) }]
  for (let m = 1; m <= input.durationMonths; m++) {
    capital = capital * (1 + monthlyNetRate) + input.monthlyContribution
    timeline.push({ month: m, capital: round2(capital) })
  }

  const totalContributions = round2(input.initialCapital + input.monthlyContribution * input.durationMonths)
  const finalCapital = round2(capital)
  const totalNetGains = round2(finalCapital - totalContributions)

  return { timeline, finalCapital, totalContributions, totalNetGains }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
