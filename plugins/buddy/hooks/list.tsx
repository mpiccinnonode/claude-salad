import type { Elements, EngineInterface, RenderInput } from 'claude-code'
import type { Card, Filter, Listing, PaneUi } from '../types'
import { ALL_SPECIES, RARITIES, STAT_NAMES } from './bones.ts'
import { titled } from './crew.ts'
import type { Ctx } from './crew.ts'
import { addNew, evolveIt, filterBy, flipSoul, hatchIt, lead, pick, remove, renameTo, setSentence, setSoulField, setSpecies, swapIn, toggleCrew } from './edits.ts'
import { LIST_KEYS, TEXT_KEYS, texts } from './friends.ts'
import { SPRITE } from './band.ts'
import { drawBuddy } from './sprite.ts'
import { listNow, setPane } from './state.ts'
import { RARITY_COLOR } from './view.tsx'
import { WORDS } from './words.ts'

const FILTERS: readonly Filter[] = ['all', 'crew', 'bench', 'egg', 'ready']
const MARK = { lead: '▸', crew: '●', bench: ' ', egg: '○' } as const
const EGG = ['', '    .--.', '   / ?? \\', '   \\    /', "    `--'"]
// Sized for a dock (45% of the terminal, ~80-95 columns): cards from three side by side, the sprite column beside the fields from a readable field width.
const META = 24
const SIDE = META + 2 + 46
// A sprite, its border and padding; one column apart.
const CARD = SPRITE.columns + 4
// An Input is drawn at a fixed height, so it gets as many rows as its text wraps to, plus one to type into.
const rowsFor = (text: string, width: number) => text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / width)), 1)

const isReady = (c: Card) => c.left !== undefined && c.left <= 0
const inFilter = (c: Card, f: Filter) => f === 'all' || (f === 'ready' ? isReady(c) : f === 'crew' ? c.status === 'crew' || c.status === 'lead' : c.status === f)
const stars = (c: Card) => (c.bones ? '★'.repeat(RARITIES.indexOf(c.bones.rarity) + 1) : '')

// What the filters leave, in file order.
export function visible(l: Listing, p: PaneUi) {
  const q = p.query.trim().toLowerCase()
  const min = RARITIES.indexOf(p.rarity as never)
  return l.cards.filter(c => inFilter(c, p.filter) && (min < 0 || (!!c.bones && RARITIES.indexOf(c.bones.rarity) >= min)) && (p.species === 'all' || c.species === p.species) && (!q || c.name.toLowerCase().includes(q)))
}

const isFiltered = (p: PaneUi) => p.filter !== 'all' || p.rarity !== 'all' || p.species !== 'all' || p.query.trim() !== ''

// The list pane: filters, the buddies as cards, the one picked with everything that can be seen or changed about it.
export async function drawList($: EngineInterface, e: RenderInput<'Pane'>, o: Ctx) {
  const w = WORDS[o.lang]
  const els = $.ui.resolve(e)
  // Mobile draws no fields yet: there the pane only shows.
  const canEdit = 'Input' in els && 'Select' in els
  const { Box, Button, Input, Select, Text } = els as Elements['terminal']
  const [l, p] = await listNow($)
  if (!l) return <Text key="loading" dimColor>{w.loading}</Text>
  const shown = visible(l, p)
  const c = shown.find(x => x.key === p.sel) ?? shown[0]
  const hasCards = e.props.bodyColumns >= 3 * (CARD + 1)
  const isSide = e.props.bodyColumns >= SIDE
  const crew = l.cards.filter(x => x.status === 'lead' || x.status === 'crew')
  const at = c ? shown.indexOf(c) : -1
  const step = (by: number) => () => shown.length && pick($, shown[(at + by + shown.length) % shown.length]!.key)

  const sprite = (x: Card, big = false) => {
    const rows = x.bones ? drawBuddy(x.species, 3, { isWorking: false, eye: x.bones.eye, hat: x.bones.hat, rarity: x.bones.rarity }, RARITY_COLOR[x.bones.rarity]) : EGG.map(t => [[t, 'gray']] as const)
    return (
      <Box key={`sprite-${x.key}${big ? '-big' : ''}`} flexDirection="column" flexShrink={0}>
        {rows.map((row, r) => <Text key={`r${r}`} mono>{row.map(([t, color], j) => <Text key={`s${j}`} color={color}>{t}</Text>)}</Text>)}
      </Box>
    )
  }

  const header = (
    <Box key="head" flexDirection="row" gap={2}>
      <Text bold>Buddy</Text>
      <Text dimColor>{w.paneHead(shown.length, l.cards.length, crew.length, l.crewSize, l.egg.done, l.egg.per)}</Text>
    </Box>
  )
  const banner = l.error && (
    <Box key="error" flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red" bold>{w.badFileHead}</Text>
      <Text>{l.error}</Text>
      <Text dimColor>{w.readOnly}</Text>
    </Box>
  )
  const filters = (
    <Box key="filters" flexDirection="row" flexWrap="wrap" columnGap={1}>
      {FILTERS.map(f => (
        <Button key={`filter-${f}`} label={`${w.filters[f as keyof typeof w.filters]} ${l.cards.filter(x => inFilter(x, f)).length}`} variant={p.filter === f ? 'primary' : undefined} dimColor={p.filter !== f} onPress={() => filterBy($, { filter: f })} />
      ))}
      {canEdit && <Select key="rarity" label={w.rarityLabel} value={p.rarity} options={[{ value: 'all', label: w.any }, ...RARITIES.map((r, i) => ({ value: r, label: `${'★'.repeat(i + 1)}+` }))]} onSelect={v => filterBy($, { rarity: v })} />}
      {canEdit && <Select key="species" label={w.speciesLabel} value={p.species} options={[{ value: 'all', label: w.any }, ...[...new Set(l.cards.map(x => x.species).filter(Boolean))].sort().map(s => ({ value: s }))]} onSelect={v => filterBy($, { species: v })} />}
      {canEdit && <Input key="query" label="/" placeholder={w.search} value={p.query} submitLabel={w.searchGo} onInput={v => filterBy($, { query: v })} onSubmit={v => filterBy($, { query: v })} />}
    </Box>
  )

  // With room for three cards, a page of them around the one picked; narrower, a line of names.
  const perPage = Math.max(1, Math.floor(e.props.bodyColumns / (CARD + 1)))
  const start = Math.max(0, Math.min(at - Math.floor(perPage / 2), shown.length - perPage))
  const cards = hasCards ? (
    <Box key="cards" flexDirection="row" gap={1}>
      {shown.slice(start, start + perPage).map(x => (
        <Box key={`card-${x.key}`} flexDirection="column" borderStyle="round" borderColor={x === c ? 'blue' : 'gray'} paddingX={1} width={CARD} flexShrink={0}>
          {sprite(x)}
          <Button key={`pick-${x.key}`} plain label={`${MARK[x.status]} ${x.name}`} onPress={() => pick($, x.key)} />
          <Text color={x.bones ? RARITY_COLOR[x.bones.rarity] : 'gray'}>{stars(x) || w.eggWord}{isReady(x) ? <Text color="yellow"> ✦</Text> : ''}</Text>
        </Box>
      ))}
      {shown.length > perPage && <Text key="more" dimColor>{`${at + 1}/${shown.length}`}</Text>}
    </Box>
  ) : (
    <Box key="cards" flexDirection="row" flexWrap="wrap" columnGap={2}>
      {shown.map(x => <Button key={`pick-${x.key}`} plain dimColor={x !== c} label={`${MARK[x.status]} ${x.name} ${stars(x) || w.eggWord}${isReady(x) ? ' ✦' : ''}`} onPress={() => pick($, x.key)} />)}
    </Box>
  )

  if (!shown.length) {
    return (
      <Box key="list" flexDirection="column" gap={1}>
        {header}{banner}{!l.error && filters}
        <Text key="none" dimColor>{l.cards.length ? w.noMatch : l.error ? w.readOnly : w.noBuddies}</Text>
        <Box key="none-actions" flexDirection="row" gap={2}>
          {isFiltered(p) && <Button key="reset" plain hotkey="0" label={w.reset} onPress={() => filterBy($, { filter: 'all', rarity: 'all', species: 'all', query: '' })} />}
          {!l.error && canEdit && <Button key="add" plain hotkey="a" label={w.add} onPress={() => setPane($, { mode: 'add', note: '' })} />}
        </Box>
        {p.mode === 'add' && addForm()}
      </Box>
    )
  }

  function addForm() {
    const d = p.draft
    return (
      <Box key="add-form" flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1}>
        <Text bold>{w.newBuddy}</Text>
        <Text dimColor>{l!.egg.left <= 0 ? w.addHatches : w.addEgg(l!.egg.left)}</Text>
        <Input key="add-name" label={w.nameLabel} placeholder={w.namePlaceholder} value={d.name} autoFocus submitLabel={w.add} onInput={v => setPane($, { draft: { ...d, name: v } })} onSubmit={v => addNew($, o, { ...d, name: v })} />
        <Select key="add-species" label={w.speciesLabel} value={d.species} options={[{ value: '', label: w.random }, ...ALL_SPECIES.map(s => ({ value: s }))]} onSelect={v => setPane($, { draft: { ...d, species: v } })} />
        <Input key="add-soul" label={w.soulLabel} placeholder={w.soulPlaceholder} rows={2} value={d.soul} submitLabel={w.add} onInput={v => setPane($, { draft: { ...d, soul: v } })} onSubmit={v => addNew($, o, { ...d, soul: v })} />
        <Box key="add-actions" flexDirection="row" gap={2}>
          <Button key="add-go" variant="primary" label={w.add} onPress={() => addNew($, o, d)} />
          <Button key="add-cancel" plain dimColor label={w.cancel} onPress={() => setPane($, { mode: 'view', note: '' })} />
        </Box>
      </Box>
    )
  }

  const card = c!
  const b = card.bones
  const soul = card.personality
  const isLocked = !!l.error || p.isBusy || !canEdit
  // The field's text width: the body, less the sprite column beside it and the field's own frame.
  const textWidth = Math.max(10, e.props.bodyColumns - (isSide ? META + 2 : 0) - 4)
  const meta = (
    <Box key="meta" flexDirection="column" flexShrink={0} width={isSide ? META : undefined}>
      {sprite(card, true)}
      <Text bold>{titled({ ...card, personality: '', bones: b! })}</Text>
      <Text>{b ? <Text color={RARITY_COLOR[b.rarity]}>{stars(card)} {w.rarity[b.rarity]}</Text> : <Text dimColor>{w.inEgg}</Text>}<Text dimColor> · {w.status[card.status]}</Text></Text>
      {b && <Box key="stats" flexDirection="row" flexWrap="wrap" columnGap={1}>{STAT_NAMES.map(s => <Text key={s} dimColor={s !== b.peak} color={s === b.peak ? 'green' : undefined}>{`${w.short[s]} ${b.stats[s]}`}</Text>)}</Box>}
      <Text>{b ? (isReady(card) ? <Text color="yellow">{w.readyNow}</Text> : w.evolvesIn(card.left!)) : l.egg.left > 0 ? w.eggIn(l.egg.left) : <Text color="yellow">{w.eggReady}</Text>}</Text>
    </Box>
  )
  const fields = isLocked ? (
    <Box key="fields" flexDirection="column">
      <Text dimColor>{texts(typeof soul === 'string' ? soul : Object.values(soul ?? {}).flat()).join(' · ') || w.noSoul}</Text>
    </Box>
  ) : (
    <Box key="fields" flexDirection="column" flexGrow={1} gap={1}>
      <Input key={`name-${card.key}`} label={w.nameLabel} value={card.name} submitLabel={w.save} onSubmit={v => renameTo($, o, card, v)} />
      <Select key={`species-${card.key}`} label={w.speciesLabel} value={card.species} options={ALL_SPECIES.map(s => ({ value: s }))} onSelect={v => setSpecies($, o, card, v)} />
      <Text dimColor>{typeof soul === 'string' ? w.soulSentence : soul ? w.soulFields : w.soulEmpty}</Text>
      {typeof soul === 'string' ? (
        <Box key="soul" flexDirection="column">
          <Text bold color="blue">{w.soulLabel}</Text>
          <Input key={`soul-${card.key}`} rows={rowsFor(soul, textWidth)} value={soul} submitLabel={w.save} onSubmit={v => setSentence($, o, card, v)} />
        </Box>
      ) : (
        [...TEXT_KEYS, ...LIST_KEYS].map(f => {
          const v = soul?.[f]
          const text = Array.isArray(v) ? v.join('\n') : (v ?? '')
          // The label on its own line: beside a field that wraps, it ran into the text.
          return (
            <Box key={`field-${f}`} flexDirection="column">
              <Text bold color="blue">{w.fields[f]}</Text>
              <Input key={`soul-${f}-${card.key}`} rows={rowsFor(text, textWidth)} value={text} placeholder={(LIST_KEYS as readonly string[]).includes(f) ? w.onePerLine : undefined} submitLabel={w.save} onSubmit={t => setSoulField($, o, card, f, t)} />
            </Box>
          )
        })
      )}
    </Box>
  )

  const actions = isLocked ? (
    <Box key="actions" flexDirection="row" gap={2}>
      <Button key="next" plain hotkey="n" label={w.next} onPress={step(1)} />
      <Button key="prev" plain hotkey="p" label={w.prev} onPress={step(-1)} />
    </Box>
  ) : (
    <Box key="actions" flexDirection="row" flexWrap="wrap" columnGap={2}>
      <Button key="next" plain hotkey="n" label={w.next} onPress={step(1)} />
      <Button key="prev" plain hotkey="p" label={w.prev} onPress={step(-1)} />
      <Button key="crew" plain hotkey="s" label={card.status === 'lead' || card.status === 'crew' ? w.toBench : w.toCrew} onPress={() => toggleCrew($, o, card, crew.length)} />
      {card.status !== 'lead' && <Button key="lead" plain hotkey="u" label={w.makeLead} onPress={() => lead($, o, card)} />}
      {b && <Button key="evolve" plain hotkey="e" dimColor={!isReady(card)} label={isReady(card) ? w.evolve : `${w.evolve} · ${card.left}`} onPress={() => evolveIt($, o, card)} />}
      {!b && <Button key="hatch" plain hotkey="h" dimColor={l.egg.left > 0} label={l.egg.left > 0 ? `${w.hatch} · ${l.egg.left}` : w.hatch} onPress={() => hatchIt($, o, card)} />}
      {soul !== undefined && <Button key="flip" plain hotkey="t" label={typeof soul === 'string' ? w.toFields : w.toSentence} onPress={() => flipSoul($, o, card)} />}
      <Button key="add" plain hotkey="a" label={w.add} onPress={() => setPane($, { mode: 'add', note: '' })} />
      <Button key="remove" plain hotkey="x" label={w.remove} onPress={() => setPane($, { mode: 'rm', note: '' })} />
      {isFiltered(p) && <Button key="reset" plain hotkey="0" label={w.reset} onPress={() => filterBy($, { filter: 'all', rarity: 'all', species: 'all', query: '' })} />}
    </Box>
  )

  // What waits for an answer replaces the actions: who makes way in a full crew, a removal to confirm, a new buddy.
  const asked = p.mode === 'swap' ? (
    <Box key="swap" flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text color="yellow" bold>{w.whoLeaves(l.crewSize, card.name)}</Text>
      {crew.map(m => <Button key={`swap-${m.key}`} plain label={`${MARK[m.status]} ${m.name}`} onPress={() => swapIn($, o, card, m.key)} />)}
      <Button key="swap-cancel" plain dimColor label={w.cancel} onPress={() => setPane($, { mode: 'view' })} />
    </Box>
  ) : p.mode === 'rm' ? (
    <Box key="rm" flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red" bold>{w.sureRemove(card.name)}</Text>
      <Box key="rm-actions" flexDirection="row" gap={2}>
        <Button key="rm-yes" plain hotkey="x" label={w.yesRemove} onPress={() => remove($, o, card)} />
        <Button key="rm-no" plain dimColor label={w.cancel} onPress={() => setPane($, { mode: 'view' })} />
      </Box>
    </Box>
  ) : p.mode === 'add' && canEdit ? addForm() : actions

  return (
    <Box key="list" flexDirection="column" gap={1}>
      {header}{banner}{filters}{cards}
      <Box key="detail" flexDirection={isSide ? 'row' : 'column'} gap={2}>{meta}{fields}</Box>
      {p.note && <Text key="note" color={p.isBusy ? 'yellow' : undefined}>{p.isBusy ? `⠹ ${p.note}` : p.note}</Text>}
      {asked}
    </Box>
  )
}
