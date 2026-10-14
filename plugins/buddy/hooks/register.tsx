import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { Bones, Pressed, Quip, StatName } from '../types'
import { RARITIES, roll, STAT_NAMES } from './bones.ts'
import { asFriends, findFriend, parseAdd, parseFriends } from './friends.ts'
import type { Friend } from './friends.ts'
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
type Opts = { name: string; personality: string; species: string; buddies: string; active: string }
type Say = (n: string) => string
const HINT = 'list | use <name> | add <name> [species] [personality] | rm <name>'
const WORDS: Record<Lang, { thinks: string; off: Say; on: Say; toggle: Say; hello: Say; unknown: Say; added: Say; taken: Say; removed: Say; notAdded: Say; locked: Say; ready: string; egg: (done: number, per: number) => string; usage: string; chatAnswer: string; chatEmpty: string; turnDone: string; reply: string; labels: [string, string, string, string] }> = {
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
    notAdded: n => `${n} was not added with /buddy add (config buddies live in /config).`,
    locked: n => `No egg yet: ${n} more session${n === '1' ? '' : 's'} together and one hatches.`,
    ready: 'An egg is ready: /buddy add <name> to hatch a new buddy.',
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
    notAdded: n => `${n} non è stato aggiunto con /buddy add (quelli da config si cambiano in /config).`,
    locked: n => `Ancora nessun uovo: ${n === '1' ? 'manca una sessione' : `mancano ${n} sessioni`} insieme perché se ne schiuda uno.`,
    ready: 'Un uovo è pronto: /buddy add <nome> per far nascere un nuovo buddy.',
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

type Born = { bones: Bones; name?: string; personality?: string }

// The original /buddy kept its soul in ~/.claude.json and rolled its bones from the account id.
async function readLegacy($: EngineInterface): Promise<Born | undefined> {
  try {
    const config = JSON.parse(await $.fs.read(`${await $.env.get('HOME')}/.claude.json`))
    const { name, personality } = config.companion ?? {}
    return { bones: roll(String(config.oauthAccount?.accountUuid ?? config.userID ?? 'anon')), name: name && String(name), personality: personality && String(personality) }
  } catch {
    return undefined
  }
}

// Every hatch rolls a random seed and is kept; ~/.claude.json is read once, to keep the original buddy of v0.2.0 users.
async function bornOf($: EngineInterface, key: string): Promise<Born> {
  let born = ((await $.store.get('born')) ?? {}) as Record<string, Born>
  if ((await $.store.get('migrated')) !== true) {
    const legacy = await readLegacy($)
    if (legacy && !born['']) born = { ...born, '': legacy }
    await Promise.all([$.store.set('born', born), $.store.set('migrated', true)])
  }
  if (born[key]) return born[key]
  const fresh = { bones: roll(String(Math.random())) }
  await $.store.set('born', { ...born, [key]: fresh })
  return fresh
}

async function rosterOf($: EngineInterface, o: Opts): Promise<[Friend, ...Friend[]]> {
  const first = (((await $.store.get('born')) ?? {}) as Record<string, Born>)['']
  const original: Friend = { name: o.name || first?.name || SOUL.name, personality: o.personality || first?.personality, species: o.species === 'auto' ? undefined : o.species }
  return [original, ...parseFriends(o.buddies), ...asFriends(await $.store.get('buddies'))]
}

async function hatch($: EngineInterface, o: Opts) {
  const roster = await rosterOf($, o)
  // /buddy use wins over the `active` option; an unknown name falls back to the original, keyed ''.
  const friend = findFriend(roster, String((await $.store.get('active')) ?? o.active)) ?? roster[0]
  const isOriginal = friend === roster[0]
  const b = await bornOf($, isOriginal ? '' : friend.name.toLowerCase())
  const named = isOriginal ? { ...friend, name: o.name || b.name || SOUL.name } : friend
  return { friend: { ...named, personality: named.personality || b.personality || SOUL.personality }, bones: { ...b.bones, species: friend.species ?? b.bones.species } }
}

// Fills the session's atoms from disk; safe to call again whenever they come back empty (a /clear starts them over).
async function hatchInto($: EngineInterface, o: Opts) {
  const hatched = await hatch($, o)
  const wasHidden = (await $.store.get('isHidden')) === true
  await Promise.all([update($, bones, () => hatched.bones), update($, isHidden, () => wasHidden), update($, quip, () => null), update($, pressed, () => null)])
  return hatched.friend
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
    buddies: String(options.buddies ?? ''),
    active: String(options.active ?? ''),
  }
  let name = o.name || SOUL.name
  let personality = o.personality || SOUL.personality
  const every = Math.max(1, Number(options.everyNTurns ?? 3))
  const perEgg = Math.max(1, Number(options.sessionsPerHatch ?? 20))
  const lang: Lang = options.language === 'en' ? 'en' : 'it'
  const isRight = options.position === 'right'
  // Before the first hatch the bones are empty: the species option still shows through.
  const speciesOf = (b: Bones | null) => b?.species ?? (o.species === 'auto' ? FALLBACK.species : o.species)
  const adopt = (friend: Friend) => {
    name = friend.name
    personality = friend.personality || SOUL.personality
  }
  let turns = 0
  let lastAnswer = ''
  let lastCannedAt = -Infinity
  let lastActiveAt = 0

  on('session.start', async ($, e, next) => {
    await $.store.set('sessions', Number((await $.store.get('sessions')) ?? 0) + 1)
    adopt(await hatchInto($, o))
    // Only on the session that completes the egg, so it is said once.
    if ((await eggs($, perEgg)).left === 0) {
      $.ui.toast(WORDS[lang].ready, { timeoutMs: 10000 })
      await say($, WORDS[lang].ready)
    }
    await $.command.register({ name: 'buddy', description: WORDS[lang].toggle(name), argumentHint: HINT })
    // ponytail: band redraws ~3x/s forever; pause the ticker while hidden if that ever shows up in profiles
    lastActiveAt = await read($, tick)
    $.clock.every(300, async () => {
      await update($, tick, n => n + 1)
      if (!(await read($, bones))) adopt(await hatchInto($, o))
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
    if (!verb) {
      const hidden = !(await read($, isHidden))
      await setHidden($, hidden)
      return { text: hidden ? w.off(name) : w.on(name) }
    }
    if (verb === 'list') {
      const [roster, { done }] = await Promise.all([rosterOf($, o), eggs($, perEgg)])
      return { text: [...roster.map(f => `${f.name === name ? '▸' : ' '} ${f.name}${f.species ? ` (${f.species})` : ''}`), w.egg(done, perEgg)].join('\n') }
    }
    if (verb === 'use') {
      if (wanted && !findFriend(await rosterOf($, o), wanted)) return { text: w.unknown(wanted) }
      // A bare `/buddy use` goes back to the `active` option.
      await $.store.set('active', wanted || null)
      adopt(await hatchInto($, o))
      return { text: w.hello(name) }
    }
    if (verb === 'add') {
      const friend = parseAdd(words)
      if (!friend) return { text: w.usage }
      if (findFriend(await rosterOf($, o), friend.name)) return { text: w.taken(friend.name) }
      const { hatched, left } = await eggs($, perEgg)
      if (left > 0) return { text: w.locked(String(left)) }
      await Promise.all([$.store.set('buddies', [...asFriends(await $.store.get('buddies')), friend]), $.store.set('hatched', hatched + 1)])
      return { text: w.added(friend.name) }
    }
    if (verb === 'rm') {
      const stored = asFriends(await $.store.get('buddies'))
      const kept = stored.filter(f => f !== findFriend(stored, wanted))
      if (!wanted || kept.length === stored.length) return { text: w.notAdded(wanted) }
      const born = ((await $.store.get('born')) ?? {}) as Record<string, Born>
      delete born[wanted.trim().toLowerCase()]
      await Promise.all([$.store.set('buddies', kept), $.store.set('born', born)])
      adopt(await hatchInto($, o))
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

    await quipFromModel($, name, personality, `${WORDS[lang].turnDone}\n\n${lastAnswer}`, lang)
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
              {row.map(([text, color], j) => <Text key={`p${i}-${j}`} color={color}>{text}</Text>)}
            </Button>
          ))}
        </Box>
        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          <Text bold>
            {name} <Text color="yellow">{STARS(b.rarity)}</Text>
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
            <Button key="talk" plain dimColor hotkey="3" label={WORDS[lang].labels[2]} onPress={() => quipFromModel($, name, personality, lastAnswer ? `${WORDS[lang].chatAnswer}\n\n${lastAnswer}` : WORDS[lang].chatEmpty, lang, true)} />
            <Button key="stats" plain dimColor hotkey="4" label={WORDS[lang].labels[3]} onPress={() => update($, isStats, v => !v)} />
          </Box>
        </Box>
        <Button key="hide" label="×" onPress={() => setHidden($, true)} />
      </Box>
    )
  })
}
