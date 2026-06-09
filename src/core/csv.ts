/**
 * Minimaler, RFC-4180-naher CSV-Parser.
 *
 * Warum kein split(';')? Deutsche Bank-CSVs quoten Felder mit ", und der
 * Verwendungszweck kann Semikolons, Zeilenumbrüche und (bei DKB-Eigenbuchungen)
 * HTML enthalten. Ein naives Split zerschießt jede solche Zeile.
 *
 * Unterstützt: konfigurierbares Trennzeichen, "-Quoting mit "" als Escape,
 * Zeilenumbrüche innerhalb quotierter Felder, \r\n und \n.
 */

export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length

  while (i < n) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    // Quote nur am Feldanfang als Quote-Start werten (RFC 4180). Ein '"' mitten
    // in einem unquotierten Feld (z.B. Zoll-Angabe 'Monitor 27"') ist ein
    // Literalzeichen – sonst würde es alle Folgezeilen still verschlucken.
    if (ch === '"' && field === '') {
      inQuotes = true
      i++
      continue
    }
    if (ch === delimiter) {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\r') {
      // \r\n oder einzelnes \r als Zeilenende behandeln
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i += text[i + 1] === '\n' ? 2 : 1
      continue
    }
    if (ch === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i++
      continue
    }
    field += ch
    i++
  }

  // letzte Zeile (ohne abschließenden Umbruch)
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // komplett leere Zeilen entfernen (z.B. Trenn-Leerzeilen im Vorspann)
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** Parst genau eine Zeile (für die Header-Erkennung). */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const rows = parseCsv(line, delimiter)
  return rows[0] ?? []
}
