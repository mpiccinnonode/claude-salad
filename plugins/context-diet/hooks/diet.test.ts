import { expect, test } from 'claude-code/testing'

const LISTING = [
  '- herdr: Control Herdr.',
  '- ponytail:ponytail-gain: Show the scoreboard.',
  '- review-then-dry:review-then-dry: Use to run both.',
  '',
  'Fire when the user:',
  '- Types `/review-then-dry`',
  '- claude-mem:wowerpoint: Kawaii deck.',
  '  second line of wowerpoint',
  '- anthropic-skills:scrum-task-writer',
].join('\n')

const GATE = '<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\nlots of rules\n</EXTREMELY_IMPORTANT>\n'
const DROP = { dropSkills: 'ponytail:ponytail-gain, claude-mem:wowerpoint' }

test('drops listed skills with their multi-line descriptions, keeps the rest', { options: DROP }, async ($, on) => {
  on('prompt.attachment', ($, e) => ({ text: e.text }))
  const { text } = await $.prompt.attachment({ type: 'skill_listing', text: LISTING, origin: { kind: 'engine' } })
  expect(text).not.toContain('ponytail-gain')
  expect(text).not.toContain('wowerpoint')
  expect(text).toContain('- herdr: Control Herdr.')
  expect(text).toContain('- Types `/review-then-dry`')
  expect(text).toContain('scrum-task-writer')
})

test('leaves the skill listing untouched by default', async ($, on) => {
  on('prompt.attachment', ($, e) => ({ text: e.text }))
  const { text } = await $.prompt.attachment({ type: 'skill_listing', text: LISTING, origin: { kind: 'engine' } })
  expect(text).toBe(LISTING)
})

test('strips the gatekeeper from SessionStart context by default', async ($, on) => {
  on('prompt.attachment', ($, e) => ({ text: e.text }))
  const { text } = await $.prompt.attachment({
    type: 'hook_additional_context',
    text: GATE + '# recent context',
    origin: { kind: 'hook', event: 'SessionStart' },
  })
  expect(text).toBe('# recent context')
})

test('leaves the gatekeeper when opted out', { options: { stripGatekeeper: false } }, async ($, on) => {
  on('prompt.attachment', ($, e) => ({ text: e.text }))
  const { text } = await $.prompt.attachment({
    type: 'hook_additional_context',
    text: GATE,
    origin: { kind: 'hook', event: 'SessionStart' },
  })
  expect(text).toBe(GATE)
})
