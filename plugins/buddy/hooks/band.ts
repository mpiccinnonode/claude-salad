// How the band fits its buddies into `bodyColumns` × `maxRows`: as many as fit beside the bubble or above it, the one talking always among them, else one line.
export type Layout = { shape: 'side' | 'stack' | 'bare'; count: number }

export const SPRITE = { columns: 13, rows: 5 }
// Measured live: the it button row with its hotkeys (`1: coccola … 4: stat`) + padding + border, and `[ × ]`.
const BUBBLE = { columns: 42, rows: 5 } // ponytail: assumes a one-line quip; a long one wraps and the band may scroll a row or two
const HIDE = 5

export function layoutFor(columns: number, rows: number, n: number): Layout {
  for (let count = n; count > 0; count--) {
    const pointer = count > 1 ? 1 : 0
    const tries = [
      { shape: 'side' as const, columns: count * SPRITE.columns + BUBBLE.columns + HIDE, rows: Math.max(SPRITE.rows + pointer, BUBBLE.rows) },
      { shape: 'stack' as const, columns: Math.max(count * SPRITE.columns + HIDE, BUBBLE.columns), rows: SPRITE.rows + pointer + BUBBLE.rows },
    ]
    const fit = tries.find(t => t.columns <= columns && t.rows <= rows)
    if (fit) return { shape: fit.shape, count }
  }
  return { shape: 'bare', count: 1 }
}

// The `count` buddies on screen: the page of the crew holding the one talking.
export function windowOf(n: number, count: number, at: number): number[] {
  const start = Math.min(Math.floor(at / count) * count, n - count)
  return Array.from({ length: count }, (_, i) => start + i)
}
