import type { EngineInterface, Frozen, Register, ToolCallInput } from 'claude-code'
import { type Config, parseConfig, verdict } from './gate.ts'

type Turn = { edited: Set<string>; ranSinceEdit: string[]; blocked: boolean; config?: Config; root?: string }
const fresh = (): Turn => ({ edited: new Set(), ranSinceEdit: [], blocked: false })
let turn = fresh() // ponytail: module state; a hot reload mid-turn just forgets that turn

async function config($: EngineInterface): Promise<[Config, string]> {
  const root = (turn.root ??= await $.session.root())
  if (!turn.config) {
    const raw = await $.fs.read(`${root}/.claude/done-gate.json`).catch(() => '')
    const names = (await $.fs.list(root).catch(() => [])).map(e => e.name)
    turn.config = parseConfig(raw, names)
  }
  return [turn.config, root]
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
  turn.edited.add(rel)
  turn.ranSinceEdit = []
}

async function pending($: EngineInterface): Promise<string | undefined> {
  if (!turn.edited.size) return undefined
  const [cfg] = await config($)
  if (!cfg.checks.length || turn.ranSinceEdit.some(cmd => cfg.checks.some(c => c.re.test(cmd)))) return undefined
  return verdict(turn.edited.size, cfg.checks)
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
    const why = await pending($)
    if (!why) return r
    turn.blocked = true
    return { ...r, block: `${why}. Run the project's checks before finishing, or say why they can't run.` }
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined || e.reason !== 'answer') return r
    const why = await pending($)
    return why ? { ...r, text: why } : r
  })
}
