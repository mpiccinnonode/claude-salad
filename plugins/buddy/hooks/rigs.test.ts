import { expect, test } from 'claude-code/testing'
import { RIGS, rigRow } from './rigs.ts'

// Every variant of every part, plugged into every row it sits in, keeps the row 12 cells wide.
test('every part variant keeps every row 12 cells', async () => {
  for (const [species, rig] of Object.entries(RIGS))
    for (const row of rig.rows) {
      const keys = [...row.matchAll(/\{([a-z])\}/g)].map(m => m[1] ?? '')
      let combos: Record<string, string>[] = [{}]
      for (const k of new Set(keys)) combos = combos.flatMap(c => (rig.parts[k]?.v ?? []).map(v => ({ ...c, [k]: v })))
      for (const combo of combos) {
        const text = row.replace(/\{([a-z])\}/g, (_, k: string) => combo[k] ?? '').replace(/\{E\}/g, '·')
        expect(`${species}:${text.length}:${text}`).toBe(`${species}:12:${text}`)
      }
    }
})

test('parts move on their own: at some tick one part has changed and another has not', async () => {
  const cat = RIGS.cat
  if (!cat) throw new Error('no cat')
  const rows = (t: number) => cat.rows.map(r => rigRow(cat, r, t, false, ['·', '·']))
  const changed = (a: number, b: number) => rows(a).map((r, i) => r !== rows(b)[i])
  expect(changed(0, 3).filter(Boolean).length).toBeGreaterThan(0)
  expect(changed(0, 3).filter(c => !c).length).toBeGreaterThan(0)
  expect(rows(3)[1]).toContain('/|_/\\')
  expect(rows(11)[3]).toContain('o')
})
