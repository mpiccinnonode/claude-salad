import yaml from '../scripts/vendor/js-yaml.mjs'

export type Check = { id: string; severity: string; rule: string; applies_to: string }

// Active only: staged checks must earn promotion by real hits, which a whisper would pre-empt.
export function activeChecks(text: string): Check[] {
  let doc: { checks?: unknown } | null
  try { doc = yaml.load(text, { schema: yaml.JSON_SCHEMA }) as typeof doc } catch { return [] } // the review flow reports bad YAML
  const checks = Array.isArray(doc?.checks) ? (doc.checks as Partial<Check & { status: string }>[]) : []
  return checks.filter(
    (c): c is Check & { status: string } =>
      c?.status === 'active' && typeof c.id === 'string' && typeof c.rule === 'string' && typeof c.applies_to === 'string',
  )
}

// Glob subset the checklists use: `**/`, `**`, `*`, `?`, `{a,b}`, and comma-separated globs.
export function globToRegex(glob: string): RegExp {
  const alts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of glob) {
    if (ch === ',' && depth === 0) { alts.push(cur.trim()); cur = ''; continue }
    if (ch === '{') depth++
    if (ch === '}') depth--
    cur += ch
  }
  alts.push(cur.trim())
  return new RegExp(`^(?:${alts.filter(Boolean).map(one).join('|')})$`)
}

function one(glob: string): string {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]!
    if (ch === '*' && glob[i + 1] === '*') {
      i++
      if (glob[i + 1] === '/') { i++; re += '(?:.*/)?' } else re += '.*'
    } else if (ch === '*') re += '[^/]*'
    else if (ch === '?') re += '[^/]'
    else if (ch === '{') re += '(?:'
    else if (ch === '}') re += ')'
    else if (ch === ',') re += '|'
    else re += ch.replace(/[.+^$()|[\]\\]/g, '\\$&')
  }
  return re
}

export const matching = (checks: readonly Check[], relPath: string) =>
  checks.filter(c => globToRegex(c.applies_to).test(relPath))

export const line = (c: Check) => `Project rule ${c.id} (${c.severity}): ${c.rule.trim()}`
