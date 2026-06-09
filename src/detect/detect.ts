import type {
  Transaction,
  RecurringGroup,
  DetectionResult,
  Confidence,
} from '../core/types.ts'
import { daysBetween } from '../core/de-format.ts'
import { merchantKey, tokenSetSimilarity } from './normalize.ts'
import { classifyFrequency, paymentsPerYear } from './interval.ts'
import { detectPriceChange } from './price.ts'
import { mean, median, stddev, min, max, round2 } from './stats.ts'

export interface DetectOptions {
  /** Fuzzy-Match-Schwelle für die Gruppierung (0..1). Default 0.85. */
  similarityThreshold?: number
  /** Ab wie vielen Vorkommen gilt eine Gruppe als "bestätigt". Default 3. */
  confirmThreshold?: number
  /** Max. Standardabweichung der Tagesabstände für "bestätigt". Default 10. */
  maxIntervalStd?: number
  /** Spread (max-min)/avg, ab dem ein Betrag als "variabel" gilt. Default 0.15. */
  variableSpread?: number
}

const DEFAULTS: Required<DetectOptions> = {
  similarityThreshold: 0.85,
  confirmThreshold: 3,
  maxIntervalStd: 10,
  variableSpread: 0.15,
}

interface Bucket {
  /** Repräsentativer normalisierter Merchant-Key (nur für m:-Buckets) */
  repr: string
  creditorId?: string
  txns: Transaction[]
}

export function detectRecurring(
  transactions: Transaction[],
  options: DetectOptions = {},
): DetectionResult {
  const opts = { ...DEFAULTS, ...options }

  // 1. Nur Abbuchungen – schließt Gehalt/Gutschriften (Fehlalarm) aus.
  const outflows = transactions.filter((t) => t.amount < 0)

  // Bezugsdatum für "aktiv/eingeschlafen": jüngste Abbuchung im Auszug.
  const asOf = outflows.reduce((m, t) => (t.bookingDate > m ? t.bookingDate : m), '')

  // 2. Initiale Gruppierung: Gläubiger-ID zuerst (stabil), sonst Merchant-Key.
  const creditorBuckets = new Map<string, Bucket>()
  const merchantBuckets: Bucket[] = []

  for (const t of outflows) {
    if (t.creditorId) {
      const k = t.creditorId.toUpperCase()
      const b = creditorBuckets.get(k)
      if (b) b.txns.push(t)
      else creditorBuckets.set(k, { repr: '', creditorId: k, txns: [t] })
      continue
    }
    const key = merchantKey(t.counterparty, t.purpose)
    if (!key) continue // nicht identifizierbar
    merchantBuckets.push({ repr: key, txns: [t] })
  }

  // 3. Fuzzy-Merge der Merchant-Buckets (gleiche Firma, leicht andere Schreibweise).
  const mergedMerchant = fuzzyMerge(merchantBuckets, opts.similarityThreshold)

  const allBuckets = [...creditorBuckets.values(), ...mergedMerchant]

  // 4. Pro Bucket analysieren.
  const groups: RecurringGroup[] = []
  for (const bucket of allBuckets) {
    const group = analyzeBucket(bucket, opts, asOf)
    if (group) groups.push(group)
  }

  // 5. Sortieren nach Jahreskosten absteigend.
  groups.sort((a, b) => b.annualCost - a.annualCost)

  // 6. Summen.
  const confirmed = groups.filter((g) => g.confidence === 'bestätigt')
  const totalMonthlyConfirmed = round2(sum(confirmed.map((g) => g.monthlyCost)))
  const totalMonthlyAll = round2(sum(groups.map((g) => g.monthlyCost)))

  // 7. Datumsbereich.
  const dates = outflows.map((t) => t.bookingDate).sort()
  const dateRange = dates.length
    ? { from: dates[0], to: dates[dates.length - 1] }
    : null

  return {
    groups,
    totalMonthlyConfirmed,
    totalAnnualConfirmed: round2(totalMonthlyConfirmed * 12),
    totalMonthlyAll,
    totalAnnualAll: round2(totalMonthlyAll * 12),
    count: groups.length,
    transactionsAnalyzed: outflows.length,
    priceIncreases: groups.filter((g) => g.priceChange),
    dormantCount: groups.filter((g) => g.status === 'eingeschlafen').length,
    dateRange,
  }
}

function fuzzyMerge(buckets: Bucket[], threshold: number): Bucket[] {
  // Deterministisch: zuerst die größten/aussagekräftigsten Buckets (stabiler
  // Repräsentant), Tiebreak alphabetisch. Dann jeweils die BESTE statt der
  // ersten Übereinstimmung wählen – so ist das Ergebnis reihenfolge-invariant.
  const sorted = [...buckets].sort(
    (a, b) => b.txns.length - a.txns.length || a.repr.localeCompare(b.repr),
  )
  const merged: Bucket[] = []
  for (const b of sorted) {
    let target: Bucket | undefined
    let bestSim = threshold
    for (const m of merged) {
      const sim = tokenSetSimilarity(b.repr, m.repr)
      if (sim >= bestSim) {
        bestSim = sim
        target = m
      }
    }
    if (target) target.txns.push(...b.txns)
    else merged.push({ repr: b.repr, txns: [...b.txns] })
  }
  return merged
}

function analyzeBucket(
  bucket: Bucket,
  opts: Required<DetectOptions>,
  asOf: string,
): RecurringGroup | null {
  const txns = [...bucket.txns].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))
  if (txns.length < 2) return null

  const amounts = txns.map((t) => Math.abs(t.amount))
  const amountAvg = mean(amounts)
  if (amountAvg <= 0) return null

  // Tagesabstände (Median über die letzten 10 – robuster gegen Ausreißer).
  const deltas: number[] = []
  for (let i = 1; i < txns.length; i++) {
    deltas.push(daysBetween(txns[i - 1].bookingDate, txns[i].bookingDate))
  }
  // Median UND Std-Abw. aus demselben Fenster (letzte 10) – sonst beruhen
  // Frequenz-Klassifikation und Confidence auf unterschiedlichen Datenbasen.
  const recentDeltas = deltas.slice(-10)
  const intervalDays = median(recentDeltas)
  const intervalStdDays = stddev(recentDeltas)
  if (intervalDays <= 0) return null

  const frequency = classifyFrequency(intervalDays)

  const amountMin = min(amounts)
  const amountMax = max(amounts)
  const spread = (amountMax - amountMin) / amountAvg
  const isVariable = spread > opts.variableSpread

  const hasMandate = Boolean(bucket.creditorId || txns.some((t) => t.creditorId || t.mandateRef))

  // Fehlalarm-Filter: ohne SEPA-Mandat nur akzeptieren, wenn Betrag stabil UND
  // Intervall regelmäßig (sonst z.B. wöchentlicher Supermarkt-Einkauf).
  const looksLikeSubscription = hasMandate || (!isVariable && frequency !== 'irregular')
  if (!looksLikeSubscription) return null

  const ppy = paymentsPerYear(frequency, intervalDays)
  const monthlyCost = round2((amountAvg * ppy) / 12)
  const annualCost = round2(amountAvg * ppy)

  const confidence: Confidence =
    txns.length >= opts.confirmThreshold && intervalStdDays <= opts.maxIntervalStd
      ? 'bestätigt'
      : 'vermutet'

  const priceChange = detectPriceChange(
    txns.map((t) => ({ date: t.bookingDate, amount: Math.abs(t.amount) })),
    frequency,
    intervalDays,
  )

  const lastSeen = txns[txns.length - 1].bookingDate
  const daysSinceLast = asOf ? daysBetween(lastSeen, asOf) : 0
  // Überfällig um mehr als ~1,75 Zyklen → wahrscheinlich beendet/gekündigt.
  const status: RecurringGroup['status'] =
    daysSinceLast > intervalDays * 1.75 ? 'eingeschlafen' : 'aktiv'

  return {
    label: pickLabel(txns, bucket.repr),
    ...(bucket.creditorId ? { creditorId: bucket.creditorId } : {}),
    transactions: txns,
    count: txns.length,
    frequency,
    intervalDays: round2(intervalDays),
    intervalStdDays: round2(intervalStdDays),
    amountAvg: round2(amountAvg),
    amountLast: round2(Math.abs(txns[txns.length - 1].amount)),
    amountMin: round2(amountMin),
    amountMax: round2(amountMax),
    isVariable,
    monthlyCost,
    annualCost,
    confidence,
    ...(priceChange ? { priceChange } : {}),
    hasMandate,
    status,
    daysSinceLast,
    firstSeen: txns[0].bookingDate,
    lastSeen,
  }
}

/** Wählt den am häufigsten vorkommenden (nicht-leeren) Gegenpartei-Namen. */
function pickLabel(txns: Transaction[], fallback: string): string {
  const counts = new Map<string, number>()
  for (const t of txns) {
    const name = t.counterparty.trim()
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  let bestName = ''
  let bestCount = 0
  for (const [name, c] of counts) {
    if (c > bestCount) {
      bestName = name
      bestCount = c
    }
  }
  if (bestName) return bestName
  // Fallback: Merchant-Key in Title-Case
  return fallback
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim() || 'Unbekannt'
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}
