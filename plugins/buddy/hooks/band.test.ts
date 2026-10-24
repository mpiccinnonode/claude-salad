import { expect, test } from 'claude-code/testing'
import { layoutFor, windowOf } from './band.ts'

const at = (columns: number, rows: number, n: number) => {
  const l = layoutFor(columns, rows, n)
  return `${l.shape} ${l.count}`
}

test('three buddies: beside the bubble, above it, then fewer of them, then one line', async () => {
  expect(at(86, 40, 3)).toBe('side 3')
  expect(at(85, 40, 3)).toBe('stack 3')
  expect(at(44, 40, 3)).toBe('stack 3')
  expect(at(43, 40, 3)).toBe('stack 2')
  expect(at(42, 40, 3)).toBe('stack 2')
  expect(at(41, 40, 3)).toBe('bare 1')
})

test('one or two buddies need less room', async () => {
  expect(at(73, 40, 2)).toBe('side 2')
  expect(at(60, 40, 1)).toBe('side 1')
  expect(at(59, 40, 1)).toBe('stack 1')
  expect(at(41, 40, 1)).toBe('bare 1')
})

test('a bigger crew shows as many as the width holds, stacked before it drops one', async () => {
  expect(at(125, 40, 6)).toBe('side 6')
  expect(at(124, 40, 6)).toBe('stack 6')
  expect(at(83, 40, 6)).toBe('stack 6')
  expect(at(70, 40, 6)).toBe('stack 5')
})

test('a short band gives up the stack before it gives up buddies', async () => {
  expect(at(70, 10, 3)).toBe('side 1')
  expect(at(73, 10, 3)).toBe('side 2')
  expect(at(73, 6, 2)).toBe('side 2')
  expect(at(50, 9, 3)).toBe('bare 1')
})

test('the window always holds the one talking and never runs past the crew', async () => {
  expect(windowOf(3, 3, 2)).toEqual([0, 1, 2])
  expect(windowOf(5, 2, 0)).toEqual([0, 1])
  expect(windowOf(5, 2, 3)).toEqual([2, 3])
  expect(windowOf(5, 2, 4)).toEqual([3, 4])
  expect(windowOf(5, 1, 4)).toEqual([4])
})

test('the box of what is ready sits beside the bubble where it fits, and never costs a buddy its place', async () => {
  const withBox = (columns: number, rows: number, n: number) => {
    const l = layoutFor(columns, rows, n, true)
    return `${l.shape} ${l.count} ${l.hasNotice}`
  }
  expect(withBox(117, 40, 3)).toBe('side 3 true')
  expect(withBox(116, 40, 3)).toBe('stack 3 true')
  expect(withBox(73, 40, 3)).toBe('stack 3 true')
  expect(withBox(72, 40, 3)).toBe('stack 3 false')
  expect(withBox(91, 40, 1)).toBe('side 1 true')
  expect(withBox(90, 40, 1)).toBe('stack 1 true')
  expect(withBox(72, 40, 1)).toBe('side 1 false')
  expect(withBox(41, 40, 1)).toBe('bare 1 false')
  expect(layoutFor(130, 40, 3).hasNotice).toBe(false)
})
