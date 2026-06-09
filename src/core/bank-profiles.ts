import type { DateStyle, DecimalStyle } from './de-format.ts'

/**
 * Bank-Profile für deutsche Privatkunden-CSV-Exporte.
 *
 * Inspiriert von taxhacker-de (MIT), aber bewusst robuster:
 *  - Header wird über bekannte Spaltennamen GEFUNDEN (kein festes skipRows),
 *    überlebt also unterschiedliche Vorspann-Längen und Format-Updates.
 *  - Mehrere Alias-Spaltennamen pro Feld (z.B. "Betrag (€)" vs "Betrag (EUR)").
 *  - Encoding wird separat heuristisch erkannt (siehe encoding.ts).
 *
 * Stand der Formate laut Recherche (2026):
 *  - ING liefert EINEN signierten Betrag (kein getrenntes Soll/Haben mehr).
 *  - DKB hat zwei Generationen (alt: "Buchungstag"; neu ab ~2023: "Buchungsdatum"
 *    + Gender-Spalten + UTF-8-BOM).
 */

export interface ColumnMap {
  bookingDate: string[]
  valueDate?: string[]
  /** signierte Einzel-Betragsspalte */
  amount?: string[]
  /** für split-Style: getrennte Soll-/Haben-Spalten */
  debit?: string[]
  credit?: string[]
  counterparty: string[]
  purpose: string[]
  bookingText?: string[]
  creditorId?: string[]
  mandateRef?: string[]
  counterpartyIban?: string[]
  currency?: string[]
}

export interface BankProfile {
  id: string
  name: string
  delimiter: string
  /** Die Header-Zeile ist die erste Zeile, die ALLE diese Spaltennamen enthält. */
  headerSignature: string[]
  columns: ColumnMap
  dateStyle: DateStyle
  decimalStyle: DecimalStyle
  amountStyle: 'signed' | 'split'
}

/** Normalisiert einen Spaltennamen für robusten Vergleich. */
export function normalizeHeader(h: string): string {
  return h
    .replace(/^﻿/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export const BANK_PROFILES: BankProfile[] = [
  {
    id: 'sparkasse',
    name: 'Sparkasse (CSV-CAMT)',
    delimiter: ';',
    headerSignature: ['auftragskonto', 'buchungstag', 'valutadatum'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchungstag'],
      valueDate: ['Valutadatum'],
      amount: ['Betrag'],
      counterparty: ['Beguenstigter/Zahlungspflichtiger', 'Begünstigter/Zahlungspflichtiger'],
      purpose: ['Verwendungszweck'],
      bookingText: ['Buchungstext'],
      creditorId: ['Glaeubiger ID', 'Gläubiger ID', 'Gläubiger-ID', 'Glaeubiger-ID'],
      mandateRef: ['Mandatsreferenz'],
      counterpartyIban: ['Kontonummer/IBAN', 'Kontonummer / IBAN'],
      currency: ['Waehrung', 'Währung'],
    },
  },
  {
    id: 'dkb-neu',
    name: 'DKB (ab 2023)',
    delimiter: ';',
    headerSignature: ['buchungsdatum', 'zahlungsempfänger*in'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchungsdatum'],
      valueDate: ['Wertstellung'],
      amount: ['Betrag (€)', 'Betrag (EUR)'],
      counterparty: ['Zahlungsempfänger*in', 'Zahlungspflichtige*r'],
      purpose: ['Verwendungszweck'],
      bookingText: ['Umsatztyp', 'Status'],
      creditorId: ['Gläubiger-ID', 'Gläubiger-ID '],
      mandateRef: ['Mandatsreferenz'],
      counterpartyIban: ['IBAN'],
    },
  },
  {
    id: 'dkb-alt',
    name: 'DKB (altes Banking)',
    delimiter: ';',
    headerSignature: ['buchungstag', 'auftraggeber / begünstigter'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchungstag'],
      valueDate: ['Wertstellung'],
      amount: ['Betrag (EUR)', 'Betrag (€)'],
      counterparty: ['Auftraggeber / Begünstigter'],
      purpose: ['Verwendungszweck'],
      bookingText: ['Buchungstext'],
      creditorId: ['Gläubiger-ID'],
      mandateRef: ['Mandatsreferenz'],
      counterpartyIban: ['Kontonummer'],
    },
  },
  {
    id: 'ing',
    name: 'ING',
    delimiter: ';',
    headerSignature: ['buchung', 'auftraggeber/empfänger', 'verwendungszweck'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchung'],
      valueDate: ['Valuta'],
      amount: ['Betrag'],
      counterparty: ['Auftraggeber/Empfänger'],
      purpose: ['Verwendungszweck'],
      bookingText: ['Buchungstext'],
      currency: ['Währung'],
    },
  },
  {
    id: 'commerzbank',
    name: 'Commerzbank',
    delimiter: ';',
    headerSignature: ['buchungstag', 'umsatzart', 'betrag'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchungstag'],
      valueDate: ['Wertstellung'],
      amount: ['Betrag'],
      counterparty: ['Auftraggeber / Begünstigter', 'Begünstigter / Auftraggeber'],
      purpose: ['Buchungstext'],
      bookingText: ['Umsatzart'],
      currency: ['Währung'],
      counterpartyIban: ['Kontonummer / IBAN', 'IBAN'],
    },
  },
  {
    id: 'volksbank',
    name: 'Volksbank/Raiffeisenbank',
    delimiter: ';',
    headerSignature: ['buchungstag', 'vorgang/verwendungszweck', 'umsatz'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchungstag'],
      valueDate: ['Valutadatum'],
      amount: ['Umsatz', 'Betrag'],
      counterparty: ['Name Zahlungsbeteiligter', 'Empfänger/Zahlungspflichtiger'],
      purpose: ['Vorgang/Verwendungszweck'],
      bookingText: ['Buchungstext'],
      counterpartyIban: ['IBAN Zahlungsbeteiligter'],
      currency: ['Währung', 'Waehrung'],
    },
  },
  {
    id: 'n26',
    name: 'N26',
    delimiter: ',',
    headerSignature: ['amount (eur)', 'payment reference'],
    dateStyle: 'iso',
    decimalStyle: 'en',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Booking Date', 'Date'],
      valueDate: ['Value Date'],
      amount: ['Amount (EUR)'],
      counterparty: ['Partner Name', 'Payee'],
      purpose: ['Payment Reference', 'Payment reference'],
      bookingText: ['Type', 'Transaction type'],
      counterpartyIban: ['Partner Iban'],
    },
  },
  {
    id: 'comdirect',
    name: 'comdirect',
    delimiter: ';',
    headerSignature: ['buchungstag', 'umsatz in eur'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchungstag'],
      valueDate: ['Wertstellung (Valuta)'],
      amount: ['Umsatz in EUR'],
      counterparty: ['Auftraggeber / Begünstigter'],
      purpose: ['Buchungstext'],
      bookingText: ['Vorgang'],
    },
  },
  {
    id: 'postbank',
    name: 'Postbank',
    delimiter: ';',
    headerSignature: ['buchungsdatum', 'buchungsdetails'],
    dateStyle: 'de',
    decimalStyle: 'de',
    amountStyle: 'signed',
    columns: {
      bookingDate: ['Buchungsdatum'],
      valueDate: ['Wertstellung'],
      amount: ['Betrag (€)', 'Betrag'],
      counterparty: ['Empfänger', 'Auftraggeber'],
      purpose: ['Buchungsdetails', 'Verwendungszweck'],
      bookingText: ['Umsatzart'],
    },
  },
]
