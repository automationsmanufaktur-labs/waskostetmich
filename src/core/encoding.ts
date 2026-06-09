/**
 * Encoding-Erkennung für deutsche Bank-CSVs.
 *
 * Hintergrund (Recherche): Sparkasse, ING und das ALTE DKB-Banking liefern
 * ISO-8859-1 / Windows-1252, nur das NEUE DKB-Banking (ab ~2023) UTF-8 mit BOM.
 * Naives UTF-8-Lesen einer Latin-1-Datei macht aus "ü" ein "�" oder "Ã¼".
 *
 * Strategie:
 *   1. BOM prüfen (UTF-8 / UTF-16) → eindeutig.
 *   2. Strikten UTF-8-Decode versuchen → wenn gültig, ist es UTF-8.
 *   3. Sonst auf Windows-1252 (Superset von ISO-8859-1) zurückfallen.
 */

export interface DecodeResult {
  text: string
  encoding: 'utf-8' | 'utf-8-bom' | 'utf-16le' | 'windows-1252'
}

export function decodeBuffer(buffer: ArrayBuffer | Uint8Array): DecodeResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

  // UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const text = new TextDecoder('utf-8').decode(bytes.subarray(3))
    return { text: stripBom(text), encoding: 'utf-8-bom' }
  }

  // UTF-16 LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const text = new TextDecoder('utf-16le').decode(bytes.subarray(2))
    return { text: stripBom(text), encoding: 'utf-16le' }
  }

  // Versuch: striktes UTF-8 (wirft bei ungültigen Bytefolgen)
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { text: stripBom(text), encoding: 'utf-8' }
  } catch {
    // Fallback: Windows-1252 (deckt ISO-8859-1 + €-Zeichen etc. ab).
    // Eigener Decoder, weil Node und Browser den 0x80–0x9F-Block (u.a. €)
    // unterschiedlich behandeln – so ist das Verhalten überall identisch.
    return { text: stripBom(decodeWindows1252(bytes)), encoding: 'windows-1252' }
  }
}

// Sonderzeichen des Windows-1252-Blocks 0x80–0x9F (Rest = ISO-8859-1-identisch).
const CP1252_C1: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
}

function decodeWindows1252(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) {
    if (b < 0x80 || b >= 0xa0) out += String.fromCharCode(b)
    else out += String.fromCharCode(CP1252_C1[b] ?? b)
  }
  return out
}

/** Entfernt ein evtl. übrig gebliebenes BOM-Zeichen am Stringanfang. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}
