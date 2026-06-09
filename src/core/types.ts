import { z } from 'zod'

/**
 * Normalisiertes Transaktionsmodell – das gemeinsame Format, in das jeder
 * Bank-Adapter seine Rohdaten überführt. Alles Weitere (Detection, UI)
 * kennt ausschließlich dieses Modell, nie das bankspezifische CSV-Layout.
 *
 * Vorzeichen-Konvention: amount < 0  = Abbuchung (Geld raus),
 *                        amount > 0  = Gutschrift (Geld rein).
 */
export const TransactionSchema = z.object({
  /** Buchungsdatum als ISO-String YYYY-MM-DD */
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'bookingDate muss ISO YYYY-MM-DD sein'),
  /** Valuta-/Wertstellungsdatum, optional */
  valueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Betrag, vorzeichenbehaftet. Negativ = Abbuchung. */
  amount: z.number().finite(),
  /** ISO-4217-Währungscode, Default EUR */
  currency: z.string().min(1).default('EUR'),
  /** Gegenpartei (Empfänger/Auftraggeber), roh wie in der CSV */
  counterparty: z.string().default(''),
  /** Verwendungszweck */
  purpose: z.string().default(''),
  /** Buchungstext / Umsatzart (z.B. "SEPA-Lastschrift") */
  bookingText: z.string().optional(),
  /** SEPA-Gläubiger-ID (z.B. DE98ZZZ09999999999) – stabilster Gruppierungs-Schlüssel */
  creditorId: z.string().optional(),
  /** SEPA-Mandatsreferenz */
  mandateRef: z.string().optional(),
  /** IBAN der Gegenpartei */
  counterpartyIban: z.string().optional(),
  /** ID des erkannten Bank-Profils, aus dem die Zeile stammt */
  source: z.string(),
  /** Original-Rohzeile (Spaltenname → Wert) für Debugging/Transparenz */
  raw: z.record(z.string(), z.string()).default({}),
})

export type Transaction = z.infer<typeof TransactionSchema>

/** Erkannte Zahlungsfrequenz */
export type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'yearly'
  | 'irregular'

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'wöchentlich',
  biweekly: '14-tägig',
  monthly: 'monatlich',
  quarterly: 'vierteljährlich',
  semiannual: 'halbjährlich',
  yearly: 'jährlich',
  irregular: 'unregelmäßig',
}

/** Vertrauensgrad einer erkannten wiederkehrenden Zahlung */
export type Confidence = 'bestätigt' | 'vermutet'

export interface PriceChange {
  /** Betrag (Absolutwert) vor der Erhöhung */
  oldAmount: number
  /** Betrag (Absolutwert) nach der Erhöhung */
  newAmount: number
  /** Relative Erhöhung, z.B. 0.15 = +15 % */
  pct: number
  /** Mehrkosten pro Monat (auf Basis der Frequenz hochgerechnet) */
  monthlyDelta: number
  /** Mehrkosten pro Jahr */
  annualDelta: number
  /** Datum, ab dem das neue Niveau gilt (ISO) */
  since: string
}

/** Eine erkannte Gruppe wiederkehrender Abbuchungen (= ein "Abo"/Vertrag) */
export interface RecurringGroup {
  /** Anzeigename (bester normalisierter Gegenpartei-Name) */
  label: string
  creditorId?: string
  /** Die einzelnen Buchungen dieser Gruppe, aufsteigend nach Datum */
  transactions: Transaction[]
  count: number
  frequency: Frequency
  /** Median der Tagesabstände */
  intervalDays: number
  /** Standardabweichung der Tagesabstände */
  intervalStdDays: number
  /** Durchschnittsbetrag (Absolutwert) */
  amountAvg: number
  amountLast: number
  amountMin: number
  amountMax: number
  /** true, wenn der Betrag spürbar schwankt (z.B. Strom/Mobilfunk) */
  isVariable: boolean
  /** Auf einen Monat hochgerechnete Kosten */
  monthlyCost: number
  /** Auf ein Jahr hochgerechnete Kosten */
  annualCost: number
  confidence: Confidence
  /** Gesetzt, wenn eine dauerhafte Preiserhöhung erkannt wurde */
  priceChange?: PriceChange
  /** true, wenn eine SEPA-Gläubiger-ID/Mandat vorliegt (= echter Lastschrift-Vertrag) */
  hasMandate: boolean
  /**
   * 'aktiv' = zuletzt im erwarteten Rhythmus gebucht.
   * 'eingeschlafen' = letzte Buchung deutlich überfällig (> ~1,75 Zyklen) –
   * evtl. bereits gekündigt, oder bei Jahresabos steht die nächste noch aus.
   */
  status: 'aktiv' | 'eingeschlafen'
  /** Tage seit der letzten Buchung (bezogen auf das Auszugsende) */
  daysSinceLast: number
  firstSeen: string
  lastSeen: string
}

export interface DetectionResult {
  groups: RecurringGroup[]
  /** Summe der monatlichen Kosten aller "bestätigten" Gruppen */
  totalMonthlyConfirmed: number
  totalAnnualConfirmed: number
  /** Summe inkl. "vermuteter" Gruppen */
  totalMonthlyAll: number
  totalAnnualAll: number
  /** Anzahl Gruppen */
  count: number
  /** Anzahl analysierter Abbuchungen */
  transactionsAnalyzed: number
  /** Gruppen mit erkannter Preiserhöhung */
  priceIncreases: RecurringGroup[]
  /** Anzahl als 'eingeschlafen' markierter Gruppen */
  dormantCount: number
  dateRange: { from: string; to: string } | null
}
