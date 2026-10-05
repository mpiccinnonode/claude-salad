import type { EngineInterface, Register, ToolCallResult } from 'claude-code'
import { activeChecks, line, matching } from './whisper.ts'

const CHECKLIST = '.claude/review-checklist.yaml'
const seen = new Set<string>() // ponytail: per-load dedupe; a hot reload whispers each rule once more

async function whisper($: EngineInterface, path: string, r: ToolCallResult): Promise<ToolCallResult> {
  if (r.deny !== undefined || r.isError) return r
  const root = await $.session.root()
  if (!path.startsWith(root + '/')) return r
  const text = await $.fs.read(`${root}/${CHECKLIST}`).catch(() => '')
  if (!text) return r
  const rel = path.slice(root.length + 1)
  const fresh = matching(activeChecks(text), rel).filter(c => !seen.has(`${rel}\0${c.id}`))
  if (!fresh.length) return r
  for (const c of fresh) seen.add(`${rel}\0${c.id}`)
  return { ...r, context: [...(r.context ?? []), fresh.map(line).join('\n')] }
}

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => whisper($, e.file_path, await next(e)))
  on('tool.call', { tool: 'Write' }, async ($, e, next) => whisper($, e.file_path, await next(e)))
}
