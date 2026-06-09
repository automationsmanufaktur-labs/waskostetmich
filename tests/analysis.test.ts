import { describe, it, expect } from 'vitest'
import { parseStatementText } from '../src/core/parse.ts'
import { detectRecurring } from '../src/detect/detect.ts'
import { buildAnalysis } from '../src/cli/analysis.ts'
import { buildDemoCsv } from '../src/ui/demo-data.ts'

const parsed = parseStatementText(buildDemoCsv())
const result = detectRecurring(parsed.transactions)

describe('buildAnalysis', () => {
  it('bildet jede Gruppe auf einen Abo-Eintrag ab', () => {
    const a = buildAnalysis(result, parsed)
    expect(a.abos).toHaveLength(result.count)
    expect(a.zusammenfassung.anzahlAbos).toBe(result.count)
    expect(a.meta.bank).toContain('Sparkasse')
  })

  it('enthält Status und Preiserhöhung in LLM-freundlicher Form', () => {
    const a = buildAnalysis(result, parsed)
    for (const sub of a.abos) {
      expect(['aktiv', 'eingeschlafen']).toContain(sub.status)
      expect(sub.jaehrlich).toBeGreaterThan(0)
    }
    const netflix = a.abos.find((s) => s.name.includes('Netflix'))
    expect(netflix?.preiserhoehung).toBeDefined()
    expect(netflix?.preiserhoehung?.von).toBe(12.99)
    expect(netflix?.preiserhoehung?.auf).toBe(13.99)
  })

  it('pseudonymisiert Anbieter mit --redact', () => {
    const a = buildAnalysis(result, parsed, { redact: true })
    expect(a.abos[0].name).toBe('Anbieter A')
    expect(a.abos[1].name).toBe('Anbieter B')
    // keine echten Anbieternamen mehr enthalten
    expect(a.abos.every((s) => /^Anbieter [A-Z]+$/.test(s.name))).toBe(true)
  })

  it('beträge der Zusammenfassung sind konsistent', () => {
    const a = buildAnalysis(result, parsed)
    expect(a.zusammenfassung.wiederkehrendJaehrlich).toBeCloseTo(
      a.zusammenfassung.wiederkehrendMonatlich * 12,
      1,
    )
  })
})
