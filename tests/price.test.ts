import { describe, it, expect } from 'vitest'
import { detectPriceChange, type DatedAmount } from '../src/detect/price.ts'

function monthly(amounts: number[]): DatedAmount[] {
  // erzeugt monatliche Daten ab 2025-01
  return amounts.map((amount, i) => {
    const month = String((i % 12) + 1).padStart(2, '0')
    const year = 2025 + Math.floor(i / 12)
    return { date: `${year}-${month}-03`, amount }
  })
}

describe('detectPriceChange', () => {
  it('erkennt eine dauerhafte Preiserhöhung (Netflix-Muster)', () => {
    const pc = detectPriceChange(monthly([12.99, 12.99, 12.99, 13.99, 13.99, 13.99]), 'monthly', 30)
    expect(pc).toBeDefined()
    expect(pc!.oldAmount).toBe(12.99)
    expect(pc!.newAmount).toBe(13.99)
    expect(pc!.pct).toBeCloseTo(0.077, 2)
    expect(pc!.annualDelta).toBeCloseTo(12, 1)
  })

  it('attribuiert die Erhöhung dem korrekten Übergangs-Datum', () => {
    // 12,99 für Monate 0–3, dann 13,99 ab Monat 4 (= Mai)
    const pc = detectPriceChange(
      monthly([12.99, 12.99, 12.99, 12.99, 13.99, 13.99, 13.99, 13.99]),
      'monthly',
      30,
    )
    expect(pc).toBeDefined()
    expect(pc!.since).toBe('2025-05-03')
  })

  it('ignoriert stabile Beträge', () => {
    expect(detectPriceChange(monthly([9.99, 9.99, 9.99, 9.99]), 'monthly', 30)).toBeUndefined()
  })

  it('ignoriert einmalige Ausreißer', () => {
    expect(detectPriceChange(monthly([10, 10, 10, 30, 10]), 'monthly', 30)).toBeUndefined()
  })

  it('ignoriert schwankende variable Beträge ohne klaren Sprung', () => {
    expect(detectPriceChange(monthly([50, 55, 48, 60, 52]), 'monthly', 30)).toBeUndefined()
  })

  it('ignoriert monoton steigenden Verbrauch (kein echter Preissprung, z.B. Strom)', () => {
    expect(detectPriceChange(monthly([60, 70, 80, 90, 100, 110]), 'monthly', 30)).toBeUndefined()
  })

  it('erkennt eine Erhöhung trotz einzelnem leichten Dip danach', () => {
    const pc = detectPriceChange(monthly([10, 10, 10, 12, 12, 11.3]), 'monthly', 30)
    expect(pc).toBeDefined()
    expect(pc!.oldAmount).toBe(10)
    expect(pc!.newAmount).toBe(12)
  })

  it('braucht mindestens 3 Datenpunkte', () => {
    expect(detectPriceChange(monthly([12.99, 13.99]), 'monthly', 30)).toBeUndefined()
  })

  it('ignoriert Erhöhungen unter der Mindestschwelle (Rauschen)', () => {
    // +0,20 € / ~1,5 % liegt unter MIN_ABS/MIN_PCT
    expect(detectPriceChange(monthly([12.99, 12.99, 13.19, 13.19]), 'monthly', 30)).toBeUndefined()
  })
})
