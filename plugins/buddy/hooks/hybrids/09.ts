import type { Rig } from '../rhythms.ts'
import { BLANK, twitch, wag, breathe, special, step, flap, fast, lag, ARMS, arms } from '../rhythms.ts'

const gill = (v: string[], r: ReturnType<typeof wag>) => ({ v, r, c: 'magenta' })
const water = (v: string[]) => ({ v, r: wag(3, 2), c: 'cyan' })

export const BATCH: Record<string, Rig> = {
  'axolotl+rabbit': {
    rows: [BLANK, '   {l}{r}     ', '{c}( {E}{n}{E} ){d} ', ' {e}(")("){f} ', "  `-^--^-'{t}"],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      c: gill(['==', '~='], wag(2, 3)),
      d: gill(['==', '=~'], lag(wag(2, 3), 1)),
      e: gill(['//', "/'"], wag(2, 2)),
      f: gill(['\\\\', "'\\"], lag(wag(2, 2), 1)),
      t: { v: ['o ', 'o~'], r: breathe },
    },
    moods: { pet: { l: 2, r: 2, n: 2, t: fast(0, 1) }, poke: { l: 1, r: 1, n: 1, c: 1, d: 1 }, asleep: { l: 2, r: 2, n: 0, c: 0, d: 0, e: 0, f: 0, t: 0 } },
  },
  'axolotl+mushroom': {
    rows: ['{s}', '  .-{k}-.  ', " `-.____.-' ", ' {c}({E}{m}{E}){d} ', '  {e}(__){f}  '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      k: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['ww', '__', 'oo', '--'], r: special },
      c: gill(['==', '~='], wag(2, 3)),
      d: gill(['==', '=~'], lag(wag(2, 3), 1)),
      e: gill(['//', "/'"], wag(2, 2)),
      f: gill(['\\\\', "'\\"], lag(wag(2, 2), 1)),
    },
    moods: { pet: { s: 2, m: 0, k: 1 }, poke: { s: fast(1, 2), m: 2, c: 1, d: 1, k: fast(0, 1) }, asleep: { s: 0, m: 3, c: 0, d: 0, e: 0, f: 0, k: 0 } },
  },
  'axolotl+chonk': {
    rows: [BLANK, '  {a}_{b}     ', '{c}( {E}{m}{E} )__.', '{e}(      ){t}', "   `{p}'   "],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['w', '.', 'o', '-'], r: special },
      c: gill(['==', '~='], wag(2, 3)),
      e: gill(['//', "/'"], lag(wag(2, 2), 1)),
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['^--^', '-^^-'], r: step },
    },
    moods: { pet: { m: 0, t: fast(0, 1), c: 1 }, poke: { a: 2, b: 2, m: 2, p: 1, c: fast(0, 1) }, asleep: { m: 3, a: 0, b: 0, t: 2, p: 0, c: 0, e: 0 } },
  },
  'axolotl+imp': {
    rows: [BLANK, '  {h}  ', '{c}( {E}  {E} ){d}', '   ( {m} ){t}', '  {e}v  v{f}  '],
    parts: {
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      c: gill(['==', '~='], wag(2, 3)),
      d: gill(['==', '=~'], lag(wag(2, 3), 1)),
      e: gill(['//', "/'"], wag(2, 2)),
      f: gill(['\\\\', "'\\"], lag(wag(2, 2), 1)),
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
    },
    moods: { pet: { h: 1, m: 1, t: fast(0, 1), c: 1, d: 1 }, poke: { h: 1, m: 2, t: 2, e: 1, f: 1 }, asleep: { h: 0, m: 3, t: 1, c: 0, d: 0, e: 0, f: 0 } },
  },
  'axolotl+bat': {
    rows: [BLANK, ' {a}_.--._{b} ', '{l}({E}  {E}){r}', '   ( {m} )   ', '    {k}    '],
    parts: {
      a: gill(['\\\\', '\\.'], wag(2, 2)),
      b: gill(['//', './'], lag(wag(2, 2), 1)),
      l: { v: ['/\\/', '\\/\\'], r: flap, c: 'green' },
      r: { v: ['\\/\\', '/\\/'], r: lag(flap, 1), c: 'green' },
      m: { v: ['ww', 'vv', 'oo', '--'], r: special },
      k: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { m: 0, a: fast(0, 1), b: fast(0, 1) }, poke: { m: 2, l: fast(0, 1), r: fast(1, 0), k: 1 }, asleep: { m: 3, a: 0, b: 0, l: 0, r: 0, k: 0 } },
  },
  'axolotl+skeleton': {
    rows: [BLANK, ' {c}({E}  {E}){d} ', '    \\{m}/    ', '{a}(={r}=){b}', '   {l}{t} '],
    parts: {
      c: gill(['==', '~='], wag(2, 3)),
      d: gill(['==', '=~'], lag(wag(2, 3), 1)),
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
      t: { v: ['  ', '~ '], r: breathe, c: 'magenta' },
    },
    moods: { pet: { m: 1, c: 1, d: 1, t: fast(0, 1) }, poke: { m: 2, a: 2, b: 2, r: 1, c: fast(0, 1) }, asleep: { m: 3, a: 2, b: 2, r: 0, l: 0, c: 0, d: 0, t: 0 } },
  },
  'cactus+capybara': {
    rows: [BLANK, '{a} {u}--{v} {b}', '{c}|{E}  {E}|{d}', '{e}|({n})|{f}', '{w}'],
    parts: {
      ...arms,
      u: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      v: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      w: water(['~~~|____|~~~', '-~~|____|-~~', '~-~|____|~-~']),
    },
    moods: { pet: { ...ARMS(0), u: 1, v: 1, n: 0 }, poke: { ...ARMS(1), n: 1, w: fast(1, 2) }, asleep: { ...ARMS(2), u: 1, v: 1, n: 2, w: 0 } },
  },
  'capybara+robot': {
    rows: [BLANK, '  {e}.----.{f}  ', '  |[{E}  {E}]|  ', '  |[({n})]|  ', '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '<>', '::'], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      w: water(['~~~~||~~~~~~', '-~~~||~-~~~~', '~-~~||~~-~~~']),
    },
    moods: { pet: { e: 1, f: 1, n: 0 }, poke: { n: 2, w: fast(1, 2), e: fast(0, 1) }, asleep: { e: 1, f: 1, n: 3, w: 0 } },
  },
  'capybara+rabbit': {
    rows: [BLANK, '   {l}{r}     ', '  ( {E}  {E} )  ', '  ( ({n}) ){t}', '{w}'],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['..', 'xx', 'ww', '::'], r: special },
      t: { v: ['o ', 'O '], r: wag(2, 3) },
      w: water(['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~']),
    },
    moods: { pet: { l: 2, r: 2, n: 2, t: fast(0, 1) }, poke: { l: 1, r: 1, n: 1, w: fast(1, 2) }, asleep: { l: 2, r: 2, n: 3, t: 0, w: 0 } },
  },
  'capybara+mushroom': {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", '  ( {E}{n}{E} )  ', '{w}'],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      n: { v: ['..', 'oo', '::'], r: special },
      w: water(['~~~(____)~~~', '-~~(____)-~~', '~-~(____)~-~']),
    },
    moods: { pet: { s: 2, c: 1, n: 0 }, poke: { s: fast(1, 2), c: fast(0, 1), n: 1, w: fast(1, 2) }, asleep: { s: 0, c: 0, n: 2, w: 0 } },
  },
  'capybara+chonk': {
    rows: [BLANK, '   {e}__{f}     ', '( {E}{n}{E} )__. ', ' (       ){t}', '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      w: water(['~~uu~~uu~~~~', '-~uu-~uu~-~~', '~-uu~-uu~~-~']),
    },
    moods: { pet: { e: 1, f: 1, n: 0, t: fast(0, 1) }, poke: { n: 1, t: 2, w: fast(1, 2) }, asleep: { e: 1, f: 1, n: 2, t: 2, w: 0 } },
  },
  'capybara+imp': {
    rows: [BLANK, ' {h}   ', ' ( {E}  {E} )   ', ' ( ({n}) ){t}', '{w}'],
    parts: {
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      n: { v: ['..', 'vv', 'oo', '::'], r: special },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      w: water(['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~']),
    },
    moods: { pet: { h: 1, n: 1, t: fast(0, 1) }, poke: { h: 1, n: 2, t: 2, w: fast(1, 2) }, asleep: { h: 0, n: 3, t: 1, w: 0 } },
  },
  'bat+capybara': {
    rows: [BLANK, '   {e}.--.{f}   ', '{l}( {E}  {E} ){r}', '  ( ({n}) )  ', '    {k}    '],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      l: { v: ['/\\', '_/'], r: flap, c: 'green' },
      r: { v: ['/\\', '\\_'], r: lag(flap, 1), c: 'green' },
      n: { v: ['..', 'oo', '::'], r: special },
      k: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { e: 1, f: 1, n: 0, l: 1, r: 1 }, poke: { n: 1, l: fast(0, 1), r: fast(1, 0), k: 1 }, asleep: { e: 1, f: 1, n: 2, l: 1, r: 1, k: 0 } },
  },
  'capybara+skeleton': {
    rows: [BLANK, '  {e}({E}  {E}){f}  ', '   \\({n})/   ', '{a}(={r}=){b}', '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      w: water(['~~~_/  \\_~~~', '-~~_/  \\_-~~', '~-~_/  \\_~-~']),
    },
    moods: { pet: { e: 1, f: 1, n: 0, a: 0, b: 0 }, poke: { n: 1, r: 1, a: 2, b: 2, w: fast(1, 2) }, asleep: { e: 1, f: 1, n: 2, a: 2, b: 2, r: 0, w: 0 } },
  },
  'cactus+robot': {
    rows: [BLANK, '{a}.----.{b}', '{c}[{E}  {E}]{d}', '{e}[ {m} ]{f}', '   |_|{g}_|   '],
    parts: {
      ...arms,
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      g: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
    },
    moods: { pet: { ...ARMS(0), m: 3, g: 1 }, poke: { ...ARMS(1), m: 2, g: fast(0, 1) }, asleep: { ...ARMS(2), m: 1, g: 0 } },
  },
  'cactus+rabbit': {
    rows: [BLANK, '{a} {l}{r} {b}', '{c}|{E}{n}{E} |{d}', '{e}| {m} |{f}', ' {g}|____|{t} '],
    parts: {
      ...arms,
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      m: { v: ['  ', 'ww', 'oo', '--'], r: special },
      g: { v: ["''", ',,'], r: wag(2, 4), c: 'green' },
      t: { v: ['o ', 'O '], r: wag(2, 3) },
    },
    moods: { pet: { ...ARMS(0), l: 2, r: 2, n: 2, m: 1 }, poke: { ...ARMS(1), l: 1, r: 1, n: 1, m: 2 }, asleep: { ...ARMS(2), l: 2, r: 2, n: 0, m: 3, g: 0, t: 0 } },
  },
  'cactus+mushroom': {
    rows: ['{s}', '  .-{k}-.  ', "{a}`-..-'{b}", '{c}|{E}{m}{E}|{d}', '{e}|____|{f}'],
    parts: {
      ...arms,
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      k: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
    },
    moods: { pet: { ...ARMS(0), s: 2, m: 1 }, poke: { ...ARMS(1), s: fast(1, 2), k: fast(0, 1), m: 2 }, asleep: { ...ARMS(2), s: 0, k: 0, m: 3 } },
  },
  'cactus+chonk': {
    rows: [BLANK, '{a}{p}__{q}{b}', '{c}({E}{m}{E}){d}', '{e}(:  :){f}', '   {u}{t} '],
    parts: {
      ...arms,
      p: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      q: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['..', 'ww', 'oo', '--'], r: special },
      u: { v: ['uu--uu', 'u-u-uu'], r: step },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
    },
    moods: { pet: { ...ARMS(0), m: 1, t: fast(0, 1) }, poke: { ...ARMS(1), p: 2, q: 2, m: 2, u: 1 }, asleep: { ...ARMS(2), p: 0, q: 0, m: 3, t: 2, u: 0 } },
  },
  'cactus+imp': {
    rows: [BLANK, '{a}{h}.--.{k}{b}', '{c}|{E}  {E}|{d}', '{e}| {m} |{f}', '   |____|{t}'],
    parts: {
      ...arms,
      h: { v: ['\\', '|'], r: twitch(3, 13), c: 'red' },
      k: { v: ['/', '|'], r: twitch(3, 13), c: 'red' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
    },
    moods: { pet: { ...ARMS(0), h: 1, k: 1, m: 1, t: fast(0, 1) }, poke: { ...ARMS(1), m: 2, t: 2 }, asleep: { ...ARMS(2), h: 0, k: 0, m: 3, t: 1 } },
  },
  'bat+cactus': {
    rows: [BLANK, '{l}.\\/.{r}', '{c}|{E}  {E}|{d}', '{e}| {m} |{f}', '   |{k}|   '],
    parts: {
      ...arms,
      l: { v: ['____', '\\/\\_'], r: flap, c: 'green' },
      r: { v: ['____', '_/\\/'], r: lag(flap, 1), c: 'green' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      k: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { ...ARMS(0), m: 1, l: 0, r: 0 }, poke: { ...ARMS(1), m: 2, l: fast(0, 1), r: fast(1, 0), k: 1 }, asleep: { ...ARMS(2), m: 3, l: 0, r: 0, k: 0 } },
  },
  'cactus+skeleton': {
    rows: [BLANK, '{a}({E}  {E}){b}', '{c} \\{m}/ {d}', '{e}(:{r}:){f}', '   {l}   '],
    parts: {
      ...arms,
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: { pet: { ...ARMS(0), m: 1, l: fast(1, 2) }, poke: { ...ARMS(1), m: 2, r: 1, l: 0 }, asleep: { ...ARMS(2), m: 3, r: 0, l: 0 } },
  },
}
