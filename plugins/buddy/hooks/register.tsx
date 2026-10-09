import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { Bones, Pressed, Quip, StatName } from '../types'
import { RARITIES, roll, STAT_NAMES } from './bones.ts'
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
const WORDS: Record<Lang, { thinks: string; off: (n: string) => string; on: (n: string) => string; toggle: (n: string) => string; chatAnswer: string; chatEmpty: string; turnDone: string; reply: string; labels: [string, string, string, string] }> = {
  en: {
    thinks: '*thinks*',
    off: n => `${n} waddles off.`,
    on: n => `${n} is back.`,
    toggle: n => `Show or hide ${n}`,
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
    toggle: n => `Mostra o nascondi ${n}`,
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

// The original /buddy kept its soul (name, personality) in ~/.claude.json and rolled its bones from the account id.
async function hatch($: EngineInterface) {
  try {
    const config = JSON.parse(await $.fs.read(`${await $.env.get('HOME')}/.claude.json`))
    const soul = { name: String(config.companion?.name ?? SOUL.name), personality: String(config.companion?.personality ?? SOUL.personality) }
    return { bones: roll(String(config.oauthAccount?.accountUuid ?? config.userID ?? 'anon')), soul }
  } catch {
    return { bones: FALLBACK, soul: SOUL }
  }
}

// Fills the session's atoms from disk; safe to call again whenever they come back empty (a /clear starts them over).
async function hatchInto($: EngineInterface) {
  const hatched = await hatch($)
  const wasHidden = (await $.store.get('isHidden')) === true
  await Promise.all([update($, bones, () => hatched.bones), update($, isHidden, () => wasHidden)])
  return hatched.soul
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
  let name = String(options.name || SOUL.name)
  let personality = String(options.personality || SOUL.personality)
  const every = Math.max(1, Number(options.everyNTurns ?? 3))
  const lang: Lang = options.language === 'en' ? 'en' : 'it'
  const forced = String(options.species ?? 'auto')
  const speciesOf = (b: Bones | null) => (forced === 'auto' ? (b ?? FALLBACK).species : forced)
  const adopt = (soul: typeof SOUL) => {
    name = String(options.name || soul.name)
    personality = String(options.personality || soul.personality)
  }
  let turns = 0
  let lastAnswer = ''
  let lastCannedAt = -Infinity
  let lastActiveAt = 0

  on('session.start', async ($, e, next) => {
    adopt(await hatchInto($))
    await $.command.register({ name: 'buddy', description: WORDS[lang].toggle(name) })
    // ponytail: band redraws ~3x/s forever; pause the ticker while hidden if that ever shows up in profiles
    lastActiveAt = await read($, tick)
    $.clock.every(300, async () => {
      await update($, tick, n => n + 1)
      if (!(await read($, bones))) adopt(await hatchInto($))
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

  on('command.run', { command: 'buddy' }, async $ => {
    const hidden = !(await read($, isHidden))
    await setHidden($, hidden)
    return { text: hidden ? WORDS[lang].off(name) : WORDS[lang].on(name) }
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
      <Box flexDirection="row">
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
