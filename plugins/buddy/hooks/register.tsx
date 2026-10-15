import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { Bones, Pressed, Quip, StatName } from '../types'
import { evolve, RARITIES, roll, STAT_NAMES } from './bones.ts'
import { asPersonality, describe, findFriend, parseAdd, parseBook, upsert, without } from './friends.ts'
import type { Friend, Personality, Soul } from './friends.ts'
import { line, reasonFor } from './lines.ts'
import type { Lang, Reason } from './lines.ts'
import { ACTION_TICKS, drawBuddy } from './sprite.ts'

const quip = atom({ plugin: 'buddy', key: 'quip' } as const, null as Quip)
const isHidden = atom({ plugin: 'buddy', key: 'isHidden' } as const, false)
const tick = atom({ plugin: 'buddy', key: 'tick' } as const, 0)
const bones = atom({ plugin: 'buddy', key: 'bones' } as const, null as Bones | null)
const pressed = atom({ plugin: 'buddy', key: 'pressed' } as const, null as Pressed)
const isStats = atom({ plugin: 'buddy', key: 'isStats' } as const, false)

// Until ~/.claude.json is read (or when it can't be), a plain common blob stands in.
const FALLBACK: Bones = { rarity: 'common', species: 'blob', eye: '·', hat: 'none', isShiny: false, stats: { DEBUGGING: 30, PATIENCE: 30, CHAOS: 30, WISDOM: 30, SNARK: 30 }, peak: 'PATIENCE' }
const SOUL = { name: 'Buddy', personality: 'A small, curious terminal companion who comments on your work.' }
type Opts = { name: string; personality: string; species: string; active: string; file: string }
type Say = (n: string) => string
const HINT = 'list | use <name> | add [name] [species] [personality] | rm <name> | evolve'
const WORDS: Record<Lang, { thinks: string; off: Say; on: Say; toggle: Say; hello: Say; unknown: Say; added: Say; taken: Say; removed: Say; locked: Say; stillEgg: (n: string, left: string) => string; badFile: Say; noName: string; dream: string; ready: string; born: Say; glow: Say; evolved: Say; notYet: (n: string, left: string) => string; noEvolve: string; egg: (done: number, per: number) => string; usage: string; chatAnswer: string; chatEmpty: string; turnDone: string; reply: string; labels: [string, string, string, string] }> = {
  en: {
    thinks: '*thinks*',
    off: n => `${n} waddles off.`,
    on: n => `${n} is back.`,
    toggle: n => `Show or hide ${n}, or switch buddy`,
    hello: n => `${n} hops in.`,
    unknown: n => `No buddy called ${n}. Try /buddy list.`,
    added: n => `${n} hatched. /buddy use ${n} to bring it out.`,
    taken: n => `There is already a buddy called ${n}.`,
    removed: n => `${n} waves goodbye.`,
    locked: n => `No egg yet: ${n} more session${n === '1' ? '' : 's'} together and one hatches.`,
    stillEgg: (n, left) => `${n} is still an egg: ${left} more session${left === '1' ? '' : 's'} together.`,
    badFile: e => `buddies.json can't be read, so it is left untouched: ${e}`,
    noName: 'Haiku could not name it, so no egg was spent. Try /buddy add <name>.',
    dream: 'Write every value in English.',
    ready: 'An egg is wobbling! Type /buddy to find out who hatches.',
    born: n => `Crack! Say hi to ${n}.`,
    glow: n => `${n} is glowing! Type /buddy evolve when you are ready.`,
    evolved: n => `${n} has evolved!`,
    notYet: (n, left) => `${n} evolves after ${left} more session${left === '1' ? '' : 's'} together.`,
    noEvolve: 'Haiku could not evolve it, so nothing changed. Try again.',
    egg: (done, per) => `Next egg: ${done}/${per} sessions together.`,
    usage: `Usage: /buddy [${HINT}]`,
    chatAnswer: 'Someone clicked you to chat. What the assistant last said:',
    chatEmpty: 'Someone clicked you to chat. Say something.',
    turnDone: 'The coding assistant just finished a turn. Its final message:',
    reply: 'Always reply in English, whatever language the text below is in.',
    labels: ['pet', 'poke', 'talk', 'stats'],
  },
  it: {
    thinks: '*pensa*',
    off: n => `${n} se ne va ondeggiando.`,
    on: n => `${n} è tornato.`,
    toggle: n => `Mostra o nascondi ${n}, o cambia buddy`,
    hello: n => `Arriva ${n}.`,
    unknown: n => `Nessun buddy di nome ${n}. Prova /buddy list.`,
    added: n => `${n} è nato. /buddy use ${n} per farlo uscire.`,
    taken: n => `C'è già un buddy di nome ${n}.`,
    removed: n => `${n} ti saluta e se ne va.`,
    locked: n => `Ancora nessun uovo: ${n === '1' ? 'manca una sessione' : `mancano ${n} sessioni`} insieme perché se ne schiuda uno.`,
    stillEgg: (n, left) => `${n} è ancora un uovo: ${left === '1' ? 'manca una sessione' : `mancano ${left} sessioni`} insieme.`,
    badFile: e => `buddies.json non si legge, quindi non lo tocco: ${e}`,
    noName: 'Haiku non è riuscito a dargli un nome, quindi nessun uovo è stato speso. Prova /buddy add <nome>.',
    dream: 'Scrivi ogni valore in italiano.',
    ready: 'Un uovo si sta muovendo! Scrivi /buddy e scopri chi nasce.',
    born: n => `Crac! Saluta ${n}.`,
    glow: n => `${n} brilla! Scrivi /buddy evolve quando sei pronto.`,
    evolved: n => `${n} si è evoluto!`,
    notYet: (n, left) => `${n} si evolve dopo ${left === '1' ? 'un\'altra sessione' : `altre ${left} sessioni`} insieme.`,
    noEvolve: 'Haiku non è riuscito a farlo evolvere, quindi non è cambiato nulla. Riprova.',
    egg: (done, per) => `Prossimo uovo: ${done}/${per} sessioni insieme.`,
    usage: `Uso: /buddy [${HINT}]`,
    chatAnswer: 'Qualcuno ti ha cliccato per chiacchierare. Ultima cosa detta dall\'assistente:',
    chatEmpty: 'Qualcuno ti ha cliccato per chiacchierare. Di\' qualcosa.',
    turnDone: 'L\'assistente di codice ha appena finito un turno. Il suo messaggio finale:',
    reply: 'Rispondi sempre in italiano, qualunque sia la lingua del testo qui sotto.',
    labels: ['coccola', 'pungola', 'parla', 'stat'],
  },
}
const RARITY_COLOR: Record<Bones['rarity'], string> = { common: 'gray', uncommon: 'green', rare: 'cyan', epic: 'magenta', legendary: 'yellow' }
const STARS = (rarity: Bones['rarity']) => '★'.repeat(RARITIES.indexOf(rarity) + 1)
const SHORT: Record<StatName, string> = { DEBUGGING: 'DBG', PATIENCE: 'PAT', CHAOS: 'CHA', WISDOM: 'WIS', SNARK: 'SNK' }

async function setHidden($: EngineInterface, hidden: boolean) {
  await $.store.set('isHidden', hidden)
  await update($, isHidden, () => hidden)
}

async function say($: EngineInterface, text: string) {
  await update($, quip, () => text)
}

// `stage` counts evolutions; `title` is the epithet they earned, kept in both languages.
type Born = { bones: Bones; name?: string; personality?: Personality; stage?: number; title?: Record<Lang, string> }
type Births = Record<string, Born>
const keyOf = (name: string) => name.trim().toLowerCase()

// The original /buddy kept its soul in ~/.claude.json and rolled its bones from the account id; no companion, nothing to keep.
async function readLegacy($: EngineInterface): Promise<Born | undefined> {
  try {
    const config = JSON.parse(await $.fs.read(`${await $.env.get('HOME')}/.claude.json`))
    if (!config.companion) return undefined
    const { name, personality } = config.companion
    return { bones: roll(String(config.oauthAccount?.accountUuid ?? config.userID ?? 'anon')), name: name && String(name), personality: personality && String(personality) }
  } catch {
    return undefined
  }
}

// The original buddy hatches free; ~/.claude.json is read once, so users of 0.2.0 keep theirs, else it is random, name and soul too.
async function bornOriginal($: EngineInterface, lang: Lang): Promise<Born> {
  let born = ((await $.store.get('born')) ?? {}) as Births
  if ((await $.store.get('migrated')) !== true) {
    const legacy = await readLegacy($)
    if (legacy && !born['']) born = { ...born, '': legacy }
    await Promise.all([$.store.set('born', born), $.store.set('migrated', true)])
  }
  if (born['']) return born['']
  const bones = roll(String(Math.random()))
  const dreamt = await dreamUp($, undefined, bones, lang)
  const fresh = { bones, name: dreamt?.name, personality: dreamt?.soul }
  await $.store.set('born', { ...born, '': fresh })
  return fresh
}

async function pathOf($: EngineInterface, o: Opts) {
  return o.file.startsWith('~/') ? `${await $.env.get('HOME')}${o.file.slice(1)}` : o.file
}

// A missing file is an empty list; a broken one reports its error and is never written.
type Book = { raw: unknown[]; friends: Friend[]; error?: string }

async function readBook($: EngineInterface, path: string): Promise<Book> {
  let text: string
  try {
    text = String(await $.fs.read(path))
  } catch {
    return { raw: [], friends: [] }
  }
  try {
    return parseBook(text)
  } catch (err) {
    return { raw: [], friends: [], error: err instanceof Error ? err.message : String(err) }
  }
}

async function rosterOf($: EngineInterface, o: Opts) {
  const [born, book] = await Promise.all([$.store.get('born').then(b => (b ?? {}) as Births), pathOf($, o).then(path => readBook($, path), (): Book => ({ raw: [], friends: [] }))])
  const original: Friend = { name: o.name || born['']?.name || SOUL.name, personality: o.personality || born['']?.personality, species: o.species === 'auto' ? undefined : o.species }
  return { roster: [original, ...book.friends] as [Friend, ...Friend[]], born, error: book.error }
}

// Spices for the personality writer, two per hatch, so no two buddies come out alike.
const TWISTS = [
  'a former life it half-remembers', 'an irrational fear', 'a secret hobby', 'a strong opinion about something trivial',
  'a rivalry with an inanimate object', 'a philosophy it misapplies', 'outdated slang it overuses', 'a collection it is proud of',
  'a grudge it cannot explain', 'a soft spot it hides badly', 'a superstition about code', 'a dream job it will never get',
  'a gap between what it says and what it does', 'a habit of its species taken too far', 'an unexpected area of expertise', 'a ritual before every commit',
]

const SOUL_SHAPE = '"tone": string, "traits": 3-5 strings, "quirks": 2-3 strings, "backstory": 2 sentences, "speech": how it talks, "catchphrase": string, "likes": 2-3 strings, "dislikes": 2-3 strings'
const statsOf = (b: Bones) => `Stats out of 100: ${STAT_NAMES.map(s => `${s} ${b.stats[s]}`).join(', ')}.`

// One Haiku call that answers with a JSON object; undefined when the call or the JSON fails.
async function askJson($: EngineInterface, system: string, prompt: string): Promise<Record<string, unknown> | undefined> {
  const r = await $.model.complete({ model: 'haiku', maxTokens: 700, system, prompt }).catch(() => undefined)
  if (!r?.isAnswered) return undefined
  try {
    return JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1))
  } catch {
    return undefined
  }
}

// One Haiku call at hatch time; undefined when it fails, and the buddy falls back to the plain default.
async function dreamUp($: EngineInterface, name: string | undefined, b: Bones, lang: Lang): Promise<{ name: string; soul?: Soul } | undefined> {
  const first = Math.floor(Math.random() * TWISTS.length)
  const twists = [TWISTS[first], TWISTS[(first + 1 + Math.floor(Math.random() * (TWISTS.length - 1))) % TWISTS.length]]
  const data = await askJson($,
    `You invent personalities for tiny terminal companions who watch a programmer work. Make each one layered, specific and odd: contradictions, concrete small details, a voice nobody else has. No generic cute-pet clichés. Keep it tight: one sentence for tone and speech, two for the backstory, a few words per list item. Never mention stats or numbers. ${WORDS[lang].dream} Answer with one JSON object and nothing else: {"name": string, ${SOUL_SHAPE}}`,
    `${name ? `Name: ${name}.` : 'It has no name yet: invent a short, unusual one.'} Species: ${b.species}. Rarity: ${b.rarity}. ${statsOf(b)} Weave in ${twists.join(' and ')}.`)
  if (!data) return undefined
  const soul = asPersonality(data)
  const named = name || (typeof data.name === 'string' ? data.name.trim() : '')
  return named ? { name: named, soul: typeof soul === 'object' ? soul : undefined } : undefined
}

// One Haiku call per evolution: the same soul pushed stranger along its stats, plus an epithet in both languages.
async function dreamOn($: EngineInterface, name: string, was: string, b: Bones, title: string | undefined, lang: Lang): Promise<{ soul: Soul; title: Record<Lang, string> } | undefined> {
  const data = await askJson($,
    `You evolve tiny terminal companions who watch a programmer work. Keep who it is, but push everything further and stranger: sharper contradictions, odder quirks, a voice even less like anyone else's. Its stats steer the growth: the higher a stat, the more that side takes over (DEBUGGING: obsessive precision, PATIENCE: unsettling calm, CHAOS: entropy, WISDOM: cryptic insight, SNARK: venom). Never mention stats or numbers. Also give it an epithet that follows its name, drawn from its new self and its strongest stat, in English (like "the Winged Sarcasm") and in Italian (like "Sarcasmo Alato"); never repeat the name in it. ${WORDS[lang].dream} The two epithets excepted. Answer with one JSON object and nothing else: {"title_en": string, "title_it": string, ${SOUL_SHAPE}}`,
    `Name: ${name}. Species: ${b.species}. Rarity now: ${b.rarity}. ${statsOf(b)}${title ? ` Its old epithet, to outgrow: ${title}.` : ''} Who it was: ${was}`)
  const soul = asPersonality(data)
  const [en, it] = [data?.title_en, data?.title_it].map(t => (typeof t === 'string' ? t.trim() : ''))
  return typeof soul === 'object' && en && it ? { soul, title: { en, it } } : undefined
}

// Spends an egg: random bones, a name and personality dreamt up when missing, written back into buddies.json.
// The egg is spent only on success; `failed` is the line to show otherwise.
async function hatchNew($: EngineInterface, o: Opts, friend: Friend, roster: Friend[], lang: Lang): Promise<{ name: string; failed?: undefined } | { failed: string }> {
  const w = WORDS[lang]
  const path = await pathOf($, o)
  const book = await readBook($, path)
  if (book.error) return { failed: w.badFile(book.error) }
  const rolled = roll(String(Math.random()))
  const dreamt = friend.name && friend.personality ? undefined : await dreamUp($, friend.name || undefined, { ...rolled, species: friend.species ?? rolled.species }, lang)
  const name = friend.name || dreamt?.name
  if (!name) return { failed: w.noName }
  if (!friend.name && findFriend(roster, name)) return { failed: w.taken(name) }
  // A file entry gets only what was dreamt up; its own fields stay as written. A new one is written whole.
  const isNew = !findFriend(book.friends, name)
  const soul = friend.personality ? undefined : dreamt?.soul
  if (isNew || soul) await $.fs.write(path, `${JSON.stringify(upsert(book.raw, name, isNew ? { ...friend, name, personality: friend.personality ?? soul } : { personality: soul }), null, 2)}\n`)
  const [born, hatched] = await Promise.all([$.store.get('born'), $.store.get('hatched')])
  await Promise.all([$.store.set('born', { ...(born as Births | undefined), [keyOf(name)]: { bones: rolled } }), $.store.set('hatched', Number(hatched ?? 0) + 1)])
  return { name }
}

// `key` is the buddy's slot in `born`: '' for the original.
async function hatch($: EngineInterface, o: Opts, lang: Lang) {
  const { roster, born } = await rosterOf($, o)
  // /buddy use wins over the `active` option; an unknown name, or one still in its egg, falls back to the original.
  const wanted = findFriend(roster, String((await $.store.get('active')) ?? o.active))
  const friend = wanted && born[keyOf(wanted.name)] ? wanted : roster[0]
  const key = friend === roster[0] ? '' : keyOf(friend.name)
  const b = key ? born[key]! : await bornOriginal($, lang)
  const named = key ? friend : { ...friend, name: o.name || b.name || SOUL.name }
  return { key, title: b.title?.[lang], friend: { ...named, personality: named.personality ?? b.personality }, bones: { ...b.bones, species: friend.species ?? b.bones.species } }
}

// Fills the session's atoms from disk; safe to call again whenever they come back empty (a /clear starts them over).
async function hatchInto($: EngineInterface, o: Opts, lang: Lang) {
  const hatched = await hatch($, o, lang)
  const wasHidden = (await $.store.get('isHidden')) === true
  await Promise.all([update($, bones, () => hatched.bones), update($, isHidden, () => wasHidden), update($, quip, () => null), update($, pressed, () => null)])
  return hatched
}

// Every `per` sessions with a buddy out earns it one evolution; `stage` counts the ones spent.
async function growth($: EngineInterface, key: string, per: number) {
  const [together, born] = await Promise.all([$.store.get('together'), $.store.get('born')])
  const done = Number((together as Record<string, number> | undefined)?.[key] ?? 0)
  const stage = Number((born as Births | undefined)?.[key]?.stage ?? 0)
  return { left: (stage + 1) * per - done }
}

async function countSession($: EngineInterface, key: string) {
  const together = ((await $.store.get('together')) ?? {}) as Record<string, number>
  await $.store.set('together', { ...together, [key]: (together[key] ?? 0) + 1 })
}

// Spends a ready evolution on the buddy that is out; nothing changes unless Haiku delivers the new soul.
async function evolveNow($: EngineInterface, o: Opts, lang: Lang): Promise<{ failed: string } | { failed?: undefined }> {
  const w = WORDS[lang]
  const h = await hatch($, o, lang)
  const path = await pathOf($, o)
  const book = h.key ? await readBook($, path) : undefined
  if (book?.error) return { failed: w.badFile(book.error) }
  const born = ((await $.store.get('born')) ?? {}) as Births
  const was = born[h.key]!
  const grown = evolve(was.bones)
  const dreamt = await dreamOn($, h.friend.name, describe(h.friend.personality ?? SOUL.personality), { ...grown, species: h.bones.species }, h.title, lang)
  if (!dreamt) return { failed: w.noEvolve }
  // A file buddy's soul lives in the file; the original's in the store.
  if (book) await $.fs.write(path, `${JSON.stringify(upsert(book.raw, h.friend.name, { personality: dreamt.soul }), null, 2)}\n`)
  await $.store.set('born', { ...born, [h.key]: { ...was, bones: grown, stage: (was.stage ?? 0) + 1, title: dreamt.title, ...(book ? {} : { personality: dreamt.soul }) } })
  return {}
}

// Every `per` sessions earns one egg; `hatched` only grows, so removing a buddy frees no slot.
async function eggs($: EngineInterface, per: number) {
  const sessions = Number((await $.store.get('sessions')) ?? 0)
  const hatched = Number((await $.store.get('hatched')) ?? 0)
  return { hatched, done: Math.min(per, sessions - hatched * per), left: (hatched + 1) * per - sessions }
}

async function react($: EngineInterface, reason: Reason, species: string, lang: Lang) {
  const [b, now] = await Promise.all([read($, bones), read($, tick)])
  await say($, line(reason, (b ?? FALLBACK).peak, species, now, lang))
}

async function press($: EngineInterface, kind: 'pet' | 'poke', species: string, lang: Lang) {
  const [b, now] = await Promise.all([read($, bones), read($, tick)])
  const { peak } = b ?? FALLBACK
  await Promise.all([update($, pressed, () => ({ kind, at: now })), update($, isStats, () => false), say($, line(kind, peak, species, now, lang))])
}

async function quipFromModel($: EngineInterface, name: string, personality: string, about: string, lang: Lang, isAsked = false) {
  if (isAsked) await Promise.all([update($, quip, () => WORDS[lang].thinks), update($, isStats, () => false)])
  const r = await $.model.complete({
    model: 'haiku',
    system: `You are ${name}, a tiny terminal companion. ${personality} Reply with ONE short in-character quip (max 15 words). ${WORDS[lang].reply} No quotes, no emoji.`,
    prompt: about,
    maxTokens: 60,
  })
  if (r.isAnswered && r.text.trim()) await say($, r.text.trim())
}

export const register: Register = (on, options) => {
  const o: Opts = {
    name: String(options.name ?? ''),
    personality: String(options.personality ?? ''),
    species: String(options.species ?? 'auto'),
    active: String(options.active ?? ''),
    file: String(options.buddiesFile || '~/.claude/buddy/buddies.json'),
  }
  let name = o.name || SOUL.name
  let personality = o.personality || SOUL.personality
  let title: string | undefined
  let current = ''
  // The epithet rides along wherever the buddy is named: the band and its own system prompt.
  const titled = () => (title ? `${name}, ${title}` : name)
  const every = Math.max(1, Number(options.everyNTurns ?? 3))
  const perEgg = Math.max(1, Number(options.sessionsPerHatch ?? 20))
  const perEvolve = Math.max(1, Number(options.sessionsPerEvolve ?? 30))
  const lang: Lang = options.language === 'en' ? 'en' : 'it'
  const isRight = options.position === 'right'
  // Before the first hatch the bones are empty: the species option still shows through.
  const speciesOf = (b: Bones | null) => b?.species ?? (o.species === 'auto' ? FALLBACK.species : o.species)
  const adopt = (h: Awaited<ReturnType<typeof hatch>>) => {
    name = h.friend.name
    personality = describe(h.friend.personality ?? SOUL.personality)
    title = h.title
    current = h.key
  }
  let turns = 0
  let lastAnswer = ''
  let lastCannedAt = -Infinity
  let lastActiveAt = 0

  on('session.start', async ($, e, next) => {
    await $.store.set('sessions', Number((await $.store.get('sessions')) ?? 0) + 1)
    adopt(await hatchInto($, o, lang))
    // Only on the session that completes the egg, so it is said once.
    if ((await eggs($, perEgg)).left === 0) {
      $.ui.toast(WORDS[lang].ready, { timeoutMs: 10000 })
      await say($, WORDS[lang].ready)
    }
    await countSession($, current)
    // Same rule as the egg: only the session that makes it ready says so.
    if ((await growth($, current, perEvolve)).left === 0) {
      $.ui.toast(WORDS[lang].glow(name), { timeoutMs: 10000 })
      await say($, WORDS[lang].glow(name))
    }
    await $.command.register({ name: 'buddy', description: WORDS[lang].toggle(name), argumentHint: HINT })
    // ponytail: band redraws ~3x/s forever; pause the ticker while hidden if that ever shows up in profiles
    lastActiveAt = await read($, tick)
    $.clock.every(300, async () => {
      await update($, tick, n => n + 1)
      if (!(await read($, bones))) adopt(await hatchInto($, o, lang))
    })
    return next(e)
  })

  // /clear ends the session without a new session.start: drop this conversation's dialogue, keep the rest.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      lastAnswer = ''
      turns = 0
      await Promise.all([update($, quip, () => null), update($, pressed, () => null)])
    }
    return next(e)
  })

  on('command.run', { command: 'buddy' }, async ($, e) => {
    const w = WORDS[lang]
    const [verb = '', ...words] = e.args.trim().split(/\s+/).filter(Boolean)
    const wanted = words.join(' ')
    // With an egg ready, a bare /buddy hatches a surprise: Haiku picks the name. Otherwise it shows or hides.
    let failed: string | undefined
    if (!verb && (await eggs($, perEgg)).left <= 0) {
      const hatched = await hatchNew($, o, { name: '' }, (await rosterOf($, o)).roster, lang)
      if ('name' in hatched) {
        await Promise.all([$.store.set('active', hatched.name), setHidden($, false)])
        adopt(await hatchInto($, o, lang))
        await say($, w.born(name))
        return { text: w.born(name) }
      }
      failed = hatched.failed
    }
    if (!verb) {
      const hidden = !(await read($, isHidden))
      await setHidden($, hidden)
      return { text: [hidden ? w.off(name) : w.on(name), ...(failed ? [failed] : [])].join('\n') }
    }
    if (verb === 'list') {
      const [{ roster, born, error }, { done }] = await Promise.all([rosterOf($, o), eggs($, perEgg)])
      const mark = (f: Friend) => (f.name === name ? '▸' : f === roster[0] || born[keyOf(f.name)] ? ' ' : '🥚')
      return { text: [...roster.map(f => `${mark(f)} ${f.name}${f.species ? ` (${f.species})` : ''}`), w.egg(done, perEgg), ...(error ? [w.badFile(error)] : [])].join('\n') }
    }
    if (verb === 'use') {
      const { roster, born } = await rosterOf($, o)
      const friend = wanted ? findFriend(roster, wanted) : undefined
      if (wanted && !friend) return { text: w.unknown(wanted) }
      if (friend && friend !== roster[0] && !born[keyOf(friend.name)]) {
        const { left } = await eggs($, perEgg)
        if (left > 0) return { text: w.stillEgg(friend.name, String(left)) }
        const { failed } = await hatchNew($, o, friend, roster, lang)
        if (failed) return { text: failed }
      }
      // A bare `/buddy use` goes back to the `active` option.
      await $.store.set('active', wanted || null)
      adopt(await hatchInto($, o, lang))
      return { text: w.hello(name) }
    }
    if (verb === 'add') {
      // A bare `/buddy add` lets Haiku name it too.
      const friend = parseAdd(words) ?? { name: '' }
      const { roster, error } = await rosterOf($, o)
      if (error) return { text: w.badFile(error) }
      if (friend.name && findFriend(roster, friend.name)) return { text: w.taken(friend.name) }
      const { left } = await eggs($, perEgg)
      if (left > 0) return { text: w.locked(String(left)) }
      const hatched = await hatchNew($, o, friend, roster, lang)
      return { text: hatched.failed ?? w.added(hatched.name) }
    }
    if (verb === 'evolve') {
      const { left } = await growth($, current, perEvolve)
      if (left > 0) return { text: w.notYet(name, String(left)) }
      const { failed } = await evolveNow($, o, lang)
      if (failed) return { text: failed }
      adopt(await hatchInto($, o, lang))
      await say($, w.evolved(titled()))
      return { text: w.evolved(titled()) }
    }
    if (verb === 'rm') {
      const path = await pathOf($, o)
      const book = await readBook($, path)
      if (book.error) return { text: w.badFile(book.error) }
      if (!wanted || !findFriend(book.friends, wanted)) return { text: w.unknown(wanted) }
      const born = ((await $.store.get('born')) ?? {}) as Births
      const together = ((await $.store.get('together')) ?? {}) as Record<string, number>
      delete born[keyOf(wanted)]
      delete together[keyOf(wanted)]
      await Promise.all([$.fs.write(path, `${JSON.stringify(without(book.raw, wanted), null, 2)}\n`), $.store.set('born', born), $.store.set('together', together)])
      adopt(await hatchInto($, o, lang))
      return { text: w.removed(wanted) }
    }
    return { text: w.usage }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const result = await next(e)
    lastActiveAt = await read($, tick)
    const reason = reasonFor(e.command, result.isError === true, new Date().getHours())
    const now = await read($, tick)
    // ponytail: one canned line per ~10s so a failing loop doesn't spam the bubble
    if (reason && now - lastCannedAt >= 33) {
      lastCannedAt = now
      await react($, reason, speciesOf(await read($, bones)), lang)
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // ponytail: main loop only, subagent turns would make it chatty
    if (e.agentId || e.reason !== 'answer') return result
    lastActiveAt = await read($, tick)
    lastAnswer = e.answer.slice(-1500)

    if (++turns % every !== 0) return result

    await quipFromModel($, titled(), personality, `${WORDS[lang].turnDone}\n\n${lastAnswer}`, lang)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const [hidden, said, frame, rolledBones, p, showStats] = await Promise.all([
      read($, isHidden), read($, quip), read($, tick), read($, bones), read($, pressed), read($, isStats),
    ])
    if (e.props.hasSurvey || hidden) return next(e)

    const b = rolledBones ?? FALLBACK
    const species = speciesOf(rolledBones)
    if (e.props.isWorking || p?.at === frame) lastActiveAt = frame
    // ponytail: ~30s with nothing happening and it dozes off
    const isAsleep = frame - Math.max(lastActiveAt, p?.at ?? 0) > 100
    const age = p ? frame - p.at : 0
    const action = p && age < ACTION_TICKS[p.kind] ? { kind: p.kind, age } : undefined
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box key="band" flexDirection={isRight ? 'row-reverse' : 'row'} width={isRight ? '100%' : undefined}>
        <Box flexDirection="column">
          {drawBuddy(species, frame, { isWorking: e.props.isWorking, eye: b.eye, hat: b.hat, action, isAsleep }, RARITY_COLOR[b.rarity]).map((row, i) => (
            <Button key={`body-${i}`} plain onPress={() => press($, 'pet', species, lang)}>
              {row.map(([text, color], j) => <Text key={`p${i}-${j}`} color={color} mono>{text}</Text>)}
            </Button>
          ))}
        </Box>
        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          <Text bold>
            {titled()} <Text color="yellow">{STARS(b.rarity)}</Text>
          </Text>
          {/* ponytail: stats stay on one line so the bubble keeps its height and the buttons never scroll out of the band */}
          {showStats ? (
            <Text>
              {STAT_NAMES.map(stat => (
                <Text key={`stat-${stat}`} color={stat === b.peak ? 'green' : undefined}>
                  {SHORT[stat]} {b.stats[stat]}{'  '}
                </Text>
              ))}
            </Text>
          ) : (
            <Text dimColor={said === null}>{said ?? '...'}</Text>
          )}
          <Box flexDirection="row" gap={1}>
            <Button key="pet" plain dimColor hotkey="1" label={WORDS[lang].labels[0]} onPress={() => press($, 'pet', species, lang)} />
            <Button key="poke" plain dimColor hotkey="2" label={WORDS[lang].labels[1]} onPress={() => press($, 'poke', species, lang)} />
            <Button key="talk" plain dimColor hotkey="3" label={WORDS[lang].labels[2]} onPress={() => quipFromModel($, titled(), personality, lastAnswer ? `${WORDS[lang].chatAnswer}\n\n${lastAnswer}` : WORDS[lang].chatEmpty, lang, true)} />
            <Button key="stats" plain dimColor hotkey="4" label={WORDS[lang].labels[3]} onPress={() => update($, isStats, v => !v)} />
          </Box>
        </Box>
        <Button key="hide" label="×" onPress={() => setHidden($, true)} />
      </Box>
    )
  })
}
