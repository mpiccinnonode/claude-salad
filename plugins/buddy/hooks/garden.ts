import { SPRITE } from './band.ts'
import { LANDMARKS, LAWN_MARGIN, PERIOD, TILE, TOP } from './scene.ts'
import type { Row } from './sprite.ts'

export type Spot = { x: number; y: number }
export type Cell = { ch: string; color?: string; who?: number }

// The scene fills the pane: the tile repeats across and the artist's lawn rows repeat down under the hedge, then the landmarks go over it, placed by their share of the width.
export type Lawn = { top: number; left: number; bottom: number; right: number }
export const MIN_COLS = 72
export const MIN_ROWS = TOP + SPRITE.rows
export const lawnFor = (cols: number, rows: number): Lawn => ({ top: TOP, left: LAWN_MARGIN, bottom: rows - 1, right: cols - 1 - LAWN_MARGIN })
const COLOR: Record<string, string> = { g: 'green', y: 'yellow', b: 'blue', c: 'cyan', m: 'magenta', r: 'red', w: 'white', k: 'gray' }
export function sceneFor(kind: 'day' | 'night', cols: number, rows: number): Cell[][] {
  const tile = TILE[kind]
  const ground = tile.ascii.length - TOP
  const grid: Cell[][] = Array.from({ length: rows }, (_, r) => {
    const src = r < TOP ? r : TOP + ((r - TOP) % ground)
    return Array.from({ length: cols }, (_, c) => ({ ch: tile.ascii[src]![c % PERIOD]!, color: COLOR[tile.color[src]![c % PERIOD]!] }))
  })
  for (const lm of LANDMARKS) {
    const art = (kind === 'night' && lm.night) || lm
    const width = Math.max(...art.ascii.map(l => l.length))
    const left = Math.min(Math.max(0, Math.round(lm.at * cols - width / 2)), cols - width)
    art.ascii.forEach((line, i) => {
      const row = grid[lm.row + i]
      if (row) [...line].forEach((ch, j) => { if (ch !== ' ' && row[left + j]) row[left + j] = { ch, color: COLOR[art.color[i]![j]!] } })
    })
  }
  return grid
}
// How many fit at once: each gets about three times its own area to walk in (the 72 x 16 scene gives 3).
export const capFor = (lawn: Lawn) => Math.max(1, Math.round(((lawn.right - lawn.left + 1) * (lawn.bottom - lawn.top + 1)) / (SPRITE.columns * SPRITE.rows * 3)))

// With a bigger crew than the cap the page moves on by one every SHIFT ticks (~45s).
const SHIFT = 150

// Which of `n` crew members are out right now, as indexes into the crew.
export const onLawn = (n: number, tick: number, cap: number): number[] => {
  const first = n > cap ? Math.floor(tick / SHIFT) % n : 0
  return Array.from({ length: Math.min(n, cap) }, (_, k) => (first + k) % n)
}

// Day from 7 to 20 o'clock, the machine's.
export const skyAt = (hour: number): 'day' | 'night' => (hour >= 7 && hour < 20 ? 'day' : 'night')

// The garden's sky button goes round: the clock, always day, always night.
export const nextSky = { auto: 'day', day: 'night', night: 'auto' } as const

// A leg is a walk, then a rest: ~7s on the move, ~3s standing.
const WALK = 24
const LEG = WALK + 10
const mix = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return (h ^ (h >>> 13)) >>> 0
}
// Where a sprite's top-left corner may be so the whole sprite stays on the lawn.
const spot = (lawn: Lawn, who: number, leg: number): Spot => ({
  x: lawn.left + (mix(who, 2 * leg) % Math.max(1, lawn.right - lawn.left + 2 - SPRITE.columns)),
  y: lawn.top + (mix(who, 2 * leg + 1) % Math.max(1, lawn.bottom - lawn.top + 2 - SPRITE.rows)),
})

// Stateless on purpose: the same tick always gives the same place (the test runner's Math.random is read-only, and nothing has to be stored per buddy).
export function placeAt(lawn: Lawn, who: number, tick: number): Spot {
  const t = tick + who * 7
  const leg = Math.floor(t / LEG)
  const k = Math.min(1, (t % LEG) / WALK)
  const a = spot(lawn, who, leg)
  const b = spot(lawn, who, leg + 1)
  return { x: Math.round(a.x + (b.x - a.x) * k), y: Math.round(a.y + (b.y - a.y) * k) }
}

// Pairs close enough to chat, as indexes into `spots`.
export function meetings(spots: Spot[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++)
      if (Math.abs(spots[i]!.x - spots[j]!.x) < SPRITE.columns + 3 && Math.abs(spots[i]!.y - spots[j]!.y) < SPRITE.rows) out.push([i, j])
  return out
}

// The scene with each sprite painted over it, the lower ones last so they stand in front.
export function compose(scene: Cell[][], sprites: { at: Spot; rows: Row[]; who: number }[]): Cell[][] {
  const grid = scene.map(line => [...line])
  for (const s of [...sprites].sort((a, b) => a.at.y - b.at.y))
    s.rows.forEach((row, r) => {
      let x = s.at.x
      for (const [text, color] of row)
        for (const ch of text) {
          const line = grid[s.at.y + r]
          if (line && x >= 0 && x < line.length) line[x] = { ch, color, who: s.who }
          x++
        }
    })
  return grid
}
