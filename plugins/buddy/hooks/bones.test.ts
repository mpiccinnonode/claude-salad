import { expect, test } from 'claude-code/testing'
import { roll, wyhash } from './bones.ts'

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
