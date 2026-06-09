#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { decodeBuffer } from './core/encoding.ts'
import { parseStatementText } from './core/parse.ts'
import { detectRecurring } from './detect/detect.ts'
import { buildAnalysis } from './cli/analysis.ts'
import { formatReport } from './cli/report.ts'

const HELP = `WasKostetMich — Abos & wiederkehrende Abbuchungen aus einem Kontoauszug.

Verwendung:
  waskostetmich <kontoauszug.csv> [Optionen]

Optionen:
  --json      Strukturierte Analyse als JSON ausgeben (für Weiterverarbeitung/Claude).
  --redact    Anbieternamen pseudonymisieren (Anbieter A/B/C). Sinnvoll mit --json,
              wenn die Auswertung an ein LLM geht und Namen geheim bleiben sollen.
  --help      Diese Hilfe.

Alles läuft lokal. Es werden keine Daten gesendet.`

function main(): number {
  const args = process.argv.slice(2)
  const flags = new Set(args.filter((a) => a.startsWith('--')))
  const positional = args.filter((a) => !a.startsWith('--'))

  if (flags.has('--help') || positional.length === 0) {
    console.log(HELP)
    return positional.length === 0 ? 1 : 0
  }

  const file = positional[0]
  let buffer: Buffer
  try {
    buffer = readFileSync(file)
  } catch {
    console.error(`Datei nicht lesbar: ${file}`)
    return 1
  }

  const { text } = decodeBuffer(buffer)
  const parseResult = parseStatementText(text)

  if (!parseResult.profile) {
    console.error(
      'Bank-CSV-Format nicht erkannt. Unterstützt: Sparkasse, DKB, ING, Commerzbank,\n' +
        'Volksbank, N26, comdirect, Postbank. Bitte die Umsätze als CSV exportieren.',
    )
    return 2
  }

  const result = detectRecurring(parseResult.transactions)

  if (flags.has('--json')) {
    const analysis = buildAnalysis(result, parseResult, { redact: flags.has('--redact') })
    console.log(JSON.stringify(analysis, null, 2))
  } else {
    console.log(formatReport(result, parseResult))
  }
  return 0
}

process.exit(main())
