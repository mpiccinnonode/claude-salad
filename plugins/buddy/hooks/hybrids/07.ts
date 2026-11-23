import type { Rig, Rhythm } from '../rhythms.ts'
import { beat, twitch, wag, breathe, special, step, flap, fast, lag, BLANK, tuft, hem, arms } from '../rhythms.ts'

const fin: Rhythm = (t, w) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2)
const crawl: Rhythm = (t, w) => (w ? t % 3 : step(t, w))
const beak = { v: ['>', 'v'], r: special, c: 'yellow' }
const flipL = { v: ['/', '|', '\\'], r: fin }
const flipR = { v: ['\\', '|', '/'], r: fin }
const water = { v: ['~~~~~~~~~~~~', '-~~~-~~~-~~~', '~-~~~-~~~-~~'], r: wag(3, 2), c: 'cyan' }

export const BATCH: Record<string, Rig> = {
  'penguin+rabbit': {
    rows: [BLANK, '    {l}{r}    ', '   ({E}{b}{E})    ', '  {a}(   ){c}{t}  ', '   {f}   '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      b: beak,
      a: flipL,
      c: flipR,
      t: { v: ['o', 'O'], r: wag(2, 3) },
      f: { v: ['(")(")', "(')(\")"], r: step },
    },
    moods: {
      pet: { l: 2, r: 2, b: 1, a: 1, c: 1, t: fast(0, 1) },
      poke: { l: 1, r: 1, a: 0, c: 0, t: 1, f: fast(0, 1) },
      asleep: { l: 2, r: 2, b: 0, a: 1, c: 1, t: 0, f: 0 },
    },
  },
  'mushroom+penguin': {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", '   {l}({E}{b}{E}){r}  ', '   {f}   '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      b: beak,
      l: flipL,
      r: flipR,
      f: { v: ["(`--')", "(`-^')", "(^--')"], r: step },
    },
    moods: {
      pet: { s: 2, c: 1, b: 1, l: 1, r: 1 },
      poke: { s: fast(1, 2), c: fast(0, 1), l: 0, r: 0, f: fast(1, 2) },
      asleep: { s: 0, c: 0, b: 0, l: 1, r: 1, f: 0 },
    },
  },
  'chonk+penguin': {
    rows: [BLANK, ' {a}_{d}      ', '( {E}{k}{E} )__.  ', '{l}( (   ) ){t}', '  {p}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      d: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      k: { v: ['>', 'v', 'o'], r: special, c: 'yellow' },
      l: flipL,
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ["`u--u'", "`u-^u'"], r: step },
    },
    moods: {
      pet: { k: 1, l: 1, t: fast(0, 1) },
      poke: { a: 2, d: 2, k: 2, l: 0, p: 1 },
      asleep: { a: 0, d: 0, k: 0, l: 1, t: 2, p: 0 },
    },
  },
  'imp+penguin': {
    rows: [BLANK, '  {h}   ', '   ({E}{b}{E})    ', '  {l}(   ){r}{t}', '   {d}    '],
    parts: {
      h: { v: ['(\\.-./)', '(|.-.|)'], r: twitch(3, 13), c: 'red' },
      b: beak,
      l: flipL,
      r: flipR,
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ["`v-v'", "`-vv'"], r: step },
    },
    moods: {
      pet: { h: 1, b: 1, l: 1, r: 1, t: fast(0, 1) },
      poke: { h: 1, l: 0, r: 0, t: 2, d: 1 },
      asleep: { h: 0, b: 0, l: 1, r: 1, t: 1, d: 0 },
    },
  },
  'bat+penguin': {
    rows: [BLANK, '   {e}  ', '    ({E}{b}{E})   ', ' {l}(   ){r}', '    {f}   '],
    parts: {
      e: { v: ['/\\.-./\\', '/|.-.|\\'], r: twitch(6, 14) },
      b: beak,
      l: { v: ['/\\/', '\\/\\', '  ('], r: wag(2, 4), c: 'green' },
      r: { v: ['\\/\\', '/\\/', ')  '], r: lag(wag(2, 4), 1), c: 'green' },
      f: { v: ["`---'", "`--^'", "^---'"], r: step },
    },
    moods: {
      pet: { b: 1, l: fast(0, 1), r: fast(0, 1) },
      poke: { e: 1, l: 1, r: 1, f: fast(1, 2) },
      asleep: { e: 0, b: 0, l: 2, r: 2, f: 0 },
    },
  },
  'penguin+skeleton': {
    rows: [BLANK, '   {h}    ', '   ({E}{b}{E})    ', '  {l}(={k}=){x}   ', '   {f}    '],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: beak,
      l: flipL,
      x: flipR,
      k: { v: ['|', ':'], r: wag(2, 4) },
      f: { v: ['_/ \\_', '_| \\_', '_/ |_'], r: step },
    },
    moods: {
      pet: { b: 1, l: 1, x: 1, k: 1, f: fast(1, 2) },
      poke: { h: 1, k: 1, l: 0, x: 0, f: 0 },
      asleep: { h: 0, b: 0, l: 1, x: 1, k: 0, f: 0 },
    },
  },
  'snail+turtle': {
    rows: [BLANK, ' _.----._ {E}{E}', '/\\_( {c} )_/{k}', '\\_/\\_/\\___/ ', '{f}'],
    parts: {
      k: { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) },
      c: { v: ['@', 'o', '0'], r: special },
      f: { v: ['  ""    ""~ ', '   ""  "" ~~', ' ""    "" ~ '], r: crawl },
    },
    moods: {
      pet: { c: 2, k: 1 },
      poke: { k: 1, c: 1, f: fast(0, 1) },
      asleep: { c: 0, k: 2, f: 0 },
    },
  },
  'ghost+turtle': {
    rows: [BLANK, ' _.----._   ', '/\\_/\\_/({E}{m}{E})', '\\_/\\_/\\__/{a}', ' {t}  '],
    parts: {
      m: { v: ['O', 'o', '-', 'w'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~~~~'", "`-~~~~~~'", "`~~-~~~~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1 }, poke: { m: 0, a: fast(0, 1), t: fast(0, 1) }, asleep: { m: 2, a: 0, t: 0 } },
  },
  'axolotl+turtle': {
    rows: [BLANK, ' _.----.{a}{b}', '/\\_/\\_/({E}{m}{E})', '\\_/\\_/\\_{e}{f}', '{t}{p}'],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      e: { v: ['//', "/'"], r: wag(2, 2), c: 'magenta' },
      f: { v: ['\\\\', "'\\"], r: lag(wag(2, 2), 1), c: 'magenta' },
      m: { v: ['w', '-', 'o', 'v'], r: special },
      t: { v: ['~', '-'], r: breathe },
      p: { v: [' ""    ""  ', '  ""  ""   ', '""    ""   '], r: crawl },
    },
    moods: {
      pet: { m: 3, a: fast(0, 1), b: fast(0, 1), t: 1 },
      poke: { m: 2, e: 1, f: 1, p: fast(0, 2) },
      asleep: { m: 1, a: 0, b: 0, e: 0, f: 0, t: 0, p: 2 },
    },
  },
  'capybara+turtle': {
    rows: [BLANK, ' _.--.{e}.--.{f}', '/\\_/\\_({E}{n}{E})', '\\_/\\_/\\___/ ', '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      w: water,
    },
    moods: { pet: { e: 1, f: 1, n: 0 }, poke: { n: 1, w: fast(1, 2), e: fast(0, 1) }, asleep: { e: 1, f: 1, n: 2, w: 0 } },
  },
  'cactus+turtle': {
    rows: [BLANK, '{a}{s}    ', '{c}|.:.|({E}{E})', '{e}|___|    ', '{p}'],
    parts: {
      a: arms.a,
      c: arms.c,
      e: arms.e,
      s: { v: [".'.'.", "'.'.'"], r: wag(2, 3), c: 'green' },
      p: { v: ['   "" ""    ', '    ""  ""  ', '  ""  ""    '], r: crawl },
    },
    moods: {
      pet: { a: 0, c: 0, e: 0, s: 1 },
      poke: { a: 1, c: 1, e: 1, p: fast(0, 2) },
      asleep: { a: 2, c: 2, e: 2, s: 0, p: 2 },
    },
  },
  'robot+turtle': {
    rows: [BLANK, ' .------.   ', ' |[{m}]|-[{E}{E}]', " '--{f}----'  ", '{p}'],
    parts: {
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      f: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
      p: { v: ['  []    []  ', '   []  []   ', ' []    []   '], r: crawl },
    },
    moods: { pet: { m: 3, f: 1 }, poke: { m: 2, f: fast(0, 1), p: fast(0, 2) }, asleep: { m: 1, f: 0, p: 2 } },
  },
  'rabbit+turtle': {
    rows: [BLANK, ' _.----.{l}{r}', '/\\_/\\_/({E}{n}{E})', '{t}\\_/\\_/\\_/  ', '{p}{g}'],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['o', 'O'], r: wag(2, 3) },
      p: { v: [' (") (")', '(")  (")', '  (")(")'], r: crawl },
      g: { v: ["_''_", '_,,_'], r: wag(2, 4), c: 'green' },
    },
    moods: {
      pet: { l: 2, r: 2, n: 2, t: fast(0, 1) },
      poke: { l: 1, r: 1, n: 1, p: fast(0, 1) },
      asleep: { l: 2, r: 2, n: 0, t: 0, g: 0, p: 0 },
    },
  },
  'mushroom+turtle': {
    rows: ['{s}', '.-{c}-.    ', "`-.__.'({E}{m}{E})", '  {g}    ', '{p}'],
    parts: {
      s: { v: [BLANK, '  .  o      ', ' o  .       '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['_', 'w', 'o', '-'], r: special },
      g: { v: ['(____)', '(_/\\_)'], r: step },
      p: { v: ['  ""  ""    ', '   "" ""    ', ' ""  ""     '], r: lag(crawl, 1) },
    },
    moods: {
      pet: { s: 2, c: 1, m: 1 },
      poke: { s: fast(1, 2), c: fast(0, 1), m: 2, p: fast(0, 2) },
      asleep: { s: 0, c: 0, m: 3, g: 0, p: 2 },
    },
  },
  'chonk+turtle': {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{m}{E} )/\\_/\\', ' (\\_/\\_/\\){t}', '  {p}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['""__""', '"_"_""'], r: step },
    },
    moods: {
      pet: { m: 1, t: fast(0, 1) },
      poke: { a: 2, b: 2, m: 3, p: 1 },
      asleep: { m: 0, a: 0, b: 0, t: 2, p: 0 },
    },
  },
  'imp+turtle': {
    rows: [BLANK, '{h}_.---._', '({E}{m}{E})\\_/\\_/\\', '   \\_/\\_/{t}', '{p}'],
    parts: {
      h: { v: ['(\\ /)', '(| |)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['v', 'w', 'o', '-'], r: special },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      p: { v: ['   vv    vv ', '    vv  vv  ', '  vv    vv  '], r: crawl },
    },
    moods: {
      pet: { h: 1, m: 1, t: fast(0, 1) },
      poke: { h: 1, m: 2, t: 2, p: fast(0, 2) },
      asleep: { h: 0, m: 3, t: 1, p: 2 },
    },
  },
  'bat+turtle': {
    rows: [BLANK, '{l}_.--._{r}', '  /\\_/\\_/\\  ', '  \\({E}  {E})/  ', '  {e}  '],
    parts: {
      l: { v: ['___', '/\\_', '\\/_'], r: wag(3, 2), c: 'green' },
      r: { v: ['___', '_/\\', '_\\/'], r: lag(wag(3, 2), 1), c: 'green' },
      e: { v: ['""\\/\\/""', '""\\/|/""', '""\\|\\/""'], r: twitch(6, 14) },
    },
    moods: {
      pet: { l: 2, r: 2, e: fast(0, 1) },
      poke: { l: 1, r: 1, e: fast(1, 2) },
      asleep: { l: 0, r: 0, e: 0 },
    },
  },
  'skeleton+turtle': {
    rows: [BLANK, '      _.--._', '({E} {E}) /{r}{r}\\', ' \\{m}/_\\{r}{r}/', '      {l}'],
    parts: {
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: { pet: { m: 1, l: fast(1, 2) }, poke: { m: 2, r: 1, l: 0 }, asleep: { m: 3, r: 0, l: 0 } },
  },
  'ghost+snail': {
    rows: [BLANK, '  .--.  {E}{E}  ', ' ( {c}  ) {k}  ', "  `--'__{m}/{w}", ' {t}  '],
    parts: {
      k: { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) },
      c: { v: ['@', 'o', '0'], r: special },
      m: { v: ['O', 'o', '-', 'w'], r: lag(special, 1) },
      w: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~~~~'", "`-~~~~~~'", "`~~-~~~~'"], r: hem(3) },
    },
    moods: {
      pet: { m: 3, c: 2, k: 1 },
      poke: { m: 0, k: 1, w: fast(0, 1), t: fast(0, 1) },
      asleep: { m: 2, c: 0, k: 2, w: 0, t: 0 },
    },
  },
  'axolotl+snail': {
    rows: [BLANK, '  .--. {a}{b} ', ' ( {c}  )({E}{E}){d}', "  `--'_({m}){e}", ' (_______){t}'],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      d: { v: ['=', '~'], r: wag(2, 3), c: 'magenta' },
      e: { v: ['=', '~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      c: { v: ['@', 'o', '0'], r: special },
      m: { v: ['ww', '--', 'oo', 'vv'], r: lag(special, 1) },
      t: { v: ['  ', '~ ', '~~'], r: (t, w) => (w ? t % 3 : step(t, w) + breathe(t, w)) },
    },
    moods: {
      pet: { m: 3, c: 2, a: fast(0, 1), b: fast(0, 1), t: 1 },
      poke: { m: 2, c: 1, d: 1, e: 1, t: fast(1, 2) },
      asleep: { m: 1, c: 0, a: 0, b: 0, d: 0, e: 0, t: 0 },
    },
  },
  'capybara+snail': {
    rows: [BLANK, ' .--. {e}.--.{f}', '( {c}  )({E}{n}{E})', "(`----'    )", '{w}'],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      c: { v: ['@', 'o', '0'], r: lag(special, 2) },
      n: { v: ['..', 'oo', '::'], r: special },
      w: water,
    },
    moods: {
      pet: { e: 1, f: 1, n: 0, c: 2 },
      poke: { n: 1, c: 1, w: fast(1, 2), e: fast(0, 1) },
      asleep: { e: 1, f: 1, n: 2, c: 0, w: 0 },
    },
  },
}
