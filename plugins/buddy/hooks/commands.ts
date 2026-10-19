import type { EngineInterface } from 'claude-code'
import { eggs, evolveNow, evolvesIn, forget, hatchCrew, hatchNew, openBook, outOfEgg, rosterOf, setCrew, titled, writeBook } from './crew.ts'
import type { Ctx, Entry, Roster } from './crew.ts'
import { findFriend, keyOf, parseAdd, without } from './friends.ts'
import { crewNow, hatchInto, membersNow, say, setHidden, speak, toggleHidden } from './state.ts'
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

async function keysOut($: EngineInterface, o: Ctx, r?: Roster) {
  return (await hatchCrew($, o, r)).map(m => m.key)
}

async function recrew($: EngineInterface, o: Ctx, keys: string[] | null) {
  await setCrew($, keys)
  return hatchInto($, o)
}

// With an egg ready, a bare /buddy hatches a surprise: Haiku picks the name. Otherwise it shows or hides.
async function toggle($: EngineInterface, o: Ctx) {
  const w = WORDS[o.lang]
  let failed: string | undefined
  if ((await eggs($, o.perEgg)).left <= 0) {
    const hatched = await hatchNew($, o, { name: '' }, await rosterOf($, o))
    if ('name' in hatched) return welcome($, o, hatched.name)
    failed = hatched.failed
  }
  const [lead] = await crewNow($, o)
  const hidden = await toggleHidden($)
  return [hidden ? w.off(lead.name) : w.on(lead.name), ...(failed ? [failed] : [])].join('\n')
}

// A newborn joins while there is room, leading or last; a full crew stays as it is and it waits on the bench.
async function place($: EngineInterface, o: Ctx, name: string, isLead: boolean) {
  const key = keyOf(name)
  const keys = (await keysOut($, o)).filter(k => k !== key)
  if (keys.length >= o.crewSize) return false
  await recrew($, o, isLead ? [key, ...keys] : [...keys, key])
  return true
}

async function welcome($: EngineInterface, o: Ctx, name: string) {
  const w = WORDS[o.lang]
  const [hasRoom] = await Promise.all([place($, o, name, true), setHidden($, false)])
  await say($, w.born(name))
  return [w.born(name), ...(hasRoom ? [] : [w.bench(name)])].join('\n')
}

async function list($: EngineInterface, o: Ctx) {
  const w = WORDS[o.lang]
  const [{ roster, born, book }, { done }, crew] = await Promise.all([rosterOf($, o), eggs($, o.perEgg), crewNow($, o)])
  // ▸ the lead, ● the rest of the crew, blank the bench, 🥚 still an egg.
  const keys = crew.map(m => m.key)
  const mark = (e: Entry) => (e.key === keys[0] ? '▸' : keys.includes(e.key) ? '●' : born[e.key] ? ' ' : '🥚')
  return [...roster.map(e => `${mark(e)} ${e.name}${e.species ? ` (${e.species})` : ''}`), w.egg(done, o.perEgg), ...(book.error ? [w.badFile(book.error)] : [])].join('\n')
}

// A name swaps the lead and keeps the rest of the crew; a bare `/buddy use` goes back to the `active` option.
async function use($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  const e = wanted ? findFriend(r.roster, wanted) : undefined
  if (wanted && !e) return w.unknown(wanted)
  const failed = e && (await outOfEgg($, o, e, r))
  if (failed) return failed
  const keys = e ? [e.key, ...(await keysOut($, o)).slice(1).filter(k => k !== e.key)] : null
  const [out] = await recrew($, o, keys)
  return w.hello(out.name)
}

async function join($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  const e = findFriend(r.roster, wanted)
  if (!e) return wanted ? w.unknown(wanted) : w.usage
  const keys = await keysOut($, o, r)
  if (keys.includes(e.key)) return w.already(e.name)
  if (keys.length >= o.crewSize) return w.full(o.crewSize)
  const failed = await outOfEgg($, o, e, r)
  if (failed) return failed
  await recrew($, o, [...keys, e.key])
  return w.joined(e.name)
}

async function leave($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  const e = findFriend(r.roster, wanted)
  if (!e) return wanted ? w.unknown(wanted) : w.usage
  const keys = await keysOut($, o, r)
  if (!keys.includes(e.key)) return w.notOut(e.name)
  if (keys.length === 1) return w.lastOne(e.name)
  await recrew($, o, keys.filter(k => k !== e.key))
  return w.benched(e.name)
}

// A bare `/buddy add` lets Haiku name it too.
async function add($: EngineInterface, o: Ctx, words: string[]) {
  const w = WORDS[o.lang]
  const friend = parseAdd(words) ?? { name: '' }
  const r = await rosterOf($, o)
  if (r.book.error) return w.badFile(r.book.error)
  if (friend.name && findFriend(r.roster, friend.name)) return w.taken(friend.name)
  const { left } = await eggs($, o.perEgg)
  if (left > 0) return w.locked(left)
  const hatched = await hatchNew($, o, friend, r)
  if ('failed' in hatched) return hatched.failed
  const hasRoom = await place($, o, hatched.name, false)
  return [w.added(hatched.name), hasRoom ? w.joined(hatched.name) : w.bench(hatched.name)].join('\n')
}

// A name picks who; without one, the first that is ready, else the lead, to say how long is left.
async function evolveOne($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const crew = (await membersNow($)) ?? (await hatchInto($, o))
  const named = wanted ? findFriend(crew, wanted) : undefined
  if (wanted && !named) return w.unknown(wanted)
  const leftOf = await evolvesIn($, o.perEvolve)
  const target = named ?? crew.find(m => leftOf(m.key) <= 0) ?? crew[0]!
  const left = leftOf(target.key)
  if (left > 0) return w.notYet(target.name, left)
  const failed = await evolveNow($, o, target)
  if (failed) return failed
  const out = await hatchInto($, o)
  const at = Math.max(0, out.findIndex(m => m.key === target.key))
  const said = w.evolved(titled(out[at]!))
  await speak($, at, said)
  return said
}

async function rm($: EngineInterface, o: Ctx, wanted: string) {
  const w = WORDS[o.lang]
  const book = await openBook($, o)
  if (book.error) return w.badFile(book.error)
  if (!wanted || !findFriend(book.friends, wanted)) return w.unknown(wanted)
  await Promise.all([writeBook($, book, without(book.raw, wanted)), forget($, keyOf(wanted))])
  await hatchInto($, o)
  return w.removed(wanted)
}
