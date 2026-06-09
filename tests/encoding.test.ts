import { describe, it, expect } from 'vitest'
import { decodeBuffer } from '../src/core/encoding.ts'

describe('decodeBuffer', () => {
  it('dekodiert gültiges UTF-8', () => {
    const bytes = new TextEncoder().encode('Müller;Café')
    const res = decodeBuffer(bytes)
    expect(res.text).toBe('Müller;Café')
    expect(res.encoding).toBe('utf-8')
  })

  it('erkennt und entfernt UTF-8-BOM (neues DKB-Banking)', () => {
    const body = new TextEncoder().encode('Buchungsdatum;Betrag')
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...body])
    const res = decodeBuffer(withBom)
    expect(res.encoding).toBe('utf-8-bom')
    // BOM darf nicht mehr am ersten Header kleben
    expect(res.text.startsWith('Buchungsdatum')).toBe(true)
  })

  it('fällt bei Latin-1/Windows-1252 korrekt zurück (Sparkasse/ING)', () => {
    // "Müller" in ISO-8859-1: ü = 0xFC (ungültiges UTF-8 -> Fallback)
    const latin1 = new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72])
    const res = decodeBuffer(latin1)
    expect(res.text).toBe('Müller')
    expect(res.encoding).toBe('windows-1252')
  })

  it('dekodiert das €-Zeichen aus Windows-1252 (0x80)', () => {
    // "9,99 €" mit € als 0x80 (Windows-1252), restliche Bytes ASCII
    const bytes = new Uint8Array([0x39, 0x2c, 0x39, 0x39, 0x20, 0x80])
    const res = decodeBuffer(bytes)
    expect(res.text).toBe('9,99 €')
  })

  it('erkennt UTF-16LE per BOM', () => {
    const utf16 = new Uint8Array([0xff, 0xfe, 0x48, 0x00, 0x69, 0x00])
    const res = decodeBuffer(utf16)
    expect(res.text).toBe('Hi')
    expect(res.encoding).toBe('utf-16le')
  })
})
