import { parseTransactionsCsv } from '../../utils/parse'

export default defineEventHandler(async (event) => {
  const files = await readMultipartFormData(event)
  const file = files?.find(f => f.name === 'file')

  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'Aucun fichier reçu (champ "file" attendu).' })
  }

  const transactions = parseTransactionsCsv(file.data)

  if (transactions.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Le fichier ne contient aucune ligne exploitable. Vérifie qu\'il s\'agit bien de l\'export "liste_transactions" de Tokimo.'
    })
  }

  return { ok: true, count: transactions.length, transactions }
})
