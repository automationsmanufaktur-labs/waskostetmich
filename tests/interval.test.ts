import { describe, it, expect } from 'vitest'
import { classifyFrequency, paymentsPerYear } from '../src/detect/interval.ts'

describe('classifyFrequency', () => {
  it('klassifiziert gängige Intervalle', () => {
    expect(classifyFrequency(7)).toBe('weekly')
    expect(classifyFrequency(14)).toBe('biweekly')
    expect(classifyFrequency(30)).toBe('monthly')
    expect(classifyFrequency(31)).toBe('monthly')
    expect(classifyFrequency(91)).toBe('quarterly')
    expect(classifyFrequency(182)).toBe('semiannual')
    expect(classifyFrequency(365)).toBe('yearly')
  })

  it('toleriert Wochenend-/Feiertags-Shift bei monatlich (±5 Tage)', () => {
    expect(classifyFrequency(28)).toBe('monthly')
    expect(classifyFrequency(33)).toBe('monthly')
  })

  it('liefert irregular außerhalb der Fenster', () => {
    expect(classifyFrequency(20)).toBe('irregular')
    expect(classifyFrequency(45)).toBe('irregular')
  })
})

describe('paymentsPerYear', () => {
  it('liefert korrekte Jahres-Häufigkeit', () => {
    expect(paymentsPerYear('monthly', 30)).toBe(12)
    expect(paymentsPerYear('yearly', 365)).toBe(1)
    expect(paymentsPerYear('quarterly', 91)).toBe(4)
  })

  it('rechnet irregular aus dem Median hoch', () => {
    expect(paymentsPerYear('irregular', 45)).toBeCloseTo(365.25 / 45, 1)
  })
})
