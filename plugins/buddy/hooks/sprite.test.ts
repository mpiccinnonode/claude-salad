import { expect, test } from 'claude-code/testing'
import { drawBuddy } from './sprite.ts'
import type { Action } from './sprite.ts'
import { SPECIES } from './bones.ts'

type Opts = { isWorking?: boolean; action?: Action; hat?: 'none' | 'crown' | 'propeller'; isAsleep?: boolean; eye?: string }
const rows = (species: string, tick: number, o: Opts = {}) =>
  drawBuddy(species, tick, { isWorking: o.isWorking ?? false, eye: o.eye ?? 'O', hat: o.hat ?? 'none', action: o.action, isAsleep: o.isAsleep }, 'blue')
const text = (species: string, tick: number, o: Opts = {}) => rows(species, tick, o).map(row => row.map(([t]) => t).join(''))

test('every species, every state: 5 rows of 13 cells, no placeholder left', async () => {
  for (const species of SPECIES)
    for (let tick = 0; tick < 30; tick++)
      for (const action of [undefined, { kind: 'pet', age: tick % 6 }, { kind: 'poke', age: tick % 5 }] as const) {
        const r = text(species, tick, { isWorking: tick % 2 === 0, action, hat: 'crown', isAsleep: tick % 7 === 0 })
        expect(r.length).toBe(5)
        for (const row of r) {
          expect(`${species}:${row.length}`).toBe(`${species}:13`)
          expect(row).not.toMatch(/\{[a-zE]\}/)
        }
      }
})

test('penguin eyes: stare, blink, look around, spin', async () => {
  expect(text('penguin', 1)[2]).toContain('(O>O)')
  expect(text('penguin', 0)[2]).toContain('(->-)')
  expect(text('penguin', 7)[2]).toContain('(O>·)')
  expect(text('penguin', 9)[2]).toContain('(·>O)')
  expect(text('penguin', 15)[2]).toContain('(@>@)')
})

test('penguin parts move on their own: tuft, flippers, foot tap; the beak is yellow', async () => {
  expect(text('penguin', 12)[1]).toContain('.-~-.')
  expect(text('penguin', 1)[3]).toContain('/(   )\\')
  expect(text('penguin', 3)[3]).toContain('|(   )|')
  expect(text('penguin', 16)[4]).toContain('`--.´')
  expect(rows('penguin', 1)[2]).toContainEqual(['>', 'yellow'])
})

test('hop: the empty top row drops and ~ ~ lands beneath', async () => {
  const hop = text('penguin', 4)
  expect(hop[0]).toContain('.---.')
  expect(hop[4]).toContain('~ ~')
  expect(text('cat', 5)[0]).toContain('/\\_/\\')
  expect(text('cat', 0, { isWorking: true })[4]).toContain('~ ~')
})

test('working penguin: head bob, flippers flap, feet step, waddle', async () => {
  expect(text('penguin', 3, { isWorking: true })).toEqual(['             ', '   .-^-.     ', '   (·>O)     ', '  /(   )\\    ', '   `---´     '])
  expect(text('penguin', 4, { isWorking: true })).toEqual(['             ', '  .---.      ', '  (O>·)      ', ' \\(   )/     ', '  ´---`      '])
})

test('moods move the body too: pet relaxes the flippers, poke ruffles the tuft, sleep slumps', async () => {
  const pet = text('penguin', 3, { action: { kind: 'pet', age: 1 } })
  expect(pet[2]).toContain('(^>^)')
  expect(pet[3]).toContain('|(   )|')
  expect(pet[0]).toContain('♥')
  const poke = text('penguin', 3, { action: { kind: 'poke', age: 3 } })
  expect(poke[2]).toContain('(ò>ó)')
  expect(poke[1]).toContain('.-~-.')
  const asleep = text('penguin', 3, { isAsleep: true })
  expect(asleep[2]).toContain('(->-)')
  expect(asleep[3]).toContain('|(   )|')
  expect(asleep[0]).toMatch(/[zZ]/)
})

test('hats sit on a free top row; the propeller spins', async () => {
  expect(text('penguin', 1, { hat: 'propeller' })[0]).toContain('-+-')
  expect(text('penguin', 2, { hat: 'propeller' })[0]).toContain('=+=')
  expect(text('cat', 1, { hat: 'crown' })[0]).toContain('\\^^^/')
})

test('other species: blink, look, spin, and their own moods', async () => {
  expect(text('duck', 1, { eye: '·' })[2]).toContain('<(· )___')
  expect(text('duck', 0, { eye: '·' })[2]).toContain('<(- )___')
  expect(text('blob', 7, { eye: '·' })[2]).toContain('( ·  · )')
  expect(text('cat', 15)[2]).toContain('( @   @)')
  expect(text('turtle', 3, { action: { kind: 'poke', age: 3 } })[2]).toContain('(  --  )')
  expect(text('capybara', 3, { action: { kind: 'pet', age: 1 } })[0]).toContain('(o)')
  expect(text('cactus', 3, { action: { kind: 'pet', age: 1 } })[1]).toContain('_**_')
})
