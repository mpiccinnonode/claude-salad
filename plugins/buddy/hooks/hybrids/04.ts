import type { Rig } from '../rhythms.ts'
import { BLANK, beat, twitch, wag, breathe, special, step, flap, fast, lag, ears, smoke, tufts, tuft, hem, arms, ARMS } from '../rhythms.ts'

const catEars = { v: ['/\\_/\\', '/\\-/\\', '/|_/\\', '-\\_/-'], r: ears }
const catMouth = { v: ['> ^ <', '= ^ =', '> o <', '> - <'], r: special }
const catPaws = { v: ['(")_(")', "(')_(\")"], r: step }
const catTail = { v: ['  ', ') ', ' )', '~ '], r: wag(4) }
const fire = { v: ['vv', 'VV', '~~'], r: (t: number, w: boolean) => (special(t, w) ? 2 : step(t, w)), c: 'red' }
const nostrils = { v: ["'..'", "'oo'"], r: breathe }

export const BATCH: Record<string, Rig> = {
  'cat+ghost': {
    rows: [BLANK, '   {e}    ', '  ( {E}.{E} )   ', '  |{m}\\{a} ', '   {t}   '],
    parts: { e: catEars, m: catMouth, a: { v: ['  ', ' ~'], r: flap }, t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) } },
    moods: { pet: { e: 0, m: 1, a: 1 }, poke: { e: 3, m: 2, a: fast(0, 1), t: fast(0, 1) }, asleep: { e: 3, m: 3, a: 0, t: 0 } },
  },
  'axolotl+cat': {
    rows: [BLANK, ' {a}{e}{b}  ', '{c}( {E}.{E} ){d} ', '  ({m}){t} ', " `{p}'  "],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['==', '~='], r: wag(2, 3), c: 'magenta' },
      d: { v: ['==', '=~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      e: catEars, m: catMouth, p: catPaws,
      t: { v: ['~ ', ' ~'], r: breathe },
    },
    moods: { pet: { m: 1, a: fast(0, 1), b: fast(0, 1), t: 1 }, poke: { e: 3, m: 2, c: 1, d: 1, p: 1 }, asleep: { e: 3, m: 3, a: 0, b: 0, c: 0, d: 0, t: 0 } },
  },
  'capybara+cat': {
    rows: [BLANK, '   {e}    ', '  ( {E}  {E} )  ', '  ( ({n}) ){t}', '{w}'],
    parts: {
      e: catEars, t: catTail,
      n: { v: ['..', 'oo', '::'], r: special },
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { e: 0, n: 0, t: fast(1, 2) }, poke: { e: 3, n: 1, t: 3, w: fast(1, 2) }, asleep: { e: 3, n: 2, t: 0, w: 0 } },
  },
  'cactus+cat': {
    rows: [BLANK, '{a} {h} {b}', '{c}|{E}  {E}|{d}', '{e}|>{m}<|{f}', '   |{p}|   '],
    parts: {
      ...arms,
      h: { v: ['/\\/\\', '/|/\\', '/\\|\\', '-\\/-'], r: ears },
      m: { v: ['^^', 'ww', 'oo', '--'], r: special },
      p: { v: ['"__"', "'__\""], r: step, c: 'green' },
    },
    moods: { pet: { ...ARMS(0), h: 0, m: 1 }, poke: { ...ARMS(1), h: 3, m: 2, p: 1 }, asleep: { ...ARMS(2), h: 3, m: 3, p: 0 } },
  },
  'cat+robot': {
    rows: [BLANK, '  {l}----{r}  ', '  |[{E}  {E}]|  ', '  |[{m}]|  ', "  '--||-{f}'{t}"],
    parts: {
      l: { v: ['/\\', '/|', '-\\'], r: ears },
      r: { v: ['/\\', '|\\', '/-'], r: lag(ears, 1) },
      m: { v: ['=^= ', '=^=_', '=o= ', '=-= '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      f: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
      t: catTail,
    },
    moods: { pet: { l: 0, r: 0, m: 1, f: 1, t: fast(1, 2) }, poke: { l: 2, r: 2, m: 2, f: fast(0, 1), t: 3 }, asleep: { m: 3, f: 0, t: 0 } },
  },
  'cat+rabbit': {
    rows: [BLANK, '   {l}{r}     ', '  ( {E} {E} )   ', '  ({m}){t} ', '  {p}   '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      m: catMouth, p: catPaws,
      t: { v: ['o ', 'o-', 'O '], r: wag(2, 3) },
    },
    moods: { pet: { l: 2, r: 2, m: 1, t: fast(0, 2) }, poke: { l: 1, r: 1, m: 2, t: 2, p: 1 }, asleep: { l: 2, r: 2, m: 3, t: 0, p: 0 } },
  },
  'cat+mushroom': {
    rows: [BLANK, '{l}.-{c}-.{r}', " `-.____.-' ", '   ({E}{m}{E})  ', '  {p}{t}'],
    parts: {
      l: { v: ['/\\', '/|', '-\\'], r: ears },
      r: { v: ['/\\', '|\\', '/-'], r: lag(ears, 1) },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['>^<', '=^=', '>o<', '>-<'], r: special },
      p: catPaws,
      t: { v: ['   ', ')  ', ' ) ', '~  '], r: wag(4) },
    },
    moods: { pet: { c: 1, m: 1, t: fast(1, 2) }, poke: { l: 2, r: 2, c: fast(0, 1), m: 2, p: 1 }, asleep: { l: 2, r: 2, c: 0, m: 3, t: 0, p: 0 } },
  },
  'cat+chonk': {
    rows: [BLANK, '  {e}     ', '( {E}{m}{E} )__.', ' (       ){t}', '  {p}   '],
    parts: {
      e: catEars, p: catPaws,
      m: { v: ['>^<', '=^=', '>o<', '>-<'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
    },
    moods: { pet: { e: 0, m: 1, t: fast(0, 1) }, poke: { e: 3, m: 2, p: 1, t: 1 }, asleep: { e: 3, m: 3, t: 2, p: 0 } },
  },
  'cat+imp': {
    rows: [BLANK, '  {h} ', '  ( {E}.{E} )   ', '   {m} {t}', '    {d}    '],
    parts: {
      h: { v: ['(\\/\\_/\\/)', '(|/\\_/\\|)', '(\\/\\-/\\/)'], r: (t, w) => (beat(t) === 13 ? 2 : twitch(3)(t, w)), c: 'red' },
      m: catMouth,
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['v  v', ' vv '], r: step },
    },
    moods: { pet: { h: 1, m: 1, t: fast(0, 1) }, poke: { h: 1, m: 2, t: 2, d: 1 }, asleep: { h: 2, m: 3, t: 1, d: 0 } },
  },
  'bat+cat': {
    rows: [BLANK, '{l}{e}{r} ', '  ( {E}.{E} )   ', '  ({m})   ', '    {f}    '],
    parts: {
      l: { v: ['___', '\\__', '/__'], r: flap, c: 'green' },
      r: { v: ['___', '__/', '__\\'], r: lag(flap, 1), c: 'green' },
      e: catEars, m: catMouth,
      f: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { e: 0, m: 1, l: fast(0, 1), r: fast(0, 1) }, poke: { e: 3, m: 2, l: 2, r: 2, f: 1 }, asleep: { e: 3, m: 3, l: 0, r: 0, f: 0 } },
  },
  'cat+skeleton': {
    rows: [BLANK, '   {e}    ', '   ({E}  {E})   ', '   =\\{m}/=   ', '   (={r}=){t} '],
    parts: {
      e: catEars,
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      t: { v: ['_o', '-o', '/o', '~o'], r: wag(4) },
    },
    moods: { pet: { e: 0, m: 1, t: fast(1, 3) }, poke: { e: 3, m: 2, r: 1, t: 2 }, asleep: { e: 3, m: 3, r: 0, t: 0 } },
  },
  'dragon+octopus': {
    rows: ['{s}', '  /)____(\\  ', ' ( {E}{n}{E} ) ', '  {t}  ', ' {u} '],
    parts: {
      s: smoke, n: nostrils,
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      u: { v: ['( (vv) )', ') )vv( (', '( )VV( )'].map(x => ` ${x} `), r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { s: 0, n: 1, t: 2, u: 2 }, poke: { s: fast(1, 2), n: 1, t: fast(0, 1), u: fast(0, 1) }, asleep: { s: 0, n: 0, t: 0, u: 2 } },
  },
  'dragon+owl': {
    rows: ['{s}', '  /){e}(\\ ', '   ( {E}{b}{E} )  ', '  {l}\\{n}/{r}  ', '   \\_{f}_/   '],
    parts: {
      s: smoke, n: nostrils, f: fire,
      e: { v: [',___,', '.___,', ',___.'], r: tufts },
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
    },
    moods: { pet: { s: 0, b: 1, l: 1, r: 1, f: 0 }, poke: { s: fast(1, 2), e: 1, l: fast(0, 1), r: fast(1, 0), f: 2 }, asleep: { s: 0, b: 0, e: 0, l: 0, r: 0, n: 0, f: 1 } },
  },
  'dragon+penguin': {
    rows: ['{s}', '  /){h}(\\ ', '    ({E}{b}{E})   ', '   {l}(:::){r}  ', '    {f}   '],
    parts: {
      s: smoke,
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      l: { v: ['/', '|', '\\'], r: (t, w) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2) },
      r: { v: ['\\', '|', '/'], r: (t, w) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2) },
      f: { v: ["`vvv'", "`VVV'", "`~~~'"], r: fire.r, c: 'red' },
    },
    moods: { pet: { s: 0, l: 1, r: 1, b: 1, f: 0 }, poke: { s: fast(1, 2), h: 1, l: 0, r: 0, f: fast(1, 2) }, asleep: { s: 0, h: 0, l: 1, r: 1, b: 0, f: 1 } },
  },
  'dragon+turtle': {
    rows: ['{s}', ' _.^^^._{h}  ', '/^\\_/^\\({E}{E}){f}', '\\_/^\\__/    ', '{g}'],
    parts: {
      s: smoke,
      h: { v: ['/)', '/|'], r: twitch(5, 15) },
      f: { v: [' ', '~', '>'], r: special, c: 'red' },
      g: { v: ['  ""    ""  ', '   ""  ""   ', ' ""    ""   '], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { s: 0, h: 0, f: 0, g: 1 }, poke: { s: fast(1, 2), h: 1, f: fast(1, 2), g: fast(0, 2) }, asleep: { s: 0, h: 0, f: 0, g: 2 } },
  },
  'dragon+snail': {
    rows: ['{s}', '  .vv.  {E} {E} ',' ( {c}  ) {k}  ', "  `--'_{f}/  ", '{g}'],
    parts: {
      s: smoke, f: fire,
      k: { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) },
      c: { v: ['@', 'o', '0'], r: special },
      g: { v: [' (_______)  ', ' (_______)~ ', ' (_______)  '], r: step },
    },
    moods: { pet: { s: 0, c: 2, k: 1, f: 0 }, poke: { s: fast(1, 2), k: 1, c: 1, f: 2, g: fast(0, 1) }, asleep: { s: 0, c: 0, k: 2, f: 1, g: 0 } },
  },
  'dragon+ghost': {
    rows: ['{s}', '  /).-.(\\   ', '   ({E} {E})    ', '   | {m} \\{a}  ', '    {t}  '],
    parts: {
      s: smoke,
      m: { v: ['O', 'o', '-', 'w'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`vvvv'", "`VvvV'", "`vVVv'"], r: hem(3), c: 'red' },
    },
    moods: { pet: { s: 0, m: 3, a: 1 }, poke: { s: fast(1, 2), m: 0, a: fast(0, 1), t: fast(0, 1) }, asleep: { s: 0, m: 2, a: 0, t: 0 } },
  },
  'axolotl+dragon': {
    rows: ['{s}', ' {a} /)(\\ {b} ', '{c}( {E}  {E} ){d}', '{e}( {n} ){f}', "  `-^{g}^-'{t}"],
    parts: {
      s: smoke, n: nostrils, g: fire,
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['==', '~='], r: wag(2, 3), c: 'magenta' },
      d: { v: ['==', '=~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      e: { v: ['//', "/'"], r: wag(2, 2), c: 'magenta' },
      f: { v: ['\\\\', "'\\"], r: lag(wag(2, 2), 1), c: 'magenta' },
      t: { v: ['  ', '~ '], r: breathe },
    },
    moods: { pet: { s: 0, n: 1, a: fast(0, 1), b: fast(0, 1), t: 1, g: 0 }, poke: { s: fast(1, 2), n: 1, c: 1, d: 1, e: 1, f: 1, g: 2 }, asleep: { s: 0, n: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, t: 0, g: 1 } },
  },
  'capybara+dragon': {
    rows: ['{s}', '  /){e}--{f}(\\  ', '  ( {E}  {E} )  ', '  ( ({n}) )  ', '{w}'],
    parts: {
      s: smoke,
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special, c: 'red' },
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { s: 1, e: 1, f: 1, n: 0 }, poke: { s: fast(1, 2), n: 1, w: fast(1, 2), e: fast(0, 1) }, asleep: { s: 0, e: 1, f: 1, n: 2, w: 0 } },
  },
  'cactus+dragon': {
    rows: ['{s}', '{a}/)--(\\{b}', '{c}|{E}  {E}|{d}', '{e}|{n}|{f}', '   |_{g}_|   '],
    parts: { ...arms, s: smoke, n: nostrils, g: fire },
    moods: { pet: { ...ARMS(0), s: 0, n: 1, g: 0 }, poke: { ...ARMS(1), s: fast(1, 2), n: 1, g: 2 }, asleep: { ...ARMS(2), s: 0, n: 0, g: 1 } },
  },
  'dragon+robot': {
    rows: ['{s}', '  /)----(\\  ', '  |[{E}  {E}]|  ', '  |[ {m} ]|  ', "  '--{f}--'  "],
    parts: {
      s: smoke,
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      f: fire,
    },
    moods: { pet: { s: 0, m: 3, f: 0 }, poke: { s: fast(1, 2), m: 2, f: 2 }, asleep: { s: 0, m: 1, f: 1 } },
  },
}
