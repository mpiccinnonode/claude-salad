import type { Rig } from '../rhythms.ts'
import { beat, twitch, wag, breathe, special, step, flap, fast, lag, BLANK, ears, smoke, tufts, tuft, hem, arms, ARMS } from '../rhythms.ts'

const bill = { v: ['>', '='], r: special, c: 'yellow' }
const wing = { v: ['<_', '<-'], r: flap }
const tail = { v: [' ', '~'], r: wag(2, 3) }
const crest = { v: ['__', '_,'], r: twitch(8) }
const flipper = (t: number, w: boolean) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2)

export const BATCH: Record<string, Rig> = {
  'duck+goose': {
    rows: [BLANK, '   {b}{E})      ', '    {n}     ', '   ( {g}. ){t} ', "    `---'   "],
    parts: { b: { v: ['<', '='], r: special, c: 'yellow' }, n: { v: [') )', ' ))', ')) '], r: wag(3, 3) }, g: wing, t: tail },
    moods: { pet: { g: 1, n: 1, t: fast(0, 1) }, poke: { b: 1, n: fast(0, 2), g: fast(0, 1) }, asleep: { b: 0, g: 0, n: 0, t: 0 } },
  },
  'blob+duck': {
    rows: [BLANK, '     {c}     ', '   .{E}--{E}.{b}  ', " _.' {g} '._ ", '({w})'],
    parts: { c: crest, b: bill, g: wing, w: { v: ['__________', '_.-~~~~-._', '__.-~~-.__'], r: wag(3, 3) } },
    moods: { pet: { c: 1, g: 1, w: 1 }, poke: { b: 1, c: 1, w: fast(1, 2) }, asleep: { b: 0, c: 0, g: 0, w: 0 } },
  },
  'cat+duck': {
    rows: [BLANK, '   {e}    ', '  ( {E}.{E} ){b}  ', '   \\ {g}. )  ', '  {p}{t}'],
    parts: {
      e: { v: ['/\\_/\\', '/\\-/\\', '/|_/\\', '-\\_/-'], r: ears },
      b: bill,
      g: wing,
      p: { v: ['(")_(")', "(')_(\")"], r: step },
      t: { v: ['   ', ')  ', ' ) ', '~  '], r: wag(4) },
    },
    moods: { pet: { e: 0, g: 1, t: fast(1, 2) }, poke: { e: 3, b: 1, p: 1, t: 3 }, asleep: { e: 3, b: 0, g: 0, t: 0, p: 0 } },
  },
  'dragon+duck': {
    rows: ['{s}', '  /)___(\\   ', ' ( {E}   {E} ){b}{f}', '  \\ {g}. /   ', "   `-{v}-'   "],
    parts: {
      s: smoke,
      b: bill,
      f: { v: [' ', '~', '*'], r: special, c: 'red' },
      g: wing,
      v: { v: ['vv', 'VV'], r: step, c: 'red' },
    },
    moods: { pet: { s: 0, f: 0, g: 1 }, poke: { s: fast(1, 2), f: 2, b: 1 }, asleep: { s: 0, f: 0, b: 0, g: 0, v: 0 } },
  },
  'duck+octopus': {
    rows: ['{o}', '   .-""-.   ', '  ( {E}  {E} ){b} ', '  {l}{g}{r}  ', ' {u} '],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special },
      b: bill,
      l: { v: ['/`)', '\\`)'], r: wag(2, 3) },
      g: wing,
      r: { v: ['(`\\', '(`/'], r: wag(2, 3) },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { g: 1, l: 0, r: 0, u: 2 }, poke: { o: 2, b: 1, l: fast(0, 1), r: fast(0, 1) }, asleep: { o: 0, b: 0, g: 0, l: 0, r: 0, u: 2 } },
  },
  'duck+owl': {
    rows: [BLANK, '   {e}    ', '   ({E} {E}){b}   ', '  {l}( {g} ){r}  ', '  --{f}--{t}  '],
    parts: {
      e: { v: [',___,', '.___,', ',___.'], r: tufts },
      b: bill,
      l: { v: [' ', '/'], r: flap },
      g: { v: ['<_', '<-'], r: step },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      f: { v: ['"-"', '"_"'], r: step },
      t: tail,
    },
    moods: { pet: { l: 1, r: 1, g: 1, t: fast(0, 1) }, poke: { e: 1, b: 1, l: fast(0, 1), r: fast(1, 0), f: 1 }, asleep: { b: 0, e: 0, l: 0, r: 0, f: 0, g: 0, t: 0 } },
  },
  'duck+penguin': {
    rows: [BLANK, '   .-{c}.    ', '   ({E}{b}{E})    ', '  {l}({g}. ){r}  ', '   {f}{t}   '],
    parts: {
      c: { v: ['--', '-,', '~,'], r: tuft },
      b: bill,
      l: { v: ['/', '|', '\\'], r: flipper },
      g: wing,
      r: { v: ['\\', '|', '/'], r: flipper },
      f: { v: ["`---'", "`--^'", "^---'"], r: step },
      t: tail,
    },
    moods: { pet: { l: 1, r: 1, b: 1, g: 1 }, poke: { c: 2, l: 0, r: 0, f: fast(1, 2) }, asleep: { c: 0, l: 1, r: 1, f: 0, b: 0, g: 0, t: 0 } },
  },
  'duck+turtle': {
    rows: [BLANK, ' _.----._{c} ', '/\\_/\\_/( {E}){b}', '{t}\\_/\\_/\\__/ ', '{f}'],
    parts: {
      c: crest,
      b: bill,
      t: tail,
      f: { v: ['  ""    ""  ', '   ""  ""   ', ' ""    ""   '], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { f: 1, c: 1, t: fast(0, 1) }, poke: { f: fast(0, 2), b: 1, c: 1 }, asleep: { f: 2, b: 0, c: 0, t: 0 } },
  },
  'duck+snail': {
    rows: [BLANK, '  .--.  {c}  ', ' ( {s}  )({E}){b} ', "  `--'\\{g}/  ", '{f}'],
    parts: {
      c: crest,
      s: { v: ['@', 'o', '0'], r: special },
      b: { v: ['>', '='], r: twitch(5, 15), c: 'yellow' },
      g: wing,
      f: { v: [' (_______)  ', ' (_______)~ ', ' (_______)  '], r: step },
    },
    moods: { pet: { s: 2, g: 1, c: 1 }, poke: { s: 1, b: 1, f: fast(0, 1) }, asleep: { s: 0, b: 0, g: 0, c: 0, f: 0 } },
  },
  'duck+ghost': {
    rows: [BLANK, '    .{c}.    ', '   ({E} {E}){b}   ', '   | {g} \\{a} ', '    {t}  '],
    parts: {
      c: { v: ['--', '-,'], r: twitch(8) },
      b: bill,
      g: wing,
      a: { v: ['  ', ' ~'], r: lag(flap, 2) },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { g: 1, a: 1 }, poke: { b: 1, a: fast(0, 1), t: fast(0, 1) }, asleep: { b: 0, g: 0, a: 0, t: 0, c: 0 } },
  },
  'axolotl+duck': {
    rows: [BLANK, ' {a} .--. {d} ', '{c}( {E}  {E} ){b} ', '  ( {g}. ){t} ', "  `-^--^-'  "],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      d: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['==', '~='], r: wag(2, 3), c: 'magenta' },
      b: bill,
      g: wing,
      t: { v: ['  ', '~ '], r: breathe },
    },
    moods: { pet: { a: fast(0, 1), d: fast(0, 1), g: 1, t: 1 }, poke: { c: 1, b: 1, g: fast(0, 1) }, asleep: { a: 0, d: 0, c: 0, b: 0, g: 0, t: 0 } },
  },
  'capybara+duck': {
    rows: [BLANK, '   {e}.--.{f}   ', '  ( {E}  {E} ){b} ', '  ( {g}.  ){t} ', '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      b: bill,
      g: wing,
      t: tail,
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, g: 1 }, poke: { b: 1, w: fast(1, 2), e: fast(0, 1) }, asleep: { e: 1, f: 1, b: 0, g: 0, w: 0, t: 0 } },
  },
  'cactus+duck': {
    rows: [BLANK, '{a} .--. {b}', '{c}| {E}{k}{E}|{d}', '{e}| {m} |{f}', "   `----'{t}  "],
    parts: { ...arms, k: bill, m: wing, t: tail },
    moods: { pet: { ...ARMS(0), m: 1 }, poke: { ...ARMS(1), k: 1 }, asleep: { ...ARMS(2), k: 0, m: 0, t: 0 } },
  },
  'duck+robot': {
    rows: [BLANK, '  .---{c}-.  ', '  |[{E}  {E}]|{b} ', '  |[{g}. ]|  ', "  '--||-{f}'{t} "],
    parts: {
      c: { v: ['--', '-,'], r: twitch(8) },
      b: bill,
      g: { v: ['<_', '<-'], r: flap, c: 'green' },
      f: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
      t: tail,
    },
    moods: { pet: { f: 1, g: 1, t: fast(0, 1) }, poke: { b: 1, f: fast(0, 1), g: fast(0, 1) }, asleep: { f: 0, g: 0, b: 0, t: 0, c: 0 } },
  },
  'duck+rabbit': {
    rows: [BLANK, '   {l}{r}     ', '   ( {E}.{E}){b}  ', '   {t}({g}. ) ', '    {k}    '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      b: bill,
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
      g: wing,
      k: { v: ["_''_", '_,,_'], r: wag(2, 4), c: 'green' },
    },
    moods: { pet: { l: 2, r: 2, g: 1, t: fast(0, 2) }, poke: { l: 1, r: 1, b: 1, t: 2 }, asleep: { l: 2, r: 2, b: 0, g: 0, t: 0, k: 0 } },
  },
  'duck+mushroom': {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", '   ( {E} ){b}   ', '   ({g}._){t}  '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      b: { v: ['>', '='], r: twitch(6, 16), c: 'yellow' },
      g: wing,
      t: tail,
    },
    moods: { pet: { s: 2, c: 1, g: 1 }, poke: { s: fast(1, 2), c: fast(0, 1), b: 1 }, asleep: { s: 0, c: 0, b: 0, g: 0, t: 0 } },
  },
  'chonk+duck': {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{k}{E} )__.  ', ' ( {g}.   ){t}', '  {p}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      k: bill,
      g: wing,
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { g: 1, t: fast(0, 1) }, poke: { a: 2, b: 2, k: 1, p: 1 }, asleep: { k: 0, a: 0, b: 0, t: 2, p: 0, g: 0 } },
  },
  'duck+imp': {
    rows: [BLANK, '  {h}  ', '  ( {E}  {E} ){b} ', '  ( {g}. ){t}', '    {d}    '],
    parts: {
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      b: bill,
      g: wing,
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['v  v', ' vv '], r: step },
    },
    moods: { pet: { h: 1, g: 1, t: fast(0, 1) }, poke: { h: 1, b: 1, t: 2, d: 1 }, asleep: { h: 0, b: 0, g: 0, t: 1, d: 0 } },
  },
  'bat+duck': {
    rows: [BLANK, '{l}{f}{r}', '   ({w})   ', '   ({E}  {E}){b}  ', '    {e}{t}   '],
    parts: {
      l: { v: ['_____'], r: () => 0, c: 'green' },
      r: { v: ['_____'], r: () => 0, c: 'green' },
      f: { v: ['""', "''"], r: step },
      w: { v: ['\\  /', '|  |', '\\__/'], r: wag(2, 4) },
      b: bill,
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
      t: tail,
    },
    moods: { pet: { w: 2, f: fast(0, 1), t: fast(0, 1) }, poke: { w: 1, e: 1, f: 1, b: 1 }, asleep: { w: 2, e: 0, f: 0, b: 0, t: 0 } },
  },
  'duck+skeleton': {
    rows: [BLANK, '   ({E}  {E}){k}  ', '    \\{m}/    ', '{a}(={r}=){b}', '   {l}{t}  '],
    parts: {
      k: bill,
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
      t: tail,
    },
    moods: {
      pet: { m: 1, a: 0, b: 0, l: fast(1, 2), t: fast(0, 1) },
      poke: { m: 2, k: 1, r: 1, a: 2, b: 2, l: 0 },
      asleep: { m: 3, k: 0, a: 2, b: 2, r: 0, l: 0, t: 0 },
    },
  },
  'blob+goose': {
    rows: [BLANK, '  {k}{E})       ', '   {n}      ', " _.' {m} '._ ", '({w})'],
    parts: {
      k: { v: ['<', '='], r: special, c: 'yellow' },
      n: { v: [') )', ' ))', ')) '], r: wag(3, 3) },
      m: { v: ['__', '_,', '-,'], r: lag(wag(3, 3), 1) },
      w: { v: ['__________', '_.-~~~~-._', '__.-~~-.__'], r: wag(3, 3) },
    },
    moods: { pet: { m: 2, w: 1, n: 1 }, poke: { k: 1, w: fast(1, 2), n: fast(0, 2) }, asleep: { k: 0, n: 0, m: 0, w: 0 } },
  },
}
