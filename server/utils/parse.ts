import Papa from 'papaparse'
import type { Project, Transaction } from '../../types/tokimo'

/** Parse a French-formatted number like "1 234,56" or "500,00" into a float. */
export function parseFrenchNumber(raw: string | undefined | null): number {
  if (!raw) return 0
  const cleaned = raw.replace(/ /g, '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/** Strip BOM and trim a raw CSV buffer into text. */
function toText(buffer: Buffer): string {
  let text = buffer.toString('utf-8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return text
}

/**
 * Parse Tokimo's "liste_projets_*.csv" export (semicolon-separated).
 * Columns: Nom du projet;Date d'émission;Étape courante;Taux ciblé (%);Capital investi (€);Statut
 */
export function parseProjectsCsv(buffer: Buffer): Project[] {
  const text = toText(buffer)
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true
  })
  return data
    .filter(row => row['Nom du projet'])
    .map(row => ({
      name: (row['Nom du projet'] || '').trim(),
      date_emission: (row["Date d'émission"] || '').trim(),
      step: (row['Étape courante'] || '').trim(),
      rate: parseFrenchNumber(row['Taux ciblé (%)']),
      amount: parseFrenchNumber(row['Capital investi (€)']),
      status: (row['Statut'] || '').trim()
    }))
}

/**
 * Parse Tokimo's "liste_transactions_*.csv" export (semicolon-separated).
 * Columns: Date;Nature;Projet;Montant (€);Statut;Montant de l'échéance (€);
 *          Part de capital (€);Part des intérêts (€);IR retenu à la source (€);
 *          CSG retenue à la source (€);Montant net perçu (€)
 */
export function parseTransactionsCsv(buffer: Buffer): Transaction[] {
  const text = toText(buffer)
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true
  })
  return data
    .filter(row => row['Date'])
    .map(row => ({
      date: (row['Date'] || '').trim(),
      nature: (row['Nature'] || '').trim(),
      project: (row['Projet'] || '').trim(),
      amount: parseFrenchNumber(row['Montant (€)']),
      status: (row['Statut'] || '').trim(),
      echeance: parseFrenchNumber(row["Montant de l'échéance (€)"]),
      capital: parseFrenchNumber(row['Part de capital (€)']),
      interest: parseFrenchNumber(row['Part des intérêts (€)']),
      ir: parseFrenchNumber(row['IR retenu à la source (€)']),
      csg: parseFrenchNumber(row['CSG retenue à la source (€)']),
      net: parseFrenchNumber(row['Montant net perçu (€)'])
    }))
}
