import { expect, mock, test } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } } as const
const TURN = { reason: 'answer', answer: 'Fixed the bug.', durationMs: 10, isAborted: false, turnId: 't' } as const
import { line } from './lines.ts'

test('speaks every N turns and the band shows the quip', { options: { everyNTurns: 2 } }, async ($, on) => {
  mock.store(on)
  let calls = 0
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('model.complete', () => { calls += 1; return { value: { isAnswered: true, text: 'Another bug? Shocking.', usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } } })
  on('turn.complete', ($, e) => ({ text: e.answer }))

  const idle = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
  expect(await idle.find({ type: 'Text', text: /Buddy/ })).toBeDefined()
  await idle.unmount()

  await $.turn.complete(TURN)
  expect(calls).toBe(0)
  await $.turn.complete(TURN)
  expect(calls).toBe(1)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'buddy', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /Shocking/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Text', text: /Shocking/ })).toBeUndefined()
  await ui.unmount()
})

test('/buddy toggles the band', { options: { language: 'en' } }, async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  const run = { command: 'buddy', args: '', origin: { kind: 'user' } } as never
  const shown = async () => {
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    const found = await ui.find({ type: 'Text', text: /Buddy/ })
    await ui.unmount()
    return found !== undefined
  }

  expect(await shown()).toBe(true)
  expect((await $.command.run(run)).text).toContain('waddles off')
  expect(await shown()).toBe(false)
  expect((await $.command.run(run)).text).toContain('is back')
  expect(await shown()).toBe(true)
})

test('the ticker started at session.start animates the band', { options: { species: 'blob' } }, async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  const eyes = async () => {
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    const shut = await ui.find({ type: 'Text', text: /\(\s*-/ })
    await ui.unmount()
    return shut ? 'shut' : 'open'
  }

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  expect(await eyes()).toBe('shut')
  await clock.advance(300)
  expect(await eyes()).toBe('open')
  await clock.advance(300 * 19)
  expect(await eyes()).toBe('shut')
})

test('clicks: pet, poke and the buddy itself say a line; stats toggles, any other click closes it', { options: { language: 'en' } }, async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })

  await ui.press({ key: 'pet' })
  expect(await ui.find({ type: 'Text', text: /squish|jiggles|happy|again|peacefully/ })).toBeDefined()
  await ui.press({ key: 'poke' })
  expect(await ui.find({ type: 'Text', text: /jiggles|oozes|wobbles|what\.|unimpressed|sarcasm/ })).toBeDefined()
  await ui.press({ key: 'body-2' })
  expect(await ui.find({ type: 'Text', text: /\^  \^/ })).toBeDefined()

  await ui.press({ key: 'stats' })
  expect(await ui.find({ type: 'Text', text: /PAT 30/ })).toBeDefined()
  await ui.press({ key: 'stats' })
  expect(await ui.find({ type: 'Text', text: /SNK/ })).toBeUndefined()
  await ui.press({ key: 'stats' })
  await ui.press({ key: 'poke' })
  expect(await ui.find({ type: 'Text', text: /SNK/ })).toBeUndefined()
  await ui.unmount()
})

test('a failing Bash call gets a canned line, a quiet one does not', async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  let isError = false
  on('tool.call', () => (isError ? { result: {}, isError: true } : { result: {} }) as never)
  const bubble = async () => {
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    const quiet = await ui.find({ type: 'Text', text: /^\.\.\.$/ })
    await ui.unmount()
    return quiet ? 'quiet' : 'spoke'
  }

  await $.tool.call({ tool: 'Bash', command: 'ls' } as never)
  expect(await bubble()).toBe('quiet')
  isError = true
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
  expect(await bubble()).toBe('spoke')
})

test('the species option swaps the art and the lines', { options: { species: 'duck', language: 'en' } }, async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /<\([◉-] \)___/ })).toBeDefined()
  await ui.press({ key: 'poke' })
  expect(await ui.find({ type: 'Text', text: /quack|waddle|attentive|what\.|unimpressed|sarcasm/ })).toBeDefined()
  await ui.unmount()
})

test('hatches from ~/.claude.json: own name, and bones rolled from the account id', async ($, on) => {
  mock.store(on)
  mock.env(on, { HOME: '/home/t' })
  let path = ''
  on('fs.read', ($, e) => {
    path = String((e as { path?: string }).path ?? '')
    return { value: JSON.stringify({ companion: { name: 'Pebble', personality: 'Calm.' }, oauthAccount: { accountUuid: 'rare-hunt-42' } }) } as never
  })
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)

  expect(path).toBe('/home/t/.claude.json')
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Pebble/ })).toBeDefined()
  await ui.press({ key: 'stats' })
  expect(await ui.find({ type: 'Text', text: /PAT 78/ })).toBeDefined()
  await ui.unmount()
})

test('language it: command text and canned lines are Italian', { options: { language: 'it' } }, async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  const run = { command: 'buddy', args: '', origin: { kind: 'user' } } as never
  expect((await $.command.run(run)).text).toContain('ondeggiando')
  expect(line('commit', 'SNARK', 'cat', 0, 'it')).toContain('tastiera')
})

test('several buddies: from the option and /buddy add, switched with /buddy use', { options: { language: 'en', buddies: 'Nino:duck; Pippo:cat:Anxious, always.', sessionsPerHatch: 1 } }, async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  const run = async (args: string) => (await $.command.run({ command: 'buddy', args, origin: { kind: 'user' } } as never)).text
  const shows = async (text: RegExp) => {
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    const found = await ui.find({ type: 'Text', text })
    await ui.unmount()
    return found !== undefined
  }

  expect(await run('use Nino')).toContain('Nino hops in')
  expect(await shows(/Nino/)).toBe(true)
  expect(await shows(/\)___/)).toBe(true)
  expect(await run('use Zorro')).toContain('No buddy called Zorro')
  expect(await run('add Zed robot Calm and precise.')).toContain('Zed hatched')
  expect(await run('add nino')).toContain('already')
  expect(await run('list')).toMatch(/Buddy[\s\S]*▸ Nino \(duck\)[\s\S]*Pippo \(cat\)[\s\S]*Zed \(robot\)/)
  expect(await run('use zed')).toContain('Zed hops in')
  expect(await run('rm Nino')).toContain('not added')
  expect(await run('rm Zed')).toContain('waves goodbye')
  expect(await shows(/Buddy/)).toBe(true)
  expect(await run('dance')).toContain('Usage')
})

test('the active option picks the buddy shown at start', { options: { buddies: 'Pippo:cat', active: 'pippo' } }, async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Pippo/ })).toBeDefined()
  await ui.unmount()
})

for (const [position, direction] of [['left', 'row'], ['right', 'row-reverse']] as const) {
  test(`position ${position} lays the band out ${direction}`, { options: { position } }, async ($, on) => {
    mock.store(on)
    on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    expect((await ui.find({ key: 'band' }))?.props.flexDirection).toBe(direction)
    await ui.unmount()
  })
}

test('a new buddy hatches only every N sessions together, and removing one frees no egg', { options: { language: 'en', sessionsPerHatch: 2 } }, async ($, on) => {
  mock.store(on)
  const toasts: string[] = []
  on('ui.toast', ($, e) => { toasts.push(e.text); return { value: undefined } })
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  const run = async (args: string) => (await $.command.run({ command: 'buddy', args, origin: { kind: 'user' } } as never)).text
  const start = () => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)

  await start()
  expect(toasts).toEqual([])
  expect(await run('add Zed robot')).toContain('1 more session together')
  expect(await run('list')).toContain('Next egg: 1/2')
  await start()
  expect(toasts).toEqual(['An egg is ready: /buddy add <name> to hatch a new buddy.'])
  expect(await run('add Zed robot')).toContain('Zed hatched')
  expect(await run('rm Zed')).toContain('waves goodbye')
  expect(await run('add Ada owl')).toContain('2 more sessions')
  await start()
  expect(toasts).toHaveLength(1)
  await start()
  expect(toasts).toHaveLength(2)
  await start()
  expect(toasts).toHaveLength(2)
  expect(await run('add Ada owl')).toContain('Ada hatched')
})

test('hatching: ~/.claude.json is read once to keep the original, the others are random, and what is born stays', { options: { language: 'en', buddies: 'Zed', active: 'Zed' } }, async ($, on) => {
  mock.store(on)
  mock.env(on, { HOME: '/home/t' })
  let reads = 0
  on('fs.read', () => (reads++, { value: JSON.stringify({ companion: { name: 'Pebble' }, oauthAccount: { accountUuid: 'rare-hunt-42' } }) }) as never)
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  const start = () => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  const card = async () => {
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    await ui.press({ key: 'stats' })
    const found = await ui.find({ type: 'Text', text: /DBG \d+/ })
    await ui.press({ key: 'stats' })
    await ui.unmount()
    return found?.text
  }

  await start()
  const zed = await card()
  expect(zed).not.toContain('PAT 78')
  expect((await $.command.run({ command: 'buddy', args: 'use Pebble', origin: { kind: 'user' } } as never)).text).toContain('Pebble hops in')
  expect(await card()).toContain('PAT 78')
  await $.command.run({ command: 'buddy', args: 'use Zed', origin: { kind: 'user' } } as never)
  await start()
  expect(await card()).toBe(zed)
  expect(reads).toBe(1)
})
