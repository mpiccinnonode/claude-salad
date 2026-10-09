import type { StatName } from '../types'
import { SPECIES_LINES } from './roster.ts'

// Canned lines, picked from ramarivera/coding-buddy (MIT): the species' own, the generic pool, and the peak stat's.
export type Reason = 'pet' | 'poke' | 'error' | 'test-fail' | 'commit' | 'late-night'

const GENERIC: Record<Reason, readonly string[]> = {
  pet: ['*happy noises*', 'again! again!', '*closes eyes peacefully*'],
  poke: ['...what.', '*unimpressed blink*', '*detects sarcasm* noted.'],
  error: ['saw that one coming.', 'have you tried reading the error message?', '*winces*'],
  'test-fail': ['bold of you to assume that would pass.', 'the tests are trying to tell you something.', '*sips tea* interesting.'],
  commit: ['*nods* ship it.', 'commit message is... a choice.', 'committed. no take-backs.'],
  'late-night': ['*yawns* it\'s past midnight.', '...have you eaten?', 'dark mode developer detected.'],
}

const PEAK: Partial<Record<StatName, Partial<Record<Reason, readonly string[]>>>> = {
  SNARK: {
    error: ['oh no. an error. how unexpected.', '*monocle adjust* shocking. truly.', 'have you considered... not making errors?'],
    'test-fail': ["the tests have spoken. and they said 'no'.", "maybe the tests are wrong. ...they're not.", '*slow clap* spectacular failure.'],
    commit: ['committed. the code review will be... interesting.', "*reads commit message* 'fix stuff'. poetic."],
    'late-night': ["it's late. your code quality shows it.", '*judges silently*'],
  },
  CHAOS: {
    error: ["*spins wildly* AN ERROR! LET'S REWRITE EVERYTHING!", "you know what? let's just start over."],
    'test-fail': ['THE TESTS ARE LYING TO YOU.', '*suggests deleting the failing tests* problem solved.'],
    commit: ['COMMIT AND RUN.', 'ship it. ship it NOW.'],
  },
  PATIENCE: {
    error: ["steady. we've seen worse.", 'one error at a time. we\'ll get there.'],
    'test-fail': ['the tests will pass. eventually.', '*waits calmly* we have time.'],
  },
  DEBUGGING: {
    error: ["*pulls out magnifying glass* let's trace this.", 'the error message contains the answer. always.'],
    'test-fail': ['the failing test is telling us exactly what\'s wrong.'],
  },
  WISDOM: {
    error: ['in every error lies a deeper truth.', 'errors are the universe suggesting we slow down.'],
    'late-night': ['the night is darkest before the deploy.', 'ancient wisdom: sleep on it.'],
  },
}

export function line(reason: Reason, peak: StatName, species: string, n: number): string {
  const pool = [...(SPECIES_LINES[species]?.[reason] ?? []), ...GENERIC[reason], ...(PEAK[peak]?.[reason] ?? [])]
  return pool[n % pool.length] ?? '...'
}

const TEST = /\b(test|jest|vitest|pytest|mocha|playwright|go test|cargo test)\b/
const COMMIT = /\bgit\s+commit\b/

// What a finished Bash call is worth a line about, if anything.
export function reasonFor(command: string, isError: boolean, hour: number): Reason | undefined {
  if (isError) return TEST.test(command) ? 'test-fail' : 'error'
  if (COMMIT.test(command)) return hour >= 0 && hour < 5 ? 'late-night' : 'commit'
  return undefined
}
