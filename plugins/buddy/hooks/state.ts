import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'
import type { Bones, Member, Pressed, Quip } from '../types'
import { countSession, eggs, evolvesIn, hatchCrew, SOUL, titled } from './crew.ts'
import type { Ctx } from './crew.ts'
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

// What the session remembers between events, outside the atoms.
export type Live = { turns: number; lastAnswer: string; lastCannedAt: number; lastActiveAt: number }

// Before the first hatch there is no crew: a plain common blob with the options' name, soul and species stands in.
const FALLBACK: Bones = { rarity: 'common', species: 'blob', eye: '·', hat: 'none', isShiny: false, stats: { DEBUGGING: 30, PATIENCE: 30, CHAOS: 30, WISDOM: 30, SNARK: 30 }, peak: 'PATIENCE' }
export const crewOr = (o: Ctx, crew: Member[] | null): [Member, ...Member[]] =>
  crew?.length ? (crew as [Member, ...Member[]]) : [{ key: '', name: o.name || SOUL.name, personality: o.personality || SOUL.personality, bones: { ...FALLBACK, species: o.species ?? FALLBACK.species } }]

// Fills the session's atoms from disk; safe to call again whenever they come back empty (a /clear starts them over).
export async function hatchInto($: EngineInterface, o: Ctx) {
  const [hatched, wasHidden] = await Promise.all([hatchCrew($, o), $.store.get('isHidden')])
  await Promise.all([update($, members, () => hatched), update($, isHidden, () => wasHidden === true), update($, speaker, () => 0), clearDialogue($)])
  return hatched
}

export async function membersNow($: EngineInterface) {
  return read($, members)
}

export async function crewNow($: EngineInterface, o: Ctx) {
  return crewOr(o, await read($, members))
}

export async function tickNow($: EngineInterface) {
  return read($, tick)
}

// One beat of the band's clock; an empty crew is hatched again.
export async function beat($: EngineInterface, o: Ctx) {
  await update($, tick, n => n + 1)
  if (!(await read($, members))) await hatchInto($, o)
}

export async function snapshot($: EngineInterface) {
  const [hidden, said, frame, out, p, showStats, floor] = await Promise.all([
    read($, isHidden), read($, quip), read($, tick), read($, members), read($, pressed), read($, isStats), read($, speaker),
  ])
  return { hidden, said, frame, out, p, showStats, floor }
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
  const mates = crew.filter(c => c !== m).map(c => c.name).join(', ')
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

// One session together: the global count, the egg, each buddy out, and the toasts that say something is ready.
export async function countSessionTogether($: EngineInterface, o: Ctx) {
  const w = WORDS[o.lang]
  await $.store.set('sessions', Number((await $.store.get('sessions')) ?? 0) + 1)
  const crew = await hatchInto($, o)
  // Every session until the egg is hatched: a toast missed once is not lost.
  if ((await eggs($, o.perEgg)).left <= 0) {
    $.ui.toast(w.ready, { timeoutMs: 10000 })
    await say($, w.ready)
  }
  await countSession($, crew.map(m => m.key))
  // Same rule as the egg: repeats until /buddy evolve is spent.
  const leftOf = await evolvesIn($, o.perEvolve)
  for (const [i, m] of crew.entries()) {
    if (leftOf(m.key) > 0) continue
    $.ui.toast(w.glow(m.name), { timeoutMs: 10000 })
    await speak($, i, w.glow(m.name))
  }
  return crew
}
