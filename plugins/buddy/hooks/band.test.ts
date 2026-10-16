import { expect, test } from 'claude-code/testing'
import { layoutFor } from './band.ts'

const at = (columns: number, rows: number, n: number) => {
  const l = layoutFor(columns, rows, n)
  return `${l.shape}${l.isSolo ? ' solo' : ''}`
}

test('three buddies: beside the bubble, above it, then only the one talking, then one line', async () => {
  expect(at(86, 40, 3)).toBe('side')
  expect(at(85, 40, 3)).toBe('stack')
  expect(at(44, 40, 3)).toBe('stack')
  expect(at(43, 40, 3)).toBe('stack solo')
  expect(at(42, 40, 3)).toBe('stack solo')
  expect(at(41, 40, 3)).toBe('bare solo')
})

test('one or two buddies need less room, and one is never solo', async () => {
  expect(at(73, 40, 2)).toBe('side')
  expect(at(60, 40, 1)).toBe('side')
  expect(at(59, 40, 1)).toBe('stack')
  expect(at(41, 40, 1)).toBe('bare')
})

test('a short band gives up the stack before it gives up buddies', async () => {
  expect(at(70, 10, 3)).toBe('side solo')
  expect(at(73, 6, 2)).toBe('side')
  expect(at(50, 9, 3)).toBe('bare solo')
})
