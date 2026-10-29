import type { EngineInterface } from 'claude-code'
import { crewSizeOf, eggs, evolveNow, evolvesIn, forget, hatchCrew, hatchLove, hatchNew, memberOf, nestsReady, outOfEgg, rosterOf, setCrew, titled, writeBook } from './crew.ts'
import type { Ctx, Entry, Roster } from './crew.ts'
import type { Lang } from './lines.ts'
import { findFriend, parseAdd, relink, without } from './friends.ts'
import { crewNow, crewOr, hatchInto, membersNow, relist, say, setHidden, speak, toggleHidden } from './state.ts'
import { WORDS } from './words.ts'

// /buddy <verb> <words>: each verb answers with the text to show.
export async function runBuddy($: EngineInterface, o: Ctx, args: string): Promise<string> {
  const [verb = '', ...words] = args.trim().split(/\s+/).filter(Boolean)
  const wanted = words.join(' ')
  switch (verb) {
    case '': return toggle($, o)
    case 'list': return list($, o)
    case 'use': return use($, o, wanted)
    case 'join': return join($, o, wanted)
    case 'leave': return leave($, o, wanted)
    case 'add': return add($, o, words)
    case 'evolve': return evolveOne($, o, wanted)
    case 'rm': return rm($, o, wanted)
    default: return WORDS[o.lang].usage
  }
}

// A name nobody has, or no name where one is needed.
const missing = (w: (typeof WORDS)[Lang], wanted: string) => (wanted ? w.unknown(wanted) : w.usage)

async function keysOut($: EngineInterface, o: Ctx, r?: Roster) {
  return (await hatchCrew($, o, r)).map(m => m.key)
}

async function recrew($: EngineInterface, o: Ctx, keys: string[] | null) {
  await setCrew($, keys)
  return hatchInto($, o)
}

// With an egg ready, a bare /buddy hatches a surprise: Haiku picks the name; a couple's egg goes first. Otherwise it shows or hides.
async function toggle($: EngineInterface, o: Ctx) {
  const w = WORDS[o.lang]
  let failed: string | undefined
  const [love] = await nestsReady($, o, await crewNow($))
  if (love) {
    const hatched = await hatchLove($, o, love)
    if ('name' in hatched) return welcome($, o, hatched.name, hatched.key, w.bornOf(hatched.name, love[0].name, love[1].name))
    failed = hatched.failed
  }
  if (!failed && (await eggs($, o.perEgg)).left <= 0) {
    const hatched = await hatchNew($, o, { name: '' }, await rosterOf($, o))
    if ('name' in hatched) return welcome($, o, hatched.name, hatched.key)
    failed = hatched.failed
  }
  const [lead] = await crewNow($)
  const hidden = await toggleHidden($)
  return [hidden ? w.off(lead.name) : w.on(lead.name), ...(failed ? [failed] : [])].join('\n')
}

// A newborn joins while there is room, leading or last; a full crew stays as it is and it waits on the bench.
export async function place($: EngineInterface, o: Ctx, key: string, isLead: boolean) {
  const [out, size] = await Promise.all([keysOut($, o), crewSizeOf($, o)])
  const keys = out.filter(k => k !== key)
  if (keys.length >= size) return false
  await recrew($, o, isLead ? [key, ...keys] : [...keys, key])
  return true
}

async function welcome($: EngineInterface, o: Ctx, name: string, key: string, said = WORDS[o.lang].born(name)) {
  const w = WORDS[o.lang]
  const [hasRoom] = await Promise.all([place($, o, key, true), setHidden($, false)])
  await say($, said)
  return [said, ...(hasRoom ? [] : [w.bench(name)])].join('\n')
}

// Opens the list pane; where no pane can be drawn (headless, or the person's terminal refuses), the plain list.
export async function list($: EngineInterface, o: Ctx) {
  const w = WORDS[o.lang]
  await relist($, o)
  const opened = await $.ui.open({ id: LIST_PANE, title: w.paneTitle, focus: true, closeOnEscape: true, rows: ALL_ROOM, columns: ALL_ROOM }).catch(() => ({ isPlaced: false }))
  return opened.isPlaced ? w.paneOpened : listText($, o)
}

export const LIST_PANE = 'buddy-list'
// As much room as the surface gives: the dock caps it at 45% of the columns, inline at what the layout spares.
const ALL_ROOM = 1000

async function listText($: EngineInterface, o: Ctx) {
  const w = WORDS[o.lang]
  const [{ roster, born, book }, { done }, crew] = await Promise.all([rosterOf($, o), eggs($, o.perEgg), crewNow($)])
  // ▸ the lead, ● the rest of the crew, blank the bench, 🥚 still an egg.
  const keys = crew.map(m => m.key)
  const mark = (e: Entry) => (e.key === keys[0] ? '▸' : keys.includes(e.key) ? '●' : born[e.key] ? ' ' : '🥚')
  return [...roster.map(e => `${mark(e)} ${e.name}${e.species ? ` (${e.species})` : ''}`), w.egg(done, o.perEgg), ...(book.error ? [w.badFile(book.error)] : [])].join('\n')
}

// A name swaps the lead and keeps the rest of the crew; a bare `/buddy use` goes back to the `active` option.
export async function use($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  const e = wanted ? findFriend(r.roster, wanted) : undefined
  if (wanted && !e) return missing(w, wanted)
  const failed = e && (await outOfEgg($, o, e, r))
  if (failed) return failed
  // A hatch just now changed `born`, so only a buddy already hatched can reuse the roster.
  const keys = e ? [e.key, ...(await keysOut($, o, r.born[e.key] ? r : undefined)).slice(1).filter(k => k !== e.key)] : null
  const [out] = await recrew($, o, keys)
  return w.hello(out.name)
}

export async function join($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  const e = findFriend(r.roster, wanted)
  if (!e) return missing(w, wanted)
  const [keys, size] = await Promise.all([keysOut($, o, r), crewSizeOf($, o)])
  if (keys.includes(e.key)) return w.already(e.name)
  if (keys.length >= size) return w.full(size)
  const failed = await outOfEgg($, o, e, r)
  if (failed) return failed
  await recrew($, o, [...keys, e.key])
  return w.joined(e.name)
}

export async function leave($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  const e = findFriend(r.roster, wanted)
  if (!e) return missing(w, wanted)
  const keys = await keysOut($, o, r)
  if (!keys.includes(e.key)) return w.notOut(e.name)
  if (keys.length === 1) return w.lastOne(e.name)
  await recrew($, o, keys.filter(k => k !== e.key))
  return w.benched(e.name)
}

// A bare `/buddy add` lets Haiku name it too.
export async function add($: EngineInterface, o: Ctx, words: string[]) {
  const w = WORDS[o.lang]
  const friend = parseAdd(words) ?? { name: '' }
  const r = await rosterOf($, o)
  if (r.book.error) return w.badFile(r.book.error)
  if (friend.name && findFriend(r.roster, friend.name)) return w.taken(friend.name)
  const { left } = await eggs($, o.perEgg)
  if (left > 0) return w.locked(left)
  const hatched = await hatchNew($, o, friend, r)
  if ('failed' in hatched) return hatched.failed
  const hasRoom = await place($, o, hatched.key, false)
  return [w.added(hatched.name), hasRoom ? w.joined(hatched.name) : w.bench(hatched.name)].join('\n')
}

// A name picks who, out or on the bench; without one, the first out that is ready, else the lead, to say how long is left.
export async function evolveOne($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const crew = crewOr((await membersNow($)) ?? (await hatchInto($, o)))
  const named = wanted ? (findFriend(crew, wanted) ?? (await benched($, o, wanted))) : undefined
  if (wanted && !named) return missing(w, wanted)
  const leftOf = await evolvesIn($, o.perEvolve)
  const target = named ?? crew.find(m => leftOf(m.key) <= 0) ?? crew[0]!
  const left = leftOf(target.key)
  if (left > 0) return w.notYet(target.name, left)
  const failed = await evolveNow($, o, target)
  if (failed) return failed
  const out = await hatchInto($, o)
  const at = out.findIndex(m => m.key === target.key)
  // One evolved on the bench is announced by the lead.
  const said = w.evolved(titled(out[at] ?? (await benched($, o, target.name)) ?? target))
  await speak($, Math.max(0, at), said)
  return said
}

export // A hatched buddy on the bench, as it would be out.
async function benched($: EngineInterface, o: Ctx, wanted: string) {
  const { roster, born } = await rosterOf($, o)
  const e = findFriend(roster, wanted)
  return e && born[e.key] ? memberOf(o, e, born) : undefined
}

export async function rm($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const { roster, book } = await rosterOf($, o)
  if (book.error) return w.badFile(book.error)
  const e = wanted ? findFriend(roster, wanted) : undefined
  if (!e) return missing(w, wanted)
  await Promise.all([writeBook($, book, relink(without(book.raw, wanted), wanted)), forget($, e.key)])
  await hatchInto($, o)
  return w.removed(wanted)
}
