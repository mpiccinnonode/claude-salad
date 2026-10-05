import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import { globToRegex } from './whisper.ts'

const CHECKLIST = `version: 1
checks:
  - id: no-any
    severity: major
    rule: >
      Never type a value as any;
      use unknown and narrow.
    applies_to: '**/*.ts'
    status: active
  - id: candidate
    severity: minor
    rule: "Staged rule"
    applies_to: "**/*.ts"
    status: staged
  - id: cs-only
    severity: critical
    rule: Validate DTOs
    applies_to: src/**/*.cs
    status: active
suppressions: []
`

function fakeRepo(on: On, checklist: string | null) {
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', ($, e) =>
    e.path === '/repo/.claude/review-checklist.yaml' && checklist !== null ? { value: checklist } : { deny: 'ENOENT' },
  )
  on('tool.call', () => ({ result: { ok: true } }))
}

const edit = (file_path: string) => ({ tool: 'Edit' as const, file_path, old_string: 'a', new_string: 'b' })

test('whispers matching active rules after an edit, skips staged and non-matching', async ($, on) => {
  fakeRepo(on, CHECKLIST)
  const r = await $.tool.call(edit('/repo/src/app/x.ts'))
  expect(r.context).toEqual(['Project rule no-any (major): Never type a value as any; use unknown and narrow.'])
})

test('whispers a rule once per file per session', async ($, on) => {
  fakeRepo(on, CHECKLIST)
  await $.tool.call(edit('/repo/src/a.ts'))
  expect((await $.tool.call(edit('/repo/src/a.ts'))).context).toBeUndefined()
  expect((await $.tool.call({ tool: 'Write', file_path: '/repo/src/b.ts', content: '' })).context).toHaveLength(1)
})

test('stays silent with no checklist or outside the project', async ($, on) => {
  fakeRepo(on, null)
  expect((await $.tool.call(edit('/repo/src/c.ts'))).context).toBeUndefined()
  expect((await $.tool.call(edit('/elsewhere/d.ts'))).context).toBeUndefined()
})

test('stays silent on a checklist that is not valid YAML', async ($, on) => {
  fakeRepo(on, 'checks:\n  - id: x\n   bad: indent: here\n')
  const r = await $.tool.call(edit('/repo/src/c.ts'))
  expect(r.result).toEqual({ ok: true })
  expect(r.context).toBeUndefined()
})

test('never turns a call into a deny or touches errored calls', async ($, on) => {
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', () => ({ value: CHECKLIST }))
  on('tool.call', () => ({ isError: true as const, result: 'boom', text: 'boom' }))
  const r = await $.tool.call(edit('/repo/src/e.ts'))
  expect(r.deny).toBeUndefined()
  expect(r.isError).toBe(true)
  expect(r.context).toBeUndefined()
})

test('glob subset: **/, braces, comma lists', async () => {
  expect(globToRegex('**/*.ts').test('a.ts')).toBe(true)
  expect(globToRegex('**/*.ts').test('src/a/b.ts')).toBe(true)
  expect(globToRegex('src/*.ts').test('src/a/b.ts')).toBe(false)
  expect(globToRegex('**/*.{page,component}.ts').test('x/y.page.ts')).toBe(true)
  expect(globToRegex('**/*.{page,component}.ts').test('x/y.service.ts')).toBe(false)
  expect(globToRegex('a/**/*.scss, b/**-card/*.scss').test('b/x/foo-card/y.scss')).toBe(true)
  expect(globToRegex('**/*').test('anything/at/all')).toBe(true)
})
