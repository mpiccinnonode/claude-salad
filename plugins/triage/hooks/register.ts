import type { EngineInterface, Register, ToolCallResult } from 'claude-code'

// Project records (`<root>/.claude/triage/`) and the user-scope fallback (`~/.claude/projects/<slug>/triage/`).
const RECORD = /\/\.claude\/(projects\/[^/]+\/)?triage\/[^/]+\.yaml$/

async function check($: EngineInterface, path: string, r: ToolCallResult): Promise<ToolCallResult> {
  if (r.deny !== undefined || r.isError || !RECORD.test(path)) return r
  const script = `${$.plugin.root}/skills/triage/scripts/validate-record.mjs`
  // ponytail: `$.process` is CLI-only; where it fails → silent, the skill's own validate step still runs
  const run = await $.process.run(['node', script, '--file', path]).catch(() => undefined)
  if (run?.exitCode !== 1) return r
  const note = `Triage record ${path} fails the schema; fix it before moving on (validate-record.mjs):\n${run.stdout.trim()}`
  return { ...r, context: [...(r.context ?? []), note] }
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => check($, e.file_path, await next(e)))
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => check($, e.file_path, await next(e)))
}
