import './style.css'
import { parseFile, parseStatementText, type ParseResult } from './core/parse.ts'
import { detectRecurring } from './detect/detect.ts'
import { renderResults } from './ui/render.ts'
import { buildDemoCsv } from './ui/demo-data.ts'

const dropzone = document.getElementById('dropzone') as HTMLElement
const fileInput = document.getElementById('file-input') as HTMLInputElement
const demoBtn = document.getElementById('demo-btn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLElement
const resultsEl = document.getElementById('results') as HTMLElement
const offlineBadge = document.getElementById('offline-badge') as HTMLElement

function showStatus(message: string, detail?: string, isError = false): void {
  statusEl.hidden = false
  statusEl.className = isError ? 'status error' : 'status'
  statusEl.replaceChildren()
  statusEl.append(document.createTextNode(message))
  if (detail) {
    const span = document.createElement('span')
    span.className = 'status-detail'
    span.textContent = detail
    statusEl.append(span)
  }
}

function handleResult(parse: ParseResult): void {
  if (!parse.profile) {
    resultsEl.replaceChildren()
    showStatus(
      'Dieses CSV-Format konnte nicht erkannt werden.',
      'Unterstützt werden CSV-Exporte von Sparkasse, DKB, ING, Commerzbank, Volksbank, N26, comdirect und Postbank. Prüfe, ob du die richtige Datei (Umsätze als CSV) exportiert hast.',
      true,
    )
    return
  }

  const result = detectRecurring(parse.transactions)
  const skipped = parse.rowsSkipped > 0 ? `, ${parse.rowsSkipped} Zeilen übersprungen` : ''
  showStatus(
    `${parse.profile.name} erkannt – ${parse.transactions.length} Buchungen gelesen${skipped}.`,
    'Alles lokal verarbeitet. Es wurden keine Daten gesendet.',
  )
  renderResults(resultsEl, result, parse)
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

async function handleFile(file: File): Promise<void> {
  showStatus('Lese Datei lokal in deinem Browser …')
  try {
    const parse = await parseFile(file)
    handleResult(parse)
  } catch (err) {
    showStatus(
      'Die Datei konnte nicht gelesen werden.',
      err instanceof Error ? err.message : String(err),
      true,
    )
  }
}

// --- Datei-Auswahl ---
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) void handleFile(file)
})

dropzone.addEventListener('click', () => fileInput.click())
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fileInput.click()
  }
})

// --- Drag & Drop ---
;['dragenter', 'dragover'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault()
    dropzone.classList.add('dragover')
  }),
)
;['dragleave', 'dragend', 'drop'].forEach((evt) =>
  dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover')),
)
dropzone.addEventListener('drop', (e) => {
  e.preventDefault()
  const file = (e as DragEvent).dataTransfer?.files?.[0]
  if (file) void handleFile(file)
})

// --- Demo ---
demoBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  showStatus('Beispiel-Daten werden analysiert …')
  const parse = parseStatementText(buildDemoCsv())
  handleResult(parse)
})

// --- Offline-Status (rein informativ, kein Request) ---
function updateOnline(): void {
  offlineBadge.classList.toggle('is-offline', !navigator.onLine)
}
window.addEventListener('online', updateOnline)
window.addEventListener('offline', updateOnline)
updateOnline()
