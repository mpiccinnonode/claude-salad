export type Check = { label: string; re: RegExp }
export type Config = { checks: Check[]; isSource: (rel: string) => boolean }

// Marker file at the project root → the commands that count as running its checks.
const DETECT: [marker: RegExp, label: string, re: RegExp][] = [
  [/^nx\.json$/, 'nx affected/run-many -t test|lint', /\bnx\s+(affected|run-many)\b.*\s(-t|--targets?)[=\s]?\S*\b(test|lint)\b/],
  [/\.(csproj|sln|slnx)$/, 'dotnet test|build', /\bdotnet\s+(test|build)\b/],
  [/^pubspec\.yaml$/, 'flutter test|analyze', /\bflutter\s+(test|analyze)\b/],
  [/^package\.json$/, 'npm test|run lint', /\bnpm\s+(test|t|run\s+lint)\b/],
]

const DOCS = /(^|\/)(docs?|\.claude)\/|\.(md|mdx|txt|rst|adoc)$/i

const toRegex = (s: string) => {
  try { return new RegExp(s) } catch { return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }
}

// `.claude/done-gate.json` wins field by field; whatever it leaves out is detected from root entries.
export function parseConfig(raw: string, rootNames: readonly string[]): Config {
  let file: { checks?: unknown; sources?: unknown } = {}
  try { file = raw ? JSON.parse(raw) : {} } catch {} // ponytail: bad JSON falls back to detection
  const checks = Array.isArray(file.checks)
    ? file.checks.filter((c): c is string => typeof c === 'string').map(c => ({ label: c, re: toRegex(c) }))
    : DETECT.filter(([m]) => rootNames.some(n => m.test(n))).map(([, label, re]) => ({ label, re }))
  const globs = Array.isArray(file.sources) ? file.sources.filter((s): s is string => typeof s === 'string').map(globToRegex) : null
  return { checks, isSource: rel => (globs ? globs.some(g => g.test(rel)) : !DOCS.test(rel)) }
}

export function globToRegex(glob: string): RegExp {
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
  return new RegExp(`^${re}$`)
}

export const verdict = (edited: number, checks: readonly Check[]) =>
  `done-gate: edited ${edited} source file${edited === 1 ? '' : 's'}, no ${checks.map(c => c.label).join(' / ')} ran after the last edit`
