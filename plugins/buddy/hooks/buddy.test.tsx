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
const answer = (text: string) => ({ value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }) as never

// A home on an in-memory disk, a stubbed engine, and the helpers the tests share.
function rig($: Engine, on: On, files: Record<string, string> = {}, store?: Record<string, unknown>, env: Record<string, string> = { HOME: '/home/t' }) {
  const reads: string[] = []
  const writes: string[] = []
  const toasts: string[] = []
  mock.store(on, store)
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
  const run = async (args: string) => (await $.command.run({ command: 'buddy', args, origin: { kind: 'user' } } as never)).text
  const start = () => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  const mount = (props: { bodyColumns?: number; maxRows?: number } = {}) => $.ui.mount({ plugin: 'buddy', surface: 'terminal', ...BAND, props: { ...BAND.props, ...props } })
  const shows = async (text: RegExp) => {
    const ui = await mount()
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
  return { reads, writes, toasts, run, start, mount, shows, card, book }
}

test('speaks every N turns and the band shows the quip', { options: { everyNTurns: 2 } }, async ($, on) => {
  const { mount, shows } = rig($, on)
  let calls = 0
  on('model.complete', () => { calls += 1; return answer('Another bug? Shocking.') })
  on('turn.complete', ($, e) => ({ text: e.answer }))

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
  const shut = /\(\s*-/

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

test('the species option swaps the art and the lines', { options: { species: 'duck', language: 'en' } }, async ($, on) => {
  const ui = await rig($, on).mount()
  expect(await ui.find({ type: 'Text', text: /<\([◉-] \)___/ })).toBeDefined()
  await ui.press({ key: 'poke' })
  expect(await ui.find({ type: 'Text', text: /quack|waddle|attentive|what\.|unimpressed|sarcasm/ })).toBeDefined()
  await ui.unmount()
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

test('buddies.json: its buddies are eggs until /buddy use spends one; a missing personality is dreamt up and written back', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const { run, start, shows, mount, book } = rig($, on, {
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
  expect(book()[1]).toEqual({ name: 'Pippo', species: expect.any(String), personality: { tone: 'anxious', traits: 'always' } })
  const ui = await mount()
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
  const { run, start, book, toasts } = rig($, on)
  on('model.complete', () => answer('not json'))

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
  expect(toasts).toHaveLength(3)
  expect(await run('add Ada owl')).toContain('Ada hatched')
  expect(book()).toEqual([{ name: 'Ada', species: 'owl' }])
  expect(await run('dance')).toContain('Usage')
})

test('hatching: ~/.claude.json is read once to keep the original, the others are random, and what is born stays', { options: { language: 'en', active: 'Zed', sessionsPerHatch: 1 } }, async ($, on) => {
  const { reads, run, start, card } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify([ZED]) })

  await start()
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

test('no companion in ~/.claude.json: the original is random, name and personality included; a bare /buddy add is named by Haiku', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const { run, start, shows, card, book } = rig($, on, { '/home/t/.claude.json': JSON.stringify({ oauthAccount: { accountUuid: 'rare-hunt-42' } }) })
  const names = ['Brisa', 'Quillon']
  on('model.complete', ($, e) => answer(e.system?.includes('invent personalities') ? JSON.stringify({ name: names.shift(), tone: 'dry', traits: ['odd'] }) : 'Hm.'))

  await start()
  expect(await shows(/Brisa/)).toBe(true)
  expect(await card()).not.toContain('PAT 78')
  expect(await run('add')).toContain('Quillon hatched')
  expect(book()).toEqual([{ name: 'Quillon', species: expect.any(String), personality: { tone: 'dry', traits: ['odd'] } }])
  expect(await run('add')).toContain('1 more session')
})

test('with an egg ready, a bare /buddy hatches a surprise named by Haiku and brings it out; then it toggles again', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const { run, start, shows, book, toasts } = rig($, on)
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

test('evolution: a toast when ready, nothing until /buddy evolve, then a rarity up, a weirder soul and an epithet in the set language', { options: { language: 'it', sessionsPerEvolve: 2 } }, async ($, on) => {
  const { run, start, shows, card, mount, toasts } = rig($, on, { '/home/t/.claude.json': LEGACY })
  const systems: string[] = []
  const prompts: string[] = []
  on('model.complete', ($, e) => {
    systems.push(e.system ?? '')
    prompts.push(e.prompt ?? '')
    return answer(e.system?.includes('You evolve') ? JSON.stringify({ title_en: 'the Winged Sarcasm', title_it: 'Sarcasmo Alato', tone: 'feroce', traits: ['strano'] }) : 'Hm.')
  })

  await start()
  expect(await shows(/^★$/)).toBe(true)
  expect(await run('evolve')).toContain('Pebble si evolve dopo un\'altra sessione insieme')
  await start()
  expect(toasts).toEqual(['Pebble brilla! Scrivi /buddy evolve quando sei pronto.'])
  expect(await card()).toContain('PAT 78')
  expect(await run('evolve')).toContain('Pebble, Sarcasmo Alato si è evoluto!')
  expect(prompts.at(-1)).toContain('Rarity now: uncommon')
  expect(await shows(/Pebble, Sarcasmo Alato/)).toBe(true)
  expect(await shows(/^★★$/)).toBe(true)
  expect(await card()).toContain('PAT 93')
  expect(await run('evolve')).toContain('altre 2 sessioni')

  const ui = await mount()
  await ui.press({ key: 'talk' })
  await ui.unmount()
  expect(systems.at(-1)).toContain('You are Pebble, Sarcasmo Alato, a tiny terminal companion. Tone: feroce. Traits: strano.')
  await start()
  await start()
  expect(toasts).toHaveLength(2)
})

test('an epithet that repeats the name shows it once', async () => {
  const m = (name: string, title?: string) => ({ name, title }) as Parameters<typeof titled>[0]
  expect(titled(m('gremolo', 'Gremolo, l\'Oca Impassibile'))).toBe('gremolo, l\'Oca Impassibile')
  expect(titled(m('Pebble', 'Pebble the Unblinking'))).toBe('Pebble, the Unblinking')
  expect(titled(m('Bo', 'Bold One'))).toBe('Bo, Bold One')
  expect(titled(m('Pebble'))).toBe('Pebble')
})

test('evolution: if Haiku fails nothing changes; a file buddy gets its new soul written back', { options: { language: 'en', sessionsPerEvolve: 1, sessionsPerHatch: 1, active: 'Zed' } }, async ($, on) => {
  const { run, start, shows, book } = rig($, on, { [FILE]: JSON.stringify([ZED]) })
  let isBroken = true
  on('model.complete', ($, e) => answer(isBroken ? 'not json' : JSON.stringify({ title_en: 'the Unbothered', title_it: 'l\'Imperturbabile', tone: 'eerily calm' })))

  await start()
  expect(await run('use Zed')).toContain('Zed hops in')
  await start()
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

test('crew: every buddy out counts the session and glows on its own; /buddy evolve takes a name, or the first that is ready', { options: { language: 'en', sessionsPerEvolve: 1 } }, async ($, on) => {
  const { run, start, book, toasts } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify([ZED]) }, { crew: ['zed', ''], born: born() })
  on('model.complete', () => answer(JSON.stringify({ title_en: 'the Unbothered', title_it: 'l\'Imperturbabile', tone: 'eerily calm' })))

  await start()
  expect(toasts).toEqual(['Zed is glowing! Type /buddy evolve when you are ready.', 'Pebble is glowing! Type /buddy evolve when you are ready.'])
  expect(await run('evolve Ghost')).toContain('No buddy called Ghost')
  expect(await run('evolve Pebble')).toContain('Pebble, the Unbothered has evolved!')
  expect(await run('evolve')).toContain('Zed, the Unbothered has evolved!')
  expect(book()).toEqual([{ name: 'Zed', species: expect.any(String), personality: { tone: 'eerily calm' } }])
  expect(await run('evolve')).toContain('Zed evolves after 1 more session together')
})

test('/clear counts as a new session for the egg and every buddy out; other endings do not', { options: { language: 'en', sessionsPerHatch: 2, sessionsPerEvolve: 2 } }, async ($, on) => {
  const { start, toasts } = rig($, on, { '/home/t/.claude.json': LEGACY }, { crew: [''], born: born() })
  on('session.end', () => ({ sessionId: 's' }))
  const end = (reason: string) => $.session.end({ reason, sessionId: 's', resume: { id: 's' } } as never)

  await start()
  await end('resume')
  expect(toasts).toEqual([])
  await end('clear')
  expect(toasts).toEqual([expect.stringContaining('egg'), expect.stringContaining('glowing')])
})

test('crew: join and leave up to 3, never empty; a newborn with the crew full waits on the bench; list marks who is out', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const friends = ['Zed', 'Ada', 'Nino', 'Pip'].map(name => ({ name, personality: 'Calm.' }))
  const { run, start } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify(friends) }, { crew: [''], born: born(), hatched: 3, sessions: 3 })
  on('model.complete', () => answer(JSON.stringify({ name: 'Brisa', tone: 'dry' })))

  await start()
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

test('crew: crewSize sets how many can be out', { options: { language: 'en', sessionsPerHatch: 1, crewSize: 2 } }, async ($, on) => {
  const friends = ['Zed', 'Ada'].map(name => ({ name, personality: 'Calm.' }))
  const { run, start } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify(friends) }, { crew: [''], born: born(), hatched: 3, sessions: 3 })

  await start()
  expect(await run('join Zed')).toBe('Zed joins the crew.')
  expect(await run('join Ada')).toBe('The crew is full (2). /buddy leave <name> first.')
})

test('crew: with no choice made it forms on its own, everyone hatched up to 3 with 0.4\'s pick leading; /buddy add brings a newborn out while there is room', { options: { language: 'en', sessionsPerHatch: 1 } }, async ($, on) => {
  const friends = ['Zed', 'Ada', 'Nino', 'Pip'].map(name => ({ name, personality: 'Calm.' }))
  const { run, start } = rig($, on, { '/home/t/.claude.json': LEGACY, [FILE]: JSON.stringify(friends) }, { active: 'Pip', born: born(), hatched: 3, sessions: 3 })

  await start()
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
    on('turn.complete', ($, e) => ({ text: e.answer }))
    const asks: { system: string; prompt: string }[] = []
    on('model.complete', ($, e) => {
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
