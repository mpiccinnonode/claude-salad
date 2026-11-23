import type { Rig } from '../rhythms.ts'
import { BLANK, ARMS, arms, breathe, fast, flap, hem, lag, special, step, twitch, wag } from '../rhythms.ts'

const stalk = { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) }
const shell = { v: ['@', 'o', '0'], r: special }
const gill = (v: string[], slow: number, by = 0) => ({ v, r: lag(wag(2, slow), by), c: 'magenta' })

export const BATCH: Record<string, Rig> = {
  'cactus+snail': {
    rows: [BLANK, '    {E} {E}     ', '{c}.-{k}-.{d}', '{e}|  {s} |{f}', '{t}'],
    parts: {
      k: stalk, s: shell,
      c: arms.c, d: arms.d, e: arms.e, f: arms.f,
      t: { v: [' ~(|____|)  ', '~ (|____|)  ', '  (|____|)~ '], r: step, c: 'green' },
    },
    moods: {
      pet: { c: 0, d: 0, e: 0, f: 0, s: 2, k: 1 },
      poke: { c: 1, d: 1, e: 1, f: 1, s: 1, t: fast(0, 2) },
      asleep: { c: 0, d: 0, e: 1, f: 1, s: 0, k: 2, t: 0 },
    },
  },
  'robot+snail': {
    rows: [BLANK, '   {k}  {k}   ', '  [{E}  {E}].-. ', '  [ {m} ]({c}) ', '{f}'],
    parts: {
      k: { v: ['o|', '|o', 'oo'], r: wag(2, 3), c: 'green' },
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      c: { v: ['@', '%', '0'], r: special },
      f: { v: [' (_||__||_) ', ' (_||__||_)~'], r: step },
    },
    moods: { pet: { m: 3, c: 2, k: 2 }, poke: { m: 2, c: 1, k: fast(0, 1), f: fast(0, 1) }, asleep: { m: 1, c: 0, k: 0, f: 0 } },
  },
  'rabbit+snail': {
    rows: [BLANK, '   {l}{r}     ', '  ( {E}{n}{E}).-. ', ' {t}(")(")({c})', '{f}'],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
      c: shell,
      f: { v: [' (_______)  ', ' (_______)~ '], r: step },
    },
    moods: { pet: { l: 2, r: 2, n: 2, c: 2, t: fast(0, 2) }, poke: { l: 1, r: 1, n: 1, c: 1, f: fast(0, 1) }, asleep: { l: 2, r: 2, n: 0, t: 0, c: 0, f: 0 } },
  },
  'mushroom+snail': {
    rows: ['{s}', ' .-{c}-.{E} {E}', "`-.____.-'{k}", '  ( {m} )_/  ', '{g}'],
    parts: {
      s: { v: [BLANK, '   .  o     ', '  o  .      '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      k: stalk,
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
      g: { v: [' (_______)  ', ' (_______)~ '], r: step },
    },
    moods: { pet: { s: 2, c: 1, m: 1, k: 0 }, poke: { s: fast(1, 2), m: 2, k: 1, g: fast(0, 1) }, asleep: { s: 0, c: 0, m: 3, k: 2, g: 0 } },
  },
  'chonk+snail': {
    rows: [BLANK, ' {a}_{b}  .--.', '( {E}{m}{E} )( {c} )', " (    `--'{t}", '{p}'],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      c: { v: ['@', 'o', '0'], r: lag(special, 2) },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['  uu--uu ~  ', '  u-u-uu  ~ '], r: step },
    },
    moods: { pet: { m: 1, c: 2, t: fast(0, 1) }, poke: { a: 2, b: 2, m: 3, c: 1, p: 1 }, asleep: { m: 0, a: 0, b: 0, c: 0, t: 2, p: 0 } },
  },
  'imp+snail': {
    rows: [BLANK, '  {h}  ', '  ( {E}  {E} )  ', '  ( {m}({c}){t}', '{d}'],
    parts: {
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      c: { v: ['@', 'o', '0'], r: lag(special, 3) },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['  (_v__v_)  ', '  (__vv__)  '], r: step },
    },
    moods: { pet: { h: 1, m: 1, c: 2, t: fast(0, 1) }, poke: { h: 1, m: 2, c: 1, t: 2, d: 1 }, asleep: { h: 0, m: 3, c: 0, t: 1, d: 0 } },
  },
  'bat+snail': {
    rows: [BLANK, '    .--. {E} {E}', '{l}( {c} ){r}{k}', "   `--'__/  ", '{e}'],
    parts: {
      k: stalk, c: shell,
      l: { v: ['/\\_', '\\/_', '___'], r: flap, c: 'green' },
      r: { v: ['_/', '_\\', '__'], r: flap, c: 'green' },
      e: { v: ['  (\\/\\/__)  ', '  (\\/|/__)~ '], r: twitch(6, 14) },
    },
    moods: { pet: { l: 2, r: 2, c: 2, k: 1 }, poke: { l: fast(0, 1), r: fast(1, 0), c: 1, e: 1 }, asleep: { l: 2, r: 2, c: 0, k: 2, e: 0 } },
  },
  'skeleton+snail': {
    rows: [BLANK, '   ({E}  {E})   ', '    \\{m}/ .-.', '{a}(={r}=)({c})', '{l}'],
    parts: {
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      c: { v: ['@', 'o', '0'], r: lag(special, 2) },
      l: { v: ['  (_/__\\_)  ', '  (_|__\\_)~ ', '  (_/__|_)  '], r: step },
    },
    moods: { pet: { m: 1, a: 0, c: 2, l: fast(1, 2) }, poke: { m: 2, r: 1, a: 2, c: 1, l: 0 }, asleep: { m: 3, a: 2, r: 0, c: 0, l: 0 } },
  },
  'axolotl+ghost': {
    rows: [BLANK, '  {a}.-.{b}   ', '{c} ({E} {E}) {d} ', '   |{m} \\{t}  ', '    {h}  '],
    parts: {
      a: gill(['\\\\', '\\.'], 2), b: gill(['//', './'], 2, 1),
      c: gill(['==', '~='], 3), d: gill(['==', '=~'], 3, 1),
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      t: { v: ['  ', ' ~'], r: flap },
      h: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: fast(0, 1), b: fast(0, 1), t: 1 }, poke: { m: 2, c: 1, d: 1, h: fast(0, 1) }, asleep: { m: 1, a: 0, b: 0, c: 0, d: 0, t: 0, h: 0 } },
  },
  'capybara+ghost': {
    rows: [BLANK, '   {e}.--.{f}   ', '  ( {E}  {E} )  ', '  | ({n}) \\{a}', '  {t}  '],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~~~'", "`-~~~-~'", "`~-~~~-'"], r: hem(3), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 0, a: 1 }, poke: { n: 1, e: fast(0, 1), a: fast(0, 1), t: fast(0, 1) }, asleep: { e: 1, f: 1, n: 2, a: 0, t: 0 } },
  },
  'cactus+ghost': {
    rows: [BLANK, '{a} .--. {b}', '{c}({E}  {E}){d}', '{e}| {m} |{f}', '   {t}   '],
    parts: {
      ...arms,
      m: { v: [' o', 'ww', 'O ', '--'], r: special },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { ...ARMS(0), m: 1 }, poke: { ...ARMS(1), m: 2, t: fast(0, 1) }, asleep: { ...ARMS(2), m: 3, t: 0 } },
  },
  'ghost+robot': {
    rows: [BLANK, '  .------.  ', '  |[{E}  {E}]|  ', '  |[ {m} ]|{a}', '  {t}  '],
    parts: {
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~||~~'", "`-~||~~'", "`~~||-~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1 }, poke: { m: 2, a: fast(0, 1), t: fast(0, 1) }, asleep: { m: 1, a: 0, t: 0 } },
  },
  'ghost+rabbit': {
    rows: [BLANK, '    {l}{r}    ', '   ({E}{n}{E})    ', '   |(")(")\\ ', '   {h}{t} '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      h: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
      t: { v: ['o ', ' o', 'O '], r: wag(2, 3) },
    },
    moods: { pet: { l: 2, r: 2, n: 2, t: fast(0, 1) }, poke: { l: 1, r: 1, n: 1, t: 2, h: fast(0, 1) }, asleep: { l: 2, r: 2, n: 0, t: 0, h: 0 } },
  },
  'ghost+mushroom': {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", '   ({E}{m}{E})\\{a}', '   {t}   '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { s: 2, c: 1, m: 1, a: 1 }, poke: { s: fast(1, 2), c: fast(0, 1), m: 2, t: fast(0, 1) }, asleep: { s: 0, c: 0, m: 3, a: 0, t: 0 } },
  },
  'chonk+ghost': {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{m}{E} )__.  ', ' (       ){t}', ' {h}  '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      h: { v: ["`~~~~~~~'", "`-~~~-~~'", "`~~-~~~-'"], r: hem(3) },
    },
    moods: { pet: { m: 1, t: fast(0, 1) }, poke: { a: 2, b: 2, m: 3, h: fast(0, 1) }, asleep: { m: 0, a: 0, b: 0, t: 2, h: 0 } },
  },
  'ghost+imp': {
    rows: [BLANK, '  {h}  ', '  ( {E}  {E} )  ', '  |  {m} \\{t}', '  {d}  '],
    parts: {
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ["`~v~~v~'", "`v~~v~~'", "`~~v~~v'"], r: hem(3) },
    },
    moods: { pet: { h: 1, m: 1, t: fast(0, 1) }, poke: { h: 1, m: 2, t: 2, d: fast(0, 1) }, asleep: { h: 0, m: 3, t: 1, d: 0 } },
  },
  'bat+ghost': {
    rows: [BLANK, '{l}.--.{r}', '   ({E}  {E})   ', '   | {e} | ', '   {t}   '],
    parts: {
      l: { v: ['____', '\\___', '_/\\_'], r: flap, c: 'green' },
      r: { v: ['____', '___/', '_/\\_'], r: flap, c: 'green' },
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { l: 2, r: 2, t: fast(0, 1) }, poke: { l: 1, r: 1, e: 1, t: fast(1, 2) }, asleep: { l: 0, r: 0, e: 0, t: 0 } },
  },
  'ghost+skeleton': {
    rows: [BLANK, '   ({E}  {E})   ', '    \\{m}/    ', '{a}|={r}=|{b}', '   {t}   '],
    parts: {
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { m: 1, a: 0, b: 0, t: fast(1, 2) }, poke: { m: 2, r: 1, a: 2, b: 2, t: fast(0, 1) }, asleep: { m: 3, a: 2, b: 2, r: 0, t: 0 } },
  },
  'axolotl+capybara': {
    rows: [BLANK, ' {a}{e}.--.{f}{b} ', '{c}( {E}  {E} ){d}', '  ( ({n}) ){t}', '{w}'],
    parts: {
      a: gill(['\\\\', '\\.'], 2), b: gill(['//', './'], 2, 1),
      c: gill(['==', '~='], 3), d: gill(['==', '=~'], 3, 1),
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::', 'ww'], r: special },
      t: { v: ['  ', '~ '], r: breathe },
      w: { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 3, a: fast(0, 1), b: fast(0, 1), t: 1 }, poke: { n: 1, c: 1, d: 1, w: fast(1, 2) }, asleep: { e: 1, f: 1, n: 2, a: 0, b: 0, c: 0, d: 0, t: 0, w: 0 } },
  },
  'axolotl+cactus': {
    rows: [BLANK, '  {g}.--.{h}  ', '{c}|{E}  {E}|{d}', '{e}| {m} |{f}', '   |____|{t} '],
    parts: {
      g: gill(['\\\\', '\\.'], 2), h: gill(['//', './'], 2, 1),
      c: arms.c, d: arms.d, e: arms.e, f: arms.f,
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      t: { v: ['  ', '~ '], r: breathe, c: 'magenta' },
    },
    moods: {
      pet: { c: 0, d: 0, e: 0, f: 0, m: 3, g: fast(0, 1), h: fast(0, 1), t: 1 },
      poke: { c: 1, d: 1, e: 1, f: 1, m: 2 },
      asleep: { c: 0, d: 0, e: 1, f: 1, m: 1, g: 0, h: 0, t: 0 },
    },
  },
  'axolotl+robot': {
    rows: [BLANK, '{a}.------.{b}', '{c}|[{E}  {E}]|{d}', '{e}|[ {m} ]|{f}', "  '--||-{x}'{t}"],
    parts: {
      a: gill(['\\\\', '\\.'], 2), b: gill(['//', './'], 2, 1),
      c: gill(['==', '~='], 3), d: gill(['==', '=~'], 3, 1),
      e: gill(['//', "/'"], 2), f: gill(['\\\\', "'\\"], 2, 1),
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      x: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
      t: { v: ['  ', '~ '], r: breathe },
    },
    moods: { pet: { m: 3, x: 1, a: fast(0, 1), b: fast(0, 1), t: 1 }, poke: { m: 2, x: fast(0, 1), c: 1, d: 1, e: 1, f: 1 }, asleep: { m: 1, x: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, t: 0 } },
  },
}
