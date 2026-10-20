import type { EngineInterface } from 'claude-code'
import type { Bones, Member } from '../types'
import { evolve, RARITIES, roll, SPECIES } from './bones.ts'
import { dreamOn, dreamUp } from './dream.ts'
import { describe, findFriend, keyOf, parseBook, upsert } from './friends.ts'
import type { Friend, Personality } from './friends.ts'
import type { Lang } from './lines.ts'
import { WORDS } from './words.ts'

// The options, read once; `species` is undefined for 'auto'.
export type Ctx = { name: string; personality: string; species?: string; active: string; file: string; lang: Lang; every: number; perEgg: number; perEvolve: number; banterChance: number; isRight: boolean; crewSize: number }

export const SOUL = { name: 'Buddy', personality: 'A small, curious terminal companion who comments on your work.' }

// `stage` counts evolutions, `at` the sessions together when the last one was spent; `title` is the epithet, in both languages.
type Born = { bones: Bones; name?: string; personality?: Personality; stage?: number; at?: number; title?: Record<Lang, string> }
type Births = Record<string, Born>
// A roster entry carries its key in `born`: '' for the original.
export type Entry = Friend & { key: string }

async function bornOf($: EngineInterface) {
  return ((await $.store.get('born')) ?? {}) as Births
}

async function togetherOf($: EngineInterface) {
  return ((await $.store.get('together')) ?? {}) as Record<string, number>
}

// Claude Code's own ~: USERPROFILE on Windows (even where Git Bash sets HOME), HOME elsewhere.
async function homeOf($: EngineInterface) {
  return (await $.env.get('USERPROFILE')) || (await $.env.get('HOME'))
}

// The original /buddy kept its soul in ~/.claude.json and rolled its bones from the account id; null when there is nothing to keep, undefined when it can't be read yet.
async function readLegacy($: EngineInterface): Promise<Born | null | undefined> {
  // CLAUDE_CONFIG_DIR moves .claude.json out of ~.
  const dir = (await $.env.get('CLAUDE_CONFIG_DIR')) || (await homeOf($))
  if (!dir) return null
  const path = `${dir}/.claude.json`
  try {
    const config = JSON.parse(await $.fs.read(path))
    if (!config.companion) return null
    const { name, personality } = config.companion
    return { bones: roll(String(config.oauthAccount?.accountUuid ?? config.userID ?? 'anon')), name: name && String(name), personality: personality && String(personality) }
  } catch {
    return (await $.fs.exists(path).catch(() => true)) ? undefined : null
  }
}

// The original buddy hatches free; ~/.claude.json is read once, so users of 0.2.0 keep theirs, else it is random, name and soul too.
async function withOriginal($: EngineInterface, o: Ctx): Promise<Births> {
  const [stored, migrated] = await Promise.all([bornOf($), $.store.get('migrated')])
  let born = stored
  if (migrated !== true && !born['']) {
    const legacy = await readLegacy($)
    // Claude Code may be mid-write: a stand-in for this session, nothing stored, and the next one tries again.
    if (legacy === undefined) return { ...born, '': { bones: roll(String(Math.random())) } }
    if (legacy) born = { ...born, '': legacy }
    await Promise.all([$.store.set('born', born), $.store.set('migrated', true)])
  }
  if (born['']) return born
  const bones = roll(String(Math.random()))
  const dreamt = await dreamUp($, undefined, bones, o.lang)
  born = { ...born, '': { bones, name: dreamt?.name, personality: dreamt?.soul } }
  await $.store.set('born', born)
  return born
}

// A missing file is an empty list; a broken one reports its error and is never written.
export type Book = { path: string; raw: unknown[]; friends: Friend[]; error?: string }

export async function openBook($: EngineInterface, o: Ctx): Promise<Book> {
  const isHome = o.file.startsWith('~/')
  const home = isHome ? await homeOf($) : ''
  if (isHome && !home) return { path: '', raw: [], friends: [], error: WORDS[o.lang].noHome }
  const path = isHome ? `${home}${o.file.slice(1)}` : o.file
  let text: string
  try {
    text = String(await $.fs.read(path))
  } catch {
    return { path, raw: [], friends: [] }
  }
  try {
    return { path, ...parseBook(text) }
  } catch (err) {
    return { path, raw: [], friends: [], error: err instanceof Error ? err.message : String(err) }
  }
}

export async function writeBook($: EngineInterface, book: Book, raw: unknown[]) {
  await $.fs.write(book.path, `${JSON.stringify(raw, null, 2)}\n`)
}

export async function rosterOf($: EngineInterface, o: Ctx) {
  const [born, book] = await Promise.all([withOriginal($, o), openBook($, o).catch((): Book => ({ path: '', raw: [], friends: [] }))])
  const original: Entry = { key: '', name: o.name || born['']?.name || SOUL.name, personality: o.personality || born['']?.personality, species: o.species }
  const roster: [Entry, ...Entry[]] = [original, ...book.friends.map(f => ({ ...f, key: keyOf(f.name) }))]
  await recordSpecies($, book, roster, born)
  return { roster, born, book }
}
// A buddy hatched before species lived in the file gets its rolled one written once, so the file can override it.
async function recordSpecies($: EngineInterface, book: Book, roster: Entry[], born: Births) {
  const missing = book.error ? [] : roster.filter(e => e.key && !e.species && born[e.key])
  if (!missing.length || !book.path) return
  for (const e of missing) e.species = born[e.key]!.bones.species
  await writeBook($, book, missing.reduce((raw, e) => upsert(raw, e.name, { species: e.species }), book.raw))
}

export type Roster = Awaited<ReturnType<typeof rosterOf>>

// Names or keys, in order: what /buddy use, join and leave wrote in `crew`; else the `active` option, else everyone hatched. 0.4's one `active` name leads either.
async function crewKeys($: EngineInterface, o: Ctx, { roster, born }: Pick<Roster, 'roster' | 'born'>): Promise<string[]> {
  const [crew, legacy] = await Promise.all([$.store.get('crew'), $.store.get('active')])
  if (Array.isArray(crew)) return crew.map(String)
  const base = o.active ? o.active.split(',').map(s => s.trim()).filter(Boolean) : roster.filter(e => born[e.key]).map(e => e.key)
  return typeof legacy === 'string' ? [legacy, ...base] : base
}

// null goes back to the option; the 0.4 `active` is cleared so it never shadows the option again.
export async function setCrew($: EngineInterface, keys: string[] | null) {
  await Promise.all([$.store.set('crew', keys), $.store.set('active', null)])
}

function memberOf(o: Ctx, e: Entry, born: Births): Member {
  const b = born[e.key]!
  return { key: e.key, name: e.name, title: b.title?.[o.lang], personality: describe(e.personality ?? b.personality ?? SOUL.personality), bones: { ...b.bones, species: e.species ?? b.bones.species } }
}

// Unknown names, eggs and repeats are skipped; with nobody left, the original comes out alone.
export async function hatchCrew($: EngineInterface, o: Ctx, r?: Roster): Promise<[Member, ...Member[]]> {
  const { roster, born } = r ?? (await rosterOf($, o))
  const keys = await crewKeys($, o, { roster, born })
  const found = keys.map(k => (k ? findFriend(roster, k) : roster[0]))
  const out = [...new Set(found)].filter((e): e is Entry => !!e && !!born[e.key]).slice(0, o.crewSize)
  const [first = roster[0], ...rest] = out
  return [first, ...rest].map(e => memberOf(o, e, born)) as [Member, ...Member[]]
}

// The epithet rides along wherever the buddy is named: the band and its own system prompt.
export const titled = (m: Member) => {
  // Haiku sometimes opens the epithet with the name anyway ("Gremolo, l'Oca Impassibile").
  const t = m.title?.replace(new RegExp(`^${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,\\s]+`, 'i'), '')
  return t ? `${m.name}, ${t}` : m.name
}

// Every `per` sessions earns one egg; `hatched` only grows, so removing a buddy frees no slot.
export async function eggs($: EngineInterface, per: number) {
  const [s, h] = await Promise.all([$.store.get('sessions'), $.store.get('hatched')])
  const [sessions, hatched] = [Number(s ?? 0), Number(h ?? 0)]
  return { done: Math.min(per, sessions - hatched * per), left: (hatched + 1) * per - sessions }
}

// A random roll; with `fresh`, rerolls until the species is one nobody in the roster has, unless all 18 are taken.
function rollNew(have: Set<string | undefined>, fresh: boolean): Bones {
  let b = roll(String(Math.random()))
  while (fresh && have.has(b.species) && SPECIES.some(s => !have.has(s))) b = roll(String(Math.random()))
  return b
}

// Spends an egg, only on success: random bones, a name and soul dreamt up when missing, written back into buddies.json.
export async function hatchNew($: EngineInterface, o: Ctx, friend: Friend, { roster, book, born: owned }: Roster): Promise<{ name: string } | { failed: string }> {
  const w = WORDS[o.lang]
  if (book.error) return { failed: w.badFile(book.error) }
  const rolled = rollNew(new Set(roster.map(e => e.species ?? owned[e.key]?.bones.species)), !friend.species)
  const dreamt = friend.name && friend.personality ? undefined : await dreamUp($, friend.name || undefined, { ...rolled, species: friend.species ?? rolled.species }, o.lang)
  const name = friend.name || dreamt?.name
  if (!name) return { failed: w.noName }
  if (!friend.name && findFriend(roster, name)) return { failed: w.taken(name) }
  // A file entry gets only what was dreamt up and its rolled species when it had none; the rest stays as written. A new one is written whole.
  const isNew = !findFriend(book.friends, name)
  const soul = friend.personality ? undefined : dreamt?.soul
  const species = friend.species ?? rolled.species
  if (isNew || soul || !friend.species) await writeBook($, book, upsert(book.raw, name, isNew ? { name, species, personality: friend.personality ?? soul } : { species, personality: soul }))
  const [born, hatched] = await Promise.all([bornOf($), $.store.get('hatched')])
  await Promise.all([$.store.set('born', { ...born, [keyOf(name)]: { bones: rolled } }), $.store.set('hatched', Number(hatched ?? 0) + 1)])
  return { name }
}

// A buddy still in its egg hatches when an egg is ready; the line to show when it cannot.
export async function outOfEgg($: EngineInterface, o: Ctx, e: Entry, r: Roster): Promise<string | undefined> {
  if (r.born[e.key]) return undefined
  const { left } = await eggs($, o.perEgg)
  if (left > 0) return WORDS[o.lang].stillEgg(e.name, left)
  const hatched = await hatchNew($, o, e, r)
  return 'failed' in hatched ? hatched.failed : undefined
}

// Each evolution costs `per` sessions times the rarity step (common 1×, legendary 5×), counted from the last one. Sessions left, by key.
export async function evolvesIn($: EngineInterface, per: number) {
  const [together, born] = await Promise.all([togetherOf($), bornOf($)])
  return (key: string) => {
    const b = born[key]
    // Buddies evolved before `at` existed: estimate the last evolution as stage × per; the rarity gap still applies.
    const since = b?.at ?? (b?.stage ?? 0) * per
    return since + per * (RARITIES.indexOf(b?.bones.rarity ?? 'common') + 1) - Number(together[key] ?? 0)
  }
}

// One write for the whole crew, so no count is lost to a parallel read.
export async function countSession($: EngineInterface, keys: string[]) {
  const together = await togetherOf($)
  await $.store.set('together', { ...together, ...Object.fromEntries(keys.map(k => [k, (together[k] ?? 0) + 1])) })
}

// Spends a ready evolution on a buddy that is out; nothing changes unless Haiku delivers the new soul. The line to show when it fails.
export async function evolveNow($: EngineInterface, o: Ctx, m: Member): Promise<string | undefined> {
  const w = WORDS[o.lang]
  const book = m.key ? await openBook($, o) : undefined
  if (book?.error) return w.badFile(book.error)
  const [born, together] = await Promise.all([bornOf($), togetherOf($)])
  const was = born[m.key]!
  const grown = evolve(was.bones)
  const dreamt = await dreamOn($, m.name, m.personality, { ...grown, species: m.bones.species }, m.title, o.lang)
  if (!dreamt) return w.noEvolve
  // A file buddy's soul lives in the file; the original's in the store.
  if (book) await writeBook($, book, upsert(book.raw, m.name, { personality: dreamt.soul }))
  await $.store.set('born', { ...born, [m.key]: { ...was, bones: grown, stage: (was.stage ?? 0) + 1, at: Number(together[m.key] ?? 0), title: dreamt.title, ...(book ? {} : { personality: dreamt.soul }) } })
  return undefined
}

export async function forget($: EngineInterface, key: string) {
  const [born, together] = await Promise.all([bornOf($), togetherOf($)])
  delete born[key]
  delete together[key]
  await Promise.all([$.store.set('born', born), $.store.set('together', together)])
}
