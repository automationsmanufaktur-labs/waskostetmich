import type { Frequency, PriceChange } from '../core/types.ts'
import { median, max, min, stddev, round2 } from './stats.ts'
import { paymentsPerYear } from './interval.ts'

/** Mindest-Schwellen gegen Rundungs-/Wechselkurs-Rauschen. */
const MIN_PCT = 0.05 // +5 %
const MIN_ABS = 0.5 // +0,50 €
/** Max. Streuung INNERHALB eines Plateaus (Variationskoeffizient). */
const PLATEAU_CV = 0.06

export interface DatedAmount {
  date: string // ISO
  amount: number // Absolutwert
}

/**
 * Erkennt eine dauerhafte ("schleichende") Preiserhöhung innerhalb einer
 * Abo-Gruppe: ein neues, höheres Betragsniveau, das über >= 2 Zyklen hält.
 *
 * Bewusst konservativ, um Fehlalarme bei schwankenden Beträgen (Strom/Mobilfunk)
 * zu vermeiden: jeder Betrag NACH dem Sprung muss klar über dem alten Niveau
 * liegen (kein einmaliger Ausreißer), und der alte Höchstbetrag muss unter dem
 * neuen Niveau liegen.
 */
export function detectPriceChange(
  series: DatedAmount[],
  frequency: Frequency,
  medianDays: number,
): PriceChange | undefined {
  if (series.length < 3) return undefined

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date))
  const amounts = sorted.map((s) => s.amount)
  const n = amounts.length

  let best: PriceChange | undefined
  let bestPct = 0

  // Split-Punkt p: before = [0..p-1], after = [p..n-1], after braucht >= 2 Werte
  for (let p = 1; p <= n - 2; p++) {
    const before = amounts.slice(0, p)
    const after = amounts.slice(p)

    const oldLevel = median(before)
    const newLevel = median(after)
    if (oldLevel <= 0) continue

    const diff = newLevel - oldLevel
    const pct = diff / oldLevel

    // Saubere Trennung: jeder Betrag NACH dem Sprung liegt STRIKT über jedem
    // davor. Das fixiert den Split exakt auf den echten Übergangspunkt (sonst
    // würde ein zu früher Split das "seit"-Datum verfälschen).
    const cleanSeparation = min(after) > max(before)
    // Beide Seiten müssen STABILE Plateaus sein (geringe Streuung). Das schließt
    // gleitende Trends (z.B. steigender Stromverbrauch) aus – die haben keinen
    // sauberen Sprung zwischen zwei festen Niveaus – toleriert aber einen
    // einzelnen leichten Ausreißer nach dem Sprung.
    const beforeStable = before.length < 2 || stddev(before) / oldLevel <= PLATEAU_CV
    const afterStable = stddev(after) / newLevel <= PLATEAU_CV

    if (
      pct >= MIN_PCT &&
      diff >= MIN_ABS &&
      cleanSeparation &&
      beforeStable &&
      afterStable &&
      pct > bestPct
    ) {
      const ppy = paymentsPerYear(frequency, medianDays)
      best = {
        oldAmount: round2(oldLevel),
        newAmount: round2(newLevel),
        pct: round2(pct),
        monthlyDelta: round2((diff * ppy) / 12),
        annualDelta: round2(diff * ppy),
        since: sorted[p].date,
      }
      bestPct = pct
    }
  }

  return best
}
