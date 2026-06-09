import type { DetectionResult } from '../core/types.ts'
import type { ParseResult } from '../core/parse.ts'
import { FREQUENCY_LABELS } from '../core/types.ts'

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const e = (n: number): string => eur.format(n)
const d = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

/** Lesbarer Terminal-Report (plain text, portabel). */
export function formatReport(result: DetectionResult, parseInfo: ParseResult): string {
  const L: string[] = []
  const bank = parseInfo.profile?.name ?? 'Unbekannt'
  const range = result.dateRange ? `${d(result.dateRange.from)}–${d(result.dateRange.to)}` : '—'

  L.push('WasKostetMich — Analyse')
  L.push(`Bank: ${bank} · ${parseInfo.transactions.length} Buchungen · ${range}`)
  L.push('')

  if (result.count === 0) {
    L.push('Keine wiederkehrenden Abbuchungen erkannt.')
    L.push('Tipp: einen längeren Zeitraum (12 Monate) exportieren – auch für Jahresabos.')
    return L.join('\n')
  }

  L.push(
    `Wiederkehrend gesamt:  ${e(result.totalMonthlyAll)}/Monat  ·  ${e(result.totalAnnualAll)}/Jahr`,
  )
  L.push(
    `davon bestätigt: ${e(result.totalMonthlyConfirmed)}/Mon  ·  ` +
      `Preiserhöhungen: ${result.priceIncreases.length}  ·  eingeschlafen: ${result.dormantCount}`,
  )
  L.push('')
  L.push('ABOS (nach Jahreskosten):')

  for (const g of result.groups) {
    const cost = `${e(g.monthlyCost)}/Mon`.padStart(13)
    const tags = [
      FREQUENCY_LABELS[g.frequency],
      g.confidence,
      g.hasMandate ? 'SEPA' : '',
      g.status === 'eingeschlafen' ? 'eingeschlafen' : '',
    ]
      .filter(Boolean)
      .join(' · ')
    let line = `  ${cost}  ${g.label}  [${tags}]`
    if (g.priceChange) {
      line += `  ⚠ ${e(g.priceChange.oldAmount)}→${e(g.priceChange.newAmount)} (+${Math.round(
        g.priceChange.pct * 100,
      )}% seit ${d(g.priceChange.since)})`
    }
    L.push(line)
  }

  if (result.priceIncreases.length > 0) {
    L.push('')
    L.push('⚠ Schleichend teurer geworden:')
    for (const g of result.priceIncreases) {
      const pc = g.priceChange!
      L.push(
        `  ${g.label}: ${e(pc.oldAmount)} → ${e(pc.newAmount)} (+${e(pc.annualDelta)}/Jahr) seit ${d(pc.since)}`,
      )
    }
  }

  return L.join('\n')
}
