const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export function formatEuro(n: number): string {
  return eur.format(n)
}

export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}.${m[2]}.${m[1]}`
}

export function formatPct(n: number): string {
  return `+${Math.round(n * 100)} %`
}
