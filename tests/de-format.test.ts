import { describe, it, expect } from 'vitest'
import { parseAmount, parseDate, daysBetween } from '../src/core/de-format.ts'

describe('parseAmount', () => {
  it('parst deutsches Format mit Tausenderpunkt und Dezimalkomma', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('12,99')).toBe(12.99)
    expect(parseAmount('2.800,00')).toBe(2800)
  })

  it('behandelt Vorzeichen', () => {
    expect(parseAmount('-12,99')).toBe(-12.99)
    expect(parseAmount('+9,99')).toBe(9.99)
  })

  it('behandelt Soll/Haben-Suffix', () => {
    expect(parseAmount('12,99 S')).toBe(-12.99)
    expect(parseAmount('12,99 H')).toBe(12.99)
  })

  it('entfernt Währungssymbole', () => {
    expect(parseAmount('1.234,56 €')).toBe(1234.56)
  })

  it('parst englisches Format (N26)', () => {
    expect(parseAmount('1,234.56', 'en')).toBe(1234.56)
    expect(parseAmount('-12.99', 'en')).toBe(-12.99)
  })

  it('liefert NaN bei leerem Input', () => {
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount('   ')).toBeNaN()
  })
})

describe('parseDate', () => {
  it('parst DD.MM.YYYY', () => {
    expect(parseDate('31.12.2025')).toBe('2025-12-31')
    expect(parseDate('03.01.2025')).toBe('2025-01-03')
  })

  it('parst DD.MM.YY mit Pivot (<=69 -> 20xx, sonst 19xx)', () => {
    expect(parseDate('03.01.25')).toBe('2025-01-03')
    expect(parseDate('31.12.69')).toBe('2069-12-31')
    expect(parseDate('01.01.70')).toBe('1970-01-01')
  })

  it('parst ISO', () => {
    expect(parseDate('2025-12-31', 'iso')).toBe('2025-12-31')
  })

  it('lehnt ungültige Daten ab', () => {
    expect(parseDate('99.99.2025')).toBeNull()
    expect(parseDate('kein datum')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})

describe('daysBetween', () => {
  it('berechnet Tagesabstand', () => {
    expect(daysBetween('2025-01-01', '2025-01-31')).toBe(30)
    expect(daysBetween('2025-01-03', '2025-02-03')).toBe(31)
    expect(daysBetween('2025-01-01', '2026-01-01')).toBe(365)
  })
})
