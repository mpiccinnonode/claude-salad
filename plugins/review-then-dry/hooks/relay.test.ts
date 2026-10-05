import type { On } from 'claude-code'
import { type Engine, expect, test } from 'claude-code/testing'

const REPORT = 'finding '.repeat(500) // 4,000 chars → relayed at 1,200 said

const engine = (on: On) =>
  on('tool.call', ($, e) => (e.tool === 'Agent' ? { result: {}, text: REPORT } : { result: {} }) as never)

const review = { tool: 'Agent' as const, description: 'review', prompt: 'go', subagent_type: 'review-then-dry:code-reviewer' }
const ask = { tool: 'AskUserQuestion' as const, questions: [] } as never

let n = 0
// The kit has no bottom for session.append: the call rejects beneath the plugin, after its hook counted the row.
const say = ($: Engine, text: string) =>
  $.session
    .append({
      message: { type: 'assistant', role: 'assistant', content: [{ type: 'text', text }] },
      door: 'response',
      origin: { kind: 'model', model: 'test' },
      uuid: `u${n++}`,
    })
    .catch(() => undefined)

test('asking before relaying the report is denied once', async ($, on) => {
  engine(on)
  await $.tool.call(review)
  await say($, 'Here are the findings in short.')
  const first = await $.tool.call(ask)
  expect(first.deny).toContain('Present the full report')
  expect((await $.tool.call(ask)).deny).toBeUndefined()
})

test('asking after relaying the report goes through', async ($, on) => {
  engine(on)
  await $.tool.call(review)
  await say($, 'x'.repeat(800))
  await say($, 'y'.repeat(500))
  expect((await $.tool.call(ask)).deny).toBeUndefined()
})

test('other agents never gate a question', async ($, on) => {
  engine(on)
  await $.tool.call({ ...review, subagent_type: 'Explore' })
  expect((await $.tool.call(ask)).deny).toBeUndefined()
})

test('no review in flight, no gate', async ($, on) => {
  engine(on)
  expect((await $.tool.call(ask)).deny).toBeUndefined()
})
