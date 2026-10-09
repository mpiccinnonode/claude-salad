import { expect, test } from 'claude-code/testing'
import { SPECIES } from './bones.ts'
import { RIGS, rigRow } from './rigs.ts'
import type { Mood } from './rigs.ts'

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

const body = (species: string, tick: number, mood?: Mood) => {
  const rig = RIGS[species]
  if (!rig) throw new Error(`no rig for ${species}`)
  return rig.rows.map(r => rigRow(rig, r, tick, mood !== undefined, ['·', '·'], 'blue', mood).map(([t]) => t).join(''))
}

test('all 18 species are rigged, and pet, poke and sleep each move part of the body, not just the eyes', async () => {
  for (const species of SPECIES)
    for (const mood of ['pet', 'poke', 'asleep'] as const) {
      const differs = Array.from({ length: 20 }, (_, t) => body(species, t, mood).join('\n') !== body(species, t).join('\n')).some(Boolean)
      expect(`${species}/${mood}:${differs}`).toBe(`${species}/${mood}:true`)
    }
})

test('parts move on their own: at some tick one part has changed and another has not', async () => {
  const changed = body('cat', 0).map((r, i) => r !== body('cat', 3)[i])
  expect(changed.filter(Boolean).length).toBeGreaterThan(0)
  expect(changed.filter(c => !c).length).toBeGreaterThan(0)
  expect(body('cat', 3)[1]).toContain('/|_/\\')
  expect(body('cat', 11)[3]).toContain('o')
})
