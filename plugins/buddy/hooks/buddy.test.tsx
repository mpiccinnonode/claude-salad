import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } } as const
const TURN = { reason: 'answer', answer: 'Fixed the bug.', durationMs: 10, isAborted: false, turnId: 't' } as const
import { line } from './lines.ts'

const FILE = '/home/t/.claude/buddy/buddies.json'
const LEGACY = JSON.stringify({ companion: { name: 'Pebble' }, oauthAccount: { accountUuid: 'rare-hunt-42' } })
const answer = (text: string) => ({ value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }) as never

// A home on an in-memory disk, a stubbed engine, and the helpers the hatching tests share.
function rig($: Engine, on: On, files: Record<string, string>) {
  const reads: string[] = []
  const writes: string[] = []
  mock.store(on)
  mock.env(on, { HOME: '/home/t' })
  on('fs.read', ($, e) => {
    reads.push(e.path)
    if (!(e.path in files)) throw new Error(`ENOENT ${e.path}`)
    return { value: files[e.path] } as never
  })
  on('fs.write', ($, e) => {
    writes.push(e.path)
    files[e.path] = e.text
    return { value: undefined }
  })
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  const run = async (args: string) => (await $.command.run({ command: 'buddy', args, origin: { kind: 'user' } } as never)).text
  const start = () => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  const shows = async (text: RegExp) => {
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    const found = await ui.find({ type: 'Text', text })
    await ui.unmount()
    return found !== undefined
  }
  const card = async () => {
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    await ui.press({ key: 'stats' })
    const found = await ui.find({ type: 'Text', text: /DBG \d+/ })
    await ui.press({ key: 'stats' })
    await ui.unmount()
    return found?.text
  }
  const book = () => JSON.parse(files[FILE] ?? '[]') as Record<string, unknown>[]
  return { reads, writes, run, start, shows, card, book }
}

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


for (const [position, direction] of [['left', 'row'], ['right', 'row-reverse']] as const) {
  test(`position ${position} lays the band out ${direction}`, { options: { position } }, async ($, on) => {
    mock.store(on)
    on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
    const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
    expect((await ui.find({ key: 'band' }))?.props.flexDirection).toBe(direction)
    await ui.unmount()
  })
}

test('buddies.json: its buddies are eggs until /buddy use spends one; a missing personality is dreamt up and written back', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const { run, start, shows, book } = rig($, on, {
    [FILE]: JSON.stringify([{ name: 'Nino', species: 'duck', mood: 'kept as is' }, { name: 'Pippo', personality: { tone: 'anxious', traits: 'always' } }]),
  })
  const systems: string[] = []
  on('model.complete', ($, e) => {
    systems.push(e.system ?? '')
    return answer(e.system?.includes('invent personalities') ? 'Sure! {"tone": "wry", "traits": ["fussy", "loyal", "nosy"], "catchphrase": "Quack. Again."}' : 'Hm.')
  })

  await start()
  expect(await run('list')).toMatch(/▸ Buddy[\s\S]*🥚 Nino \(duck\)[\s\S]*🥚 Pippo/)
  expect(await run('use Nino')).toContain('Nino hops in')
  expect(await shows(/Nino/)).toBe(true)
  expect(await shows(/\)___/)).toBe(true)
  expect(book()[0]).toEqual({ name: 'Nino', species: 'duck', mood: 'kept as is', personality: { tone: 'wry', traits: ['fussy', 'loyal', 'nosy'], catchphrase: 'Quack. Again.' } })

  expect(await run('use Pippo')).toContain('Pippo is still an egg: 1 more session together')
  await start()
  expect(await run('use Pippo')).toContain('Pippo hops in')
  // One for the original (no ~/.claude.json), one for Nino; none for Pippo, who brought his own.
  expect(systems.filter(s => s.includes('invent personalities'))).toHaveLength(2)
  expect(book()[1]).toEqual({ name: 'Pippo', personality: { tone: 'anxious', traits: 'always' } })
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND })
  await ui.press({ key: 'talk' })
  await ui.unmount()
  expect(systems.at(-1)).toContain('You are Pippo, a tiny terminal companion. Tone: anxious. Traits: always.')

  expect(await run('use Zorro')).toContain('No buddy called Zorro')
  expect(await run('rm Buddy')).toContain('No buddy called Buddy')
  expect(await run('rm nino')).toContain('waves goodbye')
  expect(book().map(b => b.name)).toEqual(['Pippo'])
})

test('a broken buddies.json is reported and never written', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const { run, start, writes } = rig($, on, { [FILE]: '{ oops' })
  await start()
  expect(await run('list')).toContain("buddies.json can't be read")
  expect(await run('add Zed robot')).toContain("can't be read")
  expect(await run('rm Zed')).toContain("can't be read")
  expect(writes).toEqual([])
})

test('a new buddy hatches only every N sessions together, and removing one frees no egg', { options: { language: 'en', sessionsPerHatch: 2 } }, async ($, on) => {
  const { run, start, book } = rig($, on, {})
  on('model.complete', () => answer('not json'))
  const toasts: string[] = []
  on('ui.toast', ($, e) => { toasts.push(e.text); return { value: undefined } })

  await start()
  expect(toasts).toEqual([])
  expect(await run('add Zed robot')).toContain('1 more session together')
  expect(await run('list')).toContain('Next egg: 1/2')
  await start()
  expect(toasts).toHaveLength(1)
  expect(await run('add Zed robot Calm and precise.')).toContain('Zed hatched')
  expect(book()).toEqual([{ name: 'Zed', species: 'robot', personality: 'Calm and precise.' }])
  expect(await run('add zed')).toContain('already')
  expect(await run('rm Zed')).toContain('waves goodbye')
  expect(await run('add Ada owl')).toContain('2 more sessions')
  await start()
  expect(toasts).toHaveLength(1)
  await start()
  expect(toasts).toHaveLength(2)
  await start()
  expect(toasts).toHaveLength(2)
  expect(await run('add Ada owl')).toContain('Ada hatched')
  expect(book()).toEqual([{ name: 'Ada', species: 'owl' }])
  expect(await run('dance')).toContain('Usage')
})

test('hatching: ~/.claude.json is read once to keep the original, the others are random, and what is born stays', { options: { language: 'en', active: 'Zed', sessionsPerHatch: 1 } }, async ($, on) => {
  const { reads, run, start, card } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify([{ name: 'Zed', personality: 'Calm.' }]) })

  await start()
  expect(await card()).toContain('PAT 78')
  expect(await run('use Zed')).toContain('Zed hops in')
  const zed = await card()
  expect(zed).not.toContain('PAT 78')
  expect(await run('use Pebble')).toContain('Pebble hops in')
  expect(await card()).toContain('PAT 78')
  expect(await run('use')).toContain('Zed hops in')
  await start()
  expect(await card()).toBe(zed)
  expect(reads.filter(p => p.endsWith('.claude.json'))).toHaveLength(1)
})

test('no companion in ~/.claude.json: the original is random, name and personality included; a bare /buddy add is named by Haiku', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const { run, start, shows, card, book } = rig($, on, { '/home/t/.claude.json': JSON.stringify({ oauthAccount: { accountUuid: 'rare-hunt-42' } }) })
  const names = ['Brisa', 'Quillon']
  on('model.complete', ($, e) => answer(e.system?.includes('invent personalities') ? JSON.stringify({ name: names.shift(), tone: 'dry', traits: ['odd'] }) : 'Hm.'))

  await start()
  expect(await shows(/Brisa/)).toBe(true)
  expect(await card()).not.toContain('PAT 78')
  expect(await run('add')).toContain('Quillon hatched')
  expect(book()).toEqual([{ name: 'Quillon', personality: { tone: 'dry', traits: ['odd'] } }])
  expect(await run('add')).toContain('1 more session')
})

test('with an egg ready, a bare /buddy hatches a surprise named by Haiku and brings it out; then it toggles again', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const { run, start, shows, book } = rig($, on, {})
  const toasts: string[] = []
  on('ui.toast', ($, e) => { toasts.push(e.text); return { value: undefined } })
  const names = ['Brisa', 'Tortellino']
  on('model.complete', ($, e) => answer(e.system?.includes('invent personalities') ? JSON.stringify({ name: names.shift(), tone: 'grand' }) : 'Hm.'))

  await start()
  expect(toasts).toEqual(['An egg is wobbling! Type /buddy to find out who hatches.'])
  expect(await shows(/Brisa/)).toBe(true)
  expect(await run('')).toContain('Crack! Say hi to Tortellino.')
  expect(await shows(/Tortellino/)).toBe(true)
  expect(await shows(/Crack!/)).toBe(true)
  expect(book().map(b => b.name)).toEqual(['Tortellino'])
  expect(await run('')).toContain('Tortellino waddles off')
})
