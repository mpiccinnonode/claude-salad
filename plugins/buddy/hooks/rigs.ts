import type { Rarity } from '../types'
import { RARITIES } from './bones.ts'

// Rigs for every species and their evolution stages; a row is 12 cells once {E} is one eye, {x} a part whose variants share one width.
type Rhythm = (tick: number, isWorking: boolean) => number
export type Mood = 'pet' | 'poke' | 'asleep' | 'working'
type Part = { v: readonly string[]; r: Rhythm; c?: string }
// A mood pins a part to one variant, or gives it its own rhythm; parts it doesn't name keep theirs.
export type Rig = { rows: readonly string[]; parts: Record<string, Part>; moods: Partial<Record<Mood, Record<string, number | Rhythm>>> }

const beat = (t: number) => t % 20
// Each rhythm picks a variant index; different parts get different ones so they move on their own.
const twitch = (...at: number[]): Rhythm => (t, w) => (w ? (t % 4 === 0 ? 1 : 0) : at.includes(beat(t)) ? 1 : 0)
const wag = (n: number, slow = 2): Rhythm => (t, w) => (w ? t % n : Math.floor(t / slow) % n)
const breathe: Rhythm = (t, w) => (w ? t % 2 : Math.floor(beat(t) / 3) % 2)
const special: Rhythm = (t, w) => (w ? (t % 3 === 2 ? 1 : 0) : beat(t) === 11 ? 1 : beat(t) === 12 ? 2 : 0)
const step: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 16 || beat(t) === 18 ? 1 : 0)
const flap: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 4 || beat(t) === 5 ? 1 : 0)
const arm = (offset: number): Rhythm => (t, w) => (w ? (t + offset) % 3 : ([0, 0, 2, 0, 1][Math.floor((t + offset * 3) / 2) % 5] ?? 0))
const fast = (a: number, b: number): Rhythm => t => (t % 2 ? b : a)
// The same rhythm `by` ticks late, so a trailing part follows the one that leads it.
const lag = (r: Rhythm, by: number): Rhythm => (t, w) => r(Math.max(0, t - by), w)

const BLANK = '            '


const ears: Rhythm = (t, w) => (w ? t % 3 : beat(t) === 3 ? 2 : beat(t) === 13 ? 1 : 0)
const smoke = { v: [BLANK, "    '  '    ", "   '    '   "], r: special }
const tufts = (t: number, w: boolean) => (w ? t % 3 : beat(t) === 2 ? 1 : beat(t) === 14 ? 2 : 0)
const tuft = (t: number, w: boolean) => (w ? (t % 2 ? 2 : 0) : beat(t) === 12 || beat(t) === 13 ? 1 : 0)
const hem = (n: number) => (t: number, w: boolean) => (w ? t % n : Math.floor(t / 2) % n)
// Arm poses top to bottom: raised, held out, half-raised.
const LEFT = [[' _ ', '| |', '\\__'], ['   ', '___', '(__'], ['   ', '| |', '\\__']]
const RIGHT = [[' _ ', '| |', '__/'], ['   ', '___', '__)'], ['   ', '| |', '__/']]
const armRow = (side: string[][], row: number) => side.map(pose => pose[row] ?? '')
const ARMS = (pose: number) => ({ a: pose, b: pose, c: pose, d: pose, e: pose, f: pose })
const arms = {
  a: { v: armRow(LEFT, 0), r: arm(0) }, c: { v: armRow(LEFT, 1), r: arm(0) }, e: { v: armRow(LEFT, 2), r: arm(0) },
  b: { v: armRow(RIGHT, 0), r: arm(1) }, d: { v: armRow(RIGHT, 1), r: arm(1) }, f: { v: armRow(RIGHT, 2), r: arm(1) },
}
const typing = (t: number, w: boolean) => (w ? t % 3 : Math.floor(t / 2) % 3)
// A legendary's sparkle: dark most of the beat, then . + * + . from its own offset.
const glint = (at: number): Part => ({
  v: [' ', '.', '+', '*', '+', '.'],
  r: (t, w) => {
    const k = ((w ? 2 * t : t) + at) % 12
    return k < 6 ? k : 0
  },
  c: 'yellow',
})

export const RIGS: Record<string, Rig> = {
  duck: {
    rows: [BLANK, '      {c}    ', '  {w}( {E}){b}  ', '  \\ {g}. )   ', "   `---'{t}   "],
    parts: {
      c: { v: ['__', '_,'], r: twitch(8) },
      w: { v: ['___', '__,'], r: wag(2, 3) },
      b: { v: ['>', '='], r: special, c: 'yellow' },
      g: { v: ['<_', '<-'], r: flap },
      t: { v: [' ', '~'], r: wag(2, 3) },
    },
    moods: { pet: { c: 1, g: 1, t: fast(0, 1) }, poke: { b: 1, w: 1, g: fast(0, 1) }, asleep: { b: 0, g: 0, w: 0, c: 0, t: 0 } },
  },
  goose: {
    rows: [BLANK, '  {b}{E} )      ', '    ) ){w}  ', '   ( {k}) ', "    `----'  "],
    parts: {
      b: { v: ['<', '='], r: special, c: 'yellow' },
      w: { v: ['___', '__,', '_,-'], r: wag(3, 3) },
      k: { v: ['`-._ ', '`-.__', '`--._'], r: lag(wag(3, 3), 1) },
    },
    moods: { pet: { w: 2, k: 2 }, poke: { b: 1, w: fast(0, 2), k: fast(0, 1) }, asleep: { b: 0, w: 0, k: 0 } },
  },
  blob: {
    rows: [BLANK, BLANK, '   .{E}--{E}.   ', " _.' {m} '._ ", '({b})'],
    parts: {
      m: { v: ['  ', 'ww', 'o ', 'uu'], r: special },
      b: { v: ['__________', '_.-~~~~-._', '__.-~~-.__'], r: wag(3, 3) },
    },
    moods: { pet: { m: 3, b: 1 }, poke: { m: 2, b: fast(1, 2) }, asleep: { m: 0, b: 0 } },
  },
  cat: {
    rows: [BLANK, '   {e}    ', '  ( {E}.{E} )   ', '   {m}    ', '  {p}{t}'],
    parts: {
      e: { v: ['/\\_/\\', '/\\-/\\', '/|_/\\', '-\\_/-'], r: ears },
      m: { v: ['> ^ <', '= ^ =', '> o <', '> - <'], r: special },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
      t: { v: ['   ', ')  ', ' ) ', '~  '], r: wag(4) },
    },
    moods: { pet: { e: 0, m: 1, t: fast(1, 2) }, poke: { e: 3, m: 2, t: 3, p: 1 }, asleep: { e: 3, m: 3, t: 0, p: 0 } },
  },
  dragon: {
    rows: ['{s}', '  /)____(\\  ', ' ( {E}    {E} ) ', '  \\ {n} /  ', '   \\_{f}_/   '],
    parts: {
      s: smoke,
      n: { v: ["'..'", "'oo'"], r: breathe },
      f: { v: ['vv', 'VV', '~~'], r: (t, w) => (special(t, w) ? 2 : step(t, w)), c: 'red' },
    },
    moods: { pet: { s: 0, n: 1, f: 0 }, poke: { s: fast(1, 2), n: 1, f: 2 }, asleep: { s: 0, n: 0, f: 1 } },
  },
  octopus: {
    rows: ['{o}', '   .-""-.   ', '  ( {E}  {E} )  ', '  {t}  ', ' {u} '],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { t: 2, u: 2 }, poke: { o: 2, t: fast(0, 1), u: fast(0, 1) }, asleep: { o: 0, t: 0, u: 2 } },
  },
  owl: {
    rows: [BLANK, '   {e}    ', '   ({E}{b}{E})    ', '  {l}(   ){r}   ', '  --{f}--   '],
    parts: {
      e: { v: [',___,', '.___,', ',___.'], r: tufts },
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      f: { v: ['"-"', '"_"'], r: step },
    },
    moods: { pet: { b: 1, l: 1, r: 1 }, poke: { e: 1, l: fast(0, 1), r: fast(1, 0), f: 1 }, asleep: { b: 0, e: 0, l: 0, r: 0, f: 0 } },
  },
  penguin: {
    rows: [BLANK, '   {h}    ', '   ({E}{b}{E})    ', '  {l}(   ){r}   ', '   {f}    '],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      l: { v: ['/', '|', '\\'], r: (t, w) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2) },
      r: { v: ['\\', '|', '/'], r: (t, w) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2) },
      f: { v: ["`---'", "`--^'", "^---'"], r: step },
    },
    moods: { pet: { l: 1, r: 1, h: 0, b: 1 }, poke: { h: 1, l: 0, r: 0, f: fast(1, 2) }, asleep: { h: 0, l: 1, r: 1, f: 0, b: 0 } },
  },
  turtle: {
    rows: [BLANK, ' _.----._   ', '/\\_/\\_/\\({E}{E})', "\\_/\\_/\\__/  ", '{f}'],
    parts: {
      f: { v: ['  ""    ""  ', '   ""  ""   ', ' ""    ""   '], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { f: 1 }, poke: { f: fast(0, 2) }, asleep: { f: 2 } },
  },
  snail: {
    rows: [BLANK, '  .--.  {a} ', ' ( {c}  ) {k}  ', "  `--'___/  ", '{f}'],
    parts: {
      a: { v: ['{E} {E}', ' {E}{E}', '{E}{E} '], r: wag(3, 3) },
      k: { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) },
      c: { v: ['@', 'o', '0'], r: special },
      f: { v: [' (_______)  ', ' (_______)~ ', ' (_______)  '], r: step },
    },
    moods: { pet: { c: 2, a: 1, k: 1 }, poke: { a: 1, k: 1, c: 1, f: fast(0, 1) }, asleep: { c: 0, a: 2, k: 2, f: 0 } },
  },
  ghost: {
    rows: [BLANK, '    .-.     ', '   ({E} {E})    ', '   | {m} \\{a}  ', '    {t}  '],
    parts: {
      m: { v: ['O', 'o', '-', 'w'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1 }, poke: { m: 0, a: fast(0, 1), t: fast(0, 1) }, asleep: { m: 2, a: 0, t: 0 } },
  },
  axolotl: {
    rows: [BLANK, ' {a} .--. {b} ', '{c}( {E}  {E} ){d}', ' {e}( {m} ){f} ', "  `-^--^-'{t}"],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['==', '~='], r: wag(2, 3), c: 'magenta' },
      d: { v: ['==', '=~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      e: { v: ['//', "/'"], r: wag(2, 2), c: 'magenta' },
      f: { v: ['\\\\', "'\\"], r: lag(wag(2, 2), 1), c: 'magenta' },
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      t: { v: ['  ', '~ '], r: breathe },
    },
    moods: { pet: { m: 3, a: fast(0, 1), b: fast(0, 1), t: 1 }, poke: { m: 2, c: 1, d: 1, e: 1, f: 1 }, asleep: { m: 1, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, t: 0 } },
  },
  capybara: {
    rows: [BLANK, '   {e}.--.{f}   ', '  ( {E}  {E} )  ', '  ( ({n}) )  ', '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 0 }, poke: { n: 1, w: fast(1, 2), e: fast(0, 1) }, asleep: { e: 1, f: 1, n: 2, w: 0 } },
  },
  cactus: {
    rows: [BLANK, '{a} .--. {b}', '{c}|{E}  {E}|{d}', '{e}| {m} |{f}', '   |____|   '],
    parts: { ...arms, m: { v: ['  ', 'ww', 'oo', '--'], r: special } },
    moods: { pet: { ...ARMS(0), m: 1 }, poke: { ...ARMS(1), m: 2 }, asleep: { ...ARMS(2), m: 3 } },
  },
  robot: {
    rows: [BLANK, '  .------.  ', '  |[{E}  {E}]|  ', '  |[ {m} ]|  ', "  '--||-{f}'  "],
    parts: {
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      f: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
    },
    moods: { pet: { m: 3, f: 1 }, poke: { m: 2, f: fast(0, 1) }, asleep: { m: 1, f: 0 } },
  },
  rabbit: {
    rows: [BLANK, '   {l}{r}     ', '   ( {E}{n}{E})   ', '   {t}(")(") ', '    {g}    '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
      g: { v: ["_''_", '_,,_'], r: wag(2, 4), c: 'green' },
    },
    moods: { pet: { l: 2, r: 2, n: 2, t: fast(0, 2) }, poke: { l: 1, r: 1, n: 1, t: 2 }, asleep: { l: 2, r: 2, n: 0, t: 0, g: 0 } },
  },
  mushroom: {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", '   ({E}{m}{E})   ', '   {g}   '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
      g: { v: ['(____)', '(_/\\_)'], r: step },
    },
    moods: { pet: { s: 2, c: 1, m: 1 }, poke: { s: fast(1, 2), c: fast(0, 1), m: 2, g: 1 }, asleep: { s: 0, c: 0, m: 0, g: 0 } },
  },
  chonk: {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{m}{E} )__.  ', ' (       ){t}', '  {p}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { m: 1, t: fast(0, 1) }, poke: { a: 2, b: 2, m: 3, p: 1 }, asleep: { m: 0, a: 0, b: 0, t: 2, p: 0 } },
  },
  imp: {
    rows: [BLANK, '  {h}  ', '  ( {E}  {E} )  ', '   ( {m} ){t}', '    {d}    '],
    parts: {
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['v  v', ' vv '], r: step },
    },
    moods: { pet: { h: 1, m: 1, t: fast(0, 1) }, poke: { h: 1, m: 2, t: 2, d: 1 }, asleep: { h: 0, m: 3, t: 1, d: 0 } },
  },
  bat: {
    rows: [BLANK, '{l}{f}{r}', '   ({w})   ', '   ({E}  {E})   ', '    {e}    '],
    parts: {
      l: { v: ['_____'], r: () => 0, c: 'green' },
      r: { v: ['_____'], r: () => 0, c: 'green' },
      f: { v: ['""', "''"], r: step },
      w: { v: ['\\  /', '|  |', '\\__/'], r: wag(2, 4) },
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { w: 2, f: fast(0, 1) }, poke: { w: 1, e: 1, f: 1 }, asleep: { w: 2, e: 0, f: 0 } },
  },
  skeleton: {
    rows: [BLANK, '   ({E}  {E})   ', '    \\{m}/    ', '{a}(={r}=){b}', '   {l}   '],
    parts: {
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: {
      pet: { m: 1, a: 0, b: 0, l: fast(1, 2) },
      poke: { m: 2, r: 1, a: 2, b: 2, l: 0 },
      asleep: { m: 3, a: 2, b: 2, r: 0, l: 0 },
    },
  },
  'duck:rare': {
    rows: [BLANK, '      {c}    ', '  {w}( {E}){b}  ', '  \\ {g}. )   ', "{x}`---'{y}"],
    parts: {
      c: { v: ['__', '_,'], r: twitch(8) },
      w: { v: ['___', '__,'], r: wag(2, 3) },
      b: { v: ['>', '='], r: special, c: 'yellow' },
      g: { v: ['<_', '<-'], r: flap },
      x: { v: ['~~~ ', ' ~~~', '~ ~~'], r: wag(3, 2), c: 'cyan' },
      y: { v: ['~~~', '~ ~', ' ~~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: { pet: { c: 1, g: 1, x: fast(0, 1) }, poke: { b: 1, w: 1, g: fast(0, 1) }, asleep: { b: 0, g: 0, w: 0, c: 0, x: 0, y: 0 } },
  },
  'duck:epic': {
    rows: [BLANK, '     {c}    ', ' {w}( {E}){b}  ', ' {k}\\ {g}. )   ', "{x}`---'{y}"],
    parts: {
      c: { v: [',__', ',_,', '.__'], r: wag(3, 3), c: 'red' },
      w: { v: ['____', '___/', '__/ '], r: wag(3, 2) },
      b: { v: ['>', '='], r: special, c: 'yellow' },
      k: { v: ['<', '{'], r: lag(flap, 1), c: 'cyan' },
      g: { v: ['<_', '<-'], r: flap, c: 'cyan' },
      x: { v: ['~~~ ', ' ~~~', '~ ~~'], r: wag(3, 2), c: 'cyan' },
      y: { v: ['~~~', '~ ~', ' ~~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: {
      pet: { c: 2, g: 1, k: 1, x: fast(0, 1) },
      poke: { b: 1, w: 1, g: fast(0, 1), k: fast(1, 0) },
      asleep: { b: 0, g: 0, k: 0, w: 0, c: 0, x: 0, y: 0 },
    },
  },
  'goose:rare': {
    rows: [BLANK, '  {b}{E} )      ', '    ) ){w}  ', '   ( {k}) ', "{x}`----'{y}"],
    parts: {
      b: { v: ['<', '='], r: special, c: 'yellow' },
      w: { v: ['___', '__,', '_,-'], r: wag(3, 3) },
      k: { v: ['`-._ ', '`-.__', '`--._'], r: lag(wag(3, 3), 1) },
      x: { v: ['~~~~', ' ~~~', '~ ~~'], r: wag(3, 2), c: 'cyan' },
      y: { v: ['~~', '~ ', ' ~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: { pet: { w: 2, k: 2, x: fast(0, 1) }, poke: { b: 1, w: fast(0, 2), k: fast(0, 1) }, asleep: { b: 0, w: 0, k: 0, x: 0, y: 0 } },
  },
  'goose:epic': {
    rows: [BLANK, ' {c}{b}{E} ){a}', '    ) ){w}', '   ( {k}) ', "{x}`----'{y}"],
    parts: {
      c: { v: [' ', '*'], r: breathe, c: 'yellow' },
      b: { v: ['<', '='], r: special, c: 'yellow' },
      a: { v: ['   /\\ ', '  /\\/\\', '  //\\\\'], r: (t, w) => (flap(t, w) ? 1 + (t % 2) : 0) },
      w: { v: ['/\\/\\/', '/\\/\\_', '_/\\/\\'], r: wag(3, 3) },
      k: { v: ['`-._ ', '`-.__', '`--._'], r: lag(wag(3, 3), 1) },
      x: { v: ['~~~~', ' ~~~', '~ ~~'], r: wag(3, 2), c: 'cyan' },
      y: { v: ['~~', '~ ', ' ~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: {
      pet: { a: 1, c: 1, w: 2, x: fast(0, 1) },
      poke: { a: fast(1, 2), b: 1, w: fast(0, 2), k: fast(0, 1) },
      asleep: { a: 0, b: 0, c: 0, w: 0, k: 0, x: 0, y: 0 },
    },
  },
  'blob:rare': {
    rows: [BLANK, '    {a}    ', "  .'{E}  {E}'.  ", ' _)  {m}  (_ ', '({b})'],
    parts: {
      a: { v: ['.--.', '.~~.'], r: breathe },
      m: { v: ['  ', 'ww', 'o ', 'uu'], r: special },
      b: { v: ['__________', '_.-~~~~-._', '__.-~~-.__'], r: lag(wag(3, 3), 1) },
    },
    moods: { pet: { m: 3, a: 1, b: 1 }, poke: { m: 2, a: 1, b: fast(1, 2) }, asleep: { m: 0, a: 0, b: 0 } },
  },
  'blob:epic': {
    rows: [BLANK, '  {p}{a}{q}  ', "  .'{E}  {E}'.  ", ' {x}(  {m}  ){y} ', '({b})'],
    parts: {
      p: { v: ['  ', ' o', ' .'], r: wag(3, 3), c: 'cyan' },
      q: { v: ['  ', 'o ', '. '], r: lag(wag(3, 3), 1), c: 'cyan' },
      a: { v: ['.~~.', '.--.'], r: breathe },
      x: { v: [' ', '.', ':'], r: lag(wag(3, 2), 1) },
      y: { v: [':', '.', ' '], r: lag(wag(3, 2), 2) },
      m: { v: ['  ', 'ww', 'o ', 'uu'], r: special },
      b: { v: ['_.-~~~~-._', '__.-~~-.__', '~._.--._.~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: {
      pet: { m: 3, a: 1, p: 1, q: 1, b: 1 },
      poke: { m: 2, a: 1, p: fast(1, 2), q: fast(2, 1), b: fast(1, 2) },
      asleep: { m: 0, a: 0, p: 0, q: 0, x: 0, y: 2, b: 0 },
    },
  },
  'cat:rare': {
    rows: [BLANK, '   {e}    ', '  ( {E}.{E} )   ', '   {m}  {k} ', '  {p}{t}'],
    parts: {
      e: { v: ['/\\_/\\', '/\\-/\\', '/|_/\\', '-\\_/-'], r: ears },
      m: { v: ['> ^ <', '= ^ =', '> o <', '> - <'], r: special },
      k: { v: [')', '|', '('], r: wag(3) },
      t: { v: ['_/ ', '_| ', '_) '], r: lag(wag(3), 1) },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
    },
    moods: { pet: { e: 0, m: 1, k: fast(0, 2) }, poke: { e: 3, m: 2, k: 1, t: 1, p: 1 }, asleep: { e: 3, m: 3, k: 0, t: 0, p: 0 } },
  },
  'cat:epic': {
    rows: [BLANK, '  {e}   ', '  ( {E}.{E} ) {u} ', '  =(_{b}_)= {k} ', '  {p}{t}'],
    parts: {
      e: { v: [',/\\_/\\,', ',/\\-/\\,', ',/|_/\\,', '-/\\_/\\-'], r: ears },
      b: { v: ['*', 'o'], r: special, c: 'yellow' },
      u: { v: [' ', '_', '.'], r: wag(3) },
      k: { v: [')', '|', '('], r: lag(wag(3), 1) },
      t: { v: ['_/ ', '_| ', '_) '], r: lag(wag(3), 2) },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
    },
    moods: { pet: { e: 0, b: 1, u: 1, k: fast(0, 2) }, poke: { e: 3, b: 1, k: 1, t: 1, p: 1 }, asleep: { e: 3, b: 0, u: 0, k: 0, t: 0, p: 0 } },
  },
  'dragon:rare': {
    rows: ['{s}', ' {a})____({b} ', '<( {E}    {E} )>', '  \\ {n} /  ', '  {c}\\_{f}_/{d}  '],
    parts: {
      s: smoke,
      a: { v: ['/\\', '/|'], r: wag(2, 3) },
      b: { v: ['/\\', '|\\'], r: wag(2, 3) },
      n: { v: ["'..'", "'oo'"], r: breathe },
      c: { v: [' ', '<'], r: lag(wag(2, 3), 1) },
      d: { v: [' ', '>'], r: lag(wag(2, 3), 1) },
      f: { v: ['vv', 'VV', '~~'], r: (t, w) => (special(t, w) ? 2 : step(t, w)), c: 'red' },
    },
    moods: { pet: { s: 0, n: 1, f: 0, c: 1, d: 1 }, poke: { s: fast(1, 2), n: 1, f: 2, a: fast(0, 1), b: fast(0, 1) }, asleep: { s: 0, n: 0, f: 1, c: 0, d: 0 } },
  },
  'dragon:epic': {
    rows: ['{s}', '{a}/)____(\\{b}', '{l}( {E}    {E} ){r}', '{c} \\ {n} / {d}', " `-\\_{f}_/-' "],
    parts: {
      s: smoke,
      a: { v: ['/|', '_|', '\\|'], r: wag(3, 3) },
      b: { v: ['|\\', '|_', '|/'], r: wag(3, 3) },
      l: { v: ['/', '|', '\\'], r: lag(wag(3, 3), 1) },
      r: { v: ['\\', '|', '/'], r: lag(wag(3, 3), 1) },
      c: { v: ['\\', '|', '/'], r: lag(wag(3, 3), 2) },
      d: { v: ['/', '|', '\\'], r: lag(wag(3, 3), 2) },
      n: { v: ["'..'", "'oo'"], r: breathe },
      f: { v: ['VV', 'vv', '~~'], r: (t, w) => (special(t, w) ? 2 : step(t, w)), c: 'red' },
    },
    moods: {
      pet: { s: 0, n: 1, f: 0, a: 1, b: 1, l: 1, r: 1, c: 1, d: 1 },
      poke: { s: fast(1, 2), n: 1, f: 2, a: fast(0, 2), b: fast(0, 2), l: fast(0, 2), r: fast(0, 2) },
      asleep: { s: 0, n: 0, f: 1, a: 1, b: 1, l: 1, r: 1, c: 1, d: 1 },
    },
  },
  'octopus:rare': {
    rows: ['{o}', '  {d}  ', ' (  {E}  {E}  ) ', ' {t} ', '{u}'],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special },
      d: { v: ['.-o""o-.', '.-"oo"-.'], r: wag(2, 4), c: 'magenta' },
      t: { v: ['/`)/  \\(`\\', '\\`)\\  /(`/'], r: wag(2, 3) },
      u: { v: ['( (( )( )) )', ') )( )( )( ('], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { d: 1, t: 1, u: 1 }, poke: { o: 2, t: fast(0, 1), u: fast(1, 0) }, asleep: { o: 0, d: 0, t: 0, u: 0 } },
  },
  'octopus:epic': {
    rows: ['{o}', ' {a}.-{d}-.{b} ', '(( {E}    {E} ))', ' {t} ', '{u}'],
    parts: {
      o: { v: [BLANK, '     o      ', '    o  O    '], r: special },
      a: { v: [',', '~', '('], r: wag(3, 3), c: 'magenta' },
      b: { v: [',', '~', ')'], r: lag(wag(3, 3), 1), c: 'magenta' },
      d: { v: ['o""o', '"oo"'], r: wag(2, 4), c: 'magenta' },
      t: { v: ['\\`)/\\/\\(`/', '/`)\\/\\/(`\\'], r: wag(2, 3), c: 'magenta' },
      u: { v: [' ~((_)(_))~ ', '~ ((_)(_)) ~'], r: lag(wag(2, 3), 1), c: 'magenta' },
    },
    moods: {
      pet: { a: 2, b: 2, d: 1, t: 1, u: 0 },
      poke: { o: 2, a: fast(0, 1), b: fast(1, 0), t: fast(0, 1), u: fast(1, 0) },
      asleep: { o: 0, a: 0, b: 0, d: 0, t: 0, u: 0 },
    },
  },
  'owl:rare': {
    rows: [BLANK, '   {e}    ', '   ({E}{b}{E})    ', '  {l}({u}){r}   ', ' ---{f}---  '],
    parts: {
      e: { v: ['^___^', '.___^', '^___.'], r: tufts },
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      l: { v: ['(', '/'], r: flap },
      r: { v: [')', '\\'], r: lag(flap, 1) },
      u: { v: [':::', '.:.'], r: breathe },
      f: { v: ['"-"', '"_"'], r: step },
    },
    moods: { pet: { b: 1, l: 1, r: 1, u: 1 }, poke: { e: 1, l: fast(0, 1), r: fast(1, 0), f: 1 }, asleep: { b: 0, e: 0, l: 0, r: 0, u: 0, f: 0 } },
  },
  'owl:epic': {
    rows: [BLANK, '  {e}   ', '  (({E}{b}{E}))   ', ' {l}(:{u}:){r}  ', ' {x}{f}{y}  '],
    parts: {
      e: { v: ['\\,___,/', '|,___,/', '\\,___,|'], r: tufts },
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      l: { v: [' (', '//', '__'], r: (t, w) => (flap(t, w) ? 1 + (t % 2) : 0) },
      r: { v: [') ', '\\\\', '__'], r: lag((t, w) => (flap(t, w) ? 1 + (t % 2) : 0), 1) },
      u: { v: ['V', 'v'], r: breathe },
      x: { v: ['*--', '-*-'], r: wag(2, 5), c: 'green' },
      f: { v: ['"v"', '"-"'], r: step },
      y: { v: ['--*', '-*-'], r: lag(wag(2, 5), 2), c: 'green' },
    },
    moods: {
      pet: { b: 1, l: 1, r: 1, u: 1 },
      poke: { e: 1, l: fast(1, 2), r: fast(2, 1), f: 1 },
      asleep: { b: 0, e: 0, l: 0, r: 0, u: 0, f: 0, x: 0, y: 0 },
    },
  },
  'penguin:rare': {
    rows: [BLANK, '   {h}    ', '   ({E}{b}{E})    ', '  {l}({s}){r}{k}  ', '   {f}    '],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      l: { v: ['/', '|'], r: breathe },
      r: { v: ['\\', '|'], r: lag(breathe, 1) },
      s: { v: ['===', '=-='], r: breathe, c: 'red' },
      k: { v: ['~', '/', '_'], r: wag(3, 2), c: 'red' },
      f: { v: ["`---'", "`--^'", "^---'"], r: step },
    },
    moods: { pet: { l: 1, r: 1, b: 1, k: 1 }, poke: { h: 1, l: fast(0, 1), r: fast(1, 0), k: 2 }, asleep: { h: 0, l: 1, r: 1, s: 0, k: 2, f: 0 } },
  },
  'penguin:epic': {
    rows: [BLANK, '  {h}   ', '  ({k}{E}{b}{E}{q})   ', '{l}({s}){r}{z}', '  {f}   '],
    parts: {
      h: { v: ['.-----.', '.--~--.', '.--^--.'], r: tuft },
      k: { v: ['~', '-'], r: wag(2, 4), c: 'yellow' },
      q: { v: ['~', '-'], r: lag(wag(2, 4), 1), c: 'yellow' },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      l: { v: ['_/', ' /', ' |'], r: wag(3, 3) },
      r: { v: ['\\_', '\\ ', '| '], r: lag(wag(3, 3), 1) },
      s: { v: ['=====', '==-=='], r: breathe, c: 'red' },
      z: { v: ['~', '/', '_'], r: wag(3, 2), c: 'red' },
      f: { v: ["`--^--'", "`-^-^-'"], r: step },
    },
    moods: {
      pet: { l: 0, r: 0, b: 1, k: 0, q: 0, z: 1 },
      poke: { h: 2, l: fast(1, 2), r: fast(2, 1), z: fast(0, 2), f: 1 },
      asleep: { h: 0, l: 2, r: 2, k: 1, q: 1, s: 0, z: 2, f: 0 },
    },
  },
  'turtle:rare': {
    rows: [BLANK, ' _.{p}._   ', '{s}({E}{E})', "{u}__/  ", '{t}{f}'],
    parts: {
      p: { v: ['----', '-~~-'], r: wag(2, 5) },
      s: { v: ['/\\_/\\_/\\', '/\\_/^\\_/'], r: special, c: 'green' },
      u: { v: ['\\_/\\_/\\', '\\_/v\\_/'], r: lag(special, 1), c: 'green' },
      t: { v: ['~', '-'], r: wag(2, 3) },
      f: { v: [' ""    ""  ', '  ""  ""   '], r: step },
    },
    moods: { pet: { p: 1, t: fast(0, 1) }, poke: { s: 1, u: 1, f: fast(0, 1) }, asleep: { p: 0, t: 1, f: 1 } },
  },
  'turtle:epic': {
    rows: [BLANK, '{p}', '{s}({E}{E})', "{u}__/  ", '{t}{f}'],
    parts: {
      p: { v: [' _,*~^~*,   ', ' _,^*~*^,   '], r: wag(2, 4), c: 'green' },
      s: { v: ['/\\_/\\_/\\', '/\\_/^\\_/', '/\\/\\/\\/\\'], r: (t, w) => (special(t, w) ? 1 : wag(2, 6)(t, w) * 2), c: 'green' },
      u: { v: ['\\_/\\_/\\', '\\_/v\\_/', '\\/\\/\\/\\'], r: lag((t, w) => (special(t, w) ? 1 : wag(2, 6)(t, w) * 2), 1), c: 'green' },
      t: { v: ['~', '-'], r: wag(2, 3) },
      f: { v: [' WW    WW  ', '  WW  WW   '], r: step },
    },
    moods: { pet: { p: 1, s: 2, u: 2, t: fast(0, 1) }, poke: { s: 1, u: 1, f: fast(0, 1) }, asleep: { p: 0, s: 0, u: 0, t: 1, f: 1 } },
  },
  'snail:rare': {
    rows: [BLANK, ' .---.  {a} ', '( ({c}) ) {k}  ', " `---'___/  ", '{f}'],
    parts: {
      a: { v: ['{E} {E}', ' {E}{E}', '{E}{E} '], r: wag(3, 3) },
      k: { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) },
      c: { v: ['@', 'o', '0'], r: special, c: 'yellow' },
      f: { v: ['(_________) ', '(_________)~'], r: step },
    },
    moods: { pet: { c: 2, a: 1, k: 1 }, poke: { a: 1, k: 1, c: 1, f: 1 }, asleep: { c: 0, a: 2, k: 2, f: 0 } },
  },
  'snail:epic': {
    rows: [BLANK, '{g} {a}', '(({c})) {k} ', "{h}___/  ", '{f}'],
    parts: {
      g: { v: [' .*-*. ', ' .-*-. ', ' *---* '], r: wag(3, 3), c: 'cyan' },
      a: { v: ['{E} {E} ', ' {E}{E} ', '{E}{E}  '], r: wag(3, 3) },
      k: { v: ['\\/ ', '|| ', '// '], r: lag(wag(3, 3), 1) },
      c: { v: ['(@)', '(o)', '(*)'], r: special, c: 'yellow' },
      h: { v: [" `*-*'", " `-*-'", " `*-*'"], r: lag(wag(3, 3), 1), c: 'cyan' },
      f: { v: ['(_________)*', '(_________)~', '(_________) '], r: (t, w) => (w ? t % 3 : wag(3, 2)(t, w)) },
    },
    moods: { pet: { c: 2, a: 1, k: 1, g: 2 }, poke: { a: 1, k: 1, c: 1, f: fast(0, 1) }, asleep: { c: 0, a: 2, k: 2, g: 0, h: 0, f: 2 } },
  },
  'ghost:rare': {
    rows: [BLANK, '    .-.     ', '   ({E} {E})    ', ' {k}-| {m} \\{a}  ', '    {t}  '],
    parts: {
      k: { v: ['*', '+'], r: wag(2, 3), c: 'yellow' },
      m: { v: ['O', 'o', '-', 'w'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1, k: 0 }, poke: { m: 0, k: fast(0, 1), t: fast(0, 1) }, asleep: { m: 2, a: 0, t: 0, k: 1 } },
  },
  'ghost:epic': {
    rows: [BLANK, '   .-""-.   ', '  ( {E}  {E} )  ', '{k}-|  {m}  \\{a}', '   \\{t} '],
    parts: {
      k: { v: ['*', '+'], r: wag(2, 3), c: 'yellow' },
      m: { v: ['O ', 'oo', '--', 'ww'], r: special },
      a: { v: ['  ', ' ~', '~ '], r: wag(3, 2) },
      t: { v: ["_~~~-~'", "_~~-~~'", "_~-~~~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1, k: 0 }, poke: { m: 0, k: fast(0, 1), t: fast(0, 1), a: fast(0, 2) }, asleep: { m: 2, a: 0, t: 0, k: 1 } },
  },
  'axolotl:rare': {
    rows: [BLANK, '{a} .--. {b}', '{c}( {E}  {E} ){d}', ' {e}( {m} ){f} ', "  `-^--^-'{t}"],
    parts: {
      a: { v: [' \\\\', ' \\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['// ', './ '], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['=<', '~<'], r: wag(2, 3), c: 'magenta' },
      d: { v: ['>=', '>~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      e: { v: ['//', "/'"], r: wag(2, 2), c: 'magenta' },
      f: { v: ['\\\\', "'\\"], r: lag(wag(2, 2), 1), c: 'magenta' },
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      t: { v: ['~>', '~-', '-~'], r: wag(3, 2) },
    },
    moods: { pet: { m: 3, a: fast(0, 1), b: fast(0, 1), t: 0 }, poke: { m: 2, c: 1, d: 1, e: 1, f: 1, t: fast(1, 2) }, asleep: { m: 1, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, t: 1 } },
  },
  'axolotl:epic': {
    rows: ['{o}', '{a}.-ww-.{b}', '{c}( {E}  {E} ){d}', '{e}(*{m}*){f}', " ~`-^--^-'{t}"],
    parts: {
      o: { v: [BLANK, '     o      ', '      O  o  '], r: special, c: 'cyan' },
      a: { v: ['\\\\\\', '\\\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['///', './/'], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['=<', '~<'], r: wag(2, 3), c: 'magenta' },
      d: { v: ['>=', '>~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      e: { v: [' //', " /'"], r: wag(2, 2), c: 'magenta' },
      f: { v: ['\\\\ ', "'\\ "], r: lag(wag(2, 2), 1), c: 'magenta' },
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      t: { v: ['~>', '~-', '-~'], r: wag(3, 2) },
    },
    moods: {
      pet: { m: 3, a: fast(0, 1), b: fast(0, 1), o: 1, t: 0 },
      poke: { m: 2, o: fast(1, 2), c: 1, d: 1, e: 1, f: 1, t: fast(1, 2) },
      asleep: { m: 1, o: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, t: 1 },
    },
  },
  'capybara:rare': {
    rows: ['{s}', '  {e}.{k}.{f}  ', ' ( {E}    {E} ) ', ' (  ({n})  ) ', '{w}'],
    parts: {
      s: { v: [BLANK, '  ~      ~  ', '   ~    ~   '], r: special, c: 'white' },
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      k: { v: ['====', '=-=='], r: breathe, c: 'white' },
      n: { v: ['..', 'oo', '::'], r: special },
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 0, s: 1 }, poke: { n: 1, k: 1, w: fast(1, 2), e: fast(0, 1) }, asleep: { e: 1, f: 1, n: 2, s: 0, w: 0 } },
  },
  'capybara:epic': {
    rows: ['{s}', '  {e}.={y}=.{f}  ', ' ( {E}    {E} ) ', ' (  ({n})  ) ', '{w}{u}{x}'],
    parts: {
      s: { v: [BLANK, ' ~        ~ ', '  ~      ~  '], r: special, c: 'white' },
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      y: { v: ['()', '()'], r: () => 0, c: 'yellow' },
      n: { v: ['..', 'oo', '::'], r: special },
      w: { v: ['~~~~~~~~', '-~~~-~~~', '~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
      u: { v: ['()', 'o)'], r: lag(wag(2, 3), 1), c: 'yellow' },
      x: { v: ['~~', '-~', '~-'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 0, s: 1 }, poke: { n: 1, u: 1, w: fast(1, 2), x: fast(1, 2), e: fast(0, 1) }, asleep: { e: 1, f: 1, n: 2, s: 0, w: 0, x: 0, u: 0 } },
  },
  'cactus:rare': {
    rows: [BLANK, '{a} .{k}. {b}', '{c}|{E}  {E}|{d}', '{e}| {m} |{f}', '{s}|____|{t}'],
    parts: {
      ...arms,
      k: { v: ['**', '*-'], r: twitch(6, 7), c: 'magenta' },
      m: { v: ['  ', 'ww', 'oo', '--'], r: special },
      s: { v: [' ~ ', '~  '], r: wag(2, 4), c: 'yellow' },
      t: { v: [' ~ ', '  ~'], r: wag(2, 4), c: 'yellow' },
    },
    moods: { pet: { ...ARMS(0), m: 1, k: 0 }, poke: { ...ARMS(1), m: 2, k: 1 }, asleep: { ...ARMS(2), m: 3, k: 1, s: 0, t: 0 } },
  },
  'cactus:epic': {
    rows: [BLANK, '{a}{k}{b}', '{c}|{E}  {E}|{d}', '{e}| {m} |{f}', '  {p}  '],
    parts: {
      ...arms,
      k: { v: ['(@**@)', '(@*-@)', '(*@@*)'], r: (t, w) => (special(t, w) ? 2 : twitch(6, 7)(t, w)), c: 'magenta' },
      m: { v: ['  ', 'ww', 'oo', '--'], r: special },
      p: { v: ['\\______/', '\\_.__._/'], r: breathe, c: 'red' },
    },
    moods: { pet: { ...ARMS(0), m: 1, k: 2 }, poke: { ...ARMS(1), m: 2, k: 1 }, asleep: { ...ARMS(2), m: 3, k: 1, p: 0 } },
  },
  'robot:rare': {
    rows: [BLANK, '  .\\----/.  ', '  |[{E}  {E}]|  ', '  |[ {m} ]|  ', ' [{k}] '],
    parts: {
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      k: { v: ['::::::::', ':.:::::.', '::.::.::'], r: typing },
    },
    moods: { pet: { m: 3, k: 0 }, poke: { m: 2, k: fast(1, 2) }, asleep: { m: 1, k: 0 } },
  },
  'robot:epic': {
    rows: ['{s}', '  .\\----/.  ', '  |[{E}  {E}]|  ', '{a}|[ {m} ]|{b}', ' [{k}] '],
    parts: {
      s: { v: [BLANK, '   ((  ))   ', '  ((    ))  '], r: special, c: 'cyan' },
      a: { v: ['o_', 'o-', 'o.'], r: typing },
      b: { v: ['_o', '-o', '.o'], r: (t, w) => typing(t + 1, w) },
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      k: { v: ['::::::::', ':.:::::.', '::.::.::'], r: typing },
    },
    moods: { pet: { m: 3, k: 0, a: 0, b: 0, s: 2 }, poke: { m: 2, k: fast(1, 2), a: fast(0, 1), b: fast(1, 0), s: fast(1, 2) }, asleep: { m: 1, k: 0, a: 0, b: 0, s: 0 } },
  },
  'rabbit:rare': {
    rows: [BLANK, '   {l}{r}     ', '  {x}( {E}{n}{E}){y}  ', '   {t}(")(") ', '  {g}  '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      x: { v: ['=', '-'], r: twitch(8, 9) },
      y: { v: ['=', '-'], r: twitch(8, 9) },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
      g: { v: ["_,_''_,_", "_'_,,_'_"], r: wag(2, 4), c: 'green' },
    },
    moods: {
      pet: { l: 2, r: 2, n: 2, t: fast(0, 2) },
      poke: { l: 1, r: 1, n: 1, t: 2, x: fast(0, 1), y: fast(0, 1) },
      asleep: { l: 2, r: 2, n: 0, t: 0, x: 0, y: 0, g: 0 },
    },
  },
  'rabbit:epic': {
    rows: ['{s}', ' {a} {l}{r}  {b}  ', '  {x}( {E}{n}{E}){y}  ', '   {t}(")(") ', ' {g}{k}{c} '],
    parts: {
      s: { v: [BLANK, '  +      .  ', '  .      +  '], r: special, c: 'yellow' },
      a: { v: ['*', '.', '+'], r: wag(3, 3), c: 'yellow' },
      b: { v: ['+', '*', '.'], r: wag(3, 3), c: 'yellow' },
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: lag(twitch(3, 4), 1) },
      x: { v: ['=', '-'], r: twitch(8, 9) },
      y: { v: ['=', '-'], r: twitch(8, 9) },
      n: { v: ['.', 'x', 'w'], r: special, c: 'magenta' },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
      g: { v: ["_,_''", "_'_,,"], r: wag(2, 4), c: 'green' },
      k: { v: ['}', '{'], r: lag(wag(2, 4), 1), c: 'green' },
      c: { v: ['===>', '==->'], r: wag(2, 5), c: 'yellow' },
    },
    moods: {
      pet: { l: 2, r: 2, n: 2, s: 1, a: 0, t: fast(0, 2) },
      poke: { l: 1, r: 1, n: 1, t: 2, k: fast(0, 1), x: fast(0, 1), y: fast(0, 1) },
      asleep: { l: 2, r: 2, n: 0, t: 0, x: 0, y: 0, s: 0, a: 1, g: 0, k: 0, c: 0 },
    },
  },
  'mushroom:rare': {
    rows: ['{s}', ' .-{c}-. ', "`-.______.-'", '{b}({E}{m}{E})   ', ' {a} {g}   '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O-o', 'O-o--O'], r: wag(2, 4), c: 'red' },
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
      b: { v: [' n ', ' n.'], r: lag(wag(2, 4), 1), c: 'red' },
      a: { v: ['|', '!'], r: lag(wag(2, 4), 1) },
      g: { v: ['(____)', '(_/\\_)'], r: step },
    },
    moods: {
      pet: { s: 2, c: 1, m: 1, b: 1 },
      poke: { s: fast(1, 2), c: fast(0, 1), m: 2, g: 1, b: fast(0, 1) },
      asleep: { s: 0, c: 0, m: 0, g: 0, b: 0, a: 0 },
    },
  },
  'mushroom:epic': {
    rows: ['{s}', ' .-{c}-. ', '{k}', '{b}({E}{m}{E}){d}', '{a}{g}{h}'],
    parts: {
      s: { v: [BLANK, '  *  .  o   ', '   o  *  .  '], r: special, c: 'yellow' },
      c: { v: ['o-@@-o', 'O-@@-O'], r: wag(2, 4), c: 'magenta' },
      k: { v: ["`-.______.-'", "`-._.--._.-'"], r: lag(wag(2, 4), 1) },
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
      b: { v: [' n ', ' n.'], r: lag(wag(2, 4), 1), c: 'red' },
      d: { v: [' n ', '.n '], r: lag(wag(2, 4), 2), c: 'red' },
      a: { v: ['_|_', '_!_'], r: lag(wag(2, 4), 1) },
      h: { v: ['_|_', '_!_'], r: lag(wag(2, 4), 2) },
      g: { v: ['(____)', '(_/\\_)'], r: step },
    },
    moods: {
      pet: { s: 2, c: 1, k: 1, m: 1, b: 1, d: 1 },
      poke: { s: fast(1, 2), c: fast(0, 1), m: 2, g: 1, k: fast(0, 1) },
      asleep: { s: 0, c: 0, k: 0, m: 0, g: 0, b: 0, d: 0, a: 0, h: 0 },
    },
  },
  'chonk:rare': {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{m}{E} ){s}. ', ' ( {x}    ){t}', '  {p}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      s: { v: [',,,', ',,,'], r: () => 0, c: 'yellow' },
      x: { v: ['//', '/,'], r: lag(wag(2, 4), 1), c: 'yellow' },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { m: 1, t: fast(0, 1), x: 1 }, poke: { a: 2, b: 2, m: 3, p: 1 }, asleep: { m: 0, a: 0, b: 0, t: 2, p: 0, x: 0 } },
  },
  'chonk:epic': {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{m}{E} ){s}. ', ' ( {x}    ){t}', '{c}'],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      s: { v: [',,,', ',,,'], r: () => 0, c: 'yellow' },
      x: { v: ['//', '/,'], r: lag(wag(2, 4), 1), c: 'yellow' },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      c: { v: ['(=uu==uu==)Y', '(=u=u=uu==)Y'], r: step, c: 'magenta' },
    },
    moods: { pet: { m: 1, t: fast(0, 1), x: 1 }, poke: { a: 2, b: 2, m: 3, c: 1 }, asleep: { m: 0, a: 0, b: 0, t: 2, x: 0, c: 0 } },
  },
  'imp:rare': {
    rows: [BLANK, '{f}{h} ', ' {k} ( {E}  {E} ) ', ' {k}  ( {m} ){t}', ' {k}   {d}   '],
    parts: {
      f: { v: ['\\|/', '\\+/'], r: twitch(7, 17), c: 'yellow' },
      k: { v: ['|'], r: () => 0, c: 'yellow' },
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~>', '_>', '-^'], r: wag(3), c: 'red' },
      d: { v: ['v  v', ' vv '], r: step },
    },
    moods: { pet: { h: 1, m: 1, f: 1, t: fast(0, 1) }, poke: { h: 1, m: 2, t: 2, d: 1 }, asleep: { h: 0, m: 3, f: 0, t: 1, d: 0 } },
  },
  'imp:epic': {
    rows: [BLANK, '{a}{h}{b}', '{c}( {E}  {E} ){d}', '   ( {m} ){t}', '    {g}{u}'],
    parts: {
      a: { v: ['/\\', '/|', '__'], r: wag(3, 3) },
      b: { v: ['/\\', '|\\', '__'], r: wag(3, 3) },
      h: { v: ['(\\ ^^ /)', '(| ^^ |)'], r: twitch(3, 13), c: 'red' },
      c: { v: ['\\_', '\\/', ' \\'], r: lag(wag(3, 3), 1) },
      d: { v: ['_/', '\\/', '/ '], r: lag(wag(3, 3), 1) },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~\\ ', '~/ ', '~~ '], r: wag(3), c: 'red' },
      g: { v: ['W  W', ' WW '], r: step },
      u: { v: [' _\\>', ' _/>', '  ~>'], r: lag(wag(3), 2), c: 'red' },
    },
    moods: {
      pet: { h: 1, m: 1, a: fast(0, 1), b: fast(0, 1) },
      poke: { h: 1, m: 2, a: 0, b: 0, c: fast(0, 1), d: fast(0, 1) },
      asleep: { m: 3, a: 2, b: 2, c: 2, d: 2, t: 2, u: 2, g: 0 },
    },
  },
  'bat:rare': {
    rows: [BLANK, '{l}{f}{r}', '  {a}({w}){b}  ', '   ({E}  {E})   ', '    {e}    '],
    parts: {
      l: { v: ['_____', '__,__'], r: wag(2, 5), c: 'green' },
      r: { v: ['__.__', '_____'], r: wag(2, 5), c: 'green' },
      f: { v: ['""', "''"], r: step },
      a: { v: [' ', '/'], r: wag(2, 3) },
      b: { v: [' ', '\\'], r: lag(wag(2, 3), 1) },
      w: { v: ['\\  /', '|  |', '\\__/'], r: wag(2, 4) },
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { w: 2, a: 1, b: 1, f: fast(0, 1) }, poke: { w: 1, e: 1, a: 1, b: 1 }, asleep: { w: 2, a: 0, b: 0, e: 0, f: 0 } },
  },
  'bat:epic': {
    rows: [BLANK, '{l}{f}{r}', '{a}({w}){b}', '{c}({E}  {E}){d}', '    {e}    '],
    parts: {
      l: { v: ['__,__', '_,___'], r: wag(2, 5), c: 'green' },
      r: { v: ['__.__', '___._'], r: wag(2, 5), c: 'green' },
      f: { v: ['""', "''"], r: step },
      a: { v: ['/\\/', '/\\_', '_/\\'], r: wag(3, 2) },
      b: { v: ['\\/\\', '_/\\', '/\\_'], r: wag(3, 2) },
      c: { v: ['\\ \\', ' \\ ', '\\  '], r: lag(wag(3, 2), 1) },
      d: { v: ['/ /', ' / ', '  /'], r: lag(wag(3, 2), 1) },
      w: { v: ['\\  /', '|  |', '\\__/'], r: wag(2, 4), c: 'red' },
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: {
      pet: { w: 2, a: 1, b: 1, f: fast(0, 1) },
      poke: { w: 1, e: 1, a: fast(0, 2), b: fast(0, 2) },
      asleep: { w: 2, a: 2, b: 2, c: 0, d: 0, e: 0, f: 0 },
    },
  },
  'skeleton:rare': {
    rows: [BLANK, '   ({E}  {E})   ', '    \\{m}/    ', '{k}{a}(={r}=){b}{j}', '   {l}   '],
    parts: {
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      k: { v: ['o', '0', ' '], r: fast(0, 1), c: 'yellow' },
      j: { v: ['o', '0', ' '], r: fast(1, 0), c: 'yellow' },
      a: { v: ['\\_', '__', ' /'], r: wag(3, 2) },
      b: { v: ['_/', '__', '\\ '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: {
      pet: { m: 1, a: 0, b: 0, k: fast(0, 1), j: fast(1, 0), l: fast(1, 2) },
      poke: { m: 2, r: 1, a: 2, b: 2, k: 2, j: 2 },
      asleep: { m: 3, a: 2, b: 2, k: 2, j: 2, r: 0, l: 0 },
    },
  },
  'skeleton:epic': {
    rows: [BLANK, '{f}({E}  {E}){g}', '  {h}\\{m}/{i}  ', '{k}{a}(={r}=){b}{j}', '   {l}   '],
    parts: {
      f: { v: [' *@', '*@ ', ' @*'], r: wag(3, 3), c: 'yellow' },
      g: { v: ['@* ', ' @*', '*@ '], r: lag(wag(3, 3), 1), c: 'yellow' },
      h: { v: ['* ', ' *'], r: wag(2, 3), c: 'magenta' },
      i: { v: [' *', '* '], r: lag(wag(2, 3), 1), c: 'magenta' },
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4), c: 'cyan' },
      k: { v: ['o', '0', ' '], r: fast(0, 1), c: 'yellow' },
      j: { v: ['o', '0', ' '], r: fast(1, 0), c: 'yellow' },
      a: { v: ['\\_', '__', ' /'], r: wag(3, 2) },
      b: { v: ['_/', '__', '\\ '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: {
      pet: { m: 1, a: 0, b: 0, k: fast(0, 1), j: fast(1, 0), l: fast(1, 2) },
      poke: { m: 2, r: 1, a: 2, b: 2, k: 2, j: 2, f: 1, g: 1 },
      asleep: { m: 3, a: 2, b: 2, k: 2, j: 2, r: 0, l: 0, f: 0, g: 0, h: 0, i: 0 },
    },
  },
  'duck:legendary': {
    rows: [BLANK, '    {z}{c}  {q} ', ' {w}( {E}){b}  ', ' {k}\\ {g}. )   ', "{x}`---'{y}"],
    parts: {
      z: glint(0),
      q: glint(5),
      c: { v: [',^,', '^,^', ',^^'], r: wag(3, 2), c: 'red' },
      w: { v: ['~^^_', '^~^_', '^^~_'], r: wag(3, 2), c: 'red' },
      b: { v: ['>', '='], r: special, c: 'yellow' },
      k: { v: ['<', '{'], r: lag(flap, 1), c: 'red' },
      g: { v: ['<_', '<-'], r: flap, c: 'red' },
      x: { v: ['^,^,', ',^,^', '^^,,'], r: wag(3, 2), c: 'red' },
      y: { v: [',^,', '^,^', ',,^'], r: lag(wag(3, 2), 1), c: 'red' },
    },
    moods: {
      pet: { c: 2, g: 1, k: 1, x: fast(0, 1) },
      poke: { b: 1, w: 1, g: fast(0, 1), k: fast(1, 0) },
      asleep: { b: 0, g: 0, k: 0, w: 0, c: 0, x: 0, y: 0 },
    },
  },
  'goose:legendary': {
    rows: [BLANK, ' {c}{b}{E} ){a}', '{g}   ) ){w}', '{e}( {k}) ', "{x}`----'{y}"],
    parts: {
      c: glint(0),
      g: glint(6),
      b: { v: ['<', '='], r: special, c: 'yellow' },
      a: { v: ['   /\\ ', '  /\\/\\', '  //\\\\'], r: (t, w) => (flap(t, w) ? 1 + (t % 2) : 0) },
      w: { v: ['/\\/\\/', '/\\/\\_', '_/\\/\\'], r: wag(3, 3) },
      e: { v: [' O ', ' 0 ', '(O)'], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'yellow' },
      k: { v: ['`-._ ', '`-.__', '`--._'], r: lag(wag(3, 3), 1) },
      x: { v: ['~~~~', ' ~~~', '~ ~~'], r: wag(3, 2), c: 'cyan' },
      y: { v: ['~~', '~ ', ' ~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: {
      pet: { a: 1, e: 2, w: 2, x: fast(0, 1) },
      poke: { a: fast(1, 2), b: 1, w: fast(0, 2), k: fast(0, 1) },
      asleep: { a: 0, b: 0, e: 0, w: 0, k: 0, x: 0, y: 0 },
    },
  },
  'blob:legendary': {
    rows: [BLANK, '  {p}{a}{q}  ', "  .'{E}  {E}'.  ", ' {x}(  {m}  ){y} ', '({b})'],
    parts: {
      p: glint(0),
      q: glint(6),
      a: { v: ['.^^^^.', '.^**^.'], r: breathe, c: 'yellow' },
      x: { v: [' ', '.', ':'], r: lag(wag(3, 2), 1) },
      y: { v: [':', '.', ' '], r: lag(wag(3, 2), 2) },
      m: { v: ['  ', 'ww', 'o ', 'uu'], r: special },
      b: { v: ['_.-~~~~-._', '__.-~~-.__', '~._.--._.~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: {
      pet: { m: 3, a: 1, b: 1 },
      poke: { m: 2, a: 1, b: fast(1, 2), x: fast(1, 2) },
      asleep: { m: 0, a: 0, x: 0, y: 2, b: 0 },
    },
  },
  'cat:legendary': {
    rows: [BLANK, '  {e} {g} ', '  ( {E}.{E} ){u}', '  =(_{b}_)= {k}', '  {p}{t}'],
    parts: {
      e: { v: [',/\\_/\\,', ',/\\-/\\,', ',/|_/\\,', '-/\\_/\\-'], r: ears },
      g: glint(3),
      u: { v: ['\\|/', '\\\\|', '|//'], r: wag(3), c: 'yellow' },
      b: { v: ['*', 'o'], r: special, c: 'yellow' },
      k: { v: [')/', '|/', '\\|'], r: lag(wag(3), 1) },
      t: { v: ['_/ ', '_| ', '_) '], r: lag(wag(3), 2) },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
    },
    moods: { pet: { e: 0, b: 1, u: fast(0, 2), k: 0 }, poke: { e: 3, b: 1, k: 1, t: 1, p: 1 }, asleep: { e: 3, b: 0, u: 0, k: 0, t: 0, p: 0 } },
  },
  'dragon:legendary': {
    rows: ['{s}', '{a}/)____(\\{b}', '{l}( {E}    {E} ){r}', '{c} \\ {n} / {d}', " `-\\_{f}_/-' "],
    parts: {
      s: { v: [BLANK, '   ^ ^^ ^   ', '  ^^ ^  ^^  '], r: special, c: 'red' },
      a: { v: ['/|', '_|', '\\|'], r: wag(3, 3), c: 'yellow' },
      b: { v: ['|\\', '|_', '|/'], r: wag(3, 3), c: 'yellow' },
      l: { v: ['/', '|', '\\'], r: lag(wag(3, 3), 1) },
      r: { v: ['\\', '|', '/'], r: lag(wag(3, 3), 1) },
      c: glint(0),
      d: glint(6),
      n: { v: ["'..'", "'oo'"], r: breathe },
      f: { v: ['VV', 'vv', '^^'], r: (t, w) => (special(t, w) ? 2 : step(t, w)), c: 'red' },
    },
    moods: {
      pet: { s: 0, n: 1, f: 0, a: 1, b: 1, l: 1, r: 1 },
      poke: { s: fast(1, 2), n: 1, f: 2, a: fast(0, 2), b: fast(0, 2), l: fast(0, 2), r: fast(0, 2) },
      asleep: { s: 0, n: 0, f: 1, a: 1, b: 1, l: 1, r: 1 },
    },
  },
  'octopus:legendary': {
    rows: ['{o}', '{a}.-{d}-.{b}', '(( {E}    {E} ))', ' {t} ', '{u}'],
    parts: {
      o: { v: [BLANK, ' ,        , ', '  ~      ~  '], r: wag(3, 3), c: 'magenta' },
      a: { v: [' \\\\', ' ||', ' //'], r: wag(3, 3), c: 'magenta' },
      b: { v: ['// ', '|| ', '\\\\ '], r: lag(wag(3, 3), 1), c: 'magenta' },
      d: { v: ['oo', '"o', 'o"'], r: wag(3, 4), c: 'yellow' },
      t: { v: ['\\`)/\\/\\(`/', '/`)\\/\\/(`\\'], r: wag(2, 3), c: 'magenta' },
      u: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: {
      pet: { o: 0, a: 1, b: 1, d: 0, t: 1 },
      poke: { o: fast(1, 2), a: fast(0, 2), b: fast(2, 0), t: fast(0, 1), u: fast(1, 2) },
      asleep: { o: 0, a: 1, b: 1, d: 0, t: 0, u: 0 },
    },
  },
  'owl:legendary': {
    rows: [BLANK, '{m}{e} {g} ', '{l}(({E}{b}{E})){r} ', ' {k}(:{u}:){j}  ', ' {x}{f}{y}  '],
    parts: {
      m: { v: [' C'], r: () => 0, c: 'yellow' },
      e: { v: ['\\,___,/', '|,___,/', '\\,___,|'], r: tufts },
      g: glint(4),
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      l: { v: ['\\\\', '__', '  '], r: (t, w) => (flap(t, w) ? 1 + (t % 2) : 0) },
      r: { v: ['//', '__', '  '], r: lag((t, w) => (flap(t, w) ? 1 + (t % 2) : 0), 1) },
      k: { v: ['\\(', '//', '_('], r: (t, w) => (flap(t, w) ? 1 + (t % 2) : 0) },
      j: { v: [')/', '\\\\', ')_'], r: lag((t, w) => (flap(t, w) ? 1 + (t % 2) : 0), 1) },
      u: { v: ['V', 'v'], r: breathe },
      x: { v: ['*--', '-*-'], r: wag(2, 5), c: 'yellow' },
      f: { v: ['"v"', '"-"'], r: step },
      y: { v: ['--*', '-*-'], r: lag(wag(2, 5), 2), c: 'yellow' },
    },
    moods: {
      pet: { b: 1, l: 1, r: 1, k: 1, j: 1, u: 1 },
      poke: { e: 1, l: fast(1, 2), r: fast(2, 1), k: fast(1, 2), j: fast(2, 1), f: 1 },
      asleep: { b: 0, e: 0, l: 2, r: 2, k: 0, j: 0, u: 0, f: 0, x: 0, y: 0 },
    },
  },
  'penguin:legendary': {
    rows: [BLANK, '{g} {h} {i} ', '  ({k}{E}{b}{E}{q})   ', '{l}({s}){r}{z}', '{w}{f}{v}'],
    parts: {
      g: glint(0),
      i: glint(6),
      h: { v: ['.-----.', '.--~--.', '.--^--.'], r: tuft },
      k: { v: ['~', '-'], r: wag(2, 4), c: 'yellow' },
      q: { v: ['~', '-'], r: lag(wag(2, 4), 1), c: 'yellow' },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      l: { v: ['_/', ' /', ' |'], r: wag(3, 3) },
      r: { v: ['\\_', '\\ ', '| '], r: lag(wag(3, 3), 1) },
      s: { v: ['=====', '==-=='], r: breathe, c: 'red' },
      z: { v: ['~', '/', '_'], r: wag(3, 2), c: 'red' },
      w: { v: ['~~', '~-', '-~'], r: wag(3, 2), c: 'cyan' },
      f: { v: ['\\_^^_^_/', '\\_^_^^_/'], r: step, c: 'cyan' },
      v: { v: ['~~', '-~', '~-'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: {
      pet: { l: 0, r: 0, b: 1, k: 0, q: 0, z: 1 },
      poke: { h: 2, l: fast(1, 2), r: fast(2, 1), z: fast(0, 2), f: 1 },
      asleep: { h: 0, l: 2, r: 2, k: 1, q: 1, s: 0, z: 2, f: 0, w: 0, v: 0 },
    },
  },
  'turtle:legendary': {
    rows: [BLANK, '{p}', '{s}({E}{E})', "{u}__/  ", '{t}{f}'],
    parts: {
      p: { v: [' _,\\|/^*,   ', ' _,/|\\^*,   ', ' _,\\|\\*^,   '], r: wag(3, 4), c: 'green' },
      s: { v: ['/\\_/\\_/\\', '/\\_/*\\_/', '/\\/\\/\\/\\'], r: (t, w) => (special(t, w) ? 1 : wag(2, 6)(t, w) * 2) },
      u: { v: ['\\_/\\_/\\', '\\_/*\\_/', '\\/\\/\\/\\'], r: lag((t, w) => (special(t, w) ? 1 : wag(2, 6)(t, w) * 2), 1) },
      t: { v: ['~', '-'], r: wag(2, 3) },
      f: { v: [' WW    WW  ', '  WW  WW   '], r: step },
    },
    moods: { pet: { p: 1, s: 2, u: 2, t: fast(0, 1) }, poke: { p: 2, s: 1, u: 1, f: fast(0, 1) }, asleep: { p: 0, s: 0, u: 0, t: 1, f: 1 } },
  },
  'snail:legendary': {
    rows: [BLANK, ' {x}_/^\\_  {a}', ' |{c}  {c}| {k} ', " `-{d}-'___/ ", '{f}'],
    parts: {
      x: glint(2),
      a: { v: ['{E} {E}', ' {E}{E}', '{E}{E} '], r: wag(3, 3) },
      c: { v: ['o', '.'], r: breathe, c: 'yellow' },
      k: { v: ['\\/ ', '|| ', '// '], r: lag(wag(3, 3), 1) },
      d: { v: ['[]', '[)'], r: special, c: 'red' },
      f: { v: ['(_________)*', '(_________)~', '(_________) '], r: (t, w) => (w ? t % 3 : wag(3, 2)(t, w)) },
    },
    moods: { pet: { c: 0, a: 1, k: 1, d: 1 }, poke: { a: 1, k: 1, c: 1, f: fast(0, 1) }, asleep: { c: 1, a: 2, k: 2, d: 0, f: 2 } },
  },
  'ghost:legendary': {
    rows: [BLANK, '{w}  .-""-.  {v}', '{y} ( {E}  {E} ) {z}', '{k}-|  {m}  \\{a}', '   \\{t} '],
    parts: {
      w: { v: [' ', 'o'], r: t => +(Math.floor(t / 2) % 4 === 0), c: 'cyan' },
      v: { v: [' ', 'o'], r: t => +(Math.floor(t / 2) % 4 === 1), c: 'cyan' },
      z: { v: [' ', 'o'], r: t => +(Math.floor(t / 2) % 4 === 2), c: 'cyan' },
      y: { v: [' ', 'o'], r: t => +(Math.floor(t / 2) % 4 === 3), c: 'cyan' },
      k: { v: ['*', '+'], r: wag(2, 3), c: 'yellow' },
      m: { v: ['O ', 'oo', '--', 'ww'], r: special },
      a: { v: ['  ', ' ~', '~ '], r: wag(3, 2) },
      t: { v: ["_~~~-~'", "_~~-~~'", "_~-~~~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1, k: 0 }, poke: { m: 0, k: fast(0, 1), t: fast(0, 1), a: fast(0, 2) }, asleep: { m: 2, a: 0, t: 0, k: 1, w: 0, v: 0, y: 0, z: 0 } },
  },
  'axolotl:legendary': {
    rows: ['{o}', '{a}.-ww-.{b}', '{c}( {E}  {E} ){d}', '{e}(*{m}*){f}', " ~`-^--^-'{t}"],
    parts: {
      o: { v: [BLANK, '  +  o    . ', ' .    O  +  '], r: special, c: 'yellow' },
      a: { v: ['\\\\\\', '\\\\.'], r: wag(2, 2), c: 'red' },
      b: { v: ['///', './/'], r: lag(wag(2, 2), 1), c: 'red' },
      c: { v: ['=<', '~<'], r: wag(2, 3), c: 'red' },
      d: { v: ['>=', '>~'], r: lag(wag(2, 3), 1), c: 'red' },
      e: { v: ['/\\/', '\\/\\', '_/\\'], r: flap, c: 'white' },
      f: { v: ['\\/\\', '/\\/', '/\\_'], r: lag(flap, 1), c: 'white' },
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      t: { v: ['~>', '~-', '-~'], r: wag(3, 2), c: 'red' },
    },
    moods: {
      pet: { m: 3, a: fast(0, 1), b: fast(0, 1), o: 1, t: 0 },
      poke: { m: 2, o: fast(1, 2), c: 1, d: 1, e: 1, f: 1, t: fast(1, 2) },
      asleep: { m: 1, o: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, t: 1 },
    },
  },
  'capybara:legendary': {
    rows: ['{s}', '  {e}.={y}=.{f}  ', ' ( {E}    {E} ) ', '{g}(  ({n})  ){h}', '{l}{w}{r}'],
    parts: {
      s: { v: [BLANK, ' ~        ~ ', '  ~      ~  '], r: special, c: 'white' },
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      y: { v: ['()'], r: () => 0, c: 'yellow' },
      g: glint(0),
      h: glint(6),
      n: { v: ['..', 'oo', '::'], r: special },
      l: { v: ['\\Y/', '\\y/'], r: wag(2, 4), c: 'magenta' },
      w: { v: ['~~~~~~', '-~~~-~', '~-~~~-'], r: wag(3, 2), c: 'cyan' },
      r: { v: ['\\Y/', '\\y/'], r: lag(wag(2, 4), 1), c: 'magenta' },
    },
    moods: { pet: { e: 1, f: 1, n: 0, s: 1, l: 1, r: 1 }, poke: { n: 1, w: fast(1, 2), e: fast(0, 1) }, asleep: { e: 1, f: 1, n: 2, s: 0, w: 0, l: 0, r: 0 } },
  },
  'cactus:legendary': {
    rows: [BLANK, '{a}{k}{b}', '{c}|{E}  {E}|{d}', '{e}| {m} |{f}', '{g} {p} {h}'],
    parts: {
      ...arms,
      k: { v: [',@@@@,', '(@**@)', '\\@@@@/'], r: (t, w) => (special(t, w) ? 2 : twitch(6, 7)(t, w)), c: 'white' },
      m: { v: ['  ', 'ww', 'oo', '--'], r: special },
      g: { v: ['C'], r: () => 0, c: 'white' },
      h: glint(6),
      p: { v: ['\\______/', '\\_.__._/'], r: breathe, c: 'red' },
    },
    moods: { pet: { ...ARMS(0), m: 1, k: 2 }, poke: { ...ARMS(1), m: 2, k: 1 }, asleep: { ...ARMS(2), m: 3, k: 1, p: 0 } },
  },
  'robot:legendary': {
    rows: ['{s}', '{x} .\\----/. {y}', '{y} |[{E}  {E}]| {x}', '{a}|[ {m} ]|{b}', ' [{k}] '],
    parts: {
      s: { v: [BLANK, '   ((  ))   ', '  ((    ))  '], r: special, c: 'cyan' },
      x: { v: ['0', '1', ' '], r: wag(3, 1), c: 'green' },
      y: { v: ['1', ' ', '0'], r: lag(wag(3, 1), 1), c: 'green' },
      a: { v: ['o_', 'o-', 'o.'], r: typing },
      b: { v: ['_o', '-o', '.o'], r: (t, w) => typing(t + 1, w) },
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      k: { v: ['::::::::', ':.:::::.', '::.::.::'], r: typing },
    },
    moods: {
      pet: { m: 3, k: 0, a: 0, b: 0, s: 2 },
      poke: { m: 2, k: fast(1, 2), a: fast(0, 1), b: fast(1, 0), s: fast(1, 2) },
      asleep: { m: 1, k: 0, a: 0, b: 0, s: 0, x: 2, y: 1 },
    },
  },
  'rabbit:legendary': {
    rows: ['{s}', '  {a}{l}{r}{b}    ', '  {x}( {E}{n}{E}){y}  ', '   {t}(")(") ', ' {g}{k}{c} '],
    parts: {
      s: { v: [BLANK, '  +      .  ', '  .      +  '], r: special, c: 'yellow' },
      a: { v: ['Y', 'y', 'V'], r: wag(3, 4) },
      b: { v: ['Y', 'y', 'V'], r: lag(wag(3, 4), 1) },
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: lag(twitch(3, 4), 1) },
      x: { v: ['=', '-'], r: twitch(8, 9) },
      y: { v: ['=', '-'], r: twitch(8, 9) },
      n: { v: ['.', 'x', 'w'], r: special, c: 'magenta' },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
      g: { v: ["_,_''", "_'_,,"], r: wag(2, 4), c: 'green' },
      k: { v: ['}', '{'], r: lag(wag(2, 4), 1), c: 'green' },
      c: { v: ['===>', '==->'], r: wag(2, 5), c: 'yellow' },
    },
    moods: {
      pet: { l: 2, r: 2, n: 2, s: 1, a: 1, b: 1, t: fast(0, 2) },
      poke: { l: 1, r: 1, n: 1, t: 2, a: 2, b: 2, k: fast(0, 1), x: fast(0, 1), y: fast(0, 1) },
      asleep: { l: 2, r: 2, n: 0, t: 0, x: 0, y: 0, s: 0, a: 0, b: 0, g: 0, k: 0, c: 0 },
    },
  },
  'mushroom:legendary': {
    rows: ['{s}', ' .-{c}-. ', '{k}', '{b}({E}{m}{E}){d}', '{a}(_{g}_){h}'],
    parts: {
      s: { v: [BLANK, '  *  .  o   ', '   o  *  .  '], r: special, c: 'yellow' },
      c: { v: ['o-[]-O', 'O-[]-o'], r: wag(2, 4), c: 'red' },
      k: { v: ["`-.______.-'", "`-._.--._.-'"], r: lag(wag(2, 4), 1) },
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
      b: { v: [' n ', ' n.'], r: lag(wag(2, 4), 1), c: 'red' },
      d: { v: [' n ', '.n '], r: lag(wag(2, 4), 2), c: 'red' },
      a: { v: ['_|_', '_!_'], r: lag(wag(2, 4), 1) },
      h: { v: ['_|_', '_!_'], r: lag(wag(2, 4), 2) },
      g: { v: ['[]', '[)'], r: step, c: 'yellow' },
    },
    moods: {
      pet: { s: 2, c: 1, k: 1, m: 1, b: 1, d: 1, g: 1 },
      poke: { s: fast(1, 2), c: fast(0, 1), m: 2, k: fast(0, 1) },
      asleep: { s: 0, c: 0, k: 0, m: 0, g: 0, b: 0, d: 0, a: 0, h: 0 },
    },
  },
  'chonk:legendary': {
    rows: [BLANK, '  {a}_{b} {w}  ', ' ( {E}{m}{E} ){p} ', ' ( {o} ) {g}  ', ' {c}  '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      w: { v: [' _', '_ '], r: wag(2, 2) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      p: { v: ['/ )', '/ /'], r: wag(2, 2) },
      o: { v: ['(o)', '(O)'], r: breathe, c: 'yellow' },
      g: glint(3),
      c: { v: ['(_uu_uu_)', '(_u_uuu_)'], r: step, c: 'red' },
    },
    moods: { pet: { m: 1, w: fast(0, 1), p: fast(0, 1) }, poke: { a: 2, b: 2, m: 3, c: 1, o: 1 }, asleep: { m: 0, a: 0, b: 0, w: 0, p: 0, o: 0, c: 0 } },
  },
  'imp:legendary': {
    rows: [BLANK, '{a}{l}{z}{r}{b}', '{c}( {E}  {E} ){d}', ' {f} ( {m} ){t}', ' {k}  {g}{u}'],
    parts: {
      a: { v: ['/\\', '/|', '__'], r: wag(3, 3) },
      b: { v: ['/\\', '|\\', '__'], r: wag(3, 3) },
      l: { v: ['(\\', '(|'], r: twitch(3, 13), c: 'red' },
      r: { v: ['/)', '|)'], r: twitch(3, 13), c: 'red' },
      z: { v: [' ^^ ', '^^^^', '^vv^'], r: wag(3, 2), c: 'yellow' },
      c: { v: ['\\_', '\\/', ' \\'], r: lag(wag(3, 3), 1) },
      d: { v: ['_/', '\\/', '/ '], r: lag(wag(3, 3), 1) },
      f: { v: ['Y', 'y'], r: twitch(7, 17), c: 'yellow' },
      k: { v: ['|'], r: () => 0, c: 'yellow' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~\\ ', '~/ ', '~~ '], r: wag(3), c: 'red' },
      g: { v: ['W  W', ' WW '], r: step },
      u: { v: [' _\\>', ' _/>', '  ~>'], r: lag(wag(3), 2), c: 'red' },
    },
    moods: {
      pet: { l: 1, r: 1, z: 1, m: 1, a: fast(0, 1), b: fast(0, 1) },
      poke: { l: 1, r: 1, z: 2, m: 2, a: 0, b: 0, c: fast(0, 1), d: fast(0, 1) },
      asleep: { m: 3, z: 0, a: 2, b: 2, c: 2, d: 2, t: 2, u: 2, g: 0, f: 0 },
    },
  },
  'bat:legendary': {
    rows: [BLANK, '{l}{f}{r}', '{a}({w}){b}', '{c}({E}  {E}){d}', '{s}   {e}   {z}'],
    parts: {
      l: { v: ['__,__', '_,___'], r: wag(2, 5), c: 'green' },
      r: { v: ['__.__', '___._'], r: wag(2, 5), c: 'green' },
      f: { v: ['""', "''"], r: step },
      a: { v: ['/\\/', '/\\_', '_/\\'], r: wag(3, 2), c: 'red' },
      b: { v: ['\\/\\', '_/\\', '/\\_'], r: wag(3, 2), c: 'red' },
      c: { v: ['\\ \\', ' \\ ', '\\  '], r: lag(wag(3, 2), 1), c: 'red' },
      d: { v: ['/ /', ' / ', '  /'], r: lag(wag(3, 2), 1), c: 'red' },
      w: { v: ['\\^^/', '|^^|', '\\__/'], r: wag(2, 4), c: 'white' },
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
      s: { v: [' ', 'v', 'w', 'v', ' ', ' '], r: wag(6, 2), c: 'magenta' },
      z: { v: [' ', ' ', ' ', 'v', 'w', 'v'], r: wag(6, 2), c: 'magenta' },
    },
    moods: {
      pet: { w: 2, a: 1, b: 1, f: fast(0, 1) },
      poke: { w: 1, e: 1, a: fast(0, 2), b: fast(0, 2), s: fast(1, 2), z: fast(4, 3) },
      asleep: { w: 2, a: 2, b: 2, c: 0, d: 0, e: 0, f: 0, s: 0, z: 0 },
    },
  },
  'skeleton:legendary': {
    rows: [BLANK, ' {z} ({E}  {E})  {o}', '    \\{m}/   {s}', ' {a}(={r}=){b}{s}', '  /{w}\\ {s}'],
    parts: {
      z: glint(2),
      o: { v: ['@', 'O', 'o'], r: wag(3, 3), c: 'cyan' },
      s: { v: ['|'], r: () => 0, c: 'yellow' },
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4), c: 'cyan' },
      a: { v: ['\\_', '__', ' /'], r: wag(3, 2) },
      b: { v: ['__', '_/', '__'], r: lag(wag(3, 2), 1) },
      w: { v: ['_/\\/\\_', '/\\_/\\_'], r: step, c: 'magenta' },
    },
    moods: {
      pet: { m: 1, a: 0, b: 1, o: 0, w: fast(0, 1) },
      poke: { m: 2, r: 1, a: 2, b: 2, o: fast(0, 1) },
      asleep: { m: 3, a: 2, b: 0, r: 0, o: 2, w: 0 },
    },
  },
}

// A stage is a rig keyed `species:rarity`; a buddy wears the highest one at or below its rarity, else the base rig.
export function rigOf(species: string, rarity: Rarity = 'common'): Rig {
  for (const r of RARITIES.slice(0, RARITIES.indexOf(rarity) + 1).reverse()) {
    const staged = RIGS[`${species}:${r}`]
    if (staged) return staged
  }
  return RIGS[species] ?? RIGS.blob!
}

export type Segment = readonly [text: string, color: string]

// One row of a rig at this tick in this mood: coloured segments, eyes filled left to right.
export function rigRow(rig: Rig, row: string, tick: number, isWorking: boolean, eyes: readonly [string, string], color: string, mood?: Mood): Segment[] {
  const out: Segment[] = []
  let n = 0
  const push = (text: string, c: string) => {
    if (!text) return
    const last = out[out.length - 1]
    if (last && last[1] === c) out[out.length - 1] = [last[0] + text, c]
    else out.push([text, c])
  }
  const fill = (text: string) => text.replace(/\{E\}/g, () => eyes[Math.min(n++, 1)] ?? '')
  for (const piece of row.split(/(\{[a-z]\})/)) {
    const key = /^\{([a-z])\}$/.exec(piece)?.[1]
    const part = key ? rig.parts[key] : undefined
    if (!key || !part) {
      push(fill(piece), color)
      continue
    }
    const pinned = mood ? rig.moods[mood]?.[key] : undefined
    const index = typeof pinned === 'number' ? pinned : (pinned ?? part.r)(tick, isWorking)
    push(fill(part.v[index % part.v.length] ?? ''), part.c ?? color)
  }
  return out
}
