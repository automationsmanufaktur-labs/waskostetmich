import {
  type DetectionResult,
  type RecurringGroup,
  FREQUENCY_LABELS,
} from '../core/types.ts'
import type { ParseResult } from '../core/parse.ts'
import { el, clear } from './dom.ts'
import { formatEuro, formatDate, formatPct } from './format.ts'

export function renderResults(
  container: HTMLElement,
  result: DetectionResult,
  parseInfo: ParseResult,
): void {
  clear(container)

  if (result.count === 0) {
    container.append(
      el(
        'div',
        { class: 'status' },
        'Keine wiederkehrenden Abbuchungen erkannt. Lade einen längeren Zeitraum (z. B. 12 Monate), damit auch seltene oder jährliche Abos sichtbar werden.',
      ),
    )
    return
  }

  container.append(renderSummary(result, parseInfo))

  if (result.priceIncreases.length > 0) {
    container.append(renderPriceAlert(result.priceIncreases))
  }

  const confirmed = result.groups.filter((g) => g.confidence === 'bestätigt')
  const suspected = result.groups.filter((g) => g.confidence === 'vermutet')

  if (confirmed.length) {
    container.append(el('h2', { class: 'group-section-title' }, `Bestätigte Abos (${confirmed.length})`))
    for (const g of confirmed) container.append(renderGroup(g))
  }
  if (suspected.length) {
    container.append(
      el('h2', { class: 'group-section-title' }, `Vermutete Abos (${suspected.length})`),
    )
    for (const g of suspected) container.append(renderGroup(g))
  }
}

function renderSummary(result: DetectionResult, parseInfo: ParseResult): HTMLElement {
  const bankName = parseInfo.profile?.name ?? 'Unbekannte Bank'
  const range = result.dateRange
    ? `${formatDate(result.dateRange.from)} – ${formatDate(result.dateRange.to)}`
    : ''

  return el(
    'div',
    { class: 'summary' },
    el('div', { class: 'summary-big' }, formatEuro(result.totalMonthlyAll)),
    el(
      'div',
      { class: 'summary-sub' },
      `pro Monat für ${result.count} ${result.count === 1 ? 'wiederkehrende Zahlung' : 'wiederkehrende Zahlungen'} · das sind ${formatEuro(result.totalMonthlyAll * 12)} im Jahr.`,
    ),
    el(
      'div',
      { class: 'summary-grid' },
      stat(formatEuro(result.totalMonthlyConfirmed), 'monatlich bestätigt'),
      stat(String(result.priceIncreases.length), 'Preiserhöhung(en)'),
      stat(bankName, 'erkanntes Format'),
      range ? stat(range, 'Zeitraum') : null,
    ),
  )
}

function stat(value: string, label: string): HTMLElement {
  return el('div', { class: 'summary-stat' }, el('div', { class: 'k' }, value), el('div', { class: 'l' }, label))
}

function renderPriceAlert(groups: RecurringGroup[]): HTMLElement {
  const items = groups.map((g) => {
    const pc = g.priceChange!
    return el(
      'li',
      {},
      el('strong', {}, g.label),
      `: ${formatEuro(pc.oldAmount)} → ${formatEuro(pc.newAmount)} (${formatPct(pc.pct)}) seit ${formatDate(pc.since)} – `,
      `${formatEuro(pc.annualDelta)} mehr pro Jahr.`,
    )
  })

  return el(
    'div',
    { class: 'alert' },
    el('h2', {}, '⚠ Schleichend teurer geworden'),
    el(
      'p',
      { class: 'muted' },
      'Bei diesen Abos ist der Betrag dauerhaft gestiegen. Bei unwirksamen Preiserhöhungen kann ein Sonderkündigungsrecht oder eine Rückforderung bestehen – allgemeine Infos dazu bei der Verbraucherzentrale.',
    ),
    el('ul', {}, ...items),
  )
}

function renderGroup(g: RecurringGroup): HTMLElement {
  const freq = FREQUENCY_LABELS[g.frequency]

  const meta = el(
    'div',
    { class: 'group-meta' },
    el('span', {}, `${freq} · ${g.count}×`),
    g.hasMandate ? el('span', { class: 'badge badge-mandate' }, 'SEPA-Lastschrift') : null,
    g.isVariable ? el('span', {}, `schwankt ${formatEuro(g.amountMin)}–${formatEuro(g.amountMax)}`) : null,
    el(
      'span',
      { class: `badge ${g.confidence === 'bestätigt' ? 'badge-confirmed' : 'badge-suspected'}` },
      g.confidence,
    ),
    g.status === 'eingeschlafen' ? el('span', { class: 'badge badge-suspected' }, 'eingeschlafen') : null,
    g.priceChange ? el('span', { class: 'badge badge-warn' }, 'teurer') : null,
  )

  const main = el(
    'div',
    { class: 'group-main' },
    el('p', { class: 'group-name' }, g.label),
    meta,
    g.priceChange
      ? el(
          'div',
          { class: 'group-price-note' },
          `Preis ${formatEuro(g.priceChange.oldAmount)} → ${formatEuro(g.priceChange.newAmount)} seit ${formatDate(g.priceChange.since)}`,
        )
      : null,
  )

  const amounts = el(
    'div',
    { class: 'group-amounts' },
    el('div', { class: 'group-amount' }, `${formatEuro(g.monthlyCost)}/Mon`),
    el('div', { class: 'group-amount-sub' }, `${formatEuro(g.annualCost)}/Jahr`),
  )

  return el('div', { class: 'group' }, main, amounts)
}
