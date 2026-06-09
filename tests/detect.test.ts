import { describe, it, expect } from 'vitest'
import { parseStatementText } from '../src/core/parse.ts'
import { detectRecurring } from '../src/detect/detect.ts'
import { buildDemoCsv } from '../src/ui/demo-data.ts'
import type { Transaction } from '../src/core/types.ts'

function tx(
  date: string,
  amount: number,
  counterparty: string,
  opts: { creditorId?: string; purpose?: string; mandateRef?: string } = {},
): Transaction {
  return {
    bookingDate: date,
    amount,
    currency: 'EUR',
    counterparty,
    purpose: opts.purpose ?? '',
    source: 'test',
    raw: {},
    ...(opts.creditorId ? { creditorId: opts.creditorId } : {}),
    ...(opts.mandateRef ? { mandateRef: opts.mandateRef } : {}),
  }
}

function monthlySeries(
  amount: number | number[],
  counterparty: string,
  opts: { creditorId?: string; months?: number; day?: number } = {},
): Transaction[] {
  const months = opts.months ?? 6
  const day = String(opts.day ?? 3).padStart(2, '0')
  const out: Transaction[] = []
  for (let i = 0; i < months; i++) {
    const m = String((i % 12) + 1).padStart(2, '0')
    const year = 2025 + Math.floor(i / 12)
    const a = Array.isArray(amount) ? amount[i % amount.length] : amount
    out.push(tx(`${year}-${m}-${day}`, -a, counterparty, { creditorId: opts.creditorId }))
  }
  return out
}

describe('detectRecurring – Demo-Kontoauszug', () => {
  const result = detectRecurring(parseStatementText(buildDemoCsv()).transactions)

  it('erkennt die Kern-Abos', () => {
    const labels = result.groups.map((g) => g.label.toLowerCase())
    expect(labels.some((l) => l.includes('netflix'))).toBe(true)
    expect(labels.some((l) => l.includes('spotify'))).toBe(true)
    expect(labels.some((l) => l.includes('fitx'))).toBe(true)
    expect(labels.some((l) => l.includes('stadtwerke'))).toBe(true)
    expect(labels.some((l) => l.includes('amazon'))).toBe(true)
  })

  it('markiert Netflix als bestätigt mit Preiserhöhung', () => {
    const netflix = result.groups.find((g) => g.label.includes('Netflix'))
    expect(netflix).toBeDefined()
    expect(netflix!.confidence).toBe('bestätigt')
    expect(netflix!.frequency).toBe('monthly')
    expect(netflix!.priceChange).toBeDefined()
    expect(netflix!.priceChange!.oldAmount).toBe(12.99)
    expect(netflix!.priceChange!.newAmount).toBe(13.99)
  })

  it('erkennt das jährliche Amazon-Prime-Abo (vermutet)', () => {
    const amazon = result.groups.find((g) => g.label.includes('Amazon'))
    expect(amazon!.frequency).toBe('yearly')
    expect(amazon!.confidence).toBe('vermutet')
  })

  it('schließt Gehalt (Gutschrift) aus', () => {
    expect(result.groups.some((g) => g.label.toLowerCase().includes('arbeitgeber'))).toBe(false)
  })

  it('vermeidet Fehlalarm beim variablen Supermarkt (REWE)', () => {
    expect(result.groups.some((g) => g.label.toLowerCase().includes('rewe'))).toBe(false)
  })

  it('ignoriert Einmalkäufe (MediaMarkt)', () => {
    expect(result.groups.some((g) => g.label.toLowerCase().includes('mediamarkt'))).toBe(false)
  })

  it('listet mindestens eine Preiserhöhung und eine positive Monatssumme', () => {
    expect(result.priceIncreases.length).toBeGreaterThanOrEqual(1)
    expect(result.totalMonthlyConfirmed).toBeGreaterThan(0)
    expect(result.totalMonthlyAll).toBeGreaterThanOrEqual(result.totalMonthlyConfirmed)
  })
})

describe('detectRecurring – Edge-Cases', () => {
  it('gruppiert umbenannte Gegenpartei über gleiche Gläubiger-ID', () => {
    const txns = [
      tx('2025-01-03', -12.99, 'PayPal *Netflix', { creditorId: 'NL92ZZZ334088280000' }),
      tx('2025-02-03', -12.99, 'Netflix Intl', { creditorId: 'NL92ZZZ334088280000' }),
      tx('2025-03-03', -12.99, 'NETFLIX INTERNATIONAL B.V.', { creditorId: 'NL92ZZZ334088280000' }),
    ]
    const r = detectRecurring(txns)
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0].count).toBe(3)
  })

  it('mergt Schreibvarianten ohne Gläubiger-ID per Fuzzy-Match', () => {
    const txns = [
      ...monthlySeries(9.99, 'Spotify AB', { months: 3, day: 5 }),
      ...monthlySeries(9.99, 'SPOTIFY AB', { months: 3, day: 6 }).map((t) => ({
        ...t,
        bookingDate: t.bookingDate.replace('-0', '-1'), // andere Monate
      })),
    ]
    const r = detectRecurring(txns)
    const spotify = r.groups.filter((g) => g.label.toLowerCase().includes('spotify'))
    expect(spotify).toHaveLength(1)
  })

  it('behält variables Abo MIT SEPA-Mandat (z.B. Strom)', () => {
    const txns = monthlySeries([80, 95, 88, 100, 84, 99], 'Stadtwerke', {
      creditorId: 'DE00ZZZ00000123456',
      months: 6,
    })
    const r = detectRecurring(txns)
    const strom = r.groups.find((g) => g.label.includes('Stadtwerke'))
    expect(strom).toBeDefined()
    expect(strom!.isVariable).toBe(true)
    expect(strom!.hasMandate).toBe(true)
  })

  it('verwirft variable Zahlung OHNE Mandat (Supermarkt)', () => {
    const txns = [
      tx('2025-01-04', -23.45, 'REWE Markt GmbH'),
      tx('2025-01-11', -67.12, 'REWE Markt GmbH'),
      tx('2025-01-18', -41.9, 'REWE Markt GmbH'),
      tx('2025-01-25', -88.3, 'REWE Markt GmbH'),
    ]
    const r = detectRecurring(txns)
    expect(r.groups.some((g) => g.label.includes('REWE'))).toBe(false)
  })

  it('gruppiert reihenfolge-invariant (fuzzyMerge deterministisch)', () => {
    const a = monthlySeries(15.0, 'Telekom Deutschland GmbH', { months: 3, day: 2 })
    const b = monthlySeries(15.0, 'Telekom Deutschland', { months: 3, day: 9 })
    const fwd = detectRecurring([...a, ...b])
    const rev = detectRecurring([...b, ...a].reverse())
    expect(fwd.groups.length).toBe(rev.groups.length)
    const telFwd = fwd.groups.filter((g) => g.label.toLowerCase().includes('telekom'))
    const telRev = rev.groups.filter((g) => g.label.toLowerCase().includes('telekom'))
    expect(telFwd).toHaveLength(1)
    expect(telRev).toHaveLength(1)
    expect(telFwd[0].count).toBe(6)
    expect(telRev[0].count).toBe(6)
  })

  it('schließt reine Gutschriften (Gehalt) aus', () => {
    const txns = monthlySeries(2800, 'Arbeitgeber', { months: 6 }).map((t) => ({
      ...t,
      amount: -t.amount, // wieder positiv machen
    }))
    const r = detectRecurring(txns)
    expect(r.groups).toHaveLength(0)
  })
})
