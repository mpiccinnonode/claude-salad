import { ALL_SPECIES } from './bones.ts'

export type Soul = { tone?: string; traits?: string[]; quirks?: string[]; backstory?: string; speech?: string; catchphrase?: string; likes?: string[]; dislikes?: string[] }
export type Personality = string | Soul
// `relations`: what this buddy is to others, by their name's key.
export type Friend = { name: string; species?: string; personality?: Personality; relations?: Record<string, string> }

export const TEXT_KEYS = ['tone', 'backstory', 'speech', 'catchphrase'] as const
export const LIST_KEYS = ['traits', 'quirks', 'likes', 'dislikes'] as const
export type SoulField = (typeof TEXT_KEYS)[number] | (typeof LIST_KEYS)[number]

const isSpecies = (s: unknown): s is string => ALL_SPECIES.includes(String(s))
export const keyOf = (name: string) => name.trim().toLowerCase()
const isNamed = (entry: unknown, name: string) => keyOf(String((entry as Friend | null)?.name ?? '')) === keyOf(name)
export const texts = (v: unknown) => (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim())

// A plain string, or an object of known fields (a lone string where a list goes counts as a list of one).
export function asPersonality(value: unknown): Personality | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const src = value as Record<string, unknown>
  const soul: Soul = {}
  for (const key of TEXT_KEYS) { const t = texts(src[key]); if (t.length) soul[key] = t.join(' ') }
  for (const key of LIST_KEYS) { const t = texts(src[key]); if (t.length) soul[key] = t }
  return Object.keys(soul).length ? soul : undefined
}

const NAME_KEYS = ['name', 'buddy', 'to', 'with', 'who']
const RELATION_KEYS = ['relation', 'relationship', 'type', 'as', 'role', 'is']

// A relations field in any shape it was written in, as (name, relation) pairs, and what cannot be read as one: { "Ada": "rival" }, a list of those,
// { "name": "Ada", "relation": "rival" }, or text like "Ada: rival; Pip - friend".
export function relationPairs(value: unknown): { pairs: [string, string][]; rest: unknown[] } {
  const pairs: [string, string][] = []
  const rest: unknown[] = []
  const fromText = (text: string) => {
    // A comma starts a new pair only before a capitalised short name and a colon: `Ada: rival, though: x` stays one.
    for (const part of text.split(/[;\n]+|,(?=\s*\p{Lu}[\p{L}\p{N} '’-]{0,30}:)/u).map(s => s.trim()).filter(Boolean)) {
      const m = part.match(/^(.+?)\s*:\s*(.+)$/) ?? part.match(/^(.+?)\s+[-–—=>]+\s+(.+)$/)
      if (m) pairs.push([m[1]!.trim(), m[2]!.trim()])
      else rest.push(part)
    }
  }
  const walk = (v: unknown): void => {
    if (typeof v === 'string') return fromText(v)
    if (Array.isArray(v)) return v.forEach(walk)
    if (!v || typeof v !== 'object') return void (v === undefined || v === null || rest.push(v))
    const o = v as Record<string, unknown>
    const nameKey = NAME_KEYS.find(k => typeof o[k] === 'string' && String(o[k]).trim())
    const relationKey = RELATION_KEYS.find(k => texts(o[k]).length)
    if (nameKey && relationKey) {
      pairs.push([String(o[nameKey]).trim(), texts(o[relationKey]).join(' ')])
      const { [nameKey]: _, [relationKey]: __, ...more } = o
      if (Object.keys(more).length) rest.push(more)
      return
    }
    for (const [n, r] of Object.entries(o)) {
      // A nested value: its relation field, else its words.
      const inner = r && typeof r === 'object' && !Array.isArray(r) ? r as Record<string, unknown> : undefined
      const said = inner ? texts(inner[RELATION_KEYS.find(k => texts(inner[k]).length) ?? ''] ?? Object.values(inner)) : texts(r)
      if (n.trim() && said.length) pairs.push([n.trim(), said.join(' ')])
      else rest.push({ [n]: r })
    }
  }
  walk(value)
  return { pairs, rest }
}

// What a buddy is to others, by their name's key, whatever shape the file holds it in.
export function asRelations(value: unknown): Record<string, string> | undefined {
  const { pairs } = relationPairs(value)
  return pairs.length ? Object.fromEntries(pairs.map(([n, r]) => [keyOf(n), r])) : undefined
}

const isCanonical = (v: unknown) => Array.isArray(v) && v.every(o => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === 1 && typeof Object.values(o)[0] === 'string')

// The relations field as this version writes it, a list of { name: relation }: `relation` and any other shape move into it,
// and what cannot be read as a pair is kept as it was under `relationNotes`. Entries already in shape are untouched; an empty list stays (it opts out).
export function inShape(raw: unknown[]): unknown[] {
  return raw.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry
    const { relation, relations, ...others } = entry as Record<string, unknown>
    if (relation === undefined && (relations === undefined || isCanonical(relations))) return entry
    const { pairs, rest } = relationPairs([relations, relation])
    const notes = others.relationNotes === undefined ? [] : Array.isArray(others.relationNotes) ? others.relationNotes : [others.relationNotes]
    // Nothing readable: no `relations` field, so Haiku still writes some; what was there stays in the notes.
    return { ...others, ...(pairs.length ? { relations: pairs.map(([n, r]) => ({ [n]: r })) } : {}), ...(rest.length ? { relationNotes: [...notes, ...rest] } : {}) }
  })
}

const isBlank = (o: unknown) => !!o && typeof o === 'object' && !Array.isArray(o) && !Object.keys(o).length

// Whole words only, accents included (`\b` stops at `à`).
const words = (alts: string, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])`, flags)
// Phrases, not bare words that also say rivalry or work: `partner`, `compagno`, `crush`, `darling` alone are not love.
const LOVE_WORDS = [
  'lovers?', 'in love', 'my love', 'true love', '(?:first|secret|only|great|one) love', 'love of (?:his|her|my|their|your) life', 'sweethearts?', 'soul ?mates?', 'twin flames?',
  'other half', 'significant other', 'spouses?', 'husband', 'hubby', 'wifey?', 'married', 'wedded', 'engaged', 'dating', 'fianc[eé]e?', 'betrothed', 'girlfriend', 'boyfriend',
  '(?:a|his|her|my|their|secret|big|huge) crush', 'crush(?:ing)? on', 'paramour', 'valentine', '(?:life|romantic) partner', 'partner (?:in|for) life',
  'amant[ei]', 'innamorat[oaie]', 'fidanzat[oaie]', 'promess[oi] spos[oi]', 'anima gemella', 'amore mio', 'mio amore', '(?:grande|vero|primo|unico) amore', "(?:(?:il suo|il mio) |l')amore(?: della sua vita| segreto)?",
  '(?:dolce|altra) metà', '(?:su[oa]|mi[oa]|tu[oa]) metà', 'tesoro mio', 'marito', 'moglie', 'coniuge', 'sposat[oaie]', 'spos[oa]', 'compagn[oa] di vita', '(?:su[oa]|mi[oa]|tu[oa]) compagn[oa]',
  'moros[oa]', 'spasimante', 'cotta', 'fiamma', '(?:su[oa]|mi[oa]|tu[oa]) ragazz[oa]',
].join('|')
const LOVE = words(LOVE_WORDS)
// A love that ended: the word right before it (an article or possessive between is fine), or `exmoglie`; `never so in love` is not one.
const ENDED = words(`(?:ex|former|no longer|non più|old flame|vecchia fiamma)(?:[\\s-]+(?:(?:my|his|her|their|a|an|the|la|il|lo|sua|suo|mia|mio|una|un)\\s+)?(?:${LOVE_WORDS}))?|ex(?:${LOVE_WORDS})`)
const FAMILY = words('parents?|child(?:ren)?|mother|father|mom|mum|dad|sisters?|brothers?|sons?|daughters?|siblings?|cousins?|aunt|uncle|grand(?:ma|pa|mother|father|child|parent)\\w*|genitor\\p{L}*|figli\\p{L}*|madre|padre|mamma|papà|sorell\\p{L}*|fratell\\p{L}*|cugin\\p{L}*|zi[oa]|nonn\\p{L}*')
// A fan of something, lower case after it: `lover of chaos`, `amante del caos` (`amante di Ada` is love), and a mate: `compagna di squadra` (`di vita` is love).
const FAN = words("[Ll]overs? of(?=\\s+\\p{Ll})|[Aa]mant[ei] d(?:i|el\\p{L}*|ei|egli|ell\\p{L}*)(?=\\s+\\p{Ll})|[Cc]ompagn[oa] d[i'](?!\\s*vita)", 'u')
export const isLove = (relation = '') => LOVE.test(relation) && !(ENDED.test(relation) && !LOVE.test(relation.replace(ENDED, ''))) && !FAMILY.test(relation) && !FAN.test(relation)

// Sets what `name` is to each buddy named in `rels`, one { name: relation } apiece; its other relations stay.
export function withRelations(raw: unknown[], name: string, rels: Record<string, string>): unknown[] {
  const keys = new Set(Object.keys(rels).map(keyOf))
  const was = (raw.find(e => isNamed(e, name)) as { relations?: unknown } | undefined)?.relations
  const strip = (o: unknown) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).filter(([n]) => !keys.has(keyOf(n)))) : o)
  const kept = (Array.isArray(was) ? was : was && typeof was === 'object' ? [was] : []).map(strip).filter(o => !isBlank(o))
  return upsert(raw, name, { relations: [...kept, ...Object.entries(rels).map(([n, r]) => ({ [n]: r }))] } as never)
}

// Every relation naming `from` names `to` instead (one already naming `to` gives way), or is dropped without one; the rest of each entry stays.
export function relink(raw: unknown[], from: string, to?: string): unknown[] {
  const swap = (o: unknown) => (o && typeof o === 'object' && !Array.isArray(o)
    ? Object.fromEntries(Object.entries(o).flatMap(([n, r]) => (keyOf(n) === keyOf(from) ? (to ? [[to, r]] : []) : to && keyOf(n) === keyOf(to) ? [] : [[n, r]])))
    : o)
  return raw.map(entry => {
    const rel = (entry as { relations?: unknown } | null)?.relations
    if (!rel || typeof rel !== 'object') return entry
    return { ...(entry as object), relations: Array.isArray(rel) ? rel.map(swap).filter(o => !isBlank(o)) : swap(rel) }
  })
}

// buddies.json is a list of { name, species?, personality?, relations? }; throws on anything else so a broken file is never rewritten.
export function parseBook(text: string): { raw: unknown[]; friends: Friend[] } {
  const raw: unknown = JSON.parse(text)
  if (!Array.isArray(raw)) throw new Error('buddies.json must be a JSON list')
  const friends = raw.flatMap(entry => {
    const e = entry as Record<string, unknown> | null
    const name = typeof e?.name === 'string' ? e.name.trim() : ''
    return name ? [{ name, species: isSpecies(e?.species) ? e.species : undefined, personality: asPersonality(e?.personality), relations: asRelations(e?.relations) }] : []
  })
  return { raw, friends }
}

// Patches the entry named `name` in place, keeping fields this module does not know; appends it when missing.
export function upsert(raw: unknown[], name: string, patch: Partial<Friend>): unknown[] {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
  const i = raw.findIndex(entry => isNamed(entry, name))
  return i < 0 ? [...raw, { name, ...defined }] : raw.map((entry, j) => (j === i ? { ...(entry as object), ...defined } : entry))
}

// One personality field set from the text typed for it (a list field, one item per line); empty drops it. Fields this module does not know stay.
export function withSoulField(raw: unknown[], name: string, field: SoulField, text: string): unknown[] {
  const entry = raw.find(e => isNamed(e, name)) as { personality?: unknown } | undefined
  const was = entry?.personality && typeof entry.personality === 'object' && !Array.isArray(entry.personality) ? (entry.personality as Record<string, unknown>) : {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const value = (LIST_KEYS as readonly string[]).includes(field) ? lines : lines.join(' ')
  const { [field]: _, ...rest } = was
  return upsert(raw, name, { personality: (value.length ? { ...rest, [field]: value } : rest) as Soul })
}

// A sentence becomes the tone of a structured personality; a structured one becomes one sentence, its fields in order.
export function flipped(p: Personality): Personality | undefined {
  if (typeof p === 'string') return { tone: p }
  return [...TEXT_KEYS, ...LIST_KEYS].flatMap(k => texts(p[k])).join('. ') || undefined
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
