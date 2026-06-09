/**
 * Merchant-Normalisierung und Ähnlichkeitsmaß für die Gruppierung.
 *
 * Ziel: "PayPal *NETFLIX 35314369001", "NETFLIX INTERNATIONAL B.V.",
 * "Netflix 0123456789" sollen denselben (oder einen ähnlichen) Schlüssel ergeben.
 */

// Bekannte Zahlungs-/Lastschrift-Präfixe, die nichts zur Identität beitragen.
const NOISE_PATTERNS: RegExp[] = [
  /\bsepa[-\s]?(basis)?last(schrift)?\b/gi,
  /\bsepa[-\s]?(ü|ue)berweisung\b/gi,
  /\bsepa[-\s]?gutschrift\b/gi,
  /\blastschrift\b/gi,
  /\bdauerauftrag\b/gi,
  /\b(kartenzahlung|kartenzlg|girocard|debitk\.?)\b/gi,
  /\bvisa\b/gi,
  /\bmastercard\b/gi,
  /\bpaypal\b/gi,
  /\bpp\.\d+\.pp\b/gi,
  /\bary\b/gi,
  /\beref\b.*/gi,
  /\bmref\b.*/gi,
  /\bcred\b.*/gi,
  /\bmandat(sreferenz)?\b.*/gi,
  /\bgl(ä|ae)ubiger[-\s]?id\b.*/gi,
]

/**
 * Reduziert einen Gegenpartei-/Verwendungszweck-String auf einen stabilen Kern:
 * Präfixe, Datums-/Zeit-/Referenznummern entfernen, lowercase, Sonderzeichen weg.
 */
export function merchantKey(counterparty: string, purpose: string): string {
  // Gegenpartei ist meist aussagekräftiger als der Verwendungszweck.
  let s = (counterparty || purpose || '').toLowerCase()

  for (const re of NOISE_PATTERNS) s = s.replace(re, ' ')

  s = s
    // Datums-/Zeitstempel
    .replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, ' ')
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ')
    // lange Ziffernfolgen (Referenz-/Transaktionsnummern)
    .replace(/\d{4,}/g, ' ')
    // Datums-Codes wie 2026-06 / 202606
    .replace(/\b\d{6,8}\b/g, ' ')
    // restliche Sonderzeichen
    .replace(/[^a-z0-9äöüß ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return s
}

/** Tokenisiert und liefert ein sortiertes, dedupliziertes Token-Set. */
export function tokenSet(s: string): string[] {
  return [...new Set(s.split(' ').filter((t) => t.length > 1))].sort()
}

/** Zeichen-Bigramme eines Strings. */
function bigrams(s: string): string[] {
  const grams: string[] = []
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2))
  return grams
}

/**
 * Sørensen-Dice-Koeffizient über Bigramme der sortiert-zusammengefügten Tokens.
 * Approximiert fuzzywuzzy's token_set_ratio: 0 = verschieden, 1 = identisch.
 * Robust gegen Wortreihenfolge (Tokens werden sortiert) und Mehrwort-Namen.
 */
export function tokenSetSimilarity(a: string, b: string): number {
  const ta = tokenSet(a).join(' ')
  const tb = tokenSet(b).join(' ')
  if (ta === tb) return ta === '' ? 0 : 1
  if (ta === '' || tb === '') return 0

  const ga = bigrams(ta)
  const gb = bigrams(tb)
  if (ga.length === 0 || gb.length === 0) return 0

  const counts = new Map<string, number>()
  for (const g of ga) counts.set(g, (counts.get(g) ?? 0) + 1)

  let intersection = 0
  for (const g of gb) {
    const c = counts.get(g) ?? 0
    if (c > 0) {
      intersection++
      counts.set(g, c - 1)
    }
  }

  return (2 * intersection) / (ga.length + gb.length)
}
