/**
 * Extrahiert SEPA-Referenzen (Gläubiger-ID, Mandatsreferenz) aus Freitext.
 *
 * Manche Banken (Sparkasse, DKB) liefern diese in eigenen CSV-Spalten – dann
 * werden sie direkt gemappt. Andere (oft ING/Commerzbank) packen sie in den
 * Verwendungszweck ("... Mandatsref: ABC123 Gläubiger-ID: DE98ZZZ...").
 * Diese Funktion holt sie aus solchem Freitext heraus.
 *
 * Die Gläubiger-ID (Creditor Identifier) ist kontounabhängig stabil und damit
 * der beste Schlüssel, um Buchungen desselben Anbieters zu gruppieren –
 * auch wenn sich Name oder Verwendungszweck ändern (Quelle: Bundesbank/EPC).
 */

// Deutsche Gläubiger-ID: 2 Länderbuchstaben + 2 Prüfziffern + 3-stelliger
// Geschäftsbereichscode + nationaler Teil. DE-Form ist 18 Zeichen.
const CREDITOR_ID_RE =
  /\b([A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z0-9]{10,28})\b/

const CREDITOR_ID_LABELED_RE =
  /(?:gl(?:ae|[aä])ubiger[-\s]?id|gl\.?[-\s]?id|creditor[-\s]?id|\bcred\b)[:\s]*([A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z0-9]{10,28})/i

// Verlangt einen Trenner ([.:\s+]) zwischen Label und Referenz, damit nicht der
// Rest des Labels (z.B. das "ref" aus "Mandatsref") mitgelesen wird. Deckt die
// häufige Abkürzung "Mandatsref"/"Mandatsref." mit ab.
const MANDATE_RE =
  /(?:mandat(?:s)?(?:[-\s]?ref(?:erenz|erence)?\.?)?|mandate[-\s]?ref(?:erence)?|\bmref\b)[.:\s+]+([A-Za-z0-9._\-/]{2,35})/i

export function extractCreditorId(...texts: (string | undefined)[]): string | undefined {
  const haystack = texts.filter(Boolean).join(' ')
  if (!haystack) return undefined

  const labeled = haystack.match(CREDITOR_ID_LABELED_RE)
  if (labeled) return labeled[1].toUpperCase()

  // Unbeschriftet: nur akzeptieren, wenn der Geschäftsbereichscode "ZZZ" an
  // Position 5–7 steht (Standard echter Gläubiger-IDs). Reines Längen-Fenster
  // würde sonst ausländische IBANs (NL=18, AT=20 Zeichen) fälschlich als
  // Gläubiger-ID extrahieren und Buchungen falsch gruppieren.
  const matches = haystack.match(new RegExp(CREDITOR_ID_RE, 'g'))
  if (matches) {
    for (const m of matches) {
      const upper = m.toUpperCase()
      if (/^[A-Z]{2}\d{2}ZZZ/.test(upper)) return upper
    }
  }
  return undefined
}

export function extractMandateRef(...texts: (string | undefined)[]): string | undefined {
  const haystack = texts.filter(Boolean).join(' ')
  if (!haystack) return undefined
  const m = haystack.match(MANDATE_RE)
  return m ? m[1].trim() : undefined
}
