import type { EngineInterface, Register, ToolCallResult } from 'claude-code'
import { DENY, isRelayed, isReviewAgent, textLength } from './relay.ts'
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

// Report-relay gate: one review report the user hasn't seen yet, by length; denied marks the one deny already spent.
const IDLE = { report: 0, said: 0, denied: false }
let relay = IDLE

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => whisper($, e.file_path, await next(e)))
  on('tool.call', { tool: 'Write' }, async ($, e, next) => whisper($, e.file_path, await next(e)))

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined && isReviewAgent(e.subagent_type) && r.text)
      relay = { report: relay.report + r.text.length, said: 0, denied: false }
    return r
  })

  on('session.append', { door: 'response' }, ($, e, next) => {
    if (relay.report && e.agentId === undefined) {
      const said = relay.said + textLength(e.message.content)
      relay = isRelayed(said, relay.report) ? IDLE : { ...relay, said }
    }
    return next(e)
  })

  // Denies once per report, so a wrong guess costs one retry, never a loop.
  on('tool.call', { tool: 'AskUserQuestion' }, ($, e, next) => {
    if (!relay.report || e.agentId !== undefined) return next(e)
    if (relay.denied) {
      relay = IDLE
      return next(e)
    }
    relay = { ...relay, denied: true }
    return { deny: DENY }
  })
}
