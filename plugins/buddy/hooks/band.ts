// How the band fits its buddies into `bodyColumns` × `maxRows`: all of them beside the bubble, above it, then only the one talking, then one line.
export type Layout = { shape: 'side' | 'stack' | 'bare'; isSolo: boolean }

export const SPRITE = { columns: 13, rows: 5 }
// Measured live: the it button row with its hotkeys (`1: coccola … 4: stat`) + padding + border, and `[ × ]`.
// ponytail: assumes a one-line quip; a long one wraps and the band may scroll a row or two
const BUBBLE = { columns: 42, rows: 5 }
const HIDE = 5

export function layoutFor(columns: number, rows: number, n: number): Layout {
  const tries = [false, true].flatMap(isSolo => {
    const shown = isSolo ? 1 : n
    const pointer = shown > 1 ? 1 : 0
    return [
      { shape: 'side' as const, isSolo, columns: shown * SPRITE.columns + BUBBLE.columns + HIDE, rows: Math.max(SPRITE.rows + pointer, BUBBLE.rows) },
      { shape: 'stack' as const, isSolo, columns: Math.max(shown * SPRITE.columns + HIDE, BUBBLE.columns), rows: SPRITE.rows + pointer + BUBBLE.rows },
    ]
  })
  const fit = tries.find(t => t.columns <= columns && t.rows <= rows)
  return fit ? { shape: fit.shape, isSolo: fit.isSolo && n > 1 } : { shape: 'bare', isSolo: n > 1 }
}
