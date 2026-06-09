import type { DetectionResult } from '../core/types.ts'
import type { ParseResult } from '../core/parse.ts'
import { FREQUENCY_LABELS } from '../core/types.ts'

/**
 * LLM-freundliche Analyse-Struktur. Bewusst NUR die erkannten Abos – nicht der
 * komplette Auszug. Gehalt, Einzelkäufe und IBANs tauchen hier nie auf; die
 * lokale Engine wirkt als Privacy-Filter, bevor irgendetwas an ein Modell geht.
 */
export interface AnalysisSubscription {
  name: string
  monatlich: number
  jaehrlich: number
  frequenz: string
  vertrauen: string
  status: string
  variabel: boolean
  sepaLastschrift: boolean
  vorkommen: number
  erstmals: string
  zuletzt: string
  tageSeitLetzter: number
  preiserhoehung?: {
    von: number
    auf: number
    prozent: number
    mehrProJahr: number
    seit: string
  }
}

export interface Analysis {
  meta: {
    bank: string | null
    buchungen: number
    uebersprungen: number
    zeitraum: { von: string; bis: string } | null
  }
  zusammenfassung: {
    wiederkehrendMonatlich: number
    wiederkehrendJaehrlich: number
    bestaetigtMonatlich: number
    anzahlAbos: number
    preiserhoehungen: number
    eingeschlafen: number
  }
  abos: AnalysisSubscription[]
}

export function buildAnalysis(
  result: DetectionResult,
  parseInfo: ParseResult,
  opts: { redact?: boolean } = {},
): Analysis {
  const abos = result.groups.map((g, i) => {
    const sub: AnalysisSubscription = {
      name: opts.redact ? `Anbieter ${letter(i)}` : g.label,
      monatlich: g.monthlyCost,
      jaehrlich: g.annualCost,
      frequenz: FREQUENCY_LABELS[g.frequency],
      vertrauen: g.confidence,
      status: g.status,
      variabel: g.isVariable,
      sepaLastschrift: g.hasMandate,
      vorkommen: g.count,
      erstmals: g.firstSeen,
      zuletzt: g.lastSeen,
      tageSeitLetzter: g.daysSinceLast,
    }
    if (g.priceChange) {
      sub.preiserhoehung = {
        von: g.priceChange.oldAmount,
        auf: g.priceChange.newAmount,
        prozent: Math.round(g.priceChange.pct * 100),
        mehrProJahr: g.priceChange.annualDelta,
        seit: g.priceChange.since,
      }
    }
    return sub
  })

  return {
    meta: {
      bank: parseInfo.profile?.name ?? null,
      buchungen: parseInfo.transactions.length,
      uebersprungen: parseInfo.rowsSkipped,
      zeitraum: result.dateRange
        ? { von: result.dateRange.from, bis: result.dateRange.to }
        : null,
    },
    zusammenfassung: {
      wiederkehrendMonatlich: result.totalMonthlyAll,
      wiederkehrendJaehrlich: result.totalAnnualAll,
      bestaetigtMonatlich: result.totalMonthlyConfirmed,
      anzahlAbos: result.count,
      preiserhoehungen: result.priceIncreases.length,
      eingeschlafen: result.dormantCount,
    },
    abos,
  }
}

function letter(i: number): string {
  // 0->A, 25->Z, 26->AA …
  let n = i
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}
