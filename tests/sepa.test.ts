import { describe, it, expect } from 'vitest'
import { extractCreditorId, extractMandateRef } from '../src/core/sepa.ts'

describe('extractCreditorId', () => {
  it('findet beschriftete Gläubiger-ID', () => {
    expect(extractCreditorId('... Gläubiger-ID: DE98ZZZ09999999999 ...')).toBe(
      'DE98ZZZ09999999999',
    )
    expect(extractCreditorId('CRED DE98ZZZ09999999999')).toBe('DE98ZZZ09999999999')
  })

  it('findet unbeschriftete ID mit ZZZ-Geschäftsbereich', () => {
    expect(extractCreditorId('Zahlung NL92ZZZ334088280000 Netflix')).toBe(
      'NL92ZZZ334088280000',
    )
  })

  it('findet die ae-Schreibweise "Glaeubiger"', () => {
    expect(extractCreditorId('Glaeubiger ID DE98ZZZ09999999999')).toBe('DE98ZZZ09999999999')
  })

  it('extrahiert KEINE ausländische IBAN als Gläubiger-ID', () => {
    expect(extractCreditorId('Ueberweisung an NL91ABNA0417164300')).toBeUndefined()
    expect(extractCreditorId('Zahlung AT611904300234573201')).toBeUndefined()
  })

  it('liefert undefined ohne Treffer', () => {
    expect(extractCreditorId('REWE SAGT DANKE')).toBeUndefined()
    expect(extractCreditorId(undefined, '')).toBeUndefined()
  })
})

describe('extractMandateRef', () => {
  it('findet Mandatsreferenz', () => {
    expect(extractMandateRef('Mandatsreferenz: NFLX-4471')).toBe('NFLX-4471')
    expect(extractMandateRef('MREF ABC123')).toBe('ABC123')
  })

  it('findet die Abkürzung "Mandatsref" ohne Label-Müll', () => {
    expect(extractMandateRef('Mandatsref: ABC123')).toBe('ABC123')
    expect(extractMandateRef('Mandatsref ABC123')).toBe('ABC123')
    expect(extractMandateRef('Mandatsref.XYZ-1')).toBe('XYZ-1')
  })

  it('liefert undefined ohne Treffer', () => {
    expect(extractMandateRef('nur text')).toBeUndefined()
  })
})
