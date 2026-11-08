// The garden backdrop (by the artist agent): TILE repeats across any width, the lawn rows (TOP down) repeat down any height, then LANDMARKS go over it, placed by `at`, their centre as a share of the width.
// Printable ASCII; colours g y b c m r w k (green yellow blue cyan magenta red white gray), a space is the default.

export type Color = ' ' | 'g' | 'y' | 'b' | 'c' | 'm' | 'r' | 'w' | 'k'
type Pick = (row: number, ch: string) => Color

// Paints every non-blank cell with `pick`; blanks stay blank (see-through, default colour).
const paint = (rows: string[], pick: Pick): string[] =>
  rows.map((line, row) => [...line].map((ch) => (ch === ' ' ? ' ' : pick(row, ch))).join(''))

const mono = (color: Color): Pick => () => color

export const TOP = 7
export const PERIOD = 30
export const LAWN_MARGIN = 4

const EMPTY = ' '.repeat(PERIOD)
const HEDGE = '%'.repeat(PERIOD)

// Rows 0..5: sky and hills (what changes between day and night).
const SKY_DAY: string[] = [
  EMPTY,
  EMPTY,
  EMPTY,
  EMPTY,
  '       _/\\_             _/\\_  ',
  '    _/      \\__        _/     ',
]

const SKY_NIGHT: string[] = [
  '  +      *        +        +  ',
  '     +        *       +       ',
  '   *       +         *     +  ',
  '  +      +       *       +    ',
  '       _/\\_             _/\\_  ',
  '    _/      \\__        _/     ',
]

// Rows 7..15: lawn. Only space, ., ,, " and a few flowers (* yellow, o red).
const GRASS: string[] = [
  ',  .  ,,   ,   .  ,,    ,   ,.',
  ',   ,,  .    ,   "  .  ,   ,, ',
  '   .  ,   ,,    o ,  ,,    .  ',
  ' ,,   .  ,  ,,   ,   .  ,,   ,',
  '  ,  ,,  .   ,    ,,  .  ,    ',
  ',    ,   ,,  .    ,   ,,   .  ',
  ' ,  .  ,,   ,   *  ,   ,,   . ',
  '  ,,   ,   .  ,,    ,   ,  .  ',
  ',   ,,   ,  .   ,,    ,   ,,  ',
]

const dayPick: Pick = (_row, ch) => (ch === '*' ? 'y' : ch === 'o' ? 'r' : 'g')
const nightPick: Pick = (row, ch) =>
  ch === '+' ? 'w' : ch === '*' ? 'y' : row <= 5 ? 'b' : ch === ',' ? 'k' : 'g'

const DAY_ASCII = [...SKY_DAY, HEDGE, ...GRASS]
const NIGHT_ASCII = [...SKY_NIGHT, HEDGE, ...GRASS]

export const TILE: Record<'day' | 'night', { ascii: string[]; color: string[] }> = {
  day: { ascii: DAY_ASCII, color: paint(DAY_ASCII, dayPick) },
  night: { ascii: NIGHT_ASCII, color: paint(NIGHT_ASCII, nightPick) },
}

// One-off objects above the hedge (rows 0..6).
const TREE_SMALL = ['  @@@  ', ' @@@@@ ', '@@@@@@@', '@@@@@@@', ' @@@@@ ', '   |   ', '   |   ']
const TREE_WIDE = ['   @@@   ', '  @@@@@  ', ' @@@@@@@ ', '@@@@@@@@@', ' @@@@@@@ ', '    |    ', '    |    ']
const TREE_PICK: Pick = (_row, ch) => (ch === '|' ? 'y' : 'g')
const CLOUD = [' .-----. ', '(       )']
const SUN = ['  *  ', '*(O)*', '  *  ']
const MOON = ['  ___ ', ' (  O)', ' (___)']
const BUSH = ['  @@@@@  ', ' @@@@@@@ ']
const BENCH = ['_______', '|_____|']
const POND = ['  ~~~~~~~  ', ' ~~~~~~~~~ ']

export const LANDMARKS: { name: string; at: number; row: number; ascii: string[]; color: string[]; night?: { ascii: string[]; color: string[] } }[] = [
  { name: 'tree-left', at: 0.083, row: 0, ascii: TREE_SMALL, color: paint(TREE_SMALL, TREE_PICK) },
  { name: 'cloud-left', at: 0.222, row: 2, ascii: CLOUD, color: paint(CLOUD, mono('w')), night: { ascii: CLOUD, color: paint(CLOUD, mono('k')) } },
  { name: 'bush', at: 0.333, row: 5, ascii: BUSH, color: paint(BUSH, mono('g')) },
  { name: 'sun', at: 0.472, row: 0, ascii: SUN, color: paint(SUN, mono('y')), night: { ascii: MOON, color: paint(MOON, mono('w')) } },
  { name: 'bench', at: 0.5, row: 5, ascii: BENCH, color: paint(BENCH, mono('y')) },
  { name: 'cloud-right', at: 0.653, row: 1, ascii: CLOUD, color: paint(CLOUD, mono('w')), night: { ascii: CLOUD, color: paint(CLOUD, mono('k')) } },
  { name: 'pond', at: 0.68, row: 5, ascii: POND, color: paint(POND, mono('c')) },
  { name: 'tree-right', at: 0.833, row: 0, ascii: TREE_WIDE, color: paint(TREE_WIDE, TREE_PICK) },
]
