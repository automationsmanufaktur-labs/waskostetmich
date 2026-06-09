import type { Frequency } from '../core/types.ts'

/**
 * Klassifiziert einen Median-Tagesabstand in eine Zahlungsfrequenz.
 * Toleranzfenster aus der Recherche (BBVA/Plaid): wöchentlich eng,
 * monatlich ±5 Tage, jährlich großzügig.
 *
 * Die Lücken zwischen den Fenstern sind ABSICHTLICH: Zwischenwerte (z.B. 20 oder
 * 45 Tage) gelten als 'irregular' und werden – sofern kein SEPA-Mandat vorliegt –
 * herausgefiltert, um Fehlalarme (z.B. unregelmäßige Einkäufe) zu vermeiden.
 * Mandatierte Lastschriften bleiben über den hasMandate-Pfad unberührt.
 */
export function classifyFrequency(medianDays: number): Frequency {
  if (medianDays >= 5 && medianDays <= 9) return 'weekly'
  if (medianDays >= 12 && medianDays <= 16) return 'biweekly'
  if (medianDays >= 26 && medianDays <= 34) return 'monthly'
  if (medianDays >= 84 && medianDays <= 98) return 'quarterly'
  if (medianDays >= 170 && medianDays <= 196) return 'semiannual'
  if (medianDays >= 350 && medianDays <= 385) return 'yearly'
  return 'irregular'
}

/** Anzahl Zahlungen pro Jahr für eine gegebene Frequenz/Intervall. */
export function paymentsPerYear(frequency: Frequency, medianDays: number): number {
  switch (frequency) {
    case 'weekly':
      return 52.18
    case 'biweekly':
      return 26.09
    case 'monthly':
      return 12
    case 'quarterly':
      return 4
    case 'semiannual':
      return 2
    case 'yearly':
      return 1
    case 'irregular':
      // Fallback: aus dem tatsächlichen Median hochrechnen
      return medianDays > 0 ? 365.25 / medianDays : 0
  }
}
