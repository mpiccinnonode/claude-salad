import type { Rig } from '../rhythms.ts'
import { twitch, wag, breathe, special, step, flap, fast, lag, BLANK, smoke, tufts, tuft, hem, arms, ARMS } from '../rhythms.ts'

const fire = { v: ['vv', 'VV', '~~'], r: (t: number, w: boolean) => (special(t, w) ? 2 : step(t, w)), c: 'red' }
const bubble = { v: [BLANK, '     o      ', '      O     '], r: special }

export const BATCH: Record<string, Rig> = {
  'dragon+rabbit': {
    rows: ['{s}', '  {l}____{r}  ', ' ( {E}{n}{E} ) ', '  \\(")(")/{q}', '   \\_{f}_/   '],
    parts: {
      s: smoke,
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['/)', '|)', '_)'], r: twitch(13) },
      n: { v: ["'..'", "'oo'", "'ww'"], r: breathe },
      q: { v: ['o ', 'O ', 'o~'], r: wag(2, 3) },
      f: fire,
    },
    moods: { pet: { s: 0, l: 2, r: 2, n: 2, q: fast(0, 1) }, poke: { s: fast(1, 2), l: 1, r: 1, n: 1, f: 2 }, asleep: { s: 0, l: 2, r: 2, n: 0, q: 0, f: 1 } },
  },
  'dragon+mushroom': {
    rows: ['{s}', '/).-{c}-.(\\', " `-.____.-' ", '  ( {E}{n}{E} )  ', '   (_{f}_)   '],
    parts: {
      s: { v: [BLANK, "    '  o    ", "   o    '   "], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      n: { v: ['..', 'oo', '--'], r: breathe },
      f: fire,
    },
    moods: { pet: { s: 2, c: 1, n: 1, f: 0 }, poke: { s: fast(1, 2), c: fast(0, 1), n: 1, f: 2 }, asleep: { s: 0, c: 0, n: 2, f: 1 } },
  },
  'chonk+dragon': {
    rows: ['{s}', ' {a}____{b}   ', '( {E}{m}{E} )__.  ', ' ( {n} ){t}', '  {p}    '],
    parts: {
      s: smoke,
      a: { v: ['/)', '/|', '/-'], r: twitch(6) },
      b: { v: ['(\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      n: { v: ['vvvvv', 'VvVvV'], r: breathe, c: 'red' },
      t: { v: ['~>', 'vv', '~~'], r: wag(3, 2), c: 'red' },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { s: 0, m: 1, t: fast(0, 1) }, poke: { s: fast(1, 2), a: 2, b: 2, m: 2, p: 1 }, asleep: { s: 0, m: 0, a: 0, b: 0, t: 2, n: 0, p: 0 } },
  },
  'dragon+imp': {
    rows: ['{s}', '  {h}  ', ' ( {E}    {E} ) ', ' \\ {n} /{t}', '    {d}    '],
    parts: {
      s: smoke,
      h: { v: ['(\\____/)', '(|____|)'], r: twitch(3, 13), c: 'red' },
      n: { v: ["'..'", "'oo'", "'vv'"], r: breathe },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['v  v', ' vv '], r: step },
    },
    moods: { pet: { s: 0, h: 1, n: 2, t: fast(0, 1) }, poke: { s: fast(1, 2), h: 1, n: 1, t: 2, d: 1 }, asleep: { s: 0, h: 0, n: 0, t: 1, d: 0 } },
  },
  'bat+dragon': {
    rows: ['{s}', '{l}{f}{r}', '   ({w})   ', '  ( {E}{n}{E} )  ', '    {e}    '],
    parts: {
      s: smoke,
      l: { v: ['_____', '/\\/\\_'], r: flap, c: 'green' },
      r: { v: ['_____', '_/\\/\\'], r: flap, c: 'green' },
      f: { v: ['/)', '(\\'], r: step },
      w: { v: ['\\  /', '|  |', '\\__/'], r: wag(2, 4) },
      n: { v: ['..', 'oo'], r: breathe },
      e: { v: ['vVvV', 'VvVv', '~~~~'], r: (t, w) => (special(t, w) ? 2 : step(t, w)), c: 'red' },
    },
    moods: { pet: { s: 0, w: 2, l: fast(0, 1), r: fast(0, 1) }, poke: { s: fast(1, 2), w: 1, n: 1, e: 2 }, asleep: { s: 0, w: 2, l: 0, r: 0, n: 0, e: 0 } },
  },
  'dragon+skeleton': {
    rows: ['{s}', '  /({E}  {E})\\  ', '    \\{m}/    ', '{a}(={r}=){b}', '   {l}   '],
    parts: {
      s: smoke,
      m: { v: ['vv', 'VV', '~~', '--'], r: special, c: 'red' },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: { pet: { s: 0, m: 1, a: 0, b: 0, l: fast(1, 2) }, poke: { s: fast(1, 2), m: 2, r: 1, a: 2, b: 2 }, asleep: { s: 0, m: 3, a: 2, b: 2, r: 0, l: 0 } },
  },
  'octopus+owl': {
    rows: ['{o}', '   {e}   ', '  ( {E}{b}{E} )   ', ' {l}{t}{r} ', ' {u} '],
    parts: {
      o: bubble,
      e: { v: [',-""-,', '.-""-,', ',-""-.'], r: tufts },
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      u: { v: ['( ( "" ) )', ') ) "" ( (', '( ) "" ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { b: 1, l: 1, r: 1, t: 2, u: 2 }, poke: { o: 2, e: 1, l: fast(0, 1), r: fast(1, 0), u: fast(0, 1) }, asleep: { o: 0, b: 0, e: 0, l: 0, r: 0, t: 0, u: 2 } },
  },
  'octopus+penguin': {
    rows: ['{o}', '   {h}   ', '  ( {E}{b}{E} )   ', '  {l}(    ){r}  ', ' {u} '],
    parts: {
      o: bubble,
      h: { v: ['.-""-.', '.-~~-.', '.-^^-.'], r: tuft },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      l: { v: ['/', '|', '\\'], r: wag(2, 3) },
      r: { v: ['\\', '|', '/'], r: wag(2, 3) },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { l: 1, r: 1, b: 1, u: 2 }, poke: { o: 2, h: 1, l: 2, r: 2, u: fast(0, 1) }, asleep: { o: 0, h: 0, l: 1, r: 1, b: 0, u: 2 } },
  },
  'octopus+turtle': {
    rows: ['{o}', '  _.----._  ', '/\\_/\\_/\\({E}{E})', '\\{t}/  ', ' {u} '],
    parts: {
      o: bubble,
      t: { v: ['_/`)(`\\_', '_\\`)(`/_', '_/`)(`/_'], r: wag(2, 3) },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { t: 2, u: 2 }, poke: { o: 2, t: fast(0, 1), u: fast(0, 1) }, asleep: { o: 0, t: 0, u: 2 } },
  },
  'octopus+snail': {
    rows: ['{o}', '  .--.  {E} {E} ', ' ( {c}  ) {k}  ', "  `--'___/  ", ' {u} '],
    parts: {
      o: bubble,
      k: { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) },
      c: { v: ['@', 'o', '0'], r: special },
      u: { v: ['( (_  _) )', ') )_  _( (', '( )_  _( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { c: 2, k: 1, u: 2 }, poke: { o: 2, k: 1, c: 1, u: fast(0, 1) }, asleep: { o: 0, c: 0, k: 2, u: 2 } },
  },
  'ghost+octopus': {
    rows: ['{o}', '   .-""-.   ', '  ( {E}  {E} )  ', '  |  {m}   \\{a}', '  {t}  '],
    parts: {
      o: bubble,
      m: { v: ['O', 'o', '-', 'w'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ['(~(  )~)', ')~)  (~(', '(~)  (~)'], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1, t: 2 }, poke: { o: 2, m: 0, a: fast(0, 1), t: fast(0, 1) }, asleep: { o: 0, m: 2, a: 0, t: 0 } },
  },
  'axolotl+octopus': {
    rows: ['{o}', ' {a}.-""-.{b} ', '{c}( {E}{m}{E} ){d}', '  {t}  ', ' {u} '],
    parts: {
      o: bubble,
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['==', '~='], r: wag(2, 3), c: 'magenta' },
      d: { v: ['==', '=~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3), c: 'magenta' },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { m: 3, a: fast(0, 1), b: fast(0, 1), t: 2 }, poke: { o: 2, m: 2, c: 1, d: 1, u: fast(0, 1) }, asleep: { o: 0, m: 1, a: 0, b: 0, c: 0, d: 0, t: 0, u: 2 } },
  },
  'capybara+octopus': {
    rows: ['{o}', '  {e}.-""-.{f}  ', '  ( {E}{n}{E} )  ', '  {t}  ', '{w}'],
    parts: {
      o: bubble,
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      w: { v: ['~( (~~~~) )~', '~) )~~~~( (~', '~( )~~~~( )~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 0, t: 2 }, poke: { o: 2, n: 1, w: fast(1, 2), e: fast(0, 1) }, asleep: { o: 0, e: 1, f: 1, n: 2, t: 0, w: 0 } },
  },
  'cactus+octopus': {
    rows: [BLANK, '{a}.-""-.{b}', '{c}({E}  {E}){d}', '{e}| {m} |{f}', '  {u}  '],
    parts: {
      ...arms,
      m: { v: ['  ', 'ww', 'oo', '--'], r: special },
      u: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3), c: 'green' },
    },
    moods: { pet: { ...ARMS(0), m: 1, u: 2 }, poke: { ...ARMS(1), m: 2, u: fast(0, 1) }, asleep: { ...ARMS(2), m: 3, u: 0 } },
  },
  'octopus+robot': {
    rows: ['{o}', '  .------.  ', '  |[{E}  {E}]|  ', '  /|[{m}]|\\  ', ' {u} '],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special, c: 'green' },
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      u: { v: ['(=(    )=)', ')=)    (=(', '(=)    (=)'], r: wag(2, 3) },
    },
    moods: { pet: { m: 3, u: 2 }, poke: { o: 2, m: 2, u: fast(0, 1) }, asleep: { o: 0, m: 1, u: 2 } },
  },
  'octopus+rabbit': {
    rows: ['{o}', '  {l}-""-{r}  ', '  ( {E}{n}{E} )   ', '  {t}{q}', ' {u} '],
    parts: {
      o: bubble,
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['/)', '|)', '_)'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      q: { v: ['o ', 'O '], r: wag(2, 3) },
      u: { v: ['( (")(") )', ') (")(") ('], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { l: 2, r: 2, n: 2, q: fast(0, 1), u: 2 }, poke: { o: 2, l: 1, r: 1, n: 1, q: 1, u: fast(0, 1) }, asleep: { o: 0, l: 2, r: 2, n: 0, q: 0, t: 0, u: 2 } },
  },
  'mushroom+octopus': {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", '   ({E}{m}{E})   ', '  {t}  '],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['__', 'ww', 'oo', '--'], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
    },
    moods: { pet: { s: 2, c: 1, m: 1, t: 2 }, poke: { s: fast(1, 2), c: fast(0, 1), m: 2, t: fast(0, 1) }, asleep: { s: 0, c: 0, m: 0, t: 0 } },
  },
  'chonk+octopus': {
    rows: ['{o}', ' {a}-""-{b}   ', '( {E}{m}{E} )__.  ', ' {k}{t}', '  {p}    '],
    parts: {
      o: bubble,
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      k: { v: ['( (   ) )', ') )   ( (', '( )   ( )'], r: lag(wag(2, 3), 1) },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { m: 1, t: fast(0, 1), k: 2 }, poke: { o: 2, a: 2, b: 2, m: 3, p: 1, k: fast(0, 1) }, asleep: { o: 0, m: 0, a: 0, b: 0, t: 2, k: 2, p: 0 } },
  },
  'imp+octopus': {
    rows: ['{o}', '  {h}-""-{g}  ', '  ( {E}{m}{E} )  ', ' {t}{k}', ' {u} '],
    parts: {
      o: bubble,
      h: { v: ['(\\', '(|'], r: twitch(3, 13), c: 'red' },
      g: { v: ['/)', '|)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      k: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      u: { v: ['( (v  v) )', ') )v  v( (', '( ) vv ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { h: 1, g: 1, m: 1, k: fast(0, 1) }, poke: { o: 2, h: 1, g: 1, m: 2, k: 2, u: fast(0, 1) }, asleep: { o: 0, h: 0, g: 0, m: 3, k: 1, t: 0, u: 2 } },
  },
  'bat+octopus': {
    rows: ['{o}', '{l}{f}{r}', '  ( {E}{e}{E} )  ', '  {t}  ', ' {u} '],
    parts: {
      o: bubble,
      l: { v: ['_____', '/\\/\\_'], r: flap, c: 'green' },
      r: { v: ['_____', '_/\\/\\'], r: flap, c: 'green' },
      f: { v: ['""', "''"], r: step },
      e: { v: ['vv', 'v ', '\\/'], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { f: fast(0, 1), l: fast(0, 1), r: fast(0, 1), t: 2 }, poke: { o: 2, e: 2, f: 1, u: fast(0, 1) }, asleep: { o: 0, l: 0, r: 0, f: 0, e: 0, t: 0, u: 2 } },
  },
  'octopus+skeleton': {
    rows: ['{o}', '   .-""-.   ', '  ( {E}{m}{E} )  ', '{a}(={r}=){b}', ' {u} '],
    parts: {
      o: bubble,
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      u: { v: ['/ /=  =\\ \\', '\\ \\=  =/ /', '/ /=  =/ /'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { m: 1, a: 0, b: 0, u: 2 }, poke: { o: 2, m: 2, r: 1, a: 2, b: 2, u: fast(0, 1) }, asleep: { o: 0, m: 3, a: 2, b: 2, r: 0, u: 2 } },
  },
}
