/** Kleine Statistik-Helfer ohne externe Abhängigkeiten. */

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(variance)
}

export function min(xs: number[]): number {
  return xs.reduce((a, b) => (b < a ? b : a), xs[0] ?? 0)
}

export function max(xs: number[]): number {
  return xs.reduce((a, b) => (b > a ? b : a), xs[0] ?? 0)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
