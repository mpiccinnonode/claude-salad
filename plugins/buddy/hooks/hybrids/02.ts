import type { Rig } from '../rhythms.ts'
import { beat, twitch, wag, breathe, special, step, flap, fast, lag, BLANK, ears, smoke, tufts, hem, arms, ARMS } from '../rhythms.ts'

const beak = { v: ['<', '='], r: special, c: 'yellow' }
const wing = { v: ['___', '__,', '_,-'], r: wag(3, 3) }
const rump = { v: ['`-._ ', '`-.__', '`--._'], r: lag(wag(3, 3), 1) }
const catEars = { v: ['/\\_/\\', '/\\-/\\', '/|_/\\', '-\\_/-'], r: ears }
const neck = { v: [') )', ' ))', ')) '], r: wag(3, 3) }
const flipper = (t: number, w: boolean) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2)
const fire = (t: number, w: boolean) => (special(t, w) ? 2 : step(t, w))

export const BATCH: Record<string, Rig> = {
  'cat+goose': {
    rows: [BLANK, '  {e}     ', ' {b}( {E}.{E} )   ', '    {n}{w}  ', '   ({k}){t}'],
    parts: {
      e: catEars,
      b: beak,
      n: neck,
      w: wing,
      k: rump,
      t: { v: ['  ', '~ ', ') ', '_)'], r: wag(4) },
    },
    moods: { pet: { e: 0, w: 2, t: fast(1, 2) }, poke: { e: 3, b: 1, w: fast(0, 2), t: 3 }, asleep: { e: 3, b: 0, n: 0, w: 0, k: 0, t: 0 } },
  },
  'dragon+goose': {
    rows: ['{s}', ' {f}{b}{E} /)    ', '    {n}{w}', '   ( {k}) ', "    `-{v}-'  "],
    parts: {
      s: smoke,
      f: { v: ['  ', ' ~', '~*'], r: special, c: 'red' },
      b: beak,
      n: neck,
      w: { v: ['/\\/\\/', '/\\/\\_', '_/\\/\\'], r: wag(3, 3) },
      k: rump,
      v: { v: ['vv', 'VV', '~~'], r: fire, c: 'red' },
    },
    moods: { pet: { s: 0, f: 0, w: 2, v: 0 }, poke: { s: fast(1, 2), f: 2, b: 1, w: fast(0, 1) }, asleep: { s: 0, f: 0, b: 0, n: 0, w: 0, k: 0, v: 1 } },
  },
  'goose+octopus': {
    rows: ['{o}', '  {b}{E} )      ', '   .{n}""-. ', '  {t}  ', ' {u} '],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special },
      b: beak,
      n: neck,
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { n: 1, t: 2, u: 2 }, poke: { o: 2, b: 1, t: fast(0, 1), u: fast(0, 1) }, asleep: { o: 0, b: 0, n: 0, t: 0, u: 2 } },
  },
  'goose+owl': {
    rows: [BLANK, '  {e}     ', ' {b}(({E}))     ', '  {l}(:{u}:){w}', "   `-{f}-'  "],
    parts: {
      e: { v: ['\\,_,/', '|,_,/', '\\,_,|'], r: tufts },
      b: beak,
      l: { v: [' (', '//', '__'], r: (t, w) => (flap(t, w) ? 1 + (t % 2) : 0) },
      u: { v: ['V', 'v'], r: breathe },
      w: wing,
      f: { v: ['"-"', '"_"'], r: step },
    },
    moods: { pet: { l: 1, u: 1, w: 2 }, poke: { e: 1, b: 1, l: fast(1, 2), w: fast(0, 2), f: 1 }, asleep: { e: 0, b: 0, l: 0, u: 0, w: 0, f: 0 } },
  },
  'goose+penguin': {
    rows: [BLANK, '  {b}{E} )      ', '    {n}     ', '   {l}( : ){r}  ', '    {f}   '],
    parts: {
      b: beak,
      n: neck,
      l: { v: ['/', '|', '\\'], r: flipper },
      r: { v: ['\\', '|', '/'], r: flipper },
      f: { v: ["`---'", "`--^'", "^---'"], r: step },
    },
    moods: { pet: { n: 1, l: 1, r: 1 }, poke: { b: 1, n: fast(0, 2), l: 0, r: 0, f: fast(1, 2) }, asleep: { b: 0, n: 0, l: 1, r: 1, f: 0 } },
  },
  'goose+turtle': {
    rows: [BLANK, ' {b}{E} )       ', '  {n}_.--._ ', '    /\\_/\\_/\\', '{f}'],
    parts: {
      b: beak,
      n: neck,
      f: { v: ['    ""  "" ', '     "" "" ', '    "" ""  '].map(s => s + ' '), r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { n: 1, f: 1 }, poke: { b: 1, n: fast(0, 2), f: fast(0, 2) }, asleep: { b: 0, n: 0, f: 2 } },
  },
  'goose+snail': {
    rows: [BLANK, '  {b}{E} )      ', '   {n} .--. ', '   (  ( {c}  )', '{f}'],
    parts: {
      b: beak,
      n: neck,
      c: { v: ['@', 'o', '0'], r: special },
      f: { v: ['  (_______) ', '  (_______)~', '  (_______) '], r: step },
    },
    moods: { pet: { n: 1, c: 2 }, poke: { b: 1, n: fast(0, 2), c: 1, f: fast(0, 1) }, asleep: { b: 0, n: 0, c: 0, f: 0 } },
  },
  'ghost+goose': {
    rows: [BLANK, '  {b}{E} {m})     ', '    {n}{w}  ', '   |     \\{a}', '    {t}  '],
    parts: {
      b: beak,
      m: { v: ['O', 'o', '-', 'w'], r: special },
      n: neck,
      w: wing,
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~'", "`-~~~'", "`~~-~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, w: 2, a: 1 }, poke: { b: 1, m: 0, a: fast(0, 1), t: fast(0, 1) }, asleep: { b: 0, m: 2, w: 0, a: 0, t: 0 } },
  },
  'axolotl+goose': {
    rows: [BLANK, '  {a}{b}{E} ){d}  ', '    {n}{w}  ', '   ( {k}) ', "    `-^^-'{t}"],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: beak,
      d: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      n: neck,
      w: wing,
      k: rump,
      t: { v: ['  ', '~ '], r: breathe },
    },
    moods: { pet: { a: fast(0, 1), d: fast(0, 1), w: 2, t: 1 }, poke: { a: 1, d: 1, b: 1, w: fast(0, 2) }, asleep: { a: 0, d: 0, b: 0, n: 0, w: 0, k: 0, t: 0 } },
  },
  'capybara+goose': {
    rows: [BLANK, '  {e}.--.{f}    ', ' ({E} {n} {E})   ', '    ) ){w}  ', "{x}`----'{y}"],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      w: wing,
      x: { v: ['~~~~', ' ~~~', '~ ~~'], r: wag(3, 2), c: 'cyan' },
      y: { v: ['~~', '~ ', ' ~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 0, w: 2 }, poke: { n: 1, e: fast(0, 1), w: fast(0, 2), x: fast(1, 2) }, asleep: { e: 1, f: 1, n: 2, w: 0, x: 0, y: 0 } },
  },
  'cactus+goose': {
    rows: [BLANK, '{a} {k}{E} ) {b}', '{c}| ) )|{d}', '{e}|{w} |{f}', '   |____|   '],
    parts: { ...arms, k: beak, w: wing },
    moods: { pet: { ...ARMS(0), w: 2 }, poke: { ...ARMS(1), k: 1 }, asleep: { ...ARMS(2), k: 0, w: 0 } },
  },
  'goose+robot': {
    rows: [BLANK, '  {b}[{E}]{f}     ', '   ||.----. ', '   |[ {m} ]| ', "   '--||-'  "],
    parts: {
      b: beak,
      f: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
    },
    moods: { pet: { m: 3, f: 1 }, poke: { b: 1, m: 2, f: fast(0, 1) }, asleep: { b: 0, m: 1, f: 0 } },
  },
  'goose+rabbit': {
    rows: [BLANK, '   {l}{r}     ', '  {b}( {E} )    ', '    {n}{w}  ', '   (")--("){t}'],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      b: beak,
      n: neck,
      w: wing,
      t: { v: ['o', 'O'], r: wag(2, 3) },
    },
    moods: { pet: { l: 2, r: 2, w: 2, t: fast(0, 1) }, poke: { l: 1, r: 1, b: 1, n: fast(0, 2), w: fast(0, 2), t: 1 }, asleep: { l: 2, r: 2, b: 0, n: 0, w: 0, t: 0 } },
  },
  'goose+mushroom': {
    rows: ['{s}', '  {b}{E} )      ', '   ).-{c}-.', "   `-.___.-'", '     {g} '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      b: beak,
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      g: { v: ['(____)', '(_/\\_)'], r: step },
    },
    moods: { pet: { s: 2, c: 1 }, poke: { s: fast(1, 2), b: 1, c: fast(0, 1), g: 1 }, asleep: { s: 0, b: 0, c: 0, g: 0 } },
  },
  'chonk+goose': {
    rows: [BLANK, '  {a}_{b}     ', ' {k}( {E} {E} )__.', ' ( {w}   ){t}', '  {p}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      k: beak,
      w: wing,
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { w: 2, t: fast(0, 1) }, poke: { a: 2, b: 2, k: 1, w: fast(0, 2), p: 1 }, asleep: { a: 0, b: 0, k: 0, w: 0, t: 2, p: 0 } },
  },
  'goose+imp': {
    rows: [BLANK, '   {h}     ', '  {b}{E}{m})      ', '   {n}{w}{t}', "   `-{d}'  "],
    parts: {
      h: { v: ['\\  /', '|  |'], r: twitch(3, 13), c: 'red' },
      b: beak,
      m: { v: ['v', 'w', 'o', '-'], r: special },
      n: neck,
      w: wing,
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['v--v', '-vv-'], r: step },
    },
    moods: { pet: { h: 1, m: 1, t: fast(0, 1) }, poke: { h: 1, b: 1, m: 2, t: 2, d: 1 }, asleep: { h: 0, b: 0, m: 3, n: 0, w: 0, t: 1, d: 0 } },
  },
  'bat+goose': {
    rows: [BLANK, '   {b}{E} )     ', '{l}{n}{r}', '   ( {k}) ', '    {e}    '],
    parts: {
      b: beak,
      l: { v: ['/\\/\\', '\\/\\/', '____'], r: wag(2, 4), c: 'green' },
      n: { v: [') )', ' ))', ')) '], r: lag(wag(2, 4), 1) },
      r: { v: ['/\\/\\/', '\\/\\/\\', '_____'], r: wag(2, 4), c: 'green' },
      k: rump,
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
    },
    moods: { pet: { l: 2, r: 2, k: 2 }, poke: { b: 1, l: fast(0, 1), r: fast(0, 1), e: 1 }, asleep: { b: 0, l: 2, r: 2, n: 0, k: 0, e: 0 } },
  },
  'goose+skeleton': {
    rows: [BLANK, '  {b}({E})      ', '    {n}     ', '{a}(={r}=){c}', '   {l}   '],
    parts: {
      b: { v: ['<', '='], r: special },
      n: { v: ['):)', ' :)', '):.'], r: wag(3, 3) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      r: { v: ['||', '::'], r: wag(2, 4) },
      c: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: { pet: { a: 0, c: 0, l: fast(1, 2) }, poke: { b: 1, r: 1, a: 2, c: 2, l: 0 }, asleep: { b: 0, n: 0, a: 2, c: 2, r: 0, l: 0 } },
  },
  'blob+cat': {
    rows: [BLANK, '   {e}    ', '  .({E}.{E}).   ', "_.'{m}'.{t}", '({b})'],
    parts: {
      e: catEars,
      m: { v: ['> ^ <', '= ^ =', '> o <', '> - <'], r: special },
      t: { v: ['_ ', '_)', '_/'], r: wag(3) },
      b: { v: ['__________', '_.-~~~~-._', '__.-~~-.__'], r: wag(3, 3) },
    },
    moods: { pet: { e: 0, m: 1, t: fast(1, 2), b: 1 }, poke: { e: 3, m: 2, t: 0, b: fast(1, 2) }, asleep: { e: 3, m: 3, t: 0, b: 0 } },
  },
  'blob+dragon': {
    rows: ['{s}', '  /)    (\\  ', "  .'{E}  {E}'.  ", ' _) {n} (_ ', '(_.-~{f}~-._)'],
    parts: {
      s: smoke,
      n: { v: ["'..'", "'oo'"], r: breathe },
      f: { v: ['vv', 'VV', '~~'], r: fire, c: 'red' },
    },
    moods: { pet: { s: 0, n: 1, f: 0 }, poke: { s: fast(1, 2), n: 1, f: 2 }, asleep: { s: 0, n: 0, f: 1 } },
  },
  'blob+octopus': {
    rows: ['{o}', '   .-""-.   ', '  ( {E}  {E} )  ', " _.'{t}'._ ", '({u})'],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special },
      t: { v: ['/  \\', '\\  /', '(  )'], r: wag(2, 3) },
      u: { v: ['_)_)  (_(_', '_(_(  )_)_', '_(_)  (_)_'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { t: 2, u: 2 }, poke: { o: 2, t: fast(0, 1), u: fast(0, 1) }, asleep: { o: 0, t: 0, u: 2 } },
  },
}
