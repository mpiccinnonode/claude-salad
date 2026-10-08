import type { EngineInterface, Frozen, Register, ToolCallInput } from 'claude-code'
import { type Check, type Config, detect, parseConfig, verdict } from './gate.ts'

type Turn = {
  edited: Set<string>; checks: Map<string, Check>; ranSinceEdit: string[]; blocked: boolean
  config?: Config; root?: string; dirs: Map<string, Check[]>
}
const fresh = (): Turn => ({ edited: new Set(), checks: new Map(), ranSinceEdit: [], blocked: false, dirs: new Map() })
let turn = fresh() // ponytail: module state; a hot reload mid-turn just forgets that turn

async function config($: EngineInterface): Promise<[Config, string]> {
  const root = (turn.root ??= await $.session.root())
  turn.config ??= parseConfig(await $.fs.read(`${root}/.claude/done-gate.json`).catch(() => ''))
  return [turn.config, root]
}

// Nearest directory from the edited file up to the root whose markers imply checks; listings cached per turn.
async function nearestChecks($: EngineInterface, root: string, rel: string): Promise<Check[]> {
  const parts = rel.split('/').slice(0, -1)
  for (let i = parts.length; i >= 0; i--) {
    const dir = [root, ...parts.slice(0, i)].join('/')
    let checks = turn.dirs.get(dir)
    if (!checks) {
      checks = detect((await $.fs.list(dir).catch(() => [])).map(e => e.name))
      turn.dirs.set(dir, checks)
    }
    if (checks.length) return checks
  }
  return []
}

function editedPath(e: Frozen<ToolCallInput>): string | undefined {
  if (e.tool === 'Edit' || e.tool === 'Write') return e.file_path
  if (e.tool === 'NotebookEdit') return e.notebook_path
  if (String(e.tool) === 'MultiEdit') return String((e as { file_path?: unknown }).file_path) // builds that still have it
}

async function record($: EngineInterface, e: Frozen<ToolCallInput>) {
  if (e.tool === 'Bash') return void turn.ranSinceEdit.push(e.command)
  const path = editedPath(e)
  if (!path) return
  const [cfg, root] = await config($)
  const rel = path.startsWith(root + '/') ? path.slice(root.length + 1) : undefined
  if (rel === undefined || !cfg.isSource(rel)) return
  const checks = cfg.checks ?? (await nearestChecks($, root, rel))
  if (!checks.length) return
  for (const c of checks) turn.checks.set(c.label, c)
  turn.edited.add(rel)
  turn.ranSinceEdit = []
}

// ponytail: any required check satisfies the turn, even if edits span two subprojects; per-subproject tracking if that bites
function pending(): string | undefined {
  if (!turn.edited.size) return undefined
  const checks = [...turn.checks.values()]
  if (turn.ranSinceEdit.some(cmd => checks.some(c => c.re.test(cmd)))) return undefined
  return verdict(turn.edited.size, checks)
}

export const register: Register = (on, options) => {
  const mode = String(options.mode ?? 'warn')
  if (mode === 'off') return

  on('turn.start', ($, e, next) => {
    turn = fresh()
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && !r.isError) await record($, e)
    return r
  })

  on('classic.Stop', async ($, e, next) => {
    const r = await next(e)
    if (mode !== 'block' || e.stop_hook_active || turn.blocked || r.block) return r
    const why = pending()
    if (!why) return r
    turn.blocked = true
    return { ...r, block: `${why}. Run the project's checks before finishing, or say why they can't run.` }
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined || e.reason !== 'answer') return r
    const why = pending()
    return why ? { ...r, text: why } : r
  })
}
