// How the band fits its buddies into `bodyColumns` × `maxRows`: as many as fit beside the bubble or above it, the one talking always among them, else one line.
// `hasNotice`: the box of what is ready sits beside the bubble too, only where it fits without costing a buddy its place.
export type Layout = { shape: 'side' | 'stack' | 'bare'; count: number; hasNotice: boolean }

export const SPRITE = { columns: 13, rows: 5 }
// Measured live: the it button row with its hotkeys (`1: coccola … 4: stat`) + padding + border, and `[ × ]`.
const BUBBLE = { columns: 42, rows: 5 } // ponytail: assumes a one-line quip; a long one wraps and the band may scroll a row or two
const HIDE = 5
// Three lines of `★ name · /buddy evolve` between its borders, and a column of air before it.
export const NOTICE = { columns: 31, rows: 5 }

export function layoutFor(columns: number, rows: number, n: number, wantsNotice = false): Layout {
  for (let count = n; count > 0; count--) {
    const pointer = count > 1 ? 1 : 0
    const tries = (extra: number) => [
      { shape: 'side' as const, columns: count * SPRITE.columns + BUBBLE.columns + extra + HIDE, rows: Math.max(SPRITE.rows + pointer, BUBBLE.rows, extra ? NOTICE.rows : 0) },
      { shape: 'stack' as const, columns: Math.max(count * SPRITE.columns + HIDE, BUBBLE.columns + extra), rows: SPRITE.rows + pointer + Math.max(BUBBLE.rows, extra ? NOTICE.rows : 0) },
    ]
    const fits = (t: { columns: number; rows: number }) => t.columns <= columns && t.rows <= rows
    const withNotice = wantsNotice ? tries(NOTICE.columns).find(fits) : undefined
    const fit = withNotice ?? tries(0).find(fits)
    if (fit) return { shape: fit.shape, count, hasNotice: !!withNotice }
  }
  return { shape: 'bare', count: 1, hasNotice: false }
}

// The `count` buddies on screen: the page of the crew holding the one talking.
export function windowOf(n: number, count: number, at: number): number[] {
  const start = Math.min(Math.floor(at / count) * count, n - count)
  return Array.from({ length: count }, (_, i) => start + i)
}
