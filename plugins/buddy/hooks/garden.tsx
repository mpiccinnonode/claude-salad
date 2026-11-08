import type { EngineInterface, RenderInput } from 'claude-code'
import type { Ctx } from './crew.ts'
import { keyOf } from './friends.ts'
import { capFor, compose, lawnFor, meetings, MIN_COLS, MIN_ROWS, nextSky, onLawn, placeAt, sceneFor, skyAt } from './garden.ts'
import type { Cell } from './garden.ts'
import { ACTION_TICKS, drawBuddy } from './sprite.ts'
import { gardenNow, press, setSky } from './state.ts'
import type { Live } from './state.ts'
import { RARITY_COLOR } from './view.tsx'
import { WORDS } from './words.ts'

// Runs of one owner and colour along a row, so a buddy's glyphs become one Button and the lawn a few Texts.
function runs(row: Cell[]) {
  const out: { who?: number; color?: string; text: string }[] = []
  for (const c of row) {
    const last = out[out.length - 1]
    if (last && last.who === c.who && last.color === c.color) last.text += c.ch
    else out.push({ who: c.who, color: c.color, text: c.ch })
  }
  return out
}

// Rows the pane spends outside the scene: the header, the gap under it, the poke buttons and the captions.
const CHROME = 4

// The crew out on the lawn. A click pets the buddy under it, so care counts exactly as in the band (`press`: same gap, same cap); meetings are only scenery.
export async function drawGarden($: EngineInterface, e: RenderInput<'Pane'>, o: Ctx, live: Live) {
  const w = WORDS[o.lang]
  const { Box, Button, Text } = $.ui.resolve(e)
  const cols = e.props.bodyColumns
  if (cols < MIN_COLS) return <Text key="narrow" dimColor>{w.gardenNarrow(MIN_COLS)}</Text>
  const { frame, crew, p, sky } = await gardenNow($)
  // Each keeps its crew index, so its path does not change when the page turns.
  const rows = Math.max(MIN_ROWS, e.props.scroll.bodyRows - CHROME)
  const lawn = lawnFor(cols, rows)
  const out = onLawn(crew.length, frame, capFor(lawn))
  const spots = out.map(i => placeAt(lawn, i, frame))
  const sprites = out.map((i, k) => {
    const c = crew[i]!
    const age = p ? frame - p.at : 0
    const action = p && p.who === c.key && age < ACTION_TICKS[p.kind] ? { kind: p.kind, age } : undefined
    return { who: i, at: spots[k]!, rows: drawBuddy(c.bones.species, frame + i * 7, { isWorking: false, eye: c.bones.eye, hat: c.bones.hat, action, rarity: c.bones.rarity }, RARITY_COLOR[c.bones.rarity]) }
  })
  const chats = meetings(spots).map(([x, y]) => [crew[out[x]!]!, crew[out[y]!]!] as const).map(([a, b]) => `${a.name} ↔ ${b.name}${a.relations?.[keyOf(b.name)] ? ` · ${a.relations[keyOf(b.name)]}` : ''}`)
  return (
    <Box key="lawn" flexDirection="column">
      {compose(sceneFor(sky === 'auto' ? skyAt(new Date().getHours()) : sky, cols, rows), sprites).map((row, y) => (
        <Box key={`row-${y}`} flexDirection="row">
          {runs(row).map((r, j) =>
            r.who === undefined ? (
              <Text key={`bg-${y}-${j}`} mono color={r.color} dimColor={!r.color}>{r.text}</Text>
            ) : (
              <Button key={`b-${y}-${j}`} plain onPress={() => press($, o, live, 'pet', crew, r.who!)}>
                <Text key={`t-${y}-${j}`} mono color={r.color}>{r.text}</Text>
              </Button>
            ),
          )}
        </Box>
      ))}
      <Box key="poke" flexDirection="row" gap={2}>
        {out.map(i => <Button key={`poke-${i}`} plain dimColor label={`${w.labels.poke} ${crew[i]!.name}`} onPress={() => press($, o, live, 'poke', crew, i)} />)}
        <Button key="sky" plain hotkey="s" label={w.skyButton(sky)} onPress={() => setSky($, nextSky[sky])} />
        {crew.length > out.length && <Text key="page" dimColor>{`${out.length}/${crew.length}`}</Text>}
      </Box>
      <Text key="chats" dimColor>{chats.join('   ') || ' '}</Text>
    </Box>
  )
}
