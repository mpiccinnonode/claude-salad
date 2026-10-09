import { expect, test } from 'claude-code/testing'
import { drawBuddy, pose } from './sprite.ts'

import type { Action } from './sprite.ts'

const text = (tick: number, isWorking: boolean, action?: Action, hat: 'none' | 'propeller' = 'none') =>
  pose(tick, { isWorking, eye: 'O', hat, action }).map(row => row.map(([t]) => t).join(''))

test('idle eyes: stare, blink, dart, spin', async () => {
  expect(text(1, false)[2]).toContain('(O>O)')
  expect(text(0, false)[2]).toContain('(->-)')
  expect(text(7, false)[2]).toContain('(O>·)')
  expect(text(9, false)[2]).toContain('(·>O)')
  expect(text(15, false)[2]).toContain('(@>@)')
})

test('idle body: breathes, ruffles its tuft, taps a foot', async () => {
  expect(text(1, false)[3]).toContain('/(   )\\')
  expect(text(3, false)[3]).toContain('|(   )|')
  expect(text(12, false)[1]).toContain('.-~-.')
  expect(text(16, false)[4]).toContain('`--.´')
  expect(text(17, false)[4]).toContain('`---´')
})

test('idle hop: lifts a row, squints, ~ ~ beneath', async () => {
  expect(text(4, false)).toEqual(['  .---.  ', '  (×>×)  ', ' /(   )\\ ', '  `---´  ', '   ~ ~   '])
  expect(text(6, false)[0]).toBe('         ')
})

test('working: hops, then waddles, bobs, flaps, steps', async () => {
  expect(text(0, true)[4]).toContain('~ ~')
  expect(text(1, true)[1]).toContain('(°>°)')
  expect(text(3, true)).toEqual(['         ', '   .-^-. ', '   (·>O) ', '  /(   )\\', '   `---´ '])
  expect(text(4, true)).toEqual(['         ', '  .---.  ', '  (O>·)  ', ' \\(   )/ ', '  ´---`  '])
})

test('every frame is 5 rows of 9 cells', async () => {
  for (let tick = 0; tick < 40; tick++)
    for (const working of [false, true]) {
      for (const action of [undefined, { kind: 'pet', age: tick % 6 }, { kind: 'poke', age: tick % 5 }] as const) {
        const rows = text(tick, working, action, 'propeller')
        expect(rows.length).toBe(5)
        for (const row of rows) expect(row.length).toBe(9)
      }
    }
})

test('the hat sits on the top row and its propeller spins', async () => {
  expect(text(1, false, undefined, 'propeller')[0]).toContain('-+-')
  expect(text(2, false, undefined, 'propeller')[0]).toContain('=+=')
  expect(text(4, false, undefined, 'propeller')[4]).toContain('~ ~')
})

test('pet: happy eyes and a floating heart; poke: startled hop, then cross', async () => {
  expect(text(3, false, { kind: 'pet', age: 0 })[2]).toContain('(^>^)')
  expect(text(3, false, { kind: 'pet', age: 1 })[0]).toContain('♥')
  expect(text(3, false, { kind: 'poke', age: 0 })[4]).toContain('~ ~')
  expect(text(3, false, { kind: 'poke', age: 3 })[2]).toContain('(ò>ó)')
})

const SPECIES = ['duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot', 'rabbit', 'mushroom', 'chonk']
const other = (species: string, tick: number, isWorking = false, action?: Action, hat: 'none' | 'crown' = 'none', isAsleep = false) =>
  drawBuddy(species, tick, { isWorking, eye: '·', hat, action, isAsleep }, 'blue').map(row => row.map(([t]) => t).join(''))

test('every other species: 5 rows of 13 cells in every frame, no {E} left', async () => {
  for (const species of SPECIES)
    for (let tick = 0; tick < 30; tick++)
      for (const action of [undefined, { kind: 'pet', age: tick % 6 }, { kind: 'poke', age: tick % 5 }] as const) {
        const rows = other(species, tick, tick % 2 === 0, action, 'crown', tick % 7 === 0)
        expect(rows.length).toBe(5)
        for (const row of rows) {
          expect(row.length).toBe(13)
          expect(row).not.toContain('{E}')
        }
      }
})

test('other species: blink, look around, spin, hat on an empty top row, pet and poke', async () => {
  expect(other('duck', 1)[2]).toContain('<(· )___')
  expect(other('duck', 0)[2]).toContain('<(- )___')
  expect(other('blob', 7)[2]).toContain('( ·  · )')
  expect(other('cat', 15)[2]).toContain('( @   @)')
  expect(other('cat', 1, false, undefined, 'crown')[0]).toContain('\\^^^/')
  expect(other('cat', 1, false, { kind: 'pet', age: 0 })[2]).toContain('^   ^')
  expect(other('cat', 1, false, { kind: 'pet', age: 0 })[0]).toContain('♥')
  expect(other('owl', 1, false, { kind: 'poke', age: 3 })[2]).toContain('((ò)(ó))')
})

test('other species hop: the empty top row drops and ~ ~ lands beneath', async () => {
  const rows = other('cat', 5)
  expect(rows[0]).toContain('/\\_/\\')
  expect(rows[4]).toContain('~ ~')
  expect(other('cat', 0, true)[4]).toContain('~ ~')
})

test('left alone, every buddy dozes with shut eyes and a drifting z', async () => {
  expect(other('owl', 3, false, undefined, 'none', true)[2]).toContain('((-)(-))')
  expect(other('owl', 3, false, undefined, 'none', true)[0]).toMatch(/[zZ]/)
  const penguin = pose(3, { isWorking: false, eye: 'O', hat: 'none', isAsleep: true }).map(row => row.map(([t]) => t).join(''))
  expect(penguin[2]).toContain('(->-)')
  expect(penguin[0]).toMatch(/[zZ]/)
})
