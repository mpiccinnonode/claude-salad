import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import { parseConfig } from './gate.ts'

const file = (name: string) => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })

function engine(on: On, doneGateJson?: string) {
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', ($, e) => (doneGateJson && e.path === '/repo/.claude/done-gate.json' ? { value: doneGateJson } : { deny: 'ENOENT' }))
  on('fs.list', () => ({ value: [file('package.json'), file('README.md')] }))
  on('tool.call', () => ({ result: {} }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('classic.Stop', () => ({}))
  on('turn.complete', ($, e) => ({ text: e.answer }))
}

const edit = (file_path: string) => ({ tool: 'Edit' as const, file_path, old_string: 'a', new_string: 'b' })
const bash = (command: string) => ({ tool: 'Bash' as const, command })
const complete = { answer: 'Done.', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' as const }

test('edited sources and no check → one warn line under the answer', async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'fix it', turnId: 't' })
  await $.tool.call(edit('/repo/src/a.ts'))
  await $.tool.call(edit('/repo/src/b.ts'))
  await $.tool.call(bash('git status'))
  expect((await $.turn.complete(complete)).text).toBe('done-gate: edited 2 source files, no npm test|run lint ran after the last edit')
})

test('a check after the last edit → silent', async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'fix it', turnId: 't' })
  await $.tool.call(edit('/repo/src/a.ts'))
  await $.tool.call(bash('npm test -- --watch=false'))
  expect((await $.turn.complete(complete)).text).toBe('Done.')
})

test('a check before the last edit does not count', async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'fix it', turnId: 't' })
  await $.tool.call(edit('/repo/src/a.ts'))
  await $.tool.call(bash('npm run lint'))
  await $.tool.call(edit('/repo/src/a.ts'))
  expect((await $.turn.complete(complete)).text).toContain('edited 1 source file,')
})

test('docs-only edits → silent', async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'docs', turnId: 't' })
  await $.tool.call(edit('/repo/README.md'))
  await $.tool.call({ tool: 'Write', file_path: '/repo/docs/guide.txt', content: '' })
  expect((await $.turn.complete(complete)).text).toBe('Done.')
})

test('done-gate.json checks and sources replace detection', async ($, on) => {
  engine(on, JSON.stringify({ checks: ['npx nx affected -t test,lint'], sources: ['libs/**'] }))
  await $.turn.start({ text: 'x', turnId: 't' })
  await $.tool.call(edit('/repo/tools/script.ts'))
  expect((await $.turn.complete(complete)).text).toBe('Done.')
  await $.tool.call(edit('/repo/libs/ui/button.ts'))
  await $.tool.call(bash('npm test'))
  expect((await $.turn.complete(complete)).text).toContain('no npx nx affected -t test,lint ran')
  await $.tool.call(bash('npx nx affected -t test,lint --base=main'))
  expect((await $.turn.complete(complete)).text).toBe('Done.')
})

test('a new turn starts clean', async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'a', turnId: 't1' })
  await $.tool.call(edit('/repo/src/a.ts'))
  await $.turn.start({ text: 'b', turnId: 't2' })
  expect((await $.turn.complete({ ...complete, turnId: 't2' })).text).toBe('Done.')
})

test('warn mode never blocks', async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'x', turnId: 't' })
  await $.tool.call(edit('/repo/src/a.ts'))
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toBeUndefined()
})

test('block mode blocks once per turn, then only warns', { options: { mode: 'block' } }, async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'x', turnId: 't' })
  await $.tool.call(edit('/repo/src/a.ts'))
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toContain('Run the project\'s checks')
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toBeUndefined()
  expect((await $.turn.complete(complete)).text).toContain('done-gate:')
})

test('block mode respects stop_hook_active', { options: { mode: 'block' } }, async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'x', turnId: 't' })
  await $.tool.call(edit('/repo/src/a.ts'))
  expect((await $.classic.Stop({ stop_hook_active: true })).block).toBeUndefined()
})

test('off mode does nothing', { options: { mode: 'off' } }, async ($, on) => {
  engine(on)
  await $.turn.start({ text: 'x', turnId: 't' })
  await $.tool.call(edit('/repo/src/a.ts'))
  expect((await $.turn.complete(complete)).text).toBe('Done.')
})

test('detection: each marker accepts its commands', async () => {
  const ran = (names: string[], cmd: string) => parseConfig('', names).checks.some(c => c.re.test(cmd))
  expect(ran(['nx.json'], 'npx nx affected -t lint,test')).toBe(true)
  expect(ran(['nx.json'], 'nx run-many --targets=test')).toBe(true)
  expect(ran(['nx.json'], 'nx affected -t build')).toBe(false)
  expect(ran(['App.sln'], 'dotnet build -c Release')).toBe(true)
  expect(ran(['pubspec.yaml'], 'flutter analyze')).toBe(true)
  expect(ran(['package.json'], 'npm run build')).toBe(false)
  expect(ran(['pyproject.toml'], 'uv run pytest -q')).toBe(true)
  expect(ran(['requirements-dev.txt'], 'python -m unittest discover')).toBe(true)
  expect(ran(['setup.py'], 'poetry run ruff check .')).toBe(true)
  expect(ran(['pyproject.toml'], 'ruff format .')).toBe(false)
  expect(ran(['pyproject.toml'], 'cat pytest.ini')).toBe(false)
  expect(parseConfig('', ['README.md']).checks).toEqual([])
})
