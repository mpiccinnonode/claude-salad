import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'
import { line } from './lines.ts'
import { roll } from './bones.ts'
import { titled } from './crew.ts'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } } as const
const TURN = { reason: 'answer', answer: 'Fixed the bug.', durationMs: 10, isAborted: false, turnId: 't' } as const
const FILE = '/home/t/.claude/buddy/buddies.json'
const LEGACY = JSON.stringify({ companion: { name: 'Pebble' }, oauthAccount: { accountUuid: 'rare-hunt-42' } })
const ZED = { name: 'Zed', personality: 'Calm.' }
// Bones already rolled for Zed, Ada and Pip; a fresh copy per test.
const born = () => ({ zed: { bones: roll('z') }, ada: { bones: roll('a') }, pip: { bones: roll('p') } })
// The evolution gap grows with rarity, so evolution tests pin Zed to common.
const commonZed = () => ({ ...born(), zed: { bones: { ...roll('z'), rarity: 'common' as const } } })
// Wide enough for the buddy, its bubble and the box of what is ready.
const WIDE = { bodyColumns: 130, maxRows: 40 }
const answer = (text: string) => ({ value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }) as never

// A home on an in-memory disk, a stubbed engine, and the helpers the tests share.
function rig($: Engine, on: On, files: Record<string, string> = {}, store?: Record<string, unknown>, env: Record<string, string> = { HOME: '/home/t' }) {
  const reads: string[] = []
  const writes: string[] = []
  const toasts: string[] = []
  // Relations were already generated, unless a test says otherwise.
  mock.store(on, { related: true, ...store })
  mock.env(on, env)
  on('fs.read', ($, e) => {
    reads.push(e.path)
    if (!(e.path in files)) throw new Error(`ENOENT ${e.path}`)
    return { value: files[e.path] } as never
  })
  on('fs.exists', ($, e) => ({ value: e.path in files }) as never)
  on('fs.write', ($, e) => {
    writes.push(e.path)
    files[e.path] = e.text
    return { value: undefined }
  })
  on('ui.toast', ($, e) => { toasts.push(e.text); return { value: undefined } })
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box key="engine" /> })
  on('command.register', () => ({ value: {} }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  const run = async (args: string) => (await $.command.run({ command: 'buddy', args, origin: { kind: 'user' } } as never)).text
  const start = () => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  const mount = (props: { bodyColumns?: number; maxRows?: number } = {}) => $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND, props: { ...BAND.props, ...props } })
  const turns = async (n: number) => {
    for (let i = 0; i < n; i++) await $.turn.complete(TURN)
  }
  const shows = async (text: RegExp, props?: { bodyColumns?: number; maxRows?: number }) => {
    const ui = await mount(props)
    const found = await ui.find({ type: 'Text', text })
    await ui.unmount()
    return found !== undefined
  }
  const card = async () => {
    const ui = await mount()
    await ui.press({ key: 'stats' })
    const found = await ui.find({ type: 'Text', text: /DBG \d+/ })
    await ui.press({ key: 'stats' })
    await ui.unmount()
    return found?.text
  }
  const book = () => JSON.parse(files[FILE] ?? '[]') as Record<string, unknown>[]
  return { reads, writes, toasts, run, start, turns, mount, shows, card, book }
}

test('speaks every N turns and the band shows the quip', { options: { everyNTurns: 2 } }, async ($, on) => {
  const { mount, shows, start } = rig($, on)
  let calls = 0
  on('model.complete', () => { calls += 1; return answer('Another bug? Shocking.') })

  await start()
  // The original dreams its soul at the first start; only the quips count.
  calls = 0
  expect(await shows(/Buddy/)).toBe(true)
  await $.turn.complete(TURN)
  expect(calls).toBe(0)
  await $.turn.complete(TURN)
  expect(calls).toBe(1)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'buddy', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /Shocking/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await mount()
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Text', text: /Shocking/ })).toBeUndefined()
  await ui.unmount()
})

test('/buddy toggles the band', { options: { language: 'en' } }, async ($, on) => {
  const { run, shows } = rig($, on)
  expect(await shows(/Buddy/)).toBe(true)
  expect(await run('')).toContain('waddles off')
  expect(await shows(/Buddy/)).toBe(false)
  expect(await run('')).toContain('is back')
  expect(await shows(/Buddy/)).toBe(true)
})

test('the ticker started at session.start animates the band', { options: { species: 'blob' } }, async ($, on) => {
  const { start, shows } = rig($, on)
  const clock = mock.clock(on)
  const shut = /\.----\.|'-  -'/

  await start()
  expect(await shows(shut)).toBe(true)
  await clock.advance(300)
  expect(await shows(shut)).toBe(false)
  await clock.advance(300 * 19)
  expect(await shows(shut)).toBe(true)
})

test('clicks: pet, poke and the buddy itself say a line; stats toggles, any other click closes it', { options: { language: 'en' } }, async ($, on) => {
  const ui = await rig($, on).mount()

  await ui.press({ key: 'pet' })
  expect(await ui.find({ type: 'Text', text: /squish|jiggles|happy|again|peacefully/ })).toBeDefined()
  await ui.press({ key: 'poke' })
  expect(await ui.find({ type: 'Text', text: /jiggles|oozes|wobbles|what\.|unimpressed|sarcasm/ })).toBeDefined()
  await ui.press({ key: 'body-0-2' })
  expect(await ui.find({ type: 'Text', text: /\^--\^/ })).toBeDefined()

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
  const { shows } = rig($, on)
  let isError = false
  on('tool.call', () => (isError ? { result: {}, isError: true } : { result: {} }) as never)
  const quiet = /^\.\.\.$/

  await $.tool.call({ tool: 'Bash', command: 'ls' } as never)
  expect(await shows(quiet)).toBe(true)
  isError = true
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
  expect(await shows(quiet)).toBe(false)
})

test('0.8\'s name, personality and species options move into the buddies file with the original, and the species swaps the art and the lines', { options: { name: 'Rex', personality: 'Grumpy.', species: 'duck', language: 'en' } }, async ($, on) => {
  const { start, mount, book } = rig($, on, { '/home/t/.claude.json': LEGACY })
  await start()
  expect(book()).toEqual([{ name: 'Rex', species: 'duck', personality: 'Grumpy.' }])
  const ui = await mount()
  expect(await ui.find({ type: 'Text', text: /___\( [◉-]\)/ })).toBeDefined()
  await ui.press({ key: 'poke' })
  expect(await ui.find({ type: 'Text', text: /quack|waddle|attentive|what\.|unimpressed|sarcasm/ })).toBeDefined()
  await ui.unmount()
})

test('0.8\'s original moves from the store to the top of the buddies file under a free name, keeping its body, epithet, turns (4 sessions count 80) and place in the crew', { options: { language: 'en', turnsPerEvolve: 80 } }, async ($, on) => {
  const original = { bones: { ...roll('x'), rarity: 'common' as const }, name: 'Pebble', personality: 'Kind.', title: { en: 'the Kind', it: 'il Gentile' } }
  const { start, run, shows, book } = rig($, on, { [FILE]: JSON.stringify([ZED, { name: 'Pebble' }]) }, { migrated: true, born: { ...born(), '': original }, together: { '': 4 }, crew: ['', 'zed'] })
  await start()
  expect(book()).toEqual([{ name: 'Pebble 2', species: original.bones.species, personality: 'Kind.' }, { ...ZED, species: expect.any(String) }, { name: 'Pebble' }])
  expect(await shows(/Pebble 2, the Kind/)).toBe(true)
  expect(await shows(/Pebble 2 · \/buddy evolve/, WIDE)).toBe(true)
  const list = await run('list')
  for (const row of ['▸ Pebble 2', '● Zed', '🥚 Pebble']) expect(list).toContain(row)
  expect(await run('rm Pebble 2')).toContain('waves goodbye')
  await start()
  expect(book().map(b => b.name)).toEqual(['Zed', 'Pebble'])
})

// Two sessions started together: the other one already wrote the original into the file.
const PEBBLE = { bones: roll('x'), name: 'Pebble', personality: 'Kind.' }
const pebbleIn = () => JSON.stringify([{ name: 'Pebble', species: PEBBLE.bones.species, personality: 'Kind.' }, ZED])

test('sessions started together: the same original already in the file is reused, not numbered', { options: { language: 'en' } }, async ($, on) => {
  const { start, run, book } = rig($, on, { [FILE]: pebbleIn() }, { migrated: true, born: { ...born(), '': PEBBLE }, together: { '': 4 }, crew: ['', 'zed'] })
  await start()
  expect(book().map(b => b.name)).toEqual(['Pebble', 'Zed'])
  expect(await run('list')).toContain('▸ Pebble')
})

test('sessions started together: one that finds the original already moved adds nobody', { options: { language: 'en' } }, async ($, on) => {
  const { start, run, book } = rig($, on, { [FILE]: pebbleIn() }, { migrated: true, born: { ...born(), pebble: { bones: PEBBLE.bones } }, crew: ['pebble', 'zed'] })
  let dreams = 0
  on('model.complete', () => { dreams += 1; return answer('{}') })
  await start()
  expect(book().map(b => b.name)).toEqual(['Pebble', 'Zed'])
  expect(await run('list')).toContain('▸ Pebble')
  expect(dreams).toBe(0)
})

test('a buddy born without a personality gets one dreamt at the next session and written back; a failed dream retries later', { options: { language: 'en' } }, async ($, on) => {
  let ok = false
  on('model.complete', () => answer(ok ? JSON.stringify({ tone: 'prim', traits: ['fussy'] }) : 'not json'))
  const { start, book } = rig($, on, { [FILE]: JSON.stringify([{ name: 'Buddy', species: 'goose' }]) }, { moved: true, born: { buddy: { bones: roll('x') } } })
  await start()
  expect(book()).toEqual([{ name: 'Buddy', species: 'goose' }])
  ok = true
  await start()
  expect(book()).toEqual([{ name: 'Buddy', species: 'goose', personality: { tone: 'prim', traits: ['fussy'] } }])
})

test('language it: command text and canned lines are Italian', { options: { language: 'it' } }, async ($, on) => {
  expect(await rig($, on).run('')).toContain('ondeggiando')
  expect(line('commit', 'SNARK', 'cat', 0, 'it')).toContain('tastiera')
})

for (const [position, direction] of [['left', 'row'], ['right', 'row-reverse']] as const) {
  test(`position ${position} lays the band out ${direction}`, { options: { position } }, async ($, on) => {
    const ui = await rig($, on).mount()
    expect((await ui.find({ key: 'band' }))?.props.flexDirection).toBe(direction)
    await ui.unmount()
  })
}

test('buddies.json: its buddies are eggs until /buddy use spends one; a missing personality is dreamt up and written back', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const { run, start, turns, shows, mount, book } = rig($, on, {
    [FILE]: JSON.stringify([{ name: 'Nino', species: 'duck', mood: 'kept as is' }, { name: 'Pippo', personality: { tone: 'anxious', traits: 'always' } }]),
  })
  const systems: string[] = []
  on('model.complete', ($, e) => {
    systems.push(e.system ?? '')
    return answer(e.system?.includes('invent personalities') ? 'Sure! {"tone": "wry", "traits": ["fussy", "loyal", "nosy"], "catchphrase": "Quack. Again."}' : 'Hm.')
  })

  await start()
  await turns(1)
  expect(await run('list')).toMatch(/▸ Buddy[\s\S]*🥚 Nino \(duck\)[\s\S]*🥚 Pippo/)
  expect(await run('use Nino')).toContain('Nino hops in')
  expect(await shows(/Nino/)).toBe(true)
  expect(await shows(/___\(/)).toBe(true)
  expect(book()[1]).toEqual({ name: 'Nino', species: 'duck', mood: 'kept as is', personality: { tone: 'wry', traits: ['fussy', 'loyal', 'nosy'], catchphrase: 'Quack. Again.' } })

  expect(await run('use Pippo')).toContain('Pippo is still an egg: 1 more turn together')
  await start()
  await turns(1)
  expect(await run('use Pippo')).toContain('Pippo hops in')
  // One for the original (no ~/.claude.json), one for Nino, one retry for the original's missing soul at the second start; none for Pippo, who brought his own.
  expect(systems.filter(s => s.includes('invent personalities'))).toHaveLength(3)
  expect(book()[2]).toEqual({ name: 'Pippo', species: expect.any(String), personality: { tone: 'anxious', traits: 'always' } })
  const ui = await mount()
  await ui.press({ key: 'talk' })
  await ui.unmount()
  expect(systems.at(-1)).toContain('You are Pippo, a tiny terminal companion. Tone: anxious. Traits: always.')

  expect(await run('use Zorro')).toContain('No buddy called Zorro')
  expect(await run('rm Ghost')).toContain('No buddy called Ghost')
  expect(await run('rm nino')).toContain('waves goodbye')
  expect(book().map(b => b.name)).toEqual(['Buddy', 'Pippo'])
})

test('a broken buddies.json is reported and never written', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const { run, start, writes } = rig($, on, { [FILE]: '{ oops' })
  await start()
  expect(await run('list')).toContain("buddies.json can't be read")
  expect(await run('add Zed robot')).toContain("can't be read")
  expect(await run('rm Zed')).toContain("can't be read")
  expect(writes).toEqual([])
})

test('a new buddy hatches only every N turns together, and removing one frees no egg', { options: { language: 'en', turnsPerHatch: 2 } }, async ($, on) => {
  const { run, start, turns, shows, book } = rig($, on)
  on('model.complete', () => answer('not json'))

  await start()
  await turns(1)
  expect(await shows(/Egg ready/, WIDE)).toBe(false)
  expect(await run('add Zed robot')).toContain('1 more turn together')
  expect(await run('list')).toContain('Next egg: 1/2')
  await turns(1)
  expect(await shows(/Egg ready/, WIDE)).toBe(true)
  expect(await run('add Zed robot Calm and precise.')).toContain('Zed hatched')
  expect(book().slice(1)).toEqual([{ name: 'Zed', species: 'robot', personality: 'Calm and precise.' }])
  expect(await run('add zed')).toContain('already')
  expect(await run('rm Zed')).toContain('waves goodbye')
  expect(await run('add Ada owl')).toContain('2 more turns')
  await turns(1)
  expect(await shows(/Egg ready/, WIDE)).toBe(false)
  await turns(1)
  expect(await shows(/Egg ready/, WIDE)).toBe(true)
  expect(await run('add Ada owl')).toContain('Ada hatched')
  expect(book().slice(1)).toEqual([{ name: 'Ada', species: 'owl' }])
  expect(await run('dance')).toContain('Usage')
})

test('subagent turns count one in three, and never quip', { options: { language: 'en', turnsPerHatch: 2, everyNTurns: 1 } }, async ($, on) => {
  const { run, start } = rig($, on)
  let calls = 0
  on('model.complete', () => { calls += 1; return answer('not json') })

  await start()
  calls = 0
  for (let i = 0; i < 5; i++) await $.turn.complete({ ...TURN, agentId: 'a1' })
  expect(await run('list')).toContain('Next egg: 1/2')
  expect(calls).toBe(0)
  await $.turn.complete({ ...TURN, agentId: 'a1' })
  expect(await run('add Zed robot')).toContain('Zed hatched')
})

test('the egg counter never goes negative when turns fall behind hatched eggs or the price changes', { options: { language: 'en', turnsPerHatch: 70 } }, async ($, on) => {
  const { run, start, turns } = rig($, on, {}, { sessions: 1, hatched: 3 })
  expect(await run('list')).toContain('Next egg: 0/70')
  expect(await run('add Zed robot Calm.')).toContain('70 more turns')
  await start()
  await turns(2)
  expect(await run('list')).toContain('Next egg: 2/70')
})

test('hatching: ~/.claude.json is read once to keep the original, the others are random, and what is born stays', { options: { language: 'en', active: 'Zed', turnsPerHatch: 1 } }, async ($, on) => {
  const { reads, run, start, turns, card } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify([ZED]) })

  await start()
  await turns(1)
  const pebble = await card()
  expect(pebble).toContain('PAT 78')
  expect(await run('use Zed')).toContain('Zed hops in')
  const zed = await card()
  expect(zed).not.toBe(pebble)
  expect(await run('use Pebble')).toContain('Pebble hops in')
  expect(await card()).toContain('PAT 78')
  expect(await run('use')).toContain('Zed hops in')
  await start()
  expect(await card()).toBe(zed)
  expect(reads.filter(p => p.endsWith('.claude.json'))).toHaveLength(1)
})

test('a half-written ~/.claude.json is not the end of the original: a stand-in for now, and the next session reads it again', { options: { language: 'en' } }, async ($, on) => {
  const files = { '/home/t/.claude.json': '{"compan' }
  const { start, card } = rig($, on, files)

  await start()
  expect(await card()).not.toContain('PAT 78')
  files['/home/t/.claude.json'] = LEGACY
  await start()
  expect(await card()).toContain('PAT 78')
})

test('on Windows, without HOME, USERPROFILE is home: the original is kept and buddies.json is found', { options: { language: 'en', active: 'Zed' } }, async ($, on) => {
  const { start, card, run } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify([ZED]) }, { born: born() }, { USERPROFILE: '/home/t' })

  await start()
  expect(await run('use Pebble')).toContain('Pebble hops in')
  expect(await card()).toContain('PAT 78')
  expect(await run('list')).toContain('Zed')
})

test('USERPROFILE wins over a Git Bash HOME, and CLAUDE_CONFIG_DIR is where ~/.claude.json lives', { options: { language: 'en', active: 'Zed' } }, async ($, on) => {
  const files = { '/cfg/.claude.json': LEGACY, [FILE]: JSON.stringify([ZED]), '/elsewhere/.claude.json': JSON.stringify({}) }
  const { start, card, run } = rig($, on, files, { born: born() }, { USERPROFILE: '/home/t', HOME: '/elsewhere', CLAUDE_CONFIG_DIR: '/cfg' })

  await start()
  expect(await run('use Pebble')).toContain('Pebble hops in')
  expect(await card()).toContain('PAT 78')
  expect(await run('list')).toContain('Zed')
})

test('no companion in ~/.claude.json: the original is random, name and personality included; a bare /buddy add is named by Haiku', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const { run, start, turns, shows, card, book } = rig($, on, { '/home/t/.claude.json': JSON.stringify({ oauthAccount: { accountUuid: 'rare-hunt-42' } }) })
  const names = ['Brisa', 'Quillon']
  on('model.complete', ($, e) => answer(e.system?.includes('invent personalities') ? JSON.stringify({ name: names.shift(), tone: 'dry', traits: ['odd'] }) : 'Hm.'))

  await start()
  await turns(1)
  expect(await shows(/Brisa/)).toBe(true)
  expect(await card()).not.toContain('PAT 78')
  expect(await run('add')).toContain('Quillon hatched')
  expect(book()).toEqual(['Brisa', 'Quillon'].map(name => ({ name, species: expect.any(String), personality: { tone: 'dry', traits: ['odd'] } })))
  expect(await run('add')).toContain('1 more turn')
})

test('with an egg ready, a bare /buddy hatches a surprise named by Haiku and brings it out; then it toggles again', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const { run, start, turns, shows, book } = rig($, on)
  const names = ['Brisa', 'Tortellino']
  on('model.complete', ($, e) => answer(e.system?.includes('invent personalities') ? JSON.stringify({ name: names.shift(), tone: 'grand' }) : 'Hm.'))

  await start()
  await turns(1)
  expect(await shows(/Egg ready · \/buddy/, WIDE)).toBe(true)
  expect(await shows(/Brisa/)).toBe(true)
  expect(await run('')).toContain('Crack! Say hi to Tortellino.')
  expect(await shows(/Tortellino/)).toBe(true)
  expect(await shows(/Crack!/)).toBe(true)
  expect(book().map(b => b.name)).toEqual(['Brisa', 'Tortellino'])
  expect(await run('')).toContain('Tortellino waddles off')
})

test('evolution: a box when ready, nothing until /buddy evolve, then a rarity up, a weirder soul and an epithet in the set language', { options: { language: 'it', turnsPerEvolve: 2 } }, async ($, on) => {
  const { run, start, turns, shows, card, mount } = rig($, on, { '/home/t/.claude.json': LEGACY })
  const systems: string[] = []
  const prompts: string[] = []
  on('model.complete', ($, e) => {
    systems.push(e.system ?? '')
    prompts.push(e.prompt ?? '')
    return answer(e.system?.includes('You evolve') ? JSON.stringify({ title_en: 'the Winged Sarcasm', title_it: 'Sarcasmo Alato', tone: 'feroce', traits: ['strano'] }) : 'Hm.')
  })

  await start()
  await turns(1)
  expect(await shows(/^★$/)).toBe(true)
  expect(await run('evolve')).toContain('Pebble si evolve dopo un altro turno insieme')
  expect(await shows(/\/buddy evolve/, WIDE)).toBe(false)
  await turns(1)
  expect(await shows(/Pebble · \/buddy evolve/, WIDE)).toBe(true)
  expect(await card()).toContain('PAT 78')
  expect(await run('evolve')).toContain('Pebble, Sarcasmo Alato si è evoluto!')
  expect(prompts.at(-1)).toContain('Rarity now: uncommon')
  expect(await shows(/Pebble, Sarcasmo Alato/)).toBe(true)
  expect(await shows(/^★★$/)).toBe(true)
  expect(await card()).toContain('PAT 93')
  expect(await run('evolve')).toContain('altri 3 turni')

  const ui = await mount()
  await ui.press({ key: 'talk' })
  await ui.unmount()
  expect(systems.at(-1)).toContain('You are Pebble, Sarcasmo Alato, a tiny terminal companion. Tone: feroce. Traits: strano.')
  await turns(2)
  expect(await shows(/\/buddy evolve/, WIDE)).toBe(false)
  await turns(1)
  expect(await shows(/Pebble · \/buddy evolve/, WIDE)).toBe(true)
})

test('an epithet that repeats the name shows it once', async () => {
  const m = (name: string, title?: string) => ({ name, title }) as Parameters<typeof titled>[0]
  expect(titled(m('gremolo', 'Gremolo, l\'Oca Impassibile'))).toBe('gremolo, l\'Oca Impassibile')
  expect(titled(m('Pebble', 'Pebble the Unblinking'))).toBe('Pebble, the Unblinking')
  expect(titled(m('Bo', 'Bold One'))).toBe('Bo, Bold One')
  expect(titled(m('Pebble'))).toBe('Pebble')
})

test('evolution: if Haiku fails nothing changes; a file buddy gets its new soul written back', { options: { language: 'en', turnsPerEvolve: 1, turnsPerHatch: 1, active: 'Zed' } }, async ($, on) => {
  const { run, start, turns, shows, book } = rig($, on, { [FILE]: JSON.stringify([ZED]) }, { born: commonZed() })
  let isBroken = true
  on('model.complete', ($, e) => answer(isBroken ? 'not json' : JSON.stringify({ title_en: 'the Unbothered', title_it: 'l\'Imperturbabile', tone: 'eerily calm' })))

  await start()
  expect(await run('use Zed')).toContain('Zed hops in')
  await turns(1)
  expect(await run('evolve')).toContain('nothing changed')
  expect(book()).toEqual([{ ...ZED, species: expect.any(String) }])
  isBroken = false
  expect(await run('evolve')).toContain('Zed, the Unbothered has evolved!')
  expect(await shows(/Zed, the Unbothered/)).toBe(true)
  expect(book()).toEqual([{ name: 'Zed', species: expect.any(String), personality: { tone: 'eerily calm' } }])
})

test('crew: the 0.4 `active` in the store still picks the buddy until /buddy use; the option is a comma list that skips unknown names and eggs', { options: { language: 'en', active: 'Ghost, Nino, Ada' } }, async ($, on) => {
  const friends = [ZED, { name: 'Nino' }, { name: 'Ada', personality: 'Sharp.' }]
  const { run, start, shows } = rig($, on, { [FILE]: JSON.stringify(friends) }, { active: 'Zed', born: born() })

  await start()
  expect(await shows(/Zed/)).toBe(true)
  expect(await run('use')).toContain('Ada hops in')
  expect(await shows(/Zed/)).toBe(false)
  expect(await run('use Zed')).toContain('Zed hops in')
  await start()
  expect(await shows(/Zed/)).toBe(true)
})

test('crew: every buddy out counts the turn and glows on its own; /buddy evolve takes a name, or the first that is ready', { options: { language: 'en', turnsPerEvolve: 1 } }, async ($, on) => {
  const { run, start, turns, shows, book } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify([ZED]) }, { crew: ['zed', ''], born: commonZed() })
  on('model.complete', () => answer(JSON.stringify({ title_en: 'the Unbothered', title_it: 'l\'Imperturbabile', tone: 'eerily calm' })))

  await start()
  await turns(1)
  expect(await shows(/Zed · \/buddy evolve/, WIDE)).toBe(true)
  expect(await shows(/Pebble · \/buddy evolve/, WIDE)).toBe(true)
  expect(await run('evolve Ghost')).toContain('No buddy called Ghost')
  expect(await run('evolve Pebble')).toContain('Pebble, the Unbothered has evolved!')
  expect(await run('evolve')).toContain('Zed, the Unbothered has evolved!')
  expect(book()).toEqual(['Pebble', 'Zed'].map(name => ({ name, species: expect.any(String), personality: { tone: 'eerily calm' } })))
  expect(await run('evolve')).toContain('Zed evolves after 2 more turns together')
})

test('a turn counts for the egg and every buddy out; /clear and other endings do not', { options: { language: 'en', turnsPerHatch: 2, turnsPerEvolve: 2 } }, async ($, on) => {
  const { start, turns, shows } = rig($, on, { '/home/t/.claude.json': LEGACY }, { crew: [''], born: born() })
  on('session.end', () => ({ sessionId: 's' }))
  const end = (reason: string) => $.session.end({ reason, sessionId: 's', resume: { id: 's' } } as never)
  const ready = async () => [await shows(/Egg ready/, WIDE), await shows(/Pebble · \/buddy evolve/, WIDE)]

  await start()
  await end('resume')
  await end('clear')
  expect(await ready()).toEqual([false, false])
  await turns(1)
  expect(await ready()).toEqual([false, false])
  await turns(1)
  expect(await ready()).toEqual([true, true])
})

test('sessions run side by side lose no turn: each writes its own tally, and the totals add up', { options: { language: 'en', turnsPerHatch: 3 } }, async ($, on) => {
  const { run, start, turns } = rig($, on, {}, { 'tally:other': { all: 2, by: {} } })
  await start()
  expect(await run('list')).toContain('Next egg: 2/3')
  await turns(1)
  expect(await run('list')).toContain('Next egg: 3/3')
})

test('the band follows an edit of the buddies file, without a reload', { options: { language: 'en' } }, async ($, on) => {
  const files = { [FILE]: JSON.stringify([{ ...ZED, species: 'blob' }]) }
  const { start, shows } = rig($, on, files, { moved: true, crew: ['zed'], born: born() })
  const clock = mock.clock(on)
  // The duck's tail wags between `___(` and `__,(`.
  const duck = /__[_,]\(/

  await start()
  expect(await shows(duck)).toBe(false)
  // Zed's species is changed by hand; the next look at the disk (about every 3s) picks it up.
  files[FILE] = JSON.stringify([{ ...ZED, species: 'duck' }])
  await clock.advance(300 * 9)
  expect(await shows(duck)).toBe(false)
  await clock.advance(300)
  expect(await shows(duck)).toBe(true)
})

test('the box of what is ready sits beside the bubble when there is room, and never over it', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const { start, turns, mount } = rig($, on)
  await start()
  await turns(1)
  const beside = await mount(WIDE)
  expect((await beside.find({ key: 'band' }))?.props.flexDirection).toBe('row')
  expect(await beside.find({ key: 'notice' })).toBeDefined()
  expect(await beside.find({ type: 'Text', text: /^\.\.\.$/ })).toBeDefined()
  await beside.unmount()
  const tight = await mount({ bodyColumns: 60, maxRows: 40 })
  expect(await tight.find({ key: 'notice' })).toBeUndefined()
  await tight.unmount()
})

test('crew: join and leave up to 3, never empty; a newborn with the crew full waits on the bench; list marks who is out', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const friends = ['Zed', 'Ada', 'Nino', 'Pip'].map(name => ({ name, personality: 'Calm.' }))
  const { run, start, turns } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify(friends) }, { crew: [''], born: born(), hatched: 3, 'tally:t': { all: 3, by: {} } })
  on('model.complete', () => answer(JSON.stringify({ name: 'Brisa', tone: 'dry' })))

  await start()
  await turns(1)
  expect(await run('join Zed')).toBe('Zed joins the crew.')
  expect(await run('join zed')).toContain('already in the crew')
  expect(await run('join Ghost')).toContain('No buddy called Ghost')
  expect(await run('join')).toContain('Usage')
  expect(await run('join Ada')).toContain('Ada joins')
  expect(await run('join Pip')).toContain('The crew is full')
  const list = await run('list')
  for (const row of ['▸ Pebble', '● Zed', '● Ada', '🥚 Nino', '\n  Pip']) expect(list).toContain(row)

  expect(await run('leave Pip')).toContain('Pip is not in the crew')
  expect(await run('leave Pebble')).toContain('Pebble steps back')
  expect(await run('list')).toContain('▸ Zed')
  expect(await run('join Pip')).toContain('Pip joins')
  expect(await run('')).toBe('Crack! Say hi to Brisa.\nThe crew is full, so Brisa waits on the bench: /buddy join Brisa to bring it out.')
  expect(await run('list')).toContain('\n  Brisa')

  await run('leave Ada')
  await run('leave Pip')
  expect(await run('leave Zed')).toContain('the only one out')
  expect(await run('join Nino')).toContain('Nino is still an egg')
})

test('crew: crewSize sets how many can be out', { options: { language: 'en', turnsPerHatch: 1, crewSize: 2 } }, async ($, on) => {
  const friends = ['Zed', 'Ada'].map(name => ({ name, personality: 'Calm.' }))
  const { run, start } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify(friends) }, { crew: [''], born: born(), hatched: 3, 'tally:t': { all: 3, by: {} } })

  await start()
  expect(await run('join Zed')).toBe('Zed joins the crew.')
  expect(await run('join Ada')).toBe('The crew is full (2). /buddy leave <name> first.')
})

test('crew: with no choice made it forms on its own, everyone hatched up to 3 with 0.4\'s pick leading; /buddy add brings a newborn out while there is room', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const friends = ['Zed', 'Ada', 'Nino', 'Pip'].map(name => ({ name, personality: 'Calm.' }))
  const { run, start, turns } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify(friends) }, { active: 'Pip', born: born(), hatched: 3, 'tally:t': { all: 3, by: {} } })

  await start()
  await turns(1)
  const upgraded = await run('list')
  for (const row of ['▸ Pip', '● Pebble', '● Zed', '\n  Ada', '🥚 Nino']) expect(upgraded).toContain(row)
  expect(await run('leave Zed')).toContain('Zed steps back')
  expect(await run('add Mox robot Calm.')).toBe('Mox hatched.\nMox joins the crew.')
  expect(await run('list')).toContain('● Mox')

  expect(await run('use')).toContain('Pebble hops in')
  const auto = await run('list')
  for (const row of ['▸ Pebble', '● Zed', '● Ada', '\n  Pip', '\n  Mox']) expect(auto).toContain(row)
})

for (const banterChance of [0, 1])
  test(`crew: the floor passes on at each quip; with banterChance ${banterChance} the next one ${banterChance ? 'answers once, 3s later' : 'stays quiet'}`, { options: { language: 'en', everyNTurns: 1, banterChance } }, async ($, on) => {
    const { start, shows } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify([ZED]) }, { crew: ['', 'zed'], born: born() })
    const clock = mock.clock(on)
    const asks: { system: string; prompt: string }[] = []
    on('model.complete', ($, e) => {
      // Pebble has no soul, so each start also dreams one; not a quip.
      if (e.system?.includes('invent personalities')) return answer('{}')
      asks.push({ system: e.system ?? '', prompt: e.prompt ?? '' })
      return answer(`line ${asks.length}`)
    })

    await start()
    await $.turn.complete(TURN)
    expect(asks[0]?.system).toContain('You are Zed, a tiny terminal companion. Calm. You share the terminal with Pebble.')
    expect(await shows(/^Zed/)).toBe(true)
    await clock.advance(2900)
    expect(asks).toHaveLength(1)
    await clock.advance(100)
    if (banterChance) {
      expect(asks).toHaveLength(2)
      expect(asks[1]?.system).toContain('You are Pebble')
      expect(asks[1]?.prompt).toBe('Zed, who shares the terminal with you, just said: "line 1". Answer it.')
      expect(await shows(/line 2/)).toBe(true)
    } else expect(asks).toHaveLength(1)
    await clock.advance(6000)
    expect(asks).toHaveLength(1 + banterChance)

    await $.turn.complete(TURN)
    expect(asks.at(-1)?.system).toContain(banterChance ? 'You are Zed' : 'You are Pebble')
  })

test('crew: the band fits three buddies to its width: beside the bubble, above it, as many as fit with the one talking, one line; a click gives the floor', { options: { language: 'en' } }, async ($, on) => {
  const friends = [ZED, { name: 'Ada', personality: 'Sharp.' }]
  const rigged = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify(friends) }, { crew: ['', 'zed', 'ada'], born: born() })
  const mount = (bodyColumns: number) => rigged.mount({ bodyColumns, maxRows: 40 })

  await rigged.start()
  const wide = await mount(100)
  expect((await wide.find({ key: 'band' }))?.props.flexDirection).toBe('row')
  expect(await wide.find({ key: 'buddy-2' })).toBeDefined()
  expect(await wide.find({ type: 'Text', text: /^ {6}▲$/ })).toBeDefined()
  await wide.press({ key: 'body-1-2' })
  expect(await wide.find({ type: 'Text', text: /^ {19}▲$/ })).toBeDefined()
  expect(await wide.find({ type: 'Text', text: /^Zed/ })).toBeDefined()
  await wide.unmount()

  const mid = await mount(50)
  expect((await mid.find({ key: 'band' }))?.props.flexDirection).toBe('column')
  expect(await mid.find({ key: 'buddy-0' })).toBeDefined()
  expect(await mid.find({ type: 'Text', text: /^ {19}▼$/ })).toBeDefined()
  await mid.unmount()

  const narrow = await mount(43)
  expect(await narrow.find({ key: 'buddy-1' })).toBeDefined()
  expect(await narrow.find({ key: 'buddy-2' })).toBeUndefined()
  expect(await narrow.find({ type: 'Text', text: /^ {19}▼$/ })).toBeDefined()
  expect(await narrow.find({ type: 'Text', text: / · Ada$/ })).toBeDefined()
  await narrow.unmount()

  const bare = await mount(41)
  expect(await bare.find({ type: 'Text', text: /^Zed: / })).toBeDefined()
  expect(await bare.find({ key: 'pet' })).toBeUndefined()
  await bare.unmount()
})

// The list pane, docked and wide enough for cards; Zed, Ada and Pip hatched, Nino still an egg.
const PANE = { plugin: 'buddy', component: 'Pane', requestId: 'buddy-list', props: { title: 'Buddy', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } } as const
const ROSTER = ['Zed', 'Ada', 'Pip', 'Nino'].map(name => ({ name, personality: 'Calm.' }))
const settledStore = (extra: Record<string, unknown> = {}) => ({ migrated: true, moved: true, born: born(), crew: ['zed', 'ada'], ...extra })
function paneRig($: Engine, on: On, files: Record<string, string>, store: Record<string, unknown>, isPlaced = true) {
  const r = rig($, on, files, store)
  on('ui.open', () => ({ value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: 'narrow' } }) as never)
  const open = async () => {
    await r.start()
    await r.run('list')
    return $.ui.mount({ ...PANE, surface: 'terminal' })
  }
  return { ...r, open }
}

test('list: opens a pane where one can be drawn, else the plain list', { options: { language: 'en' } }, async ($, on) => {
  const files = { [FILE]: JSON.stringify(ROSTER) }
  const shut = paneRig($, on, files, settledStore(), false)
  await shut.start()
  expect(await shut.run('list')).toContain('▸ Zed')
})

test('list: the pane shows every buddy and filters them by status, rarity and name', { options: { language: 'en' } }, async ($, on) => {
  const { open, run } = paneRig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore())
  const ui = await open()
  expect(await run('list')).toBe('Buddy list opened.')
  for (const name of ['▸ Zed', '● Ada', '  Pip', '○ Nino']) expect(await ui.find({ type: 'Button', key: `pick-${name.slice(2).toLowerCase()}` })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /4 · crew 2\/3/ })).toBeDefined()

  await ui.press({ key: 'filter-egg' })
  expect(await ui.find({ type: 'Button', key: 'pick-zed' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'pick-nino' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /still in its egg/ })).toBeDefined()

  await ui.press({ key: 'filter-all' })
  await ui.input({ key: 'query', text: 'ghost', kind: 'change' })
  expect(await ui.find({ type: 'Text', text: /No buddy matches/ })).toBeDefined()
  await ui.press({ key: 'reset' })
  expect(await ui.find({ type: 'Button', key: 'pick-pip' })).toBeDefined()
  await ui.unmount()
})

test('list: a rename keeps the buddy whole, its turns too; a name in use is refused, so is the old one for a newcomer', { options: { language: 'en', turnsPerHatch: 1 } }, async ($, on) => {
  const { open, book, turns, run } = paneRig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore({ 'tally:t': { all: 0, by: { zed: 7 } } }))
  const ui = await open()
  await ui.input({ key: 'name-zed', text: 'Ada' })
  expect(await ui.find({ type: 'Text', text: /already a buddy called Ada/ })).toBeDefined()
  expect(book()[0]!.name).toBe('Zed')

  await ui.input({ key: 'name-zed', text: 'Zorro' })
  expect(await ui.find({ type: 'Text', text: /Zed is now Zorro/ })).toBeDefined()
  expect(book()[0]).toMatchObject({ name: 'Zorro', personality: 'Calm.' })
  // Same key in the store, so the same body, crew place and turns.
  expect(await ui.find({ type: 'Button', key: 'pick-zed' })).toBeDefined()
  expect(await run('use Zorro')).toContain('Zorro hops in')
  await turns(2)
  expect(await run('add Zed')).toContain('already a buddy called Zed')
  await ui.unmount()
})

test('list: species and personality are written into the file, other fields kept; a sentence splits into fields and back', { options: { language: 'en' } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: { tone: 'calm', traits: ['wry'], mood: 'kept' }, extra: 1 }, ...ROSTER.slice(1)]
  const { open, book } = paneRig($, on, { [FILE]: JSON.stringify(roster) }, settledStore())
  const ui = await open()
  await ui.select({ key: 'species-zed', value: 'owl' })
  expect(book()[0]).toMatchObject({ species: 'owl', extra: 1 })
  await ui.input({ key: 'soul-traits-zed', text: 'wry\n  nosy \n' })
  expect(book()[0]!.personality).toEqual({ tone: 'calm', traits: ['wry', 'nosy'], mood: 'kept' })
  await ui.input({ key: 'soul-tone-zed', text: '' })
  expect(book()[0]!.personality).toEqual({ traits: ['wry', 'nosy'], mood: 'kept' })
  await ui.press({ key: 'flip' })
  expect(book()[0]!.personality).toBe('wry. nosy')
  await ui.press({ key: 'flip' })
  expect(book()[0]!.personality).toEqual({ tone: 'wry. nosy' })
  await ui.unmount()
})

test('list: relations show under the mate name and are edited one per line', { options: { language: 'en' } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ ada: 'old rival' }] }, ...ROSTER.slice(1)]
  const { open, book } = paneRig($, on, { [FILE]: JSON.stringify(roster) }, settledStore())
  const ui = await open()
  expect(await ui.find({ type: 'Input', key: 'rel-zed' })).toMatchObject({ props: { value: 'Ada: old rival' } })
  await ui.input({ key: 'rel-zed', text: 'Ada: secret lover\nPip - little brother' })
  expect(book()[0]!.relations).toEqual([{ Ada: 'secret lover' }, { Pip: 'little brother' }])
  await ui.input({ key: 'rel-zed', text: '' })
  expect(book()[0]!.relations).toEqual([])
  await ui.unmount()
})

test('list: a full crew asks who makes way; removal asks first', { options: { language: 'en', crewSize: 2 } }, async ($, on) => {
  const { open, book, run } = paneRig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore())
  const ui = await open()
  await ui.press({ key: 'pick-pip' })
  await ui.press({ key: 'crew' })
  expect(await ui.find({ type: 'Text', text: /crew is full \(2\): who makes way for Pip/ })).toBeDefined()
  await ui.press({ key: 'swap-ada' })
  expect(await run('list')).toBe('Buddy list opened.')
  expect(await ui.find({ type: 'Button', key: 'pick-pip' })).toMatchObject({ props: { label: '● Pip' } })

  await ui.press({ key: 'remove' })
  expect(await ui.find({ type: 'Text', text: /Remove Pip from the buddies file/ })).toBeDefined()
  expect(book()).toHaveLength(4)
  await ui.press({ key: 'rm-yes' })
  expect(book().map(b => b.name)).toEqual(['Zed', 'Ada', 'Nino'])
  await ui.unmount()
})

test('list: without an egg ready a new buddy goes into the file as an egg, and needs a name', { options: { language: 'en', turnsPerHatch: 100 } }, async ($, on) => {
  const { open, book } = paneRig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore({ eggAt: 0 }))
  const ui = await open()
  await ui.press({ key: 'add' })
  await ui.press({ key: 'add-go' })
  expect(await ui.find({ type: 'Text', text: /Give it a name/ })).toBeDefined()
  await ui.select({ key: 'add-species', value: 'owl' })
  await ui.input({ key: 'add-name', text: 'Fiocca' })
  expect(book().at(-1)).toEqual({ name: 'Fiocca', species: 'owl' })
  expect(await ui.find({ type: 'Text', text: /Fiocca is in the file, still an egg/ })).toBeDefined()
  await ui.unmount()
})

test('list: a broken file is shown read-only', { options: { language: 'en' } }, async ($, on) => {
  const broken = paneRig($, on, { [FILE]: '[{' }, settledStore())
  const ui = await broken.open()
  expect(await ui.find({ type: 'Text', text: /not valid JSON/ })).toBeDefined()
  expect(await ui.find({ type: 'Input' })).toBeUndefined()
  await ui.unmount()
})

test('list: on mobile the pane shows without fields', { options: { language: 'en' } }, async ($, on) => {
  const { start, run } = paneRig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore())
  await start()
  await run('list')
  const ui = await $.ui.mount({ ...PANE, surface: 'mobile' })
  expect(await ui.find({ type: 'Button', key: 'pick-zed' })).toBeDefined()
  expect(await ui.find({ type: 'Input' })).toBeUndefined()
  await ui.unmount()
})

test('list: a buddy ready on the bench evolves from the pane, announced by the lead', { options: { language: 'en', turnsPerEvolve: 2 } }, async ($, on) => {
  on('model.complete', ($, e) => answer(e.system?.includes('You evolve') ? JSON.stringify({ title_en: 'the Odd', title_it: 'lo Strano', tone: 'odd' }) : 'Hm.'))
  const { open, book } = paneRig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore({ born: commonZed(), crew: ['ada'], 'tally:t': { all: 2, by: { zed: 2 } } }))
  const ui = await open()
  await ui.press({ key: 'pick-zed' })
  expect(await ui.find({ type: 'Text', text: /ready to evolve/ })).toBeDefined()
  await ui.press({ key: 'evolve' })
  expect(await ui.find({ type: 'Text', text: /Zed, the Odd has evolved!/ })).toBeDefined()
  expect(book()[0]!.personality).toEqual({ tone: 'odd' })
  expect(await ui.find({ type: 'Text', text: /evolves in 3 turns/ })).toBeDefined()
  await ui.unmount()
})

test('band: the fifth button opens the list pane', { options: { language: 'en' } }, async ($, on) => {
  const opened: string[] = []
  const { start, mount } = rig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore())
  on('ui.open', ($, e) => { opened.push(e.id); return { value: { isPlaced: true } } as never })
  await start()
  const ui = await mount()
  expect(await ui.find({ type: 'Button', key: 'list' })).toMatchObject({ props: { hotkey: '5', label: 'list' } })
  await ui.press({ key: 'list' })
  await ui.unmount()
  expect(opened).toEqual(['buddy-list'])
})

test('list: − and + set the crew\'s room, kept in the store; a smaller crew keeps its first ones', { options: { language: 'en' } }, async ($, on) => {
  const { open, run } = paneRig($, on, { [FILE]: JSON.stringify(ROSTER) }, settledStore())
  const ui = await open()
  await ui.press({ key: 'room-less' })
  expect(await ui.find({ type: 'Text', text: /crew 2\/2/ })).toBeDefined()
  await ui.press({ key: 'room-less' })
  expect(await ui.find({ type: 'Text', text: /room for 1/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'pick-zed' })).toMatchObject({ props: { label: '▸ Zed' } })
  expect(await ui.find({ type: 'Button', key: 'pick-ada' })).toMatchObject({ props: { label: '  Ada' } })
  // Stuck at one: the store, read by /buddy join too, holds the room.
  await ui.press({ key: 'room-less' })
  expect(await run('join Pip')).toContain('crew is full (1)')
  await ui.press({ key: 'room-more' })
  // Ada was still listed in the crew, so she comes back with the room.
  expect(await ui.find({ type: 'Button', key: 'pick-ada' })).toMatchObject({ props: { label: '● Ada' } })
  for (let i = 0; i < 4; i++) await ui.press({ key: 'room-more' })
  // Never more room than buddies in the file.
  expect(await ui.find({ type: 'Text', text: /crew 2\/4/ })).toBeDefined()
  await ui.unmount()
})

test('relations: each buddy talks to its mates as what they are to it; a rename follows them and a removal drops them', { options: { language: 'en' } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'your rival', pip: 'your apprentice' }] }, { name: 'Ada', personality: 'Sharp.', relations: { ZED: 'an old flame' } }, ...ROSTER.slice(2)]
  const systems: string[] = []
  on('model.complete', ($, e) => { systems.push(e.system ?? ''); return answer('Hm.') })
  const { open, book, mount } = paneRig($, on, { [FILE]: JSON.stringify(roster) }, settledStore())
  const ui = await open()
  const band = await mount()
  await band.press({ key: 'talk' })
  expect(systems.at(-1)).toContain('You share the terminal with Ada (to you: your rival).')
  await band.press({ key: 'body-1-2' })
  await band.press({ key: 'talk' })
  expect(systems.at(-1)).toContain('You share the terminal with Zed (to you: an old flame).')
  await band.unmount()

  await ui.press({ key: 'pick-ada' })
  await ui.input({ key: 'name-ada', text: 'Adele' })
  expect(book()[0]!.relations).toEqual([{ Adele: 'your rival' }, { pip: 'your apprentice' }])
  await ui.press({ key: 'pick-pip' })
  await ui.press({ key: 'remove' })
  await ui.press({ key: 'rm-yes' })
  expect(book()[0]!.relations).toEqual([{ Adele: 'your rival' }])
  expect(book()[1]).toMatchObject({ name: 'Adele', relations: [{ ZED: 'an old flame' }] })
  await ui.unmount()
})

test('love: two buddies out who call each other lovers lay an egg of their own every half turnsPerHatch; a bare /buddy hatches their child', { options: { language: 'en', turnsPerHatch: 2 } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'lover' }] }, { name: 'Ada', personality: 'Sharp.', relations: { zed: 'secret lover' } }, ...ROSTER.slice(2)]
  const prompts: string[] = []
  on('model.complete', ($, e) => { prompts.push(e.prompt ?? ''); return answer(e.system?.includes('invent personalities') ? JSON.stringify({ name: 'Bimbo', tone: 'tiny' }) : 'Hm.') })
  const { start, run, turns, shows, book } = rig($, on, { [FILE]: JSON.stringify(roster) }, settledStore({ eggAt: 0 }))
  await start()
  expect(await shows(/♥/, WIDE)).toBe(false)
  await turns(1)
  expect(await shows(/♥ Zed\+Ada · \/buddy/, WIDE)).toBe(true)
  expect(await run('')).toContain('Crack! Bimbo is born, child of Zed and Ada.')
  expect(prompts.at(-1)).toContain('Its parents are Zed (Calm.) and Ada (Sharp.)')
  const [zed, ada, , , bimbo] = book()
  expect(bimbo).toMatchObject({ name: 'Bimbo', personality: { tone: 'tiny' }, relations: [{ Zed: 'your parent' }, { Ada: 'your parent' }] })
  expect([zed!.species, ada!.species]).toContain(bimbo!.species)
  expect(zed!.relations).toEqual([{ Ada: 'lover' }, { Bimbo: 'your child' }])
  expect(ada!.relations).toEqual([{ zed: 'secret lover' }, { Bimbo: 'your child' }])
  // The normal egg was not spent, and the couple starts over.
  expect(await shows(/♥/, WIDE)).toBe(false)
  expect(await shows(/Egg ready/, WIDE)).toBe(false)
  await turns(1)
  expect(await shows(/♥ Zed\+Ada/, WIDE)).toBe(true)
})

test('love: one-sided love lays no egg', { options: { language: 'en', turnsPerHatch: 2 } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'lover' }] }, { name: 'Ada', personality: 'Sharp.', relations: { zed: 'ex-lover' } }, ...ROSTER.slice(2)]
  const { start, turns, shows } = rig($, on, { [FILE]: JSON.stringify(roster) }, settledStore({ eggAt: 0 }))
  await start()
  await turns(3)
  expect(await shows(/♥/, WIDE)).toBe(false)
})

test('evolution: what the mates out are to it shifts with its new self, written into the file by name', { options: { language: 'en', turnsPerEvolve: 1 } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'rival' }, { Nino: 'old friend' }] }, ...ROSTER.slice(1)]
  const prompts: string[] = []
  on('model.complete', ($, e) => { prompts.push(e.prompt ?? ''); return answer(e.system?.includes('You evolve') ? JSON.stringify({ title_en: 'the Odd', title_it: 'lo Strano', tone: 'odd', relations: { ada: 'lover', Ghost: 'x' } }) : 'Hm.') })
  const { start, run, turns, book } = rig($, on, { [FILE]: JSON.stringify(roster) }, settledStore({ born: commonZed() }))
  await start()
  await turns(1)
  expect(await run('evolve Zed')).toContain('Zed, the Odd has evolved!')
  expect(prompts.at(-1)).toContain('Ada (rival)')
  expect(book()[0]!.relations).toEqual([{ Nino: 'old friend' }, { Ada: 'lover' }])
})

test('relations drift without an evolution: every fifth of turnsPerEvolve, one buddy out per turn; a love starts only in a turn, once every turnsPerEvolve, and is answered at the next step', { options: { language: 'en', turnsPerEvolve: 1, turnsPerHatch: 2 } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'rival' }] }, { name: 'Ada', personality: 'Sharp.' }, ...ROSTER.slice(2)]
  const drifts: string[] = []
  on('model.complete', ($, e) => {
    if (!e.system?.includes('as days go by')) return answer('Hm.')
    drifts.push(e.prompt ?? '')
    return answer(JSON.stringify(e.prompt?.startsWith('Zed') ? { ada: 'lover', Ghost: 'x' } : { Zed: 'my lover' }))
  })
  const { start, turns, shows, book } = rig($, on, { [FILE]: JSON.stringify(roster) }, settledStore({ eggAt: 0 }))
  await start()
  // Turns 1-4 are small steps, Zed and Ada in turn: no love starts.
  await turns(4)
  expect(drifts).toHaveLength(4)
  expect(drifts[0]).toContain('Ada: to Zed rival; Zed to them nothing yet.')
  expect(book()[0]!.relations).toEqual([{ Ada: 'rival' }])
  expect(book()[1]!.relations).toBeUndefined()
  // Turn 5 is Zed's turn: it falls in love; at turn 6 Ada answers.
  await turns(1)
  expect(book()[0]!.relations).toEqual([{ Ada: 'lover' }])
  await turns(1)
  expect(drifts[5]).toContain('Zed: to Ada nothing yet; Ada to them lover.')
  expect(book()[1]!.relations).toEqual([{ Zed: 'my lover' }])
  await turns(1)
  expect(await shows(/♥ Zed\+Ada · \/buddy/, WIDE)).toBe(true)
})

test('relations drift: a small step starts no love unless answering one, and ends none', { options: { language: 'en', turnsPerEvolve: 5 } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'rival' }, { Nino: 'my lover' }] }, { name: 'Ada', personality: 'Sharp.' }, ...ROSTER.slice(2)]
  on('model.complete', ($, e) => answer(e.system?.includes('as days go by') ? JSON.stringify({ Ada: 'lover', Nino: 'old friend now' }) : 'Hm.'))
  const { start, turns, book } = rig($, on, { [FILE]: JSON.stringify(roster) }, settledStore({ crew: ['zed', 'ada', 'nino'] }))
  await start()
  await turns(1)
  expect(book()[0]!.relations).toEqual([{ Ada: 'rival' }, { Nino: 'my lover' }])
})

test('relations drift: a mate renamed while Haiku answers gets no orphan relation under its old name', { options: { language: 'en', turnsPerEvolve: 5 } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'rival' }] }, { name: 'Ada', personality: 'Sharp.' }, ...ROSTER.slice(2)]
  const files = { [FILE]: JSON.stringify(roster) }
  on('model.complete', ($, e) => {
    if (!e.system?.includes('as days go by')) return answer('Hm.')
    files[FILE] = files[FILE]!.replace(/"Ada"/g, '"Bea"')
    return answer(JSON.stringify({ Ada: 'grudging respect' }))
  })
  const { start, turns, book } = rig($, on, files, settledStore())
  await start()
  await turns(1)
  expect(book()[0]!.relations).toEqual([{ Bea: 'rival' }])
})

test('love: a buddy can love more than one; benching one pauses that couple without resetting it, and only removal clears it', { options: { language: 'en', turnsPerHatch: 4 } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relations: [{ Ada: 'lover' }, { Pip: 'soulmate' }] }, { name: 'Ada', personality: 'Sharp.', relations: [{ Zed: 'lover' }] }, { name: 'Pip', personality: 'Calm.', relations: [{ Zed: 'husband' }] }, ROSTER[3]!]
  const { start, run, turns, shows, book } = rig($, on, { [FILE]: JSON.stringify(roster) }, settledStore({ eggAt: 0, crew: ['zed', 'ada', 'pip'] }))
  await start()
  await turns(1)
  expect(await run('leave Pip')).toContain('Pip')
  await turns(1)
  expect(await shows(/♥ Zed\+Ada/, WIDE)).toBe(true)
  expect(await shows(/♥ Zed\+Pip/, WIDE)).toBe(false)
  // Back out, Pip's couple goes on from 1 turn, not from 0.
  await run('join Pip')
  await turns(1)
  expect(await shows(/♥ Zed\+Pip/, WIDE)).toBe(true)
  expect(book()[0]!.relations).toEqual([{ Ada: 'lover' }, { Pip: 'soulmate' }])
  await run('rm Pip')
  expect(book()[0]!.relations).toEqual([{ Ada: 'lover' }])
})

test('upgrade: relations in an old shape are put in shape at session start, and buddies without any get them from Haiku once', { options: { language: 'en' } }, async ($, on) => {
  const roster = [{ name: 'Zed', personality: 'Calm.', relation: 'Ada: rival' }, { name: 'Ada', personality: 'Sharp.' }, { name: 'Pip', personality: 'Calm.', relations: [] }]
  let calls = 0
  let ok = false
  on('model.complete', ($, e) => {
    if (!e.system?.includes('You weave')) return answer('Hm.')
    calls += 1
    return answer(ok ? JSON.stringify({ ada: { Zed: 'grudging admirer', pip: 'lover', Ghost: 'x' } }) : 'not json')
  })
  const { start, book } = rig($, on, { [FILE]: JSON.stringify(roster) }, settledStore({ related: false }))
  await start()
  expect(book()[0]).toMatchObject({ name: 'Zed', relations: [{ Ada: 'rival' }] })
  expect(book()[0]).not.toHaveProperty('relation')
  expect(book()[1]).not.toHaveProperty('relations')
  ok = true
  await start()
  expect(book()[1]!.relations).toEqual([{ Zed: 'grudging admirer' }, { Pip: 'lover' }])
  expect(book()[2]!.relations).toEqual([])
  await start()
  expect(calls).toBe(2)
})
