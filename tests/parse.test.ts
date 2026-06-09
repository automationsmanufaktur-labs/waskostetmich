import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseStatementText, parseFile } from '../src/core/parse.ts'
import type { Transaction } from '../src/core/types.ts'

function loadFixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf-8')
}

function netflix(txns: Transaction[]): Transaction | undefined {
  return txns.find((t) => t.counterparty.includes('Netflix') || t.purpose.includes('Netflix'))
}

const CASES: Array<{ file: string; id: string; hasCreditorId: boolean }> = [
  { file: 'sparkasse.csv', id: 'sparkasse', hasCreditorId: true },
  { file: 'dkb-neu.csv', id: 'dkb-neu', hasCreditorId: true },
  { file: 'dkb-alt.csv', id: 'dkb-alt', hasCreditorId: true },
  { file: 'ing.csv', id: 'ing', hasCreditorId: false },
  { file: 'commerzbank.csv', id: 'commerzbank', hasCreditorId: false },
  { file: 'volksbank.csv', id: 'volksbank', hasCreditorId: false },
  { file: 'n26.csv', id: 'n26', hasCreditorId: false },
  { file: 'comdirect.csv', id: 'comdirect', hasCreditorId: false },
  { file: 'postbank.csv', id: 'postbank', hasCreditorId: false },
]

describe('parseStatementText – Bank-Erkennung und Mapping', () => {
  for (const c of CASES) {
    it(`erkennt ${c.id} und mappt die Netflix-Buchung korrekt`, () => {
      const result = parseStatementText(loadFixture(c.file))
      expect(result.profile?.id).toBe(c.id)
      expect(result.transactions.length).toBeGreaterThanOrEqual(2)

      const nf = netflix(result.transactions)
      expect(nf, `Netflix-Buchung in ${c.file}`).toBeDefined()
      expect(nf!.amount).toBeCloseTo(-12.99, 2)
      expect(nf!.bookingDate).toBe('2025-01-03')
      expect(nf!.currency).toBe('EUR')

      if (c.hasCreditorId) {
        expect(nf!.creditorId).toBe('NL92ZZZ334088280000')
      }
    })
  }

  it('liefert profile=null bei unbekanntem Format', () => {
    const result = parseStatementText('foo,bar,baz\n1,2,3')
    expect(result.profile).toBeNull()
    expect(result.transactions).toHaveLength(0)
  })

  it('verarbeitet Semikolon im quotierten Verwendungszweck (Sparkasse)', () => {
    const result = parseStatementText(loadFixture('sparkasse.csv'))
    const nf = netflix(result.transactions)
    expect(nf!.purpose).toContain('Abonnement Januar')
  })

  it('erkennt Gehalt als Gutschrift (positiver Betrag)', () => {
    const result = parseStatementText(loadFixture('sparkasse.csv'))
    const salary = result.transactions.find((t) => t.purpose.includes('Gehalt'))
    expect(salary!.amount).toBe(2800)
  })
})

describe('parseFile – End-to-End inkl. Encoding', () => {
  it('dekodiert eine Latin-1-Datei korrekt (Umlaute bleiben erhalten)', async () => {
    const utf8 = loadFixture('sparkasse.csv')
    // Fixture als ISO-8859-1/Latin-1 kodieren (so liefern echte Sparkassen-Exporte)
    const latin1Bytes = new Uint8Array(Buffer.from(utf8, 'latin1'))
    const file = new File([latin1Bytes], 'sparkasse.csv', { type: 'text/csv' })

    const result = await parseFile(file)
    expect(result.profile?.id).toBe('sparkasse')
    expect(result.encoding).toBe('windows-1252')

    const strom = result.transactions.find((t) => t.counterparty.includes('Stadtwerke'))
    expect(strom!.counterparty).toBe('Stadtwerke Lüneburg GmbH')
  })
})
