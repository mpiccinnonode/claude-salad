import { expect, test } from 'claude-code/testing'
import { asRelations, inShape, isLove, parseAdd, relink, withRelations } from './friends.ts'

test('/buddy add takes a species added after the original 18, and still treats any other word as personality', async () => {
  expect(parseAdd(['Nino', 'imp', 'sly'])).toEqual({ name: 'Nino', species: 'imp', personality: 'sly' })
  expect(parseAdd(['Nino', 'demon', 'sly'])).toEqual({ name: 'Nino', species: undefined, personality: 'demon sly' })
})

test('relink: a rename takes over a relation already naming the new name, and a removal drops it', async () => {
  const raw = [{ name: 'Zed', relations: [{ Ada: 'rival', adele: 'sister' }, { Pip: 'pupil' }] }, { name: 'Ada' }]
  expect(relink(raw, 'ada', 'Adele')).toEqual([{ name: 'Zed', relations: [{ Adele: 'rival' }, { Pip: 'pupil' }] }, { name: 'Ada' }])
  expect(relink(raw, 'Pip')).toEqual([{ name: 'Zed', relations: [{ Ada: 'rival', adele: 'sister' }] }, { name: 'Ada' }])
  expect(asRelations([{ Ada: ' rival ', Bo: 3 }, 'x', { CY: ['a', 'b'] }])).toEqual({ ada: 'rival', cy: 'a b' })
})

test('love: lovers in either language, never an ex; a relation set replaces the old one for that name and keeps the rest', async () => {
  for (const r of ['lover', 'secret lover', 'Amante', 'la sua anima gemella', 'innamorata persa', 'soulmate', 'my love', 'ex-rival, now lover']) expect(isLove(r)).toBe(true)
  for (const r of ['ex-lover', 'ex amante', 'no longer my lover', 'former sweetheart', 'non più innamorata', 'my beloved child', 'amante del caos', 'lover of bugs', 'amore di mamma', 'rival', 'loves to annoy', 'partner in crime', undefined]) expect(isLove(r)).toBe(false)
  const raw = [{ name: 'Zed', relations: { Ada: 'rival', Pip: 'pupil' }, x: 1 }]
  expect(withRelations(raw, 'zed', { ada: 'lover' })).toEqual([{ name: 'Zed', relations: [{ Pip: 'pupil' }, { ada: 'lover' }], x: 1 }])
})

test('love keywords: the wider pool, still never an ended love, family, a fan or a mate', async () => {
  for (const r of ['his fiancée', 'married to her', 'has a crush on him', 'twin flame', 'life partner', 'partner in life', 'la sua dolce metà', 'compagna di vita', 'la sua ragazza', 'moglie', 'spasimante',
    'ha una cotta', 'vero amore', 'promessa sposa', 'never so in love', 'ex-rival, now lover', 'old friend, lover', 'amante di Ada', 'secret lover of Ada', 'the love of his life',
    'first love', 'his other half', "l'altra metà", 'significant other', 'engaged to Ada', 'il suo amore segreto']) expect(isLove(r)).toBe(true)
  for (const r of ['old flame', 'vecchia fiamma', 'exmoglie', 'ex fidanzata', 'partner in crime', 'compagno di squadra', 'my little sister, my darling', 'zia amata', 'una ragazza qualunque',
    'sparring partner', 'coding partner', 'compagno fedele', 'wants to crush him in every review', 'the darling of the office', 'amata da tutti']) expect(isLove(r)).toBe(false)
})

test('relations in any shape are moved into the list of { name: relation }, keeping what cannot be read as one', async () => {
  const raw = [
    { name: 'A', relation: 'Bo: rival, Cy: friend' },
    { name: 'B', relations: { Ada: 'lover', Cy: 'pupil' }, x: 1 },
    { name: 'C', relations: [{ name: 'Ada', relation: 'boss', since: 2020 }, 'Bo - neighbour', 'weird vibes', 7] },
    { name: 'D', relations: [{ Ada: 'ok' }] },
    { name: 'E' },
    { name: 'F', relation: 'Ada: rival, though she admits one thing: he is brilliant' },
    { name: 'G', relations: { Ada: { relation: 'rival', since: 2020 }, Bo: { note: 'owes him one' } } },
    { name: 'H', relations: 'Ada is my rival' },
  ]
  expect(inShape(raw)).toEqual([
    { name: 'A', relations: [{ Bo: 'rival' }, { Cy: 'friend' }] },
    { name: 'B', relations: [{ Ada: 'lover' }, { Cy: 'pupil' }], x: 1 },
    { name: 'C', relations: [{ Ada: 'boss' }, { Bo: 'neighbour' }], relationNotes: [{ since: 2020 }, 'weird vibes', 7] },
    { name: 'D', relations: [{ Ada: 'ok' }] },
    { name: 'E' },
    { name: 'F', relations: [{ Ada: 'rival, though she admits one thing: he is brilliant' }] },
    { name: 'G', relations: [{ Ada: 'rival' }, { Bo: 'owes him one' }] },
    // Nothing readable: kept as a note, and no relations field, so Haiku writes some.
    { name: 'H', relationNotes: ['Ada is my rival'] },
  ])
  expect(inShape(inShape(raw))).toEqual(inShape(raw))
})
