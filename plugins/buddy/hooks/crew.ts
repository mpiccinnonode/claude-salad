import type { EngineInterface } from 'claude-code'
import type { Bones, Member } from '../types'
import { ALL_SPECIES, evolve, RARITIES, roll } from './bones.ts'
import { dreamOn, dreamUp } from './dream.ts'
import { asPersonality, describe, findFriend, keyOf, parseBook, upsert } from './friends.ts'
import type { Friend, Personality } from './friends.ts'
import type { Lang } from './lines.ts'
import { WORDS } from './words.ts'

// The options, read once; `old` holds 0.8's overrides of the original, read only to move it into the buddies file.
export type Ctx = { old: { name: string; personality: string; species?: string }; active: string; file: string; lang: Lang; every: number; perEgg: number; perEvolve: number; banterChance: number; isRight: boolean; crewSize: number }

export const SOUL = { name: 'Buddy', personality: 'A small, curious terminal companion who comments on your work.' }

// `stage` counts evolutions, `at` the sessions together when the last one was spent; `title` is the epithet, in both languages.
type Born = { bones: Bones; stage?: number; at?: number; title?: Record<Lang, string> }
type Births = Record<string, Born>
// Until 0.9 the original kept its name and soul in the store, under ''.
type Kept = Born & { name?: string; personality?: Personality }
// A roster entry carries its key in `born`.
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
async function readLegacy($: EngineInterface): Promise<Kept | null | undefined> {
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

// The original moves to the top of the buddies file once (`moved`), under its own name, and is a buddy like any other from then on; a new user's first buddy hatches free the same way.
async function withOriginal($: EngineInterface, o: Ctx, book: Book): Promise<{ born: Births; book: Book }> {
  const [born, moved, migrated] = await Promise.all([bornOf($), $.store.get('moved'), $.store.get('migrated')])
  // A broken or unreachable file is never written: it waits, and the stand-in shows meanwhile.
  if (moved === true || book.error || !book.path) return { born, book }
  // ~/.claude.json is read once (`migrated`), so users of 0.2.0 keep theirs; else it is random, name and soul too.
  const kept = (born[''] as Kept | undefined) ?? (migrated === true ? null : await readLegacy($))
  // Claude Code may be mid-write: nothing stored, and the next session tries again.
  if (kept === undefined) return { born, book }
  // Sessions started together race here: one rekeyed `born` before `moved` landed, so the original is already in the file.
  if (!kept && Object.keys(born).length) return settled($, o)
  const bones = kept?.bones ?? roll(String(Math.random()))
  const dreamt = kept ? undefined : await dreamUp($, o.old.name || undefined, bones, o.lang)
  // shortcut: two first sessions whose dreams end within the same instant still both hatch; a store with compare-and-set would close it.
  if (dreamt && (await $.store.get('moved')) === true) return settled($, o)
  const wanted = o.old.name || kept?.name || dreamt?.name || SOUL.name
  const species = o.old.species ?? bones.species
  const personality = asPersonality(o.old.personality) ?? kept?.personality ?? dreamt?.soul
  // The same original written by a session started alongside is reused, not numbered.
  const twin = findFriend(book.friends, wanted)
  const isTwin = !!kept && twin?.species === species && JSON.stringify(twin.personality) === JSON.stringify(asPersonality(personality))
  let name = wanted
  for (let n = 2; !isTwin && findFriend(book.friends, name); n++) name = `${wanted} ${n}`
  const friend: Friend = { name, species, personality }
  const raw = isTwin ? book.raw : [friend, ...book.raw]
  if (!isTwin) await writeBook($, book, raw)
  const key = keyOf(name)
  const [together, crew] = await Promise.all([togetherOf($), $.store.get('crew')])
  const { '': _, ...others } = born
  const { '': count, ...counts } = together
  const rekeyed = { ...others, [key]: { bones, stage: kept?.stage, at: kept?.at, title: kept?.title } }
  await Promise.all([
    $.store.set('born', rekeyed),
    $.store.set('together', count === undefined ? counts : { ...counts, [key]: count }),
    Array.isArray(crew) && $.store.set('crew', crew.map(k => (k === '' ? key : k))),
    $.store.set('moved', true),
  ])
  return { born: rekeyed, book: { ...book, raw, friends: isTwin ? book.friends : [friend, ...book.friends] } }
}

// Another session moved the original: fresh reads, so a stale file is never written back over its entry.
async function settled($: EngineInterface, o: Ctx): Promise<{ born: Births; book: Book }> {
  await $.store.set('moved', true)
  return { born: await bornOf($), book: await openBook($, o) }
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
  const { born, book } = await withOriginal($, o, await openBook($, o).catch((): Book => ({ path: '', raw: [], friends: [] })))
  const roster: Entry[] = book.friends.map(f => ({ ...f, key: keyOf(f.name) }))
  await recordSpecies($, book, roster, born)
  return { roster, born, book }
}
// A buddy hatched before species lived in the file gets its rolled one written once, so the file can override it.
async function recordSpecies($: EngineInterface, book: Book, roster: Entry[], born: Births) {
  const missing = book.error ? [] : roster.filter(e => !e.species && born[e.key])
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
  return { key: e.key, name: e.name, title: b.title?.[o.lang], personality: describe(e.personality ?? SOUL.personality), bones: { ...b.bones, species: e.species ?? b.bones.species } }
}

// Unknown names, eggs and repeats are skipped; with nobody left, the first one hatched comes out alone, and with nobody hatched, no one.
export async function hatchCrew($: EngineInterface, o: Ctx, r?: Roster): Promise<Member[]> {
  const { roster, born } = r ?? (await rosterOf($, o))
  const keys = await crewKeys($, o, { roster, born })
  const out = [...new Set(keys.map(k => findFriend(roster, k)))].filter((e): e is Entry => !!e && !!born[e.key]).slice(0, o.crewSize)
  const first = roster.find(e => born[e.key])
  return (out.length ? out : first ? [first] : []).map(e => memberOf(o, e, born))
}

// The epithet rides along wherever the buddy is named: the band and its own system prompt.
export const titled = (m: Member) => {
  // Haiku sometimes opens the epithet with the name anyway ("Gremolo, l'Oca Impassibile").
  const t = m.title?.replace(new RegExp(`^${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,\\s]+`, 'i'), '')
  return t ? `${m.name}, ${t}` : m.name
}

// Eggs are counted from `eggBase` (sessions when the last egg was spent), so changing `per` or losing sessions never leaves a negative count; `hatched * per` seeds it for older stores.
export async function eggs($: EngineInterface, per: number) {
  const [s, h, b] = await Promise.all([$.store.get('sessions'), $.store.get('hatched'), $.store.get('eggBase')])
  const sessions = Number(s ?? 0)
  const base = Math.min(Number(b ?? Number(h ?? 0) * per), sessions)
  return { base, done: Math.min(per, sessions - base), left: base + per - sessions }
}

// A random roll over every species; with `fresh`, one nobody in the roster has, unless all are taken.
function rollNew(have: Set<string | undefined>, fresh: boolean): Bones {
  const free = ALL_SPECIES.filter(s => !have.has(s))
  const pool = fresh && free.length ? free : ALL_SPECIES
  return { ...roll(String(Math.random())), species: pool[Math.floor(Math.random() * pool.length)]! }
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
  const [born, hatched, { base }] = await Promise.all([bornOf($), $.store.get('hatched'), eggs($, o.perEgg)])
  await Promise.all([$.store.set('born', { ...born, [keyOf(name)]: { bones: rolled } }), $.store.set('hatched', Number(hatched ?? 0) + 1), $.store.set('eggBase', base + o.perEgg)])
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
  const book = await openBook($, o)
  if (book.error) return w.badFile(book.error)
  const [born, together] = await Promise.all([bornOf($), togetherOf($)])
  const was = born[m.key]!
  const grown = evolve(was.bones)
  const dreamt = await dreamOn($, m.name, m.personality, { ...grown, species: m.bones.species }, m.title, o.lang)
  if (!dreamt) return w.noEvolve
  await writeBook($, book, upsert(book.raw, m.name, { personality: dreamt.soul }))
  await $.store.set('born', { ...born, [m.key]: { ...was, bones: grown, stage: (was.stage ?? 0) + 1, at: Number(together[m.key] ?? 0), title: dreamt.title } })
  return undefined
}

export async function forget($: EngineInterface, key: string) {
  const [born, together] = await Promise.all([bornOf($), togetherOf($)])
  delete born[key]
  delete together[key]
  await Promise.all([$.store.set('born', born), $.store.set('together', together)])
}
