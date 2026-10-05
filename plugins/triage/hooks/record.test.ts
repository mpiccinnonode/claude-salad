import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const RECORD = '/repo/.claude/triage/fix-login.draft.yaml'
const write = (file_path: string) => ({ tool: 'Write' as const, file_path, content: 'status: draft\n' })

function engine(on: On, exitCode: number, ran: string[][] = []) {
  on('tool.call', () => ({ result: {} }) as never)
  on('process.run', ($, e) => {
    ran.push([...e.argv])
    return { value: { exitCode, stdout: '  status (wip): off-schema', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
}

test('a record that fails the schema gets the violations as model-only context', async ($, on) => {
  const ran: string[][] = []
  engine(on, 1, ran)
  const r = await $.tool.call(write(RECORD))
  expect(r.context?.[0]).toContain('fails the schema')
  expect(r.context?.[0]).toContain('status (wip): off-schema')
  expect(ran[0]?.[0]).toBe('node')
  expect(ran[0]?.[1]).toMatch(/\/skills\/triage\/scripts\/validate-record\.mjs$/)
  expect(ran[0]?.slice(2)).toEqual(['--file', RECORD])
})

test('a valid record stays quiet', async ($, on) => {
  engine(on, 0)
  expect((await $.tool.call(write(RECORD))).context).toBeUndefined()
})

test('the user-scope record dir counts too, edits included', async ($, on) => {
  engine(on, 1)
  const r = await $.tool.call({ tool: 'Edit', file_path: '/home/u/.claude/projects/-repo/triage/x.yaml', old_string: 'a', new_string: 'b' })
  expect(r.context).toHaveLength(1)
})

test('other files are never validated', async ($, on) => {
  const ran: string[][] = []
  engine(on, 1, ran)
  await $.tool.call(write('/repo/src/triage.yaml'))
  await $.tool.call(write('/repo/.claude/triage/notes.md'))
  expect(ran).toEqual([])
})

test('no process noun (or node missing) → silent, the call is untouched', async ($, on) => {
  on('tool.call', () => ({ result: { ok: true } }) as never)
  on('process.run', () => ({ deny: 'CLI only' }))
  const r = await $.tool.call(write(RECORD))
  expect(r.result).toEqual({ ok: true })
  expect(r.context).toBeUndefined()
})
