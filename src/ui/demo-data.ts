/**
 * Synthetischer Beispiel-Kontoauszug im Sparkasse-CSV-CAMT-Format.
 * Deterministisch erzeugt (keine echten Daten, keine Zufallswerte), damit der
 * "Demo laden"-Button ohne Netzwerk-Request funktioniert.
 *
 * Enthält bewusst: stabile Monats-Abos, ein variables Abo mit Mandat (Strom),
 * ein jährliches Abo, eine schleichende Preiserhöhung (Netflix), sowie
 * Fehlalarm-Köder (Gehaltseingang, variabler Supermarkt, Einmalkauf).
 */

const HEADER =
  '"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";' +
  '"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";' +
  '"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";' +
  '"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";' +
  '"Betrag";"Waehrung";"Info"'

const MONTHS: Array<[number, number]> = [
  [2025, 1], [2025, 2], [2025, 3], [2025, 4], [2025, 5], [2025, 6], [2025, 7],
  [2025, 8], [2025, 9], [2025, 10], [2025, 11], [2025, 12], [2026, 1], [2026, 2],
]

function deDate(year: number, month: number, day: number): string {
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  const yy = String(year % 100).padStart(2, '0')
  return `${dd}.${mm}.${yy}`
}

function deAmount(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function row(opts: {
  date: string
  text: string
  purpose: string
  creditorId?: string
  mandate?: string
  payee: string
  amount: number
}): string {
  const f = [
    'DE00123456789012345678',
    opts.date,
    opts.date,
    opts.text,
    opts.purpose,
    opts.creditorId ?? '',
    opts.mandate ?? '',
    '',
    '',
    '',
    '',
    opts.payee,
    'DE00500105170000000000',
    'GENODEF1XXX',
    deAmount(opts.amount),
    'EUR',
    'Umsatz gebucht',
  ]
  return f.map((v) => `"${v}"`).join(';')
}

const STROM_CYCLE = [89.0, 92.5, 95.0, 91.0]
const REWE_AMOUNTS = [
  23.45, 67.12, 41.9, 88.3, 19.99, 54.6, 72.15, 33.4, 61.8, 27.95, 49.5, 95.2, 38.7, 70.05,
  44.25, 81.6, 29.9, 58.35, 66.4, 22.1, 90.0, 36.75, 53.2, 77.85, 31.6, 69.4, 47.1, 84.95,
]

export function buildDemoCsv(): string {
  const lines: string[] = [HEADER]

  MONTHS.forEach(([y, m], i) => {
    // Netflix – schleichende Preiserhöhung ab Monat 7 (12,99 -> 13,99)
    lines.push(
      row({
        date: deDate(y, m, 3),
        text: 'FOLGELASTSCHRIFT',
        purpose: 'Netflix Abonnement Mitgliedschaft',
        creditorId: 'NL92ZZZ334088280000',
        mandate: 'NFLX-4471',
        payee: 'Netflix International B.V.',
        amount: -(i < 7 ? 12.99 : 13.99),
      }),
    )

    // Spotify – stabil
    lines.push(
      row({
        date: deDate(y, m, 5),
        text: 'FOLGELASTSCHRIFT',
        purpose: 'Spotify Premium',
        creditorId: 'LU96ZZZ0000000000000000058',
        mandate: 'SPOT-99812',
        payee: 'Spotify AB',
        amount: -9.99,
      }),
    )

    // Fitnessstudio – stabil
    lines.push(
      row({
        date: deDate(y, m, 1),
        text: 'FOLGELASTSCHRIFT',
        purpose: 'Mitgliedsbeitrag Studio',
        creditorId: 'DE98ZZZ09999999999',
        mandate: 'FITX-2024-771',
        payee: 'FitX Deutschland GmbH',
        amount: -29.9,
      }),
    )

    // Stromabschlag – variabel, aber mit Mandat (soll erkannt bleiben)
    lines.push(
      row({
        date: deDate(y, m, 15),
        text: 'FOLGELASTSCHRIFT',
        purpose: 'Abschlag Strom Kundennr 7782341',
        creditorId: 'DE00ZZZ00000123456',
        mandate: 'SWLG-STROM-7782341',
        payee: 'Stadtwerke Lueneburg GmbH',
        amount: -STROM_CYCLE[i % STROM_CYCLE.length],
      }),
    )

    // Gehalt – Gutschrift, darf NICHT als Abo erscheinen
    lines.push(
      row({
        date: deDate(y, m, 28),
        text: 'GUTSCHRIFT',
        purpose: 'Gehalt Lohn/Gehalt',
        payee: 'Beispiel Arbeitgeber GmbH',
        amount: 2800.0,
      }),
    )

    // Supermarkt – zweimal pro Monat, variabel, ohne Mandat (Fehlalarm-Köder)
    lines.push(
      row({
        date: deDate(y, m, 8),
        text: 'KARTENZAHLUNG',
        purpose: 'REWE SAGT DANKE',
        payee: 'REWE Markt GmbH',
        amount: -REWE_AMOUNTS[(i * 2) % REWE_AMOUNTS.length],
      }),
    )
    lines.push(
      row({
        date: deDate(y, m, 22),
        text: 'KARTENZAHLUNG',
        purpose: 'REWE SAGT DANKE',
        payee: 'REWE Markt GmbH',
        amount: -REWE_AMOUNTS[(i * 2 + 1) % REWE_AMOUNTS.length],
      }),
    )
  })

  // Amazon Prime – jährlich (zwei Vorkommen ~12 Monate auseinander)
  lines.push(
    row({
      date: deDate(2025, 1, 20),
      text: 'FOLGELASTSCHRIFT',
      purpose: 'Amazon Prime Mitgliedschaft',
      creditorId: 'LU28ZZZ0000000000000005700',
      mandate: 'AMZN-PRIME-55',
      payee: 'Amazon EU S.a.r.l.',
      amount: -89.9,
    }),
  )
  lines.push(
    row({
      date: deDate(2026, 1, 20),
      text: 'FOLGELASTSCHRIFT',
      purpose: 'Amazon Prime Mitgliedschaft',
      creditorId: 'LU28ZZZ0000000000000005700',
      mandate: 'AMZN-PRIME-55',
      payee: 'Amazon EU S.a.r.l.',
      amount: -89.9,
    }),
  )

  // Einmalkauf – darf NICHT als Abo erscheinen
  lines.push(
    row({
      date: deDate(2025, 4, 12),
      text: 'KARTENZAHLUNG',
      purpose: 'MediaMarkt Einkauf',
      payee: 'MediaMarkt Lueneburg',
      amount: -499.0,
    }),
  )

  return lines.join('\r\n')
}
