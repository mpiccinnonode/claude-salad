import type { Rig } from '../rhythms.ts'
import { beat, twitch, wag, breathe, special, step, flap, fast, lag, BLANK, tufts, tuft, hem, typing, ARMS, arms } from '../rhythms.ts'

const fin = (t: number, w: boolean) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2)
const beak = { v: [',', 'v'], r: special, c: 'yellow' }
const pbeak = { v: ['>', 'v'], r: special, c: 'yellow' }
const flipL = { v: ['/', '|', '\\'], r: fin }
const flipR = { v: ['\\', '|', '/'], r: fin }

export const BATCH: Record<string, Rig> = {
  'owl+penguin': {
    rows: [BLANK, '   {e}    ', '   ({E}{b}{E})    ', '  {l}( : ){r}   ', '  {f}   '],
    parts: {
      e: { v: [',-^-,', ',---,', '.-^-,'], r: tufts },
      b: pbeak,
      l: flipL,
      r: flipR,
      f: { v: ['-`"-"\'-', '-`"_"\'-'], r: step },
    },
    moods: { pet: { e: 0, b: 1, l: 1, r: 1 }, poke: { e: 2, l: 0, r: 0, f: fast(0, 1) }, asleep: { e: 1, b: 0, l: 1, r: 1, f: 0 } },
  },
  'owl+turtle': {
    rows: [BLANK, ' _.----.{e} ', '/\\_/\\_/({E}{b}{E})', '\\_/\\_/\\_{w}/ ', '{f}'],
    parts: {
      e: { v: [',_,', '._,', ',_.'], r: tufts },
      b: beak,
      w: { v: ['__', '_\\'], r: flap },
      f: { v: ['  "-"  "-"  ', '   "-""-"   ', ' "_"  "_"   '], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { b: 1, e: 0, f: 1 }, poke: { e: 1, w: 1, f: fast(0, 2) }, asleep: { b: 0, e: 0, w: 0, f: 2 } },
  },
  'owl+snail': {
    rows: [BLANK, '  .--. {e}', ' ( {c}  )({E}{b}{E})', "  `--'{l}( ){r} ", '{f}'],
    parts: {
      e: { v: [',___,', '.___,', ',___.'], r: tufts },
      b: beak,
      c: { v: ['@', 'o', '0'], r: special },
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      f: { v: [' (______"-")', ' (______"_")'], r: step },
    },
    moods: { pet: { c: 2, b: 1, l: 1, r: 1 }, poke: { e: 1, c: 1, l: fast(0, 1), f: fast(0, 1) }, asleep: { c: 0, e: 0, b: 0, l: 0, r: 0, f: 0 } },
  },
  'ghost+owl': {
    rows: [BLANK, '   {e}    ', '  ( {E}{b}{E} )   ', '  {l}|{u}\\{a} ', '   {t}   '],
    parts: {
      e: { v: [',-.-,', '.-.-,', ',-.-.'], r: tufts },
      b: beak,
      l: { v: [' ', '/'], r: flap },
      u: { v: [' :: ', ' .: '], r: breathe },
      a: { v: ['  ', ' ~'], r: lag(flap, 1) },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { b: 1, a: 1, l: 1 }, poke: { e: 1, a: fast(0, 1), t: fast(0, 1) }, asleep: { b: 0, e: 0, a: 0, l: 0, t: 0, u: 0 } },
  },
  'axolotl+owl': {
    rows: [BLANK, ' {a}{e}{g}  ', ' {c}({E}{k}{E}){d}  ', '  {l}(   ){r}{t} ', "  `-{f}-'   "],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      g: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      e: { v: [',___,', '.___,', ',___.'], r: tufts },
      c: { v: ['==', '~='], r: wag(2, 3), c: 'magenta' },
      d: { v: ['==', '=~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      k: beak,
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      t: { v: ['  ', '~ '], r: breathe },
      f: { v: ['"-"', '"_"'], r: step },
    },
    moods: {
      pet: { k: 1, a: fast(0, 1), g: fast(0, 1), t: 1 },
      poke: { e: 1, c: 1, d: 1, l: fast(0, 1), r: fast(1, 0), f: 1 },
      asleep: { k: 0, e: 0, a: 0, g: 0, c: 0, d: 0, l: 0, r: 0, t: 0, f: 0 },
    },
  },
  'capybara+owl': {
    rows: [BLANK, ' {e}  ', ' ( {E} {b} {E} )  ', ' ({l} {u} {r})  ', '{w}'],
    parts: {
      e: { v: [',.-----.,', '..-----.,', ',.-----..'], r: tufts },
      b: beak,
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      u: { v: [':::', '.:.'], r: breathe },
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { b: 1, l: 1, r: 1, u: 1 }, poke: { e: 1, l: fast(0, 1), r: fast(1, 0), w: fast(1, 2) }, asleep: { b: 0, e: 0, l: 0, r: 0, u: 0, w: 0 } },
  },
  'cactus+owl': {
    rows: [BLANK, '{a}{k}{b} ', '{c}|{E}{q}{E}|{d} ', '{e}|{m}|{f} ', '   |___|    '],
    parts: {
      ...arms,
      k: { v: [',___,', '.___,', ',___.'], r: tufts },
      q: beak,
      m: { v: [':::', '.:.'], r: breathe, c: 'green' },
    },
    moods: { pet: { ...ARMS(0), q: 1, m: 1 }, poke: { ...ARMS(1), k: 1 }, asleep: { ...ARMS(2), k: 0, q: 0, m: 0 } },
  },
  'owl+robot': {
    rows: [BLANK, '  {e}   ', '  |({E}{b}{E})|   ', ' {l}|[{m}]|{r}  ', "  '-{f}-'   "],
    parts: {
      e: { v: [',-----,', '.-----,', ',-----.'], r: tufts },
      b: beak,
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      m: { v: ['===', '=-=', '-=-'], r: typing, c: 'green' },
      f: { v: ['"-"', '"o"'], r: wag(2, 3) },
    },
    moods: { pet: { b: 1, l: 1, r: 1, f: 0 }, poke: { e: 1, m: fast(1, 2), l: fast(0, 1), r: fast(1, 0) }, asleep: { b: 0, e: 0, m: 0, l: 0, r: 0, f: 1 } },
  },
  'owl+rabbit': {
    rows: [BLANK, '   {l}{r}     ', '   ({E}{b}{E})    ', ' {t}{w}(   ){v}   ', '  {g}{f}{h}   '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      b: beak,
      t: { v: ['o', 'O'], r: wag(2, 3) },
      w: { v: [' ', '/'], r: flap },
      v: { v: [' ', '\\'], r: lag(flap, 1) },
      g: { v: ["_'", '_,'], r: wag(2, 4), c: 'green' },
      f: { v: ['"-"', '"_"'], r: step },
      h: { v: ["'_", ',_'], r: lag(wag(2, 4), 1), c: 'green' },
    },
    moods: {
      pet: { l: 2, r: 2, b: 1, t: fast(0, 1) },
      poke: { l: 1, r: 1, t: 1, w: fast(0, 1), v: fast(1, 0) },
      asleep: { l: 2, r: 2, b: 0, t: 0, w: 0, v: 0, g: 0, h: 0, f: 0 },
    },
  },
  'mushroom+owl': {
    rows: ['{s}', '  .-{c}-.  ', " `-.{e}.-' ", '  {l}({E}{b}{E}){r}   ', '   {g}   '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      e: { v: [',__,', '.__,', ',__.'], r: tufts },
      b: beak,
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      g: { v: ['(_""_)', '(_/\\_)'], r: step },
    },
    moods: {
      pet: { s: 2, c: 1, b: 1, l: 1, r: 1 },
      poke: { s: fast(1, 2), c: fast(0, 1), e: 1, g: 1 },
      asleep: { s: 0, c: 0, e: 0, b: 0, l: 0, r: 0, g: 0 },
    },
  },
  'chonk+owl': {
    rows: [BLANK, ' {a}___{c}    ', '( {E}{b}{E} )__.  ', ' ({l} ::: {r}){t}', '  {p}   '],
    parts: {
      a: { v: ['/,', '/.', '/-'], r: twitch(6) },
      c: { v: [',\\', '.\\', '-\\'], r: twitch(14) },
      b: { v: [',', 'v', 'o'], r: special, c: 'yellow' },
      l: { v: ['(', '/'], r: flap },
      r: { v: [')', '\\'], r: lag(flap, 1) },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu"-"uu', 'u-"_"uu'], r: step },
    },
    moods: { pet: { b: 1, l: 1, r: 1, t: fast(0, 1) }, poke: { a: 2, c: 2, b: 2, p: 1 }, asleep: { a: 0, c: 0, b: 0, l: 0, r: 0, t: 2, p: 0 } },
  },
  'imp+owl': {
    rows: [BLANK, '  {h}   ', '  ( {E}{b}{E} )   ', '  {l}(   ){t} ', '    {d}    '],
    parts: {
      h: { v: ['(\\   /)', '(|   |)'], r: twitch(3, 13), c: 'red' },
      b: beak,
      l: { v: [' ', '/'], r: flap },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['v""v', '"vv"'], r: step },
    },
    moods: { pet: { h: 1, b: 1, l: 1, t: fast(0, 1) }, poke: { h: 1, l: fast(0, 1), t: 2, d: 1 }, asleep: { h: 0, b: 0, l: 0, t: 1, d: 0 } },
  },
  'bat+owl': {
    rows: [BLANK, '{l}{e}{r}', '   ({E}{b}{E})   ', '   ( {u} )   ', '    {d}    '],
    parts: {
      l: { v: ['___', '/\\_'], r: flap, c: 'green' },
      r: { v: ['___', '_/\\'], r: lag(flap, 1), c: 'green' },
      e: { v: [',____,', '.____,', ',____.'], r: tufts },
      b: { v: ['\\/', 'vv'], r: special, c: 'yellow' },
      u: { v: ['::', '.:'], r: breathe },
      d: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { b: 1, l: 1, r: 1, u: 1 }, poke: { e: 1, l: fast(0, 1), r: fast(1, 0), d: 1 }, asleep: { b: 0, e: 0, l: 0, r: 0, u: 0, d: 0 } },
  },
  'owl+skeleton': {
    rows: [BLANK, '   {e}   ', '   ({E}{b}{E})   ', '{x}(={r}=){y}', '   {l}   '],
    parts: {
      e: { v: [',____,', '.____,', ',____.'], r: tufts },
      b: { v: ['\\/', 'vv'], r: special, c: 'yellow' },
      r: { v: ['||', '::'], r: wag(2, 4) },
      x: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      y: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      l: { v: ['"/  \\"', '"|  \\"', '"/  |"'], r: step },
    },
    moods: {
      pet: { b: 1, x: 0, y: 0, l: fast(1, 2) },
      poke: { e: 1, r: 1, x: 2, y: 2, l: 0 },
      asleep: { e: 0, b: 0, x: 2, y: 2, r: 0, l: 0 },
    },
  },
  'penguin+turtle': {
    rows: [BLANK, ' _.--._{h}', '/\\_/\\_/({E}{b}{E})', '\\_/\\_/\\__/{r} ', '{f}'],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: pbeak,
      r: flipR,
      f: { v: ['  ^^    ^^  ', '   ^^  ^^   ', ' ^^    ^^   '], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { h: 0, b: 1, r: 1, f: 1 }, poke: { h: 1, r: 0, f: fast(0, 2) }, asleep: { h: 0, b: 0, r: 1, f: 2 } },
  },
  'penguin+snail': {
    rows: [BLANK, '   {h}    ', '   ({E}{b}{E})    ', '  {l}( {c} ){r}   ', '{f}'],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: pbeak,
      c: { v: ['@', 'o', '0'], r: special },
      l: flipL,
      r: flipR,
      f: { v: ['  (_____)   ', '  (_____)~  ', ' ~(_____)   '], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { h: 0, c: 2, b: 1, l: 1, r: 1 }, poke: { h: 1, c: 1, l: 0, r: 0, f: fast(0, 1) }, asleep: { h: 0, c: 0, b: 0, l: 1, r: 1, f: 0 } },
  },
  'ghost+penguin': {
    rows: [BLANK, '  {h}   ', '  ( {E}{b}{E} )   ', ' {l}|     \\{a} ', '  {t}  '],
    parts: {
      h: { v: ['.-----.', '.--~--.', '.--^--.'], r: tuft },
      b: pbeak,
      l: flipL,
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~^~~^~'", "`-^~~^~'", "`~^~-^~'"], r: hem(3) },
    },
    moods: { pet: { h: 0, b: 1, l: 1, a: 1 }, poke: { h: 1, l: 0, a: fast(0, 1), t: fast(0, 1) }, asleep: { h: 0, b: 0, l: 1, a: 0, t: 0 } },
  },
  'axolotl+penguin': {
    rows: [BLANK, '   {h}    ', '{c}({E}{b}{E}){d} ', '  {l}(   ){r}{t}', '  {f}  '],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      c: { v: ['<==', '<~='], r: wag(2, 3), c: 'magenta' },
      d: { v: ['==>', '=~>'], r: lag(wag(2, 3), 1), c: 'magenta' },
      b: pbeak,
      l: flipL,
      r: flipR,
      t: { v: ['_~ ', '_-~'], r: wag(2, 3), c: 'magenta' },
      f: { v: ["`-^--^-'", "`^---^-'"], r: step },
    },
    moods: {
      pet: { b: 1, l: 1, r: 1, c: 1, d: 1, t: 1 },
      poke: { h: 1, l: 0, r: 0, c: fast(0, 1), d: fast(1, 0), f: 1 },
      asleep: { h: 0, b: 0, l: 1, r: 1, c: 0, d: 0, t: 0, f: 0 },
    },
  },
  'capybara+penguin': {
    rows: [BLANK, '   {e}{h}{f}  ', '  ( {E}   {E} ) ', ' {l}(  ({b})  ){r}', '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: pbeak,
      l: flipL,
      r: flipR,
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: {
      pet: { e: 1, f: 1, h: 0, b: 1, l: 1, r: 1 },
      poke: { h: 1, l: 0, r: 0, e: fast(0, 1), w: fast(1, 2) },
      asleep: { e: 1, f: 1, h: 0, b: 0, l: 1, r: 1, w: 0 },
    },
  },
  'cactus+penguin': {
    rows: [BLANK, '{a}{h}{b}', '{c}|{E}{k}{E}|{d}', '{e}|{m}|{f}', '  {p}  '],
    parts: {
      ...arms,
      h: { v: ['.----.', '.-~~-.', '.-^^-.'], r: tuft },
      k: { v: ['vv', 'VV'], r: special, c: 'yellow' },
      m: { v: ['(  )', '(..)'], r: breathe },
      p: { v: ["\\`----'/", "\\`--^-'/"], r: step, c: 'red' },
    },
    moods: { pet: { ...ARMS(0), h: 0, k: 1, m: 1 }, poke: { ...ARMS(1), h: 2, p: fast(0, 1) }, asleep: { ...ARMS(2), h: 0, k: 0, m: 0, p: 0 } },
  },
  'penguin+robot': {
    rows: [BLANK, '  {h}  ', '  |[{E}{b}{E}]|  ', ' {l}|( {m} )|{r} ', "  '-^-{o}^-'  "],
    parts: {
      h: { v: ['.------.', '.--~~--.', '.--^^--.'], r: tuft },
      b: { v: ['>_', '> ', 'v_'], r: special, c: 'yellow' },
      l: flipL,
      r: flipR,
      m: { v: ['::', '.:', ':.'], r: typing, c: 'green' },
      o: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
    },
    moods: { pet: { h: 0, b: 2, l: 1, r: 1, o: 1 }, poke: { h: 1, l: 0, r: 0, m: fast(1, 2), o: fast(0, 1) }, asleep: { h: 0, b: 1, l: 1, r: 1, m: 0, o: 0 } },
  },
}
