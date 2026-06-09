/**
 * Parser für deutsche (und N26-englische) Zahlen- und Datumsformate.
 * Abgeleitet von taxhacker-de (MIT), erweitert um robustere Vorzeichen-,
 * Suffix- (S/H) und 2-/4-stellige-Jahr-Behandlung.
 */

export type DecimalStyle = 'de' | 'en'
export type DateStyle = 'de' | 'iso'

/**
 * Parst einen Geldbetrag in eine vorzeichenbehaftete Zahl.
 *   "1.234,56"    -> 1234.56   (de)
 *   "-1.234,56"   -> -1234.56
 *   "1.234,56 S"  -> -1234.56  (Soll-Suffix)
 *   "1.234,56 H"  -> 1234.56   (Haben-Suffix)
 *   "1,234.56"    -> 1234.56   (en)
 * Liefert NaN bei leerem/ungültigem Input (Aufrufer entscheidet, was das heißt).
 */
export function parseAmount(value: string, style: DecimalStyle = 'de'): number {
  if (value == null) return NaN
  let s = value.trim()
  if (s === '') return NaN

  // Soll/Haben-Suffix (manche Banken hängen " S" / " H" an)
  let sign = 1
  const suffix = s.match(/\s*([SH])\s*$/i)
  if (suffix) {
    sign = suffix[1].toUpperCase() === 'S' ? -1 : 1
    s = s.slice(0, suffix.index).trim()
  }

  // führendes Vorzeichen
  if (s.startsWith('-')) {
    sign *= -1
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }

  // Währungssymbole und Leerzeichen entfernen
  s = s.replace(/[€$£\s]/g, '')

  if (style === 'de') {
    // Tausenderpunkt weg, Dezimalkomma -> Punkt
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    // en: Tausenderkomma weg, Punkt bleibt Dezimaltrenner
    s = s.replace(/,/g, '')
  }

  const n = parseFloat(s)
  if (!Number.isFinite(n)) return NaN
  return sign * n
}

/**
 * Parst ein Datum in ISO YYYY-MM-DD.
 *   "31.12.25"   -> "2025-12-31"  (de, 2-stelliges Jahr mit Pivot)
 *   "31.12.2025" -> "2025-12-31"  (de)
 *   "2025-12-31" -> "2025-12-31"  (iso)
 * Liefert null bei nicht parsebarem Input.
 *
 * Pivot für 2-stellige Jahre: 00–69 -> 20xx, 70–99 -> 19xx.
 */
export function parseDate(value: string, style: DateStyle = 'de'): string | null {
  if (!value) return null
  const s = value.trim()

  if (style === 'iso') {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    // manche ISO-Exporte enthalten trotzdem DD.MM. – als Fallback de versuchen
  }

  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    let year = m[3]
    if (year.length === 2) {
      year = parseInt(year, 10) <= 69 ? `20${year}` : `19${year}`
    }
    if (!isValidYmd(+year, +month, +day)) return null
    return `${year}-${month}-${day}`
  }

  // letzter Versuch: ISO auch ohne expliziten iso-Style
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  return null
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  if (y < 1900 || y > 2100) return false
  return true
}

/** Tagesdifferenz zwischen zwei ISO-Daten (b - a) in ganzen Tagen. */
export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a + 'T00:00:00Z')
  const tb = Date.parse(b + 'T00:00:00Z')
  return Math.round((tb - ta) / 86_400_000)
}
