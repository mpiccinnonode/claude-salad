import { expect, test } from 'claude-code/testing'
import { SPRITE } from './band.ts'
import { capFor, compose, lawnFor, meetings, MIN_ROWS, onLawn, placeAt, sceneFor, skyAt } from './garden.ts'
import { LANDMARKS, LAWN_MARGIN, PERIOD, TILE, TOP } from './scene.ts'

const SIZES: [number, number][] = [[72, 12], [72, 16], [120, 30], [200, 50]]

test('the tile and the landmarks are printable ASCII with a colour for every cell, in the colours the garden knows', () => {
  const arts = [TILE.day, TILE.night, ...LANDMARKS.flatMap(l => (l.night ? [l, l.night] : [l]))]
  for (const a of arts) {
    expect(a.color).toHaveLength(a.ascii.length)
    a.ascii.forEach((row, i) => {
      expect(row).toMatch(/^[\x20-\x7e]*$/)
      expect(a.color[i]).toMatch(/^[gybcmrwk ]*$/)
      expect(a.color[i]).toHaveLength(row.length)
    })
  }
  for (const kind of ['day', 'night'] as const) {
    expect(TILE[kind].ascii.length).toBeGreaterThan(TOP + SPRITE.rows - 1)
    for (const row of TILE[kind].ascii) expect(row).toHaveLength(PERIOD)
  }
  for (const l of LANDMARKS) expect(l.row + l.ascii.length).toBeLessThanOrEqual(TOP + 1)
})

test('the scene fills any size, and the walkable lawn holds nothing but ground and the odd flower', () => {
  for (const kind of ['day', 'night'] as const)
    for (const [cols, rows] of SIZES) {
      const scene = sceneFor(kind, cols, rows)
      expect(scene).toHaveLength(rows)
      expect(scene.every(r => r.length === cols)).toBe(true)
      const lawn = lawnFor(cols, rows)
      for (const row of scene.slice(lawn.top, lawn.bottom + 1))
        expect(row.slice(lawn.left, lawn.right + 1).map(c => c.ch).join('')).toMatch(/^[ .,"*o]*$/)
    }
})

test('the backdrop above the hedge does not change with the height', () => {
  const a = sceneFor('day', 120, MIN_ROWS)
  const b = sceneFor('day', 120, 40)
  expect(a.slice(0, TOP)).toEqual(b.slice(0, TOP))
})

test('a buddy stays whole on the lawn at every tick and every size, is the same at the same tick, and does move', () => {
  for (const [cols, rows] of SIZES) {
    const lawn = lawnFor(cols, rows)
    const seen = new Set<string>()
    for (let t = 0; t < 600; t++)
      for (const who of [0, 1, 2]) {
        const { x, y } = placeAt(lawn, who, t)
        expect(placeAt(lawn, who, t)).toEqual({ x, y })
        expect(x).toBeGreaterThanOrEqual(lawn.left)
        expect(x + SPRITE.columns - 1).toBeLessThanOrEqual(lawn.right + 1)
        expect(y).toBeGreaterThanOrEqual(lawn.top)
        expect(y + SPRITE.rows - 1).toBeLessThanOrEqual(lawn.bottom)
        seen.add(`${who}:${x},${y}`)
      }
    expect(seen.size).toBeGreaterThan(30)
  }
  expect(lawnFor(72, 16).left).toBe(LAWN_MARGIN)
})

test('the cap follows the lawn: three at 72 x 16, fewer in a strip, more in a big pane', () => {
  expect(capFor(lawnFor(72, 16))).toBe(3)
  expect(capFor(lawnFor(72, MIN_ROWS))).toBe(2)
  expect(capFor(lawnFor(200, 50))).toBeGreaterThan(capFor(lawnFor(120, 30)))
  expect(capFor(lawnFor(120, 30))).toBeGreaterThan(3)
})

test('buddies meet when close, and a sprite paints over the scene without changing its size', () => {
  expect(meetings([{ x: 10, y: 8 }, { x: 18, y: 9 }, { x: 60, y: 8 }])).toEqual([[0, 1]])
  const scene = sceneFor('day', 72, 16)
  const grid = compose(scene, [{ who: 0, at: { x: 10, y: 8 }, rows: [[['ab', 'red']], [['c', 'blue']]] }])
  expect(grid).toHaveLength(16)
  expect(grid[8]!.slice(10, 12).map(c => c.ch + c.who)).toEqual(['a0', 'b0'])
  expect(grid[9]![10]).toEqual({ ch: 'c', color: 'blue', who: 0 })
  expect(grid[8]![12]!.who).toBeUndefined()
  expect(scene[8]![10]!.who).toBeUndefined()
  expect(grid.every(r => r.length === 72)).toBe(true)
})

test('no more than the cap are out, a bigger crew takes turns one at a time, and a small one stays whole', () => {
  expect(onLawn(2, 9999, 3)).toEqual([0, 1])
  expect(onLawn(5, 0, 3)).toEqual([0, 1, 2])
  expect(onLawn(5, 150, 3)).toEqual([1, 2, 3])
  expect(onLawn(5, 4 * 150, 3)).toEqual([4, 0, 1])
  expect(onLawn(5, 0, 5)).toEqual([0, 1, 2, 3, 4])
  for (let t = 0; t < 3000; t += 7) expect(onLawn(7, t, 4)).toHaveLength(4)
})

test('the sky is day from 7 to 19 and night otherwise', () => {
  expect([0, 6, 7, 12, 19, 20, 23].map(skyAt)).toEqual(['night', 'night', 'day', 'day', 'day', 'night', 'night'])
})
