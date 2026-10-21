import { expect, test } from 'claude-code/testing'
import { parseAdd } from './friends.ts'

test('/buddy add takes a species added after the original 18, and still treats any other word as personality', async () => {
  expect(parseAdd(['Nino', 'imp', 'sly'])).toEqual({ name: 'Nino', species: 'imp', personality: 'sly' })
  expect(parseAdd(['Nino', 'demon', 'sly'])).toEqual({ name: 'Nino', species: undefined, personality: 'demon sly' })
})
