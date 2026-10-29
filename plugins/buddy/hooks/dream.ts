import type { EngineInterface } from 'claude-code'
import type { Bones, Member } from '../types'
import { STAT_NAMES } from './bones.ts'
import { asPersonality, describe, isLove, texts } from './friends.ts'
import type { Friend, Soul } from './friends.ts'
import type { Lang } from './lines.ts'
import { WORDS } from './words.ts'

// Spices for the personality writer, two per hatch, so no two buddies come out alike.
const TWISTS = [
  'a former life it half-remembers', 'an irrational fear', 'a secret hobby', 'a strong opinion about something trivial',
  'a rivalry with an inanimate object', 'a philosophy it misapplies', 'outdated slang it overuses', 'a collection it is proud of',
  'a grudge it cannot explain', 'a soft spot it hides badly', 'a superstition about code', 'a dream job it will never get',
  'a gap between what it says and what it does', 'a habit of its species taken too far', 'an unexpected area of expertise', 'a ritual before every commit',
]

const SOUL_SHAPE = '"tone": string, "traits": 3-5 strings, "quirks": 2-3 strings, "backstory": 2 sentences, "speech": how it talks, "catchphrase": string, "likes": 2-3 strings, "dislikes": 2-3 strings'
const statsOf = (b: Bones) => `Stats out of 100: ${STAT_NAMES.map(s => `${s} ${b.stats[s]}`).join(', ')}.`
const soulIn = (data: unknown) => {
  const soul = asPersonality(data)
  return typeof soul === 'object' ? soul : undefined
}

// One Haiku call that answers with a JSON object; undefined when the call or the JSON fails.
async function askJson($: EngineInterface, system: string, prompt: string, maxTokens = 700): Promise<Record<string, unknown> | undefined> {
  const r = await $.model.complete({ model: 'haiku', maxTokens, system, prompt }).catch(() => undefined)
  if (!r?.isAnswered) return undefined
  try {
    return JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1))
  } catch {
    return undefined
  }
}

// One Haiku call at hatch time; undefined when it fails, and the buddy falls back to the plain default.
// `parents`: two lovers whose egg it is; it takes after both.
export async function dreamUp($: EngineInterface, name: string | undefined, b: Bones, lang: Lang, parents?: readonly Member[]): Promise<{ name: string; soul?: Soul } | undefined> {
  const first = Math.floor(Math.random() * TWISTS.length)
  const twists = [TWISTS[first], TWISTS[(first + 1 + Math.floor(Math.random() * (TWISTS.length - 1))) % TWISTS.length]]
  const data = await askJson($,
    `You invent personalities for tiny terminal companions who watch a programmer work. Make each one layered, specific and odd: contradictions, concrete small details, a voice nobody else has. No generic cute-pet clichés. Keep it tight: one sentence for tone and speech, two for the backstory, a few words per list item. Never mention stats or numbers. ${WORDS[lang].dream} Answer with one JSON object and nothing else: {"name": string, ${SOUL_SHAPE}}`,
    `${name ? `Name: ${name}.` : 'It has no name yet: invent a short, unusual one.'} Species: ${b.species}. Rarity: ${b.rarity}. ${statsOf(b)} Weave in ${twists.join(' and ')}.${parents ? ` Its parents are ${parents.map(p => `${p.name} (${p.personality})`).join(' and ')}: someone new, with a trace of each.` : ''}`)
  if (!data) return undefined
  const named = name || texts(data.name)[0]
  return named ? { name: named, soul: soulIn(data) } : undefined
}

// One Haiku call per evolution: the same soul pushed stranger along its stats, plus an epithet in both languages.
// `mates`: the buddies out beside it and what each is to it now; the answer says what they become, by name.
export async function dreamOn($: EngineInterface, name: string, was: string, b: Bones, title: string | undefined, lang: Lang, mates: { name: string; relation?: string }[] = []): Promise<{ soul: Soul; title: Record<Lang, string>; relations: Record<string, string> } | undefined> {
  const ties = mates.map(m => `${m.name} (${m.relation ?? 'nothing yet'})`).join(', ')
  const data = await askJson($,
    `You evolve tiny terminal companions who watch a programmer work. Keep who it is, but push everything further and stranger: sharper contradictions, odder quirks, a voice even less like anyone else's. Its stats steer the growth: the higher a stat, the more that side takes over (DEBUGGING: obsessive precision, PATIENCE: unsettling calm, CHAOS: entropy, WISDOM: cryptic insight, SNARK: venom). Never mention stats or numbers. Also give it an epithet that follows its name, drawn from its new self and its strongest stat, in English (like "the Winged Sarcasm") and in Italian (like "Sarcasmo Alato"); never repeat the name in it. ${WORDS[lang].dream} The two epithets excepted. Answer with one JSON object and nothing else: {"title_en": string, "title_it": string, ${SOUL_SHAPE}${ties ? ', "relations": an object from each name it shares the terminal with to a few words of what that one is to it now' : ''}}`,
    `Name: ${name}. Species: ${b.species}. Rarity now: ${b.rarity}. ${statsOf(b)}${title ? ` Its old epithet, to outgrow: ${title}.` : ''} Who it was: ${was}${ties ? ` What the others are to it, free to shift with its new self (a love it keeps says lover, or amante in Italian): ${ties}.` : ''}`)
  const soul = soulIn(data)
  const [en, it] = [texts(data?.title_en)[0], texts(data?.title_it)[0]]
  const said = data?.relations && typeof data.relations === 'object' ? (data.relations as Record<string, unknown>) : {}
  // Only the mates it was asked about, under the names they have.
  const relations = Object.fromEntries(mates.flatMap(m => {
    const r = texts(Object.entries(said).find(([n]) => n.trim().toLowerCase() === m.name.trim().toLowerCase())?.[1])[0]
    return r ? [[m.name, r]] : []
  }))
  return soul && en && it ? { soul, title: { en, it }, relations } : undefined
}

// One Haiku call as time goes by: what the mates out beside it are to it now, a small step from what they were; by name, only for those mates.
// `mates[].back`: what it is to each of them. `isTurn`: one may change for real; otherwise a love neither starts, except to answer one offered, nor ends.
export async function dreamDrift($: EngineInterface, name: string, soul: string, lang: Lang, mates: { name: string; relation?: string; back?: string }[], isTurn = false): Promise<Record<string, string> | undefined> {
  const data = await askJson($,
    `You follow the relationships of tiny terminal companions who share a programmer's terminal, as days go by. Say what each of the others is to this one now, a few words each (at most 8), specific and in character. ${isTurn ? 'This time one of them takes a real turn (a rival softens, a fondness becomes love, a friendship sours, a love fades); the others only take a small step.' : 'Each only takes a small step from before: the same feeling, a new shade or detail; a love stays a love.'} Being loved is no reason to love back. Call one its lover (amante in Italian) only if it is in love with it, never as a label for anything else. ${WORDS[lang].dream} Answer with one JSON object and nothing else: {"<other name>": string}.`,
    `${name}: ${soul}\n\n${mates.map(m => `${m.name}: to ${name} ${m.relation ?? 'nothing yet'}; ${name} to them ${m.back ?? 'nothing yet'}.`).join('\n')}`,
    400)
  if (!data) return undefined
  let fell = false
  const relations = Object.fromEntries(mates.flatMap(m => {
    const r = texts(Object.entries(data).find(([n]) => n.trim().toLowerCase() === m.name.trim().toLowerCase())?.[1])[0]
    if (!r) return []
    // Outside a turn a love neither starts (unless answering one) nor ends; in a turn, one new love at most. Else that relation stays as it was.
    if (!isTurn && isLove(m.relation) && !isLove(r)) return []
    if (isLove(r) && !isLove(m.relation) && !isLove(m.back)) {
      if (!isTurn || fell) return []
      fell = true
    }
    return [[m.name, r]]
  }))
  return Object.keys(relations).length ? relations : undefined
}

// What each of `bare` is to every other buddy in the file, from who they are, a few buddies per Haiku call so a big file fits; by name.
// What the calls that worked answered, and whether they all did.
export async function dreamTies($: EngineInterface, everyone: Friend[], bare: string[], lang: Lang): Promise<{ ties: Record<string, Record<string, string>>; isWhole: boolean }> {
  const per = Math.max(1, Math.floor(3600 / (30 * everyone.length)))
  const batches = Array.from({ length: Math.ceil(bare.length / per) }, (_, i) => bare.slice(i * per, (i + 1) * per))
  const answers = await Promise.all(batches.map(batch => tiesOf($, everyone, batch, lang)))
  return { ties: Object.assign({}, ...answers), isWhole: answers.every(Boolean) }
}

async function tiesOf($: EngineInterface, everyone: Friend[], bare: string[], lang: Lang): Promise<Record<string, Record<string, string>> | undefined> {
  const data = await askJson($,
    `You weave the relationships of tiny terminal companions who share a programmer's terminal. From who each one is, say what each listed one is to every other one: a few words each, specific and in character (friendships, rivalries, grudges, mentors, crushes, now and then a couple in love, who then call each other lover), never all alike, mostly not love. ${WORDS[lang].dream} Answer with one JSON object and nothing else: {"<listed name>": {"<other name>": string}}.`,
    `${everyone.map(f => `${f.name}${f.species ? ` (${f.species})` : ''}: ${f.personality ? describe(f.personality) : 'not known yet'}`).join('\n')}\n\nListed: ${bare.join(', ')}.`,
    Math.min(4000, 300 + 30 * bare.length * everyone.length))
  if (!data) return undefined
  const named = (name: string, from: Record<string, unknown>) => Object.entries(from).find(([n]) => n.trim().toLowerCase() === name.trim().toLowerCase())?.[1]
  const ties = Object.fromEntries(bare.flatMap(name => {
    const said = named(name, data)
    if (!said || typeof said !== 'object') return []
    const rels = Object.fromEntries(everyone.filter(f => f.name !== name).flatMap(f => {
      const r = texts(named(f.name, said as Record<string, unknown>))[0]
      return r ? [[f.name, r]] : []
    }))
    return Object.keys(rels).length ? [[name, rels]] : []
  }))
  return Object.keys(ties).length ? ties : undefined
}
