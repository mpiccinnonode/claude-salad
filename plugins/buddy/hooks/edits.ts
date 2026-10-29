import type { EngineInterface } from 'claude-code'
import type { Card, Draft, PaneUi } from '../types'
import { evolveOne, join, leave, place, rm, use } from './commands.ts'
import { crewSizeOf, eggs, hatchCrew, hatchNew, isHeld, openBook, outOfEgg, rename, rosterOf, setCrew, setCrewSize, writeBook } from './crew.ts'
import type { Ctx } from './crew.ts'
import { findFriend, flipped, keyOf, relationPairs, upsert, withSoulField } from './friends.ts'
import type { Personality, SoulField } from './friends.ts'
import { hatchInto, refresh, setPane } from './state.ts'
import { WORDS } from './words.ts'

// What the list pane's controls do: each writes the buddies file or the crew, then the band and the pane read the disk again.

async function settle($: EngineInterface, o: Ctx, note: string, patch: Partial<PaneUi> = {}) {
  await refresh($, o)
  await setPane($, { note, isBusy: false, mode: 'view', ...patch })
}

// A change to one buddy's entry in the file, read fresh so an edit made meanwhile by hand is kept.
async function patchEntry($: EngineInterface, o: Ctx, change: (raw: unknown[]) => unknown[]) {
  const book = await openBook($, o)
  if (book.error) return settle($, o, WORDS[o.lang].badFile(book.error))
  await writeBook($, book, change(book.raw))
  return settle($, o, '')
}

export async function pick($: EngineInterface, key: string) {
  await setPane($, { sel: key, mode: 'view', note: '' })
}

export async function filterBy($: EngineInterface, patch: Partial<PaneUi>) {
  await setPane($, { ...patch, note: '' })
}

export async function renameTo($: EngineInterface, o: Ctx, c: Card, name: string) {
  const failed = await rename($, o, c, name)
  return settle($, o, failed ?? (name.trim() === c.name ? '' : WORDS[o.lang].renamed(c.name, name.trim())))
}

export async function setSpecies($: EngineInterface, o: Ctx, c: Card, species: string) {
  return patchEntry($, o, raw => upsert(raw, c.name, { species }))
}

export async function setSoulField($: EngineInterface, o: Ctx, c: Card, field: SoulField, text: string) {
  return patchEntry($, o, raw => withSoulField(raw, c.name, field, text))
}

export async function setSentence($: EngineInterface, o: Ctx, c: Card, text: string) {
  return patchEntry($, o, raw => upsert(raw, c.name, { personality: text.trim() }))
}

// One `Name: relation` per line; an empty field keeps an empty list, so relateUp does not dream them again.
export async function setRelations($: EngineInterface, o: Ctx, c: Card, text: string) {
  return patchEntry($, o, raw => upsert(raw, c.name, { relations: relationPairs(text).pairs.map(([n, r]) => ({ [n]: r })) } as never))
}

export async function flipSoul($: EngineInterface, o: Ctx, c: Card) {
  if (c.personality === undefined) return
  return patchEntry($, o, raw => upsert(raw, c.name, { personality: flipped(c.personality as Personality) }))
}

// In the crew it steps back; on the bench it joins while there is room, else the pane asks who makes way.
export async function toggleCrew($: EngineInterface, o: Ctx, c: Card, crew: number) {
  if (c.status === 'lead' || c.status === 'crew') return settle($, o, await leave($, o, c.name))
  if (crew >= (await crewSizeOf($, o))) return setPane($, { mode: 'swap', note: '' })
  return settle($, o, await join($, o, c.name))
}

// `c` takes the place of the buddy keyed `out`, hatching first when it is still an egg.
export async function swapIn($: EngineInterface, o: Ctx, c: Card, out: string) {
  const r = await rosterOf($, o)
  const e = findFriend(r.roster, c.name)
  if (!e) return settle($, o, WORDS[o.lang].unknown(c.name))
  const failed = await outOfEgg($, o, e, r)
  if (failed) return settle($, o, failed)
  const keys = (await hatchCrew($, o)).map(m => m.key)
  await setCrew($, keys.map(k => (k === out ? e.key : k)))
  await hatchInto($, o)
  return settle($, o, WORDS[o.lang].joined(c.name))
}

// Room for one more or one less in the crew; a smaller crew keeps its first ones.
export async function resize($: EngineInterface, o: Ctx, size: number) {
  await setCrewSize($, size)
  await hatchInto($, o)
  return settle($, o, WORDS[o.lang].crewSized(size))
}

export async function lead($: EngineInterface, o: Ctx, c: Card) {
  return settle($, o, await use($, o, c.name))
}

export async function evolveIt($: EngineInterface, o: Ctx, c: Card) {
  await setPane($, { isBusy: true, note: WORDS[o.lang].evolving(c.name) })
  return settle($, o, await evolveOne($, o, c.name))
}

// An egg hatches when one is ready, and joins while there is room.
export async function hatchIt($: EngineInterface, o: Ctx, c: Card) {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  const e = findFriend(r.roster, c.name)
  if (!e) return settle($, o, w.unknown(c.name))
  await setPane($, { isBusy: true, note: w.hatching(c.name) })
  const failed = await outOfEgg($, o, e, r)
  if (failed) return settle($, o, failed)
  return settle($, o, (await place($, o, e.key, false)) ? w.joined(c.name) : w.bench(c.name))
}

export async function remove($: EngineInterface, o: Ctx, c: Card) {
  return settle($, o, await rm($, o, c.name), { sel: '' })
}

// A new buddy: hatched at once when an egg is ready (Haiku fills what is left blank), else written into the file as an egg.
export async function addNew($: EngineInterface, o: Ctx, d: Draft) {
  const w = WORDS[o.lang]
  const name = d.name.trim()
  const r = await rosterOf($, o)
  if (r.book.error) return settle($, o, w.badFile(r.book.error), { mode: 'add' })
  if (name && (findFriend(r.roster, name) || isHeld(r, keyOf(name)))) return settle($, o, w.taken(name), { mode: 'add' })
  const friend = { name, species: d.species || undefined, personality: d.soul.trim() || undefined }
  const { left } = await eggs($, o.perEgg)
  if (left > 0) {
    if (!name) return settle($, o, w.needName(left), { mode: 'add' })
    await writeBook($, r.book, upsert(r.book.raw, name, friend))
    return settle($, o, w.addedEgg(name), { sel: keyOf(name), draft: { name: '', species: '', soul: '' } })
  }
  await setPane($, { isBusy: true, note: w.hatching(name || '?') })
  const hatched = await hatchNew($, o, friend, r)
  if ('failed' in hatched) return settle($, o, hatched.failed, { mode: 'add' })
  const hasRoom = await place($, o, hatched.key, false)
  return settle($, o, hasRoom ? w.joined(hatched.name) : w.bench(hatched.name), { sel: hatched.key, draft: { name: '', species: '', soul: '' } })
}
