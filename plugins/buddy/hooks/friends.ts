import { SPECIES } from './bones.ts'

export type Friend = { name: string; species?: string; personality?: string }

const isSpecies = (s?: string): s is string => (SPECIES as readonly string[]).includes(s ?? '')

// The `buddies` option: "Nino:duck; Pippo:cat:Anxious, always." — an unknown species is dropped.
export function parseFriends(text: string): Friend[] {
  return text.split(';').map(s => s.trim()).filter(Boolean).map(entry => {
    const [name = '', species, ...rest] = entry.split(':').map(s => s.trim())
    return { name, species: isSpecies(species) ? species : undefined, personality: rest.join(':') || undefined }
  }).filter(f => f.name)
}

// `/buddy add Nino duck grumpy old bird`: the species word is optional, the rest is personality.
export function parseAdd(words: string[]): Friend | undefined {
  const [name, maybeSpecies, ...rest] = words
  if (!name) return undefined
  const hasSpecies = isSpecies(maybeSpecies)
  const personality = (hasSpecies ? rest : [maybeSpecies, ...rest]).filter(Boolean).join(' ')
  return { name, species: hasSpecies ? maybeSpecies : undefined, personality: personality || undefined }
}

export const asFriends = (value: unknown): Friend[] =>
  Array.isArray(value) ? value.filter((f): f is Friend => typeof f?.name === 'string') : []

export const findFriend = (roster: Friend[], name: string) => roster.find(f => f.name.toLowerCase() === name.trim().toLowerCase())
