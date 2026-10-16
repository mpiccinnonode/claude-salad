import type { EngineInterface } from 'claude-code'
import type { Bones } from '../types'
import { STAT_NAMES } from './bones.ts'
import { asPersonality, texts } from './friends.ts'
import type { Soul } from './friends.ts'
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
export async function dreamUp($: EngineInterface, name: string | undefined, b: Bones, lang: Lang): Promise<{ name: string; soul?: Soul } | undefined> {
  const first = Math.floor(Math.random() * TWISTS.length)
  const twists = [TWISTS[first], TWISTS[(first + 1 + Math.floor(Math.random() * (TWISTS.length - 1))) % TWISTS.length]]
  const data = await askJson($,
    `You invent personalities for tiny terminal companions who watch a programmer work. Make each one layered, specific and odd: contradictions, concrete small details, a voice nobody else has. No generic cute-pet clichés. Keep it tight: one sentence for tone and speech, two for the backstory, a few words per list item. Never mention stats or numbers. ${WORDS[lang].dream} Answer with one JSON object and nothing else: {"name": string, ${SOUL_SHAPE}}`,
    `${name ? `Name: ${name}.` : 'It has no name yet: invent a short, unusual one.'} Species: ${b.species}. Rarity: ${b.rarity}. ${statsOf(b)} Weave in ${twists.join(' and ')}.`)
  if (!data) return undefined
  const named = name || texts(data.name)[0]
  return named ? { name: named, soul: soulIn(data) } : undefined
}

// One Haiku call per evolution: the same soul pushed stranger along its stats, plus an epithet in both languages.
export async function dreamOn($: EngineInterface, name: string, was: string, b: Bones, title: string | undefined, lang: Lang): Promise<{ soul: Soul; title: Record<Lang, string> } | undefined> {
  const data = await askJson($,
    `You evolve tiny terminal companions who watch a programmer work. Keep who it is, but push everything further and stranger: sharper contradictions, odder quirks, a voice even less like anyone else's. Its stats steer the growth: the higher a stat, the more that side takes over (DEBUGGING: obsessive precision, PATIENCE: unsettling calm, CHAOS: entropy, WISDOM: cryptic insight, SNARK: venom). Never mention stats or numbers. Also give it an epithet that follows its name, drawn from its new self and its strongest stat, in English (like "the Winged Sarcasm") and in Italian (like "Sarcasmo Alato"); never repeat the name in it. ${WORDS[lang].dream} The two epithets excepted. Answer with one JSON object and nothing else: {"title_en": string, "title_it": string, ${SOUL_SHAPE}}`,
    `Name: ${name}. Species: ${b.species}. Rarity now: ${b.rarity}. ${statsOf(b)}${title ? ` Its old epithet, to outgrow: ${title}.` : ''} Who it was: ${was}`)
  const soul = soulIn(data)
  const [en, it] = [texts(data?.title_en)[0], texts(data?.title_it)[0]]
  return soul && en && it ? { soul, title: { en, it } } : undefined
}
