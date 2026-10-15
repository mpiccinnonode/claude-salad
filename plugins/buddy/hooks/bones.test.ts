import { expect, test } from 'claude-code/testing'
import { evolve, roll, wyhash } from './bones.ts'

// Computed by the reference implementation (coding-buddy core/engine.ts) with the 18 original species.
const REF_EMPTY = 290873116282709081n
const REF_ABC = 190542993387777138n
const REF_LONG = 7077612499900502782n
const REF_ID = 'rare-hunt-42'
const REF_BONES = { rarity: 'common', species: 'blob', eye: '✦', hat: 'none', isShiny: false, stats: { DEBUGGING: 1, PATIENCE: 78, CHAOS: 22, WISDOM: 19, SNARK: 11 }, peak: 'PATIENCE' }

test('wyhash matches the reference port', async () => {
  expect(wyhash('')).toBe(REF_EMPTY)
  expect(wyhash('abc')).toBe(REF_ABC)
  expect(wyhash('a'.repeat(100))).toBe(REF_LONG)
})

test('roll is stable for an id and draws from the original tables', async () => {
  expect(roll('test-user-1friend')).toEqual(roll('test-user-1friend'))
  expect(roll(REF_ID)).toEqual(REF_BONES)
})

test('evolve: a rarity up, a hat, stats up with the peak most, capped at 100; legendary stays legendary', async () => {
  const b = roll(REF_ID)
  const grown = evolve(b, () => 0)
  expect(grown).toEqual({ ...b, rarity: 'uncommon', hat: 'crown', stats: { DEBUGGING: 6, PATIENCE: 93, CHAOS: 27, WISDOM: 24, SNARK: 16 } })
  const top = evolve({ ...grown, rarity: 'legendary', stats: { ...grown.stats, PATIENCE: 95 } })
  expect([top.rarity, top.hat, top.stats.PATIENCE]).toEqual(['legendary', 'crown', 100])
})
