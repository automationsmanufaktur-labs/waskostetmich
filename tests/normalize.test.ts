import { describe, it, expect } from 'vitest'
import { merchantKey, tokenSetSimilarity } from '../src/detect/normalize.ts'

describe('merchantKey', () => {
  it('entfernt PayPal-Präfix und Referenznummern', () => {
    expect(merchantKey('PayPal *NETFLIX 35314369001', '')).toBe('netflix')
  })

  it('entfernt SEPA-Lastschrift-Präfix', () => {
    expect(merchantKey('SEPA-LASTSCHRIFT Netflix', 'Netflix Abo')).toBe('netflix')
  })

  it('entfernt Datumsangaben', () => {
    expect(merchantKey('Spotify 03.01.2025', '')).toBe('spotify')
  })

  it('nutzt Verwendungszweck, wenn Gegenpartei leer', () => {
    expect(merchantKey('', 'Mitgliedsbeitrag Studio')).toContain('mitgliedsbeitrag')
  })
})

describe('tokenSetSimilarity', () => {
  it('ist 1 bei gleicher Tokenmenge (reihenfolge-invariant)', () => {
    expect(tokenSetSimilarity('telekom deutschland gmbh', 'deutschland gmbh telekom')).toBe(1)
  })

  it('ist hoch bei Namensvarianten desselben Anbieters', () => {
    expect(
      tokenSetSimilarity('stadtwerke lueneburg gmbh', 'stadtwerke lueneburg'),
    ).toBeGreaterThan(0.7)
  })

  it('ist niedrig bei verschiedenen Anbietern', () => {
    expect(tokenSetSimilarity('netflix', 'spotify')).toBeLessThan(0.4)
  })

  it('ist 0 bei leerem Input', () => {
    expect(tokenSetSimilarity('', 'netflix')).toBe(0)
  })
})
