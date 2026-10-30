import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'
import type { Bones, Listing, Member, PaneUi, Pressed, Quip, Ready } from '../types'
import { eggs, evolvesIn, hatchCrew, listingOf, loversIn, nestsReady, pairOf, soulUp, SOUL, titled, writeTally } from './crew.ts'
import type { Ctx, Tally } from './crew.ts'
import { keyOf } from './friends.ts'
import { line } from './lines.ts'
import type { Reason } from './lines.ts'
import { WORDS } from './words.ts'

// The validator reads atoms only in the file that declares them: every read and update of the session's state lives here.
const quip = atom({ plugin: 'buddy', key: 'quip' } as const, null as Quip)
const isHidden = atom({ plugin: 'buddy', key: 'isHidden' } as const, false)
const tick = atom({ plugin: 'buddy', key: 'tick' } as const, 0)
const members = atom({ plugin: 'buddy', key: 'members' } as const, null as Member[] | null)
const pressed = atom({ plugin: 'buddy', key: 'pressed' } as const, null as Pressed)
const isStats = atom({ plugin: 'buddy', key: 'isStats' } as const, false)
// Index into `members` of the one whose bubble shows; wrapped, so a crew that shrank still points at someone.
const speaker = atom({ plugin: 'buddy', key: 'speaker' } as const, 0)
// What is ready to spend, drawn in its own box beside the bubble so it never covers what a buddy says.
const ready = atom({ plugin: 'buddy', key: 'ready' } as const, { egg: false, glow: [], nests: [] } as Ready)
// The list pane: what it shows, read from disk (null while it is shut), and what the person picked in it.
const listing = atom({ plugin: 'buddy', key: 'listing' } as const, null as Listing | null)
export const PANE_START: PaneUi = { sel: '', filter: 'all', rarity: 'all', species: 'all', query: '', mode: 'view', note: '', isBusy: false, draft: { name: '', species: '', soul: '' } }
const pane = atom({ plugin: 'buddy', key: 'pane' } as const, PANE_START)

// What the session remembers between events, outside the atoms.
export type Live = { turns: number; lastAnswer: string; lastCannedAt: number; lastActiveAt: number; id: string; tally: Tally; isRefreshing: boolean; subTurns: number }

// The band looks at the disk again every this many beats (~3s).
const REFRESH_BEATS = 10
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Before anyone hatches, or with the buddies file broken, there is no crew: a plain common blob stands in, under the key ''.
const FALLBACK: Bones = { rarity: 'common', species: 'blob', eye: '·', hat: 'none', isShiny: false, stats: { DEBUGGING: 30, PATIENCE: 30, CHAOS: 30, WISDOM: 30, SNARK: 30 }, peak: 'PATIENCE' }
export const crewOr = (crew: Member[] | null): [Member, ...Member[]] =>
  crew?.length ? (crew as [Member, ...Member[]]) : [{ key: '', ...SOUL, bones: FALLBACK }]

// Fills the session's atoms from disk; safe to call again whenever they come back empty (a /clear starts them over). Resolves who is out, the stand-in included.
export async function hatchInto($: EngineInterface, o: Ctx) {
  await soulUp($, o)
  const [hatched, wasHidden] = await Promise.all([hatchCrew($, o), $.store.get('isHidden')])
  const now = await readinessOf($, o, hatched)
  await Promise.all([update($, members, () => hatched), update($, ready, () => now), update($, isHidden, () => wasHidden === true), update($, speaker, () => 0), clearDialogue($)])
  return crewOr(hatched)
}

export async function membersNow($: EngineInterface) {
  return read($, members)
}

export async function crewNow($: EngineInterface) {
  return crewOr(await read($, members))
}

export async function tickNow($: EngineInterface) {
  return read($, tick)
}

// An egg is ready, the buddies out that can evolve, and the couples out with an egg of their own.
async function readinessOf($: EngineInterface, o: Ctx, crew: Member[]): Promise<Ready> {
  const [{ left }, leftOf, nests] = await Promise.all([eggs($, o.perEgg), evolvesIn($, o.perEvolve), nestsReady($, o, crew)])
  return { egg: left <= 0, glow: crew.filter(m => m.key && leftOf(m.key) <= 0).map(m => m.name), nests: nests.map(([a, b]) => [a.name, b.name]) }
}

// Reads again what another session or an edit of the buddies file may have changed, so the band follows without a reload. The dialogue, the speaker and the hidden flag stay as they are.
export async function refresh($: EngineInterface, o: Ctx) {
  const hatched = await hatchCrew($, o)
  const [was, wasReady, now] = await Promise.all([read($, members), read($, ready), readinessOf($, o, hatched)])
  if (!same(hatched, was)) await update($, members, () => hatched)
  if (!same(now, wasReady)) await update($, ready, () => now)
  if (await read($, listing)) await relist($, o)
}

// Reads every buddy again for the list pane; it redraws only when something changed.
export async function relist($: EngineInterface, o: Ctx) {
  const [now, was] = await Promise.all([listingOf($, o), read($, listing)])
  if (!same(now, was)) await update($, listing, () => now)
}

export async function shutList($: EngineInterface) {
  await Promise.all([update($, listing, () => null), update($, pane, () => PANE_START)])
}

export async function listNow($: EngineInterface) {
  return Promise.all([read($, listing), read($, pane)])
}

export async function setPane($: EngineInterface, patch: Partial<PaneUi>) {
  await update($, pane, p => ({ ...p, ...patch }))
}

// One beat of the band's clock; an empty crew is hatched again, and now and then the disk is read again.
export async function beat($: EngineInterface, o: Ctx, live: Live) {
  await update($, tick, n => n + 1)
  if (!(await read($, members))) return hatchInto($, o)
  if ((await read($, tick)) % REFRESH_BEATS || live.isRefreshing) return
  live.isRefreshing = true
  try {
    await refresh($, o)
  } catch {
    // A read caught mid-write: the next one is a few seconds away.
  } finally {
    live.isRefreshing = false
  }
}

export async function snapshot($: EngineInterface) {
  const [hidden, said, frame, out, p, showStats, floor, due] = await Promise.all([
    read($, isHidden), read($, quip), read($, tick), read($, members), read($, pressed), read($, isStats), read($, speaker), read($, ready),
  ])
  return { hidden, said, frame, out, p, showStats, floor, due }
}

export async function clearDialogue($: EngineInterface) {
  await Promise.all([update($, quip, () => null), update($, pressed, () => null)])
}

export async function toggleStats($: EngineInterface) {
  await update($, isStats, v => !v)
}

export async function setHidden($: EngineInterface, hidden: boolean) {
  await $.store.set('isHidden', hidden)
  await update($, isHidden, () => hidden)
}

export async function toggleHidden($: EngineInterface) {
  const hidden = !(await read($, isHidden))
  await setHidden($, hidden)
  return hidden
}

export async function say($: EngineInterface, text: string) {
  await update($, quip, () => text)
}

export async function speak($: EngineInterface, i: number, text: string) {
  await Promise.all([update($, speaker, () => i), update($, quip, () => text)])
}

// Whose turn it is: the one after whoever spoke last.
export async function nextSpeaker($: EngineInterface, crew: Member[]) {
  return ((await read($, speaker)) + 1) % crew.length
}

// Canned lines take turns too: the next one in the crew says it.
export async function react($: EngineInterface, o: Ctx, reason: Reason, crew: Member[]) {
  const i = await nextSpeaker($, crew)
  const m = crew[i]!
  await speak($, i, line(reason, m.bones.peak, m.bones.species, await read($, tick), o.lang))
}

export async function press($: EngineInterface, o: Ctx, kind: 'pet' | 'poke', crew: Member[], i: number) {
  const now = await read($, tick)
  const m = crew[i]!
  await Promise.all([update($, pressed, () => ({ kind, at: now, who: m.key })), update($, isStats, () => false), speak($, i, line(kind, m.bones.peak, m.bones.species, now, o.lang))])
}

// One Haiku line from buddy `i`; the bubble moves only once it answers. Resolves what was said, '' for nothing.
export async function quipFromModel($: EngineInterface, o: Ctx, crew: Member[], i: number, about: string, isAsked = false) {
  const w = WORDS[o.lang]
  const m = crew[i]!
  if (isAsked) await Promise.all([speak($, i, w.thinks), update($, isStats, () => false)])
  // What the speaker is to each mate, from its own `relations`, colours how it talks to them.
  const mates = crew.filter(c => c !== m).map(c => (m.relations?.[keyOf(c.name)] ? w.related(c.name, m.relations[keyOf(c.name)]!) : c.name)).join(', ')
  const r = await $.model.complete({
    model: 'haiku',
    system: `You are ${titled(m)}, a tiny terminal companion. ${m.personality}${mates ? ` ${w.mates(mates)}` : ''} Reply with ONE short in-character quip (max 15 words). ${w.reply} No quotes, no emoji.`,
    prompt: about,
    maxTokens: 60,
  })
  // ponytail: Haiku sometimes narrates a stage direction first; the quip is its last line
  const said = r.isAnswered ? (r.text.trim().split(/\n+/).at(-1) ?? '').trim() : ''
  if (said) await speak($, i, said)
  return said
}

// One finished turn together: counted for the session and for each buddy out, in the session's own tally, then what is ready is read again.
export async function countTurnTogether($: EngineInterface, o: Ctx, live: Live) {
  live.tally.all += 1
  // The stand-in ('') never counts.
  const crew = await crewNow($)
  for (const k of [...crew.map(m => m.key).filter(Boolean), ...loversIn(crew).map(([a, b]) => pairOf(a.key, b.key))]) live.tally.by[k] = (live.tally.by[k] ?? 0) + 1
  await writeTally($, live.id, live.tally)
  await refresh($, o)
}
