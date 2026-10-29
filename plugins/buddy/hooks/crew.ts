import type { EngineInterface } from 'claude-code'
import type { Bones, Card, Listing, Member } from '../types'
import { ALL_SPECIES, evolve, RARITIES, roll } from './bones.ts'
import { dreamDrift, dreamOn, dreamTies, dreamUp } from './dream.ts'
import { asPersonality, describe, findFriend, inShape, isLove, keyOf, parseBook, relink, upsert, withRelations } from './friends.ts'
import type { Friend, Personality } from './friends.ts'
import type { Lang } from './lines.ts'
import { WORDS } from './words.ts'

// The options, read once; `old` holds 0.8's overrides of the original, read only to move it into the buddies file.
export type Ctx = { old: { name: string; personality: string; species?: string }; active: string; file: string; lang: Lang; every: number; perEgg: number; perEvolve: number; banterChance: number; isRight: boolean; crewSize: number }

export const SOUL = { name: 'Buddy', personality: 'A small, curious terminal companion who comments on your work.' }

// `stage` counts evolutions, `ats` the turns together when the last one was spent (`at`: the same in sessions, before turns counted); `title` is the epithet, in both languages.
type Born = { bones: Bones; stage?: number; at?: number; ats?: number; title?: Record<Lang, string> }
type Births = Record<string, Born>
// Until 0.9 the original kept its name and soul in the store, under ''.
type Kept = Born & { name?: string; personality?: Personality }
// A roster entry carries its key in `born`.
export type Entry = Friend & { key: string }

async function bornOf($: EngineInterface) {
  return ((await $.store.get('born')) ?? {}) as Births
}

// Before turns counted, 0.9 kept sessions per buddy here; it is read, never written again.
async function legacyTogether($: EngineInterface) {
  return ((await $.store.get('together')) ?? {}) as Record<string, number>
}

// What a session counts: every turn, and the turns of each buddy that was out for it.
export type Tally = { all: number; by: Record<string, number> }
const TALLY = 'tally:'
// A session's sessions were worth about this many turns when 0.9's counts are carried over.
const TURNS_PER_SESSION = 20

// The store has no compare-and-set, so no counter is read-modify-written by two sessions: each session writes only its own `tally:<id>` and a total is the sum of them all.
// ponytail: tallies are never folded together, ~60 bytes a session against the store's 4 MiB; fold them under one idempotent key if that ever shows.
export async function writeTally($: EngineInterface, id: string, tally: Tally) {
  await $.store.set(`${TALLY}${id}`, tally)
}

async function tallies($: EngineInterface) {
  const keys = (await $.store.keys()).filter(k => k.startsWith(TALLY))
  return (await Promise.all(keys.map(k => $.store.get(k)))).filter((t): t is Tally => !!t) as Tally[]
}

async function turnsTogether($: EngineInterface) {
  const [sessions, all] = await Promise.all([$.store.get('sessions'), tallies($)])
  return Number(sessions ?? 0) * TURNS_PER_SESSION + all.reduce((n, t) => n + t.all, 0)
}

// Turns per buddy; `zero` is what each one had when it was removed, so a buddy added again under the same name starts over.
async function togetherOf($: EngineInterface) {
  const [legacy, all, zero] = await Promise.all([legacyTogether($), tallies($), $.store.get('zero')])
  const total: Record<string, number> = Object.fromEntries(Object.entries(legacy).map(([k, n]) => [k, n * TURNS_PER_SESSION]))
  for (const t of all) for (const [k, n] of Object.entries(t.by)) total[k] = (total[k] ?? 0) + n
  for (const [k, n] of Object.entries((zero ?? {}) as Record<string, number>)) if (k in total) total[k] = Math.max(0, total[k]! - n)
  return total
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
  const [together, crew] = await Promise.all([legacyTogether($), $.store.get('crew')])
  const { '': _, ...others } = born
  const { '': count, ...counts } = together
  const rekeyed = { ...others, [key]: { bones, stage: kept?.stage, at: kept?.at, ats: kept?.ats, title: kept?.title } }
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

// A renamed buddy keeps the key it was born under: `aka` maps its new name's key to it, so the turns other sessions are counting still land.
type Aka = Record<string, string>
const keyIn = (aka: Aka, name: string) => aka[keyOf(name)] ?? keyOf(name)

export async function rosterOf($: EngineInterface, o: Ctx) {
  const [{ born, book }, aka] = await Promise.all([
    withOriginal($, o, await openBook($, o).catch((): Book => ({ path: '', raw: [], friends: [] }))),
    $.store.get('aka').then(a => (a ?? {}) as Aka),
  ])
  const roster: Entry[] = book.friends.map(f => ({ ...f, key: keyIn(aka, f.name) }))
  await recordSpecies($, book, roster, born)
  return { roster, born, book, aka }
}

// A key someone else holds in the store: a name that maps to it would wear their body.
export const isHeld = ({ born, aka }: Pick<Roster, 'born' | 'aka'>, key: string, self?: string) => key !== self && (key in born || Object.values(aka).includes(key))

// Renames in the buddies file; the store's key stays. The line to show when it cannot.
export async function rename($: EngineInterface, o: Ctx, e: { key: string; name: string }, wanted: string): Promise<string | undefined> {
  const w = WORDS[o.lang]
  const name = wanted.trim()
  if (!name) return w.emptyName
  const r = await rosterOf($, o)
  if (r.book.error) return w.badFile(r.book.error)
  const other = findFriend(r.roster, name)
  if ((other && other.key !== e.key) || (!other && isHeld(r, keyOf(name), e.key))) return w.taken(name)
  const { [keyOf(e.name)]: _, ...aka } = r.aka
  await writeBook($, r.book, relink(upsert(r.book.raw, e.name, { name }), e.name, name))
  await $.store.set('aka', keyOf(name) === e.key ? aka : { ...aka, [keyOf(name)]: e.key })
  return undefined
}
// A buddy born without a personality (Haiku failed at hatch) gets one dreamt at the next session start; a failure changes nothing and retries then.
export async function soulUp($: EngineInterface, o: Ctx) {
  const { roster, born, book } = await rosterOf($, o)
  const bare = book.error ? [] : roster.filter(e => born[e.key] && !e.personality)
  const dreamt = await Promise.all(bare.map(e => dreamUp($, e.name, { ...born[e.key]!.bones, species: e.species ?? born[e.key]!.bones.species }, o.lang)))
  const souls = bare.flatMap((e, i) => (dreamt[i]?.soul ? [{ name: e.name, soul: dreamt[i]!.soul }] : []))
  if (!souls.length) return
  // Fresh read, so a file edited while Haiku was thinking is never written back stale.
  const fresh = await openBook($, o)
  if (fresh.error) return
  await writeBook($, fresh, souls.reduce((raw, { name, soul }) => (findFriend(fresh.friends, name)?.personality ? raw : upsert(raw, name, { personality: soul })), fresh.raw))
}

// After a Haiku call, only the relations to buddies still in the file: one renamed or removed meanwhile would come back as an orphan.
const stillIn = (friends: Friend[], rels: Record<string, string>) => Object.fromEntries(Object.entries(rels).filter(([n]) => findFriend(friends, n)))

// Relations, from 0.13: at every session start the file's relations are put in shape (`inShape`, content kept); once (`related`), buddies with no
// relations field get them from Haiku.
export async function relateUp($: EngineInterface, o: Ctx) {
  const book = await openBook($, o)
  if (book.error || !book.path) return
  const raw = inShape(book.raw)
  if (JSON.stringify(raw) !== JSON.stringify(book.raw)) await writeBook($, book, raw)
  if ((await $.store.get('related')) === true) return
  const has = (name: string) => raw.some(e => keyOf(String((e as Friend | null)?.name ?? '')) === keyOf(name) && 'relations' in (e as object))
  const bare = book.friends.filter(f => !has(f.name)).map(f => f.name)
  // A lone buddy, or none yet (a first run moves the original in later), has nobody to relate to: it waits for a second one.
  if (book.friends.length < 2) return
  const { ties, isWhole } = bare.length ? await dreamTies($, book.friends, bare, o.lang) : { ties: {}, isWhole: true }
  // Fresh read after Haiku: an edit made meanwhile is kept, and an entry given relations meanwhile is left alone.
  const fresh = await openBook($, o)
  if (fresh.error) return
  const still = (name: string) => fresh.raw.some(e => keyOf(String((e as Friend | null)?.name ?? '')) === keyOf(name) && !('relations' in (e as object)))
  const written = Object.entries(ties).filter(([name]) => still(name)).reduce((r, [name, rels]) => withRelations(r, name, stillIn(fresh.friends, rels)), fresh.raw)
  if (written !== fresh.raw) await writeBook($, fresh, written)
  // What worked is written either way; a failed batch is asked again at the next start, for those names only.
  if (isWhole) await $.store.set('related', true)
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

// The room the list pane set, else the `crewSize` option.
export async function crewSizeOf($: EngineInterface, o: Ctx) {
  const n = Math.floor(Number(await $.store.get('crewSize')))
  return n >= 1 ? n : o.crewSize
}

export async function setCrewSize($: EngineInterface, n: number) {
  await $.store.set('crewSize', n)
}

// null goes back to the option; the 0.4 `active` is cleared so it never shadows the option again.
export async function setCrew($: EngineInterface, keys: string[] | null) {
  await Promise.all([$.store.set('crew', keys), $.store.set('active', null)])
}

export function memberOf(o: Ctx, e: Entry, born: Births): Member {
  const b = born[e.key]!
  return { key: e.key, name: e.name, title: b.title?.[o.lang], personality: describe(e.personality ?? SOUL.personality), bones: { ...b.bones, species: e.species ?? b.bones.species }, ...(e.relations ? { relations: e.relations } : {}) }
}

// Unknown names, eggs and repeats are skipped; with nobody left, the first one hatched comes out alone, and with nobody hatched, no one.
export async function hatchCrew($: EngineInterface, o: Ctx, r?: Roster): Promise<Member[]> {
  const { roster, born } = r ?? (await rosterOf($, o))
  const [keys, size] = await Promise.all([crewKeys($, o, { roster, born }), crewSizeOf($, o)])
  const out = [...new Set(keys.map(k => roster.find(e => e.key === k) ?? findFriend(roster, k)))].filter((e): e is Entry => !!e && !!born[e.key]).slice(0, size)
  const first = roster.find(e => born[e.key])
  return (out.length ? out : first ? [first] : []).map(e => memberOf(o, e, born))
}

// The epithet rides along wherever the buddy is named: the band and its own system prompt.
export const titled = (m: Member) => {
  // Haiku sometimes opens the epithet with the name anyway ("Gremolo, l'Oca Impassibile").
  const t = m.title?.replace(new RegExp(`^${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,\\s]+`, 'i'), '')
  return t ? `${m.name}, ${t}` : m.name
}

// Eggs are counted from `eggAt` (turns when the last egg was spent), so changing `per` or losing turns never leaves a negative count; the sessions-based `eggBase` of 0.9, else `hatched * per`, seeds it for older stores.
export async function eggs($: EngineInterface, per: number) {
  const [turns, h, at, b] = await Promise.all([turnsTogether($), $.store.get('hatched'), $.store.get('eggAt'), $.store.get('eggBase')])
  const base = Math.min(Number(at ?? (b === undefined ? Number(h ?? 0) * per : Number(b) * TURNS_PER_SESSION)), turns)
  // A seed or clamp not written down would be redone from the new total at every read, and the egg would never fill.
  if (at === undefined || Number(at) > turns) await $.store.set('eggAt', base)
  return { base, done: Math.min(per, turns - base), left: base + per - turns }
}

// A random roll over every species; with `fresh`, one nobody in the roster has, unless all are taken.
function rollNew(have: Set<string | undefined>, fresh: boolean): Bones {
  const free = ALL_SPECIES.filter(s => !have.has(s))
  const pool = fresh && free.length ? free : ALL_SPECIES
  return { ...roll(String(Math.random())), species: pool[Math.floor(Math.random() * pool.length)]! }
}

// Spends an egg, only on success: random bones, a name and soul dreamt up when missing, written back into buddies.json.
export async function hatchNew($: EngineInterface, o: Ctx, friend: Friend, { roster, book, born: owned, aka }: Roster): Promise<{ name: string; key: string } | { failed: string }> {
  const w = WORDS[o.lang]
  if (book.error) return { failed: w.badFile(book.error) }
  const rolled = rollNew(new Set(roster.map(e => e.species ?? owned[e.key]?.bones.species)), !friend.species)
  const dreamt = friend.name && friend.personality ? undefined : await dreamUp($, friend.name || undefined, { ...rolled, species: friend.species ?? rolled.species }, o.lang)
  const name = friend.name || dreamt?.name
  if (!name) return { failed: w.noName }
  if (!friend.name && findFriend(roster, name)) return { failed: w.taken(name) }
  const key = keyIn(aka, name)
  if (!findFriend(roster, name) && isHeld({ born: owned, aka }, key)) return { failed: w.taken(name) }
  // A file entry gets only what was dreamt up and its rolled species when it had none; the rest stays as written. A new one is written whole.
  const isNew = !findFriend(book.friends, name)
  const soul = friend.personality ? undefined : dreamt?.soul
  const species = friend.species ?? rolled.species
  if (isNew || soul || !friend.species) await writeBook($, book, upsert(book.raw, name, isNew ? { name, species, personality: friend.personality ?? soul } : { species, personality: soul }))
  const [born, hatched, { base }] = await Promise.all([bornOf($), $.store.get('hatched'), eggs($, o.perEgg)])
  await Promise.all([$.store.set('born', { ...born, [key]: { bones: rolled } }), $.store.set('hatched', Number(hatched ?? 0) + 1), $.store.set('eggAt', base + o.perEgg)])
  return { name, key }
}

// A buddy still in its egg hatches when an egg is ready; the line to show when it cannot.
export async function outOfEgg($: EngineInterface, o: Ctx, e: Entry, r: Roster): Promise<string | undefined> {
  if (r.born[e.key]) return undefined
  const { left } = await eggs($, o.perEgg)
  if (left > 0) return WORDS[o.lang].stillEgg(e.name, left)
  const hatched = await hatchNew($, o, e, r)
  return 'failed' in hatched ? hatched.failed : undefined
}

// Each evolution costs `per` turns times the rarity step (common 1×, +½ a step, legendary 3×), counted from the last one. Turns left, by key.
export async function evolvesIn($: EngineInterface, per: number) {
  const [together, born] = await Promise.all([togetherOf($), bornOf($)])
  return (key: string) => {
    const b = born[key]
    // `at` is 0.9's, in sessions; before it existed, estimate the last evolution as stage × per. The rarity gap still applies.
    const since = b?.ats ?? (b?.at === undefined ? (b?.stage ?? 0) * per : b.at * TURNS_PER_SESSION)
    return since + Math.ceil(per * (1 + RARITIES.indexOf(b?.bones.rarity ?? 'common') / 2)) - Number(together[key] ?? 0)
  }
}

// Spends a ready evolution on a buddy that is out; nothing changes unless Haiku delivers the new soul. The line to show when it fails.
export async function evolveNow($: EngineInterface, o: Ctx, m: Member): Promise<string | undefined> {
  const w = WORDS[o.lang]
  const book = await openBook($, o)
  if (book.error) return w.badFile(book.error)
  const [born, together] = await Promise.all([bornOf($), togetherOf($)])
  const was = born[m.key]!
  const grown = evolve(was.bones)
  const mates = (await hatchCrew($, o)).filter(c => c.key !== m.key).map(c => ({ name: c.name, relation: m.relations?.[keyOf(c.name)] }))
  const dreamt = await dreamOn($, m.name, m.personality, { ...grown, species: m.bones.species }, m.title, o.lang, mates)
  if (!dreamt) return w.noEvolve
  // Fresh read after Haiku, so an edit made meanwhile is kept.
  const now = await openBook($, o)
  if (now.error) return w.badFile(now.error)
  const souled = upsert(now.raw, m.name, { personality: dreamt.soul })
  const rels = stillIn(now.friends, dreamt.relations)
  await writeBook($, now, Object.keys(rels).length ? withRelations(souled, m.name, rels) : souled)
  await Promise.all([$.store.set('born', { ...born, [m.key]: { ...was, bones: grown, stage: (was.stage ?? 0) + 1, ats: Number(together[m.key] ?? 0), title: dreamt.title } }), driftedAt($, m.key, Number(together[m.key] ?? 0))])
  return undefined
}

// The turns together of each buddy when its relations last shifted (`drifts`); an evolution counts as one.
async function driftsOf($: EngineInterface) {
  return ((await $.store.get('drifts')) ?? {}) as Record<string, number>
}
async function driftedAt($: EngineInterface, key: string, at: number) {
  await $.store.set('drifts', { ...(await driftsOf($)), [key]: at })
}

// Relations shift without waiting for an evolution: every fifth of `perEvolve` turns a buddy spends out with others, its view of them takes a step.
// One buddy per turn, the longest due, so after an upgrade they catch up one by one. The clock moves before Haiku: a failure waits for the next step.
export async function driftOne($: EngineInterface, o: Ctx, crew: Member[]) {
  const out = crew.filter(m => m.key)
  if (out.length < 2) return false
  const [together, drifts] = await Promise.all([togetherOf($), driftsOf($)])
  const step = Math.ceil(o.perEvolve / 5)
  const overdue = (m: Member) => (together[m.key] ?? 0) - (drifts[m.key] ?? 0) - step
  const [m] = out.filter(x => overdue(x) >= 0).sort((a, b) => overdue(b) - overdue(a))
  if (!m) return false
  const at = together[m.key] ?? 0
  await driftedAt($, m.key, at)
  const mates = out.filter(c => c.key !== m.key).map(c => ({ name: c.name, relation: m.relations?.[keyOf(c.name)], back: c.relations?.[keyOf(m.name)] }))
  // Once every `perEvolve` of its turns (one step in five) something may change for real, a new love among them; the other steps stay close to what was.
  const rels = await dreamDrift($, m.name, m.personality, o.lang, mates, Math.floor(at / step) % 5 === 0)
  if (!rels) return false
  // Fresh read after Haiku, so an edit made meanwhile is kept.
  const now = await openBook($, o)
  const kept = now.error || !findFriend(now.friends, m.name) ? {} : stillIn(now.friends, rels)
  if (!Object.keys(kept).length) return false
  await writeBook($, now, withRelations(now.raw, m.name, kept))
  return true
}

export async function forget($: EngineInterface, key: string) {
  const [born, together, zero, aka, nests, drifts] = await Promise.all([bornOf($), togetherOf($), ($.store.get('zero') as Promise<Record<string, number> | undefined>).then(z => z ?? {}), $.store.get('aka').then(a => (a ?? {}) as Aka), nestsOf($), driftsOf($)])
  delete drifts[key]
  delete born[key]
  const kept = Object.fromEntries(Object.entries(aka).filter(([, k]) => k !== key))
  // Its couples go too, so one added again under its name starts over with them as well.
  const gone = [key, ...Object.keys(together).filter(k => inPair(k, key))]
  // `together` is already net of the old zero, so the new one adds to it.
  const zeroed = { ...zero, ...Object.fromEntries(gone.map(k => [k, (zero[k] ?? 0) + (together[k] ?? 0)])) }
  await Promise.all([$.store.set('born', born), $.store.set('zero', zeroed), $.store.set('aka', kept), $.store.set('nests', Object.fromEntries(Object.entries(nests).filter(([k]) => !gone.includes(k)))), $.store.set('drifts', drifts)])
}

// Two buddies out who each call the other their love; their turns together count under `pairOf` in the tallies.
export const pairOf = (a: string, b: string) => JSON.stringify([a, b].sort())
const inPair = (k: string, key: string) => {
  try {
    const p: unknown = k.startsWith('[') ? JSON.parse(k) : undefined
    return Array.isArray(p) && p.includes(key)
  } catch {
    return false
  }
}
export function loversIn(crew: Member[]) {
  const loves = (a: Member, b: Member) => isLove(a.relations?.[keyOf(b.name)])
  return crew.flatMap((a, i) => crew.slice(i + 1).filter(b => a.key && b.key && loves(a, b) && loves(b, a)).map(b => [a, b] as const))
}

// The turns together of each couple when it last laid an egg.
async function nestsOf($: EngineInterface) {
  return ((await $.store.get('nests')) ?? {}) as Record<string, number>
}

// Lovers out together lay an egg of their own every half `per` turns they spend together, besides the usual ones: the couples whose egg is ready.
export async function nestsReady($: EngineInterface, o: Ctx, crew: Member[]) {
  const [together, nests] = await Promise.all([togetherOf($), nestsOf($)])
  return loversIn(crew).filter(([a, b]) => (together[pairOf(a.key, b.key)] ?? 0) - (nests[pairOf(a.key, b.key)] ?? 0) >= Math.ceil(o.perEgg / 2))
}

// Spends a couple's egg, only on success: one parent's species and the rest rolled, a name and soul dreamt from both, and the relations written both ways.
export async function hatchLove($: EngineInterface, o: Ctx, [a, b]: readonly [Member, Member]): Promise<{ name: string; key: string } | { failed: string }> {
  const w = WORDS[o.lang]
  const r = await rosterOf($, o)
  if (r.book.error) return { failed: w.badFile(r.book.error) }
  const bones = { ...roll(String(Math.random())), species: (Math.random() < 0.5 ? a : b).bones.species }
  const dreamt = await dreamUp($, undefined, bones, o.lang, [a, b])
  if (!dreamt) return { failed: w.noChild }
  const { name, soul } = dreamt
  // Fresh read after Haiku: an edit made meanwhile is kept, and parents renamed or removed meanwhile lay nothing.
  const fresh = await rosterOf($, o)
  if (fresh.book.error) return { failed: w.badFile(fresh.book.error) }
  if (!findFriend(fresh.book.friends, a.name) || !findFriend(fresh.book.friends, b.name)) return { failed: w.noChild }
  const key = keyIn(fresh.aka, name)
  if (findFriend(fresh.roster, name) || isHeld(fresh, key)) return { failed: w.taken(name) }
  const child = upsert(fresh.book.raw, name, { name, species: bones.species, personality: soul, relations: [{ [a.name]: w.parentRel }, { [b.name]: w.parentRel }] } as never)
  await writeBook($, fresh.book, [a, b].reduce((raw, p) => withRelations(raw, p.name, { [name]: w.childRel }), child))
  const [born, together, nests] = await Promise.all([bornOf($), togetherOf($), nestsOf($)])
  const pair = pairOf(a.key, b.key)
  await Promise.all([$.store.set('born', { ...born, [key]: { bones } }), $.store.set('nests', { ...nests, [pair]: together[pair] ?? 0 })])
  return { name, key }
}

// Every buddy in the file as the list pane shows it: where it stands, its body once hatched, turns left to evolve.
export async function listingOf($: EngineInterface, o: Ctx): Promise<Listing> {
  const r = await rosterOf($, o)
  const [out, egg, leftOf, crewSize] = await Promise.all([hatchCrew($, o, r), eggs($, o.perEgg), evolvesIn($, o.perEvolve), crewSizeOf($, o)])
  const keys = out.map(m => m.key)
  const cards = r.roster.map((e): Card => {
    const b = r.born[e.key]
    const card: Card = { key: e.key, name: e.name, species: e.species ?? b?.bones.species ?? '', status: !b ? 'egg' : e.key === keys[0] ? 'lead' : keys.includes(e.key) ? 'crew' : 'bench' }
    if (e.personality !== undefined) card.personality = e.personality
    // Shown under the mate's current name; a relation to someone gone keeps the key it was written under.
    if (e.relations) card.relations = Object.entries(e.relations).map(([k, rel]) => [r.roster.find(x => keyOf(x.name) === k)?.name ?? k, rel])
    if (!b) return card
    const title = b.title?.[o.lang]
    return { ...card, bones: { ...b.bones, species: card.species }, left: leftOf(e.key), ...(title ? { title } : {}) }
  })
  return { cards, crewSize, egg: { done: egg.done, per: o.perEgg, left: egg.left }, ...(r.book.error ? { error: r.book.error } : {}) }
}
