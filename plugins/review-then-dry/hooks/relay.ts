// A report counts as relayed once the reply text since it reaches 30% of its length, or 1,500 chars for long reports.
export const isRelayed = (said: number, report: number) => said >= Math.min(report * 0.3, 1500)

export const textLength = (content: readonly { type: string; text?: unknown }[]) =>
  content.reduce((n, b) => n + (b.type === 'text' && typeof b.text === 'string' ? b.text.length : 0), 0)

export const isReviewAgent = (subagentType: string | undefined) => !!subagentType?.startsWith('review-then-dry:')

export const DENY =
  'review-then-dry: the review report is only in an Agent tool result, which the user never sees. ' +
  'Present the full report in your reply first (Post-Review Flow step 1), then ask the triage question.'
