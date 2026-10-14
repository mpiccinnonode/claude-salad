import { SPECIES } from './bones.ts'

export type Soul = { tone?: string; traits?: string[]; quirks?: string[]; backstory?: string; speech?: string; catchphrase?: string; likes?: string[]; dislikes?: string[] }
export type Personality = string | Soul
export type Friend = { name: string; species?: string; personality?: Personality }

const TEXT_KEYS = ['tone', 'backstory', 'speech', 'catchphrase'] as const
const LIST_KEYS = ['traits', 'quirks', 'likes', 'dislikes'] as const

const isSpecies = (s: unknown): s is string => (SPECIES as readonly string[]).includes(String(s))
const isNamed = (entry: unknown, name: string) => String((entry as Friend | null)?.name ?? '').trim().toLowerCase() === name.trim().toLowerCase()
const texts = (v: unknown) => (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim())

// A plain string, or an object of known fields (a lone string where a list goes counts as a list of one).
export function asPersonality(value: unknown): Personality | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const src = value as Record<string, unknown>
  const soul: Soul = {}
  for (const key of TEXT_KEYS) if (texts(src[key])[0]) soul[key] = texts(src[key]).join(' ')
  for (const key of LIST_KEYS) if (texts(src[key]).length) soul[key] = texts(src[key])
  return Object.keys(soul).length ? soul : undefined
}

// buddies.json is a list of { name, species?, personality? }; throws on anything else so a broken file is never rewritten.
export function parseBook(text: string): { raw: unknown[]; friends: Friend[] } {
  const raw: unknown = JSON.parse(text)
  if (!Array.isArray(raw)) throw new Error('buddies.json must be a JSON list')
  const friends = raw.flatMap(entry => {
    const e = entry as Record<string, unknown> | null
    const name = typeof e?.name === 'string' ? e.name.trim() : ''
    return name ? [{ name, species: isSpecies(e?.species) ? e.species : undefined, personality: asPersonality(e?.personality) }] : []
  })
  return { raw, friends }
}

// Patches the entry named `name` in place, keeping fields this module does not know; appends it when missing.
export function upsert(raw: unknown[], name: string, patch: Partial<Friend>): unknown[] {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
  const i = raw.findIndex(entry => isNamed(entry, name))
  return i < 0 ? [...raw, { name, ...defined }] : raw.map((entry, j) => (j === i ? { ...(entry as object), ...defined } : entry))
}

export const without = (raw: unknown[], name: string) => raw.filter(entry => !isNamed(entry, name))

// The personality as the system prompt reads it.
export function describe(p: Personality): string {
  if (typeof p === 'string') return p
  return [
    p.tone && `Tone: ${p.tone}.`,
    p.traits && `Traits: ${p.traits.join(', ')}.`,
    p.quirks && `Quirks: ${p.quirks.join('; ')}.`,
    p.backstory && `Backstory: ${p.backstory}`,
    p.speech && `How you talk: ${p.speech}`,
    p.likes && `Likes: ${p.likes.join(', ')}.`,
    p.dislikes && `Dislikes: ${p.dislikes.join(', ')}.`,
    p.catchphrase && `Catchphrase, used rarely: "${p.catchphrase}"`,
  ].filter(Boolean).join(' ')
}

// `/buddy add Nino duck grumpy old bird`: the species word is optional, the rest is personality.
export function parseAdd(words: string[]): Friend | undefined {
  const [name, maybeSpecies, ...rest] = words
  if (!name) return undefined
  const hasSpecies = isSpecies(maybeSpecies)
  const personality = (hasSpecies ? rest : [maybeSpecies, ...rest]).filter(Boolean).join(' ')
  return { name, species: hasSpecies ? maybeSpecies : undefined, personality: personality || undefined }
}

export const findFriend = <F extends Friend>(roster: F[], name: string) => roster.find(f => isNamed(f, name))
