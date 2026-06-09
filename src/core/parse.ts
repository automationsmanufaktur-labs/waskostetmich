import { parseCsv } from './csv.ts'
import { decodeBuffer, type DecodeResult } from './encoding.ts'
import { parseAmount, parseDate } from './de-format.ts'
import { extractCreditorId, extractMandateRef } from './sepa.ts'
import { BANK_PROFILES, normalizeHeader, type BankProfile } from './bank-profiles.ts'
import { TransactionSchema, type Transaction } from './types.ts'

export interface ParseResult {
  profile: BankProfile | null
  transactions: Transaction[]
  rowsTotal: number
  rowsSkipped: number
  encoding?: DecodeResult['encoding']
}

interface HeaderHit {
  profile: BankProfile
  headerRowIndex: number
  headersNorm: string[]
  headersRaw: string[]
  /** Anzahl matchender Spalten gesamt (für Disambiguierung) */
  recognizedCols: number
}

/** Findet das passende Profil + die Header-Zeile mit dem höchsten Score. */
function detectProfile(text: string): HeaderHit | null {
  let best: HeaderHit | null = null

  for (const profile of BANK_PROFILES) {
    const rows = parseCsv(text, profile.delimiter)
    const sig = profile.headerSignature
    const limit = Math.min(rows.length, 60)

    for (let r = 0; r < limit; r++) {
      const norm = rows[r].map(normalizeHeader)
      const set = new Set(norm)
      const sigMatches = sig.filter((s) => set.has(s)).length
      if (sigMatches !== sig.length) continue

      // alle Signatur-Spalten vorhanden → wie viele Spalten kennen wir insgesamt?
      const recognizedCols = countRecognizedColumns(profile, set)
      const hit: HeaderHit = {
        profile,
        headerRowIndex: r,
        headersNorm: norm,
        headersRaw: rows[r],
        recognizedCols,
      }
      if (
        best === null ||
        profile.headerSignature.length > best.profile.headerSignature.length ||
        (profile.headerSignature.length === best.profile.headerSignature.length &&
          recognizedCols > best.recognizedCols)
      ) {
        best = hit
      }
      break // pro Profil reicht der erste Header-Treffer
    }
  }

  return best
}

function countRecognizedColumns(profile: BankProfile, headerSet: Set<string>): number {
  let count = 0
  for (const aliases of Object.values(profile.columns)) {
    if (!aliases) continue
    if ((aliases as string[]).some((a) => headerSet.has(normalizeHeader(a)))) count++
  }
  return count
}

function cell(dataRow: string[], headersNorm: string[], aliases?: string[]): string {
  if (!aliases) return ''
  for (const a of aliases) {
    const idx = headersNorm.indexOf(normalizeHeader(a))
    if (idx >= 0) {
      const v = (dataRow[idx] ?? '').trim()
      if (v !== '') return v
    }
  }
  return ''
}

/** Parst einen bereits dekodierten CSV-Text in normalisierte Transaktionen. */
export function parseStatementText(text: string): ParseResult {
  const hit = detectProfile(text)
  if (!hit) {
    return { profile: null, transactions: [], rowsTotal: 0, rowsSkipped: 0 }
  }

  const { profile, headersNorm, headerRowIndex } = hit
  const allRows = parseCsv(text, profile.delimiter)
  const dataRows = allRows.slice(headerRowIndex + 1)
  const cols = profile.columns

  const transactions: Transaction[] = []
  let skipped = 0

  for (const row of dataRows) {
    const dateRaw = cell(row, headersNorm, cols.bookingDate)
    const bookingDate = parseDate(dateRaw, profile.dateStyle)
    if (!bookingDate) {
      skipped++
      continue
    }

    let amount: number
    if (profile.amountStyle === 'split') {
      const debit = parseAmount(cell(row, headersNorm, cols.debit), profile.decimalStyle)
      const credit = parseAmount(cell(row, headersNorm, cols.credit), profile.decimalStyle)
      const d = Number.isFinite(debit) ? Math.abs(debit) : 0
      const c = Number.isFinite(credit) ? Math.abs(credit) : 0
      amount = c - d
      if (d === 0 && c === 0) {
        skipped++
        continue
      }
    } else {
      amount = parseAmount(cell(row, headersNorm, cols.amount), profile.decimalStyle)
      if (!Number.isFinite(amount)) {
        skipped++
        continue
      }
    }

    const purpose = cell(row, headersNorm, cols.purpose)
    const counterparty = cell(row, headersNorm, cols.counterparty)
    const bookingText = cell(row, headersNorm, cols.bookingText)

    const creditorId =
      cell(row, headersNorm, cols.creditorId) ||
      extractCreditorId(purpose, bookingText, counterparty)
    const mandateRef =
      cell(row, headersNorm, cols.mandateRef) || extractMandateRef(purpose, bookingText)

    const valueDate = parseDate(cell(row, headersNorm, cols.valueDate), profile.dateStyle)
    const currency = cell(row, headersNorm, cols.currency) || 'EUR'
    const counterpartyIban = cell(row, headersNorm, cols.counterpartyIban)

    const raw: Record<string, string> = {}
    hit.headersRaw.forEach((h, i) => {
      if (h) raw[h] = (row[i] ?? '').trim()
    })

    const candidate: Transaction = {
      bookingDate,
      amount,
      currency,
      counterparty,
      purpose,
      source: profile.id,
      raw,
      ...(valueDate ? { valueDate } : {}),
      ...(bookingText ? { bookingText } : {}),
      ...(creditorId ? { creditorId } : {}),
      ...(mandateRef ? { mandateRef } : {}),
      ...(counterpartyIban ? { counterpartyIban } : {}),
    }

    const parsed = TransactionSchema.safeParse(candidate)
    if (parsed.success) {
      transactions.push(parsed.data)
    } else {
      skipped++
    }
  }

  return {
    profile,
    transactions,
    rowsTotal: dataRows.length,
    rowsSkipped: skipped,
  }
}

/**
 * Liest eine Datei im Browser ein – komplett lokal über die File-API,
 * KEIN Upload, KEIN Netzwerk. Erkennt das Encoding heuristisch.
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const decoded = decodeBuffer(buffer)
  const result = parseStatementText(decoded.text)
  return { ...result, encoding: decoded.encoding }
}
