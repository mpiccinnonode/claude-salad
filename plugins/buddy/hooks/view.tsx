import type { EngineInterface, RenderInput } from 'claude-code'
import type { Bones, StatName } from '../types'
import { layoutFor, SPRITE, windowOf } from './band.ts'
import { RARITIES, STAT_NAMES } from './bones.ts'
import { titled } from './crew.ts'
import type { Ctx } from './crew.ts'
import { ACTION_TICKS, drawBuddy } from './sprite.ts'
import { crewOr, press, quipFromModel, setHidden, snapshot, toggleStats } from './state.ts'
import type { Live } from './state.ts'
import { WORDS } from './words.ts'

const RARITY_COLOR: Record<Bones['rarity'], string> = { common: 'gray', uncommon: 'green', rare: 'cyan', epic: 'magenta', legendary: 'yellow' }
const SHORT: Record<StatName, string> = { DEBUGGING: 'DBG', PATIENCE: 'PAT', CHAOS: 'CHA', WISDOM: 'WIS', SNARK: 'SNK' }
const BUTTONS = ['pet', 'poke', 'talk', 'stats'] as const

// The band above the prompt; undefined when it yields, to a survey or because the buddy is hidden.
export async function drawBand($: EngineInterface, e: RenderInput<'AbovePrompt'>, o: Ctx, live: Live) {
  const { hidden, said, frame, out, p, showStats, floor } = await snapshot($)
  if (e.props.hasSurvey || hidden) return undefined

  const w = WORDS[o.lang]
  const crew = crewOr(o, out)
  const at = floor % crew.length
  const m = crew[at]!
  const b = m.bones
  if (e.props.isWorking || p?.at === frame) live.lastActiveAt = frame
  // ponytail: ~30s with nothing happening and it dozes off
  const isAsleep = frame - Math.max(live.lastActiveAt, p?.at ?? 0) > 100
  const age = p ? frame - p.at : 0
  const layout = layoutFor(e.props.bodyColumns, e.props.maxRows, crew.length)
  const shown = windowOf(crew.length, layout.count, at)
  const { Box, Button, Text } = $.ui.resolve(e)

  if (layout.shape === 'bare') {
    return (
      <Box key="band">
        <Text wrap="truncate-end"><Text bold>{m.name}</Text>: {said ?? '...'}</Text>
      </Box>
    )
  }

  // Each buddy on its own beat (+7 ticks apiece) so the crew never blinks in unison; a click pets it and gives it the floor.
  const sprites = (
    <Box key="crew" flexDirection="column" flexShrink={0}>
      <Box flexDirection="row">
        {shown.map(i => {
          const c = crew[i]!
          const action = p && p.who === c.key && age < ACTION_TICKS[p.kind] ? { kind: p.kind, age } : undefined
          const look = { isWorking: e.props.isWorking, eye: c.bones.eye, hat: c.bones.hat, action, isAsleep, rarity: c.bones.rarity }
          return (
            <Box key={`buddy-${i}`} flexDirection="column" width={SPRITE.columns} flexShrink={0}>
              {drawBuddy(c.bones.species, frame + i * 7, look, RARITY_COLOR[c.bones.rarity]).map((row, r) => (
                <Button key={`body-${i}-${r}`} plain onPress={() => press($, o, 'pet', crew, i)}>
                  {row.map(([text, color], j) => <Text key={`p${i}-${r}-${j}`} color={color} mono>{text}</Text>)}
                </Button>
              ))}
            </Box>
          )
        })}
      </Box>
      {shown.length > 1 && <Text key="pointer" mono>{`${' '.repeat(shown.indexOf(at) * SPRITE.columns + 6)}${layout.shape === 'stack' ? '▼' : '▲'}`}</Text>}
    </Box>
  )
  const others = crew.filter((_, i) => !shown.includes(i)).map(c => ` · ${c.name}`).join('')
  const actions = {
    pet: () => press($, o, 'pet', crew, at),
    poke: () => press($, o, 'poke', crew, at),
    talk: () => quipFromModel($, o, crew, at, live.lastAnswer ? `${w.chatAnswer}\n\n${live.lastAnswer}` : w.chatEmpty, true),
    stats: () => toggleStats($),
  }
  const bubble = (
    <Box key="bubble" flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold wrap="truncate-end">
        {titled(m)} <Text color="yellow">{'★'.repeat(RARITIES.indexOf(b.rarity) + 1)}</Text>
        {others && <Text bold={false} dimColor>{others}</Text>}
      </Text>
      {/* ponytail: stats stay on one line so the bubble keeps its height and the buttons never scroll out of the band */}
      {showStats ? (
        <Text>
          {STAT_NAMES.map(stat => (
            <Text key={`stat-${stat}`} color={stat === b.peak ? 'green' : undefined}>
              {SHORT[stat]} {b.stats[stat]}{'  '}
            </Text>
          ))}
        </Text>
      ) : (
        <Text dimColor={said === null}>{said ?? '...'}</Text>
      )}
      <Box flexDirection="row" gap={1}>
        {BUTTONS.map((key, i) => <Button key={key} plain dimColor hotkey={String(i + 1)} label={w.labels[key]} onPress={actions[key]} />)}
      </Box>
    </Box>
  )
  const hide = <Button key="hide" label="×" onPress={() => setHidden($, true)} />
  const width = o.isRight ? '100%' : undefined
  const row = o.isRight ? 'row-reverse' : 'row'

  if (layout.shape === 'stack') {
    return (
      <Box key="band" flexDirection="column" alignItems={o.isRight ? 'flex-end' : 'flex-start'} width={width}>
        <Box key="top" flexDirection={row}>{sprites}{hide}</Box>
        {bubble}
      </Box>
    )
  }
  return (
    <Box key="band" flexDirection={row} width={width}>
      {sprites}{bubble}{hide}
    </Box>
  )
}
