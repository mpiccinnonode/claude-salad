import type { Rig } from '../rhythms.ts'
import { BLANK, twitch, wag, breathe, special, step, flap, fast, lag, ears, smoke, tufts, tuft, hem, arms, ARMS } from '../rhythms.ts'

const BASE = ['__________', '_.-~~~~-._', '__.-~~-.__']
const MOUTH = ['  ', 'ww', 'o ', 'uu']
const fins = (t: number, w: boolean) => (w ? (t % 2 ? 0 : 2) : Math.floor(t / 3) % 2)

export const BATCH: Record<string, Rig> = {
  'blob+owl': {
    rows: [BLANK, '   {e}    ', '  .({E}{b}{E}).   ', " _.'{l}  {r}'._ ", '({w})'],
    parts: {
      e: { v: [',___,', '.___,', ',___.'], r: tufts },
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      w: { v: ['____"-"___', '_.-~"-"~-.', '__.-"_"-._'], r: wag(3, 3) },
    },
    moods: { pet: { b: 1, l: 1, r: 1, w: 1 }, poke: { e: 1, l: fast(0, 1), r: fast(1, 0), w: fast(1, 2) }, asleep: { b: 0, e: 0, l: 0, r: 0, w: 0 } },
  },
  'blob+penguin': {
    rows: [BLANK, '    {h}   ', " .'{E} {b} {E}'.  ", ' {l}(  {m}  ){r} ', '(_.-{f}-._)'],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: tuft },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      l: { v: ['/', '|', '\\'], r: fins },
      r: { v: ['\\', '|', '/'], r: fins },
      m: { v: MOUTH, r: lag(special, 2) },
      f: { v: ["`--'", "`-^'", "^--'"], r: step },
    },
    moods: { pet: { l: 1, r: 1, b: 1, m: 3 }, poke: { h: 1, l: 0, r: 0, f: fast(1, 2), m: 2 }, asleep: { h: 0, l: 1, r: 1, f: 0, b: 0, m: 0 } },
  },
  'blob+turtle': {
    rows: [BLANK, ' {s}   ', '/\\_/\\_/\\.{E}{E}.', '\\_/\\_/\\_.{m}.', '({w})'],
    parts: {
      s: { v: ['_.----._', '_.-~~-._'], r: wag(2, 3) },
      m: { v: MOUTH, r: special },
      w: { v: ['_""____""_', '__""~~""__', '_""-~~-""_'], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { m: 3, s: 1, w: 1 }, poke: { m: 2, w: fast(0, 2) }, asleep: { m: 0, s: 0, w: 0 } },
  },
  'blob+snail': {
    rows: [BLANK, '  .--.  {E} {E} ', ' ( {c}  ). {k} ', " _`--'{m} '. ", '({w})'],
    parts: {
      k: { v: ['\\/', '||', '//'], r: lag(wag(3, 3), 1) },
      c: { v: ['@', 'o', '0'], r: special },
      m: { v: MOUTH, r: lag(special, 3) },
      w: { v: ['_________~', '_.-~~~~-.~', '__.-~~-._~'], r: step },
    },
    moods: { pet: { c: 2, k: 1, m: 3, w: 1 }, poke: { k: 1, c: 1, m: 2, w: fast(1, 2) }, asleep: { c: 0, k: 2, m: 0, w: 0 } },
  },
  'blob+ghost': {
    rows: [BLANK, '    .--.    ', '  .({E}  {E}).  ', ' (  {m}    ){a}', ' {t} '],
    parts: {
      m: { v: ['O', 'o', '-', 'w'], r: special },
      a: { v: ['  ', ' ~'], r: flap },
      t: { v: ["`~~~~~~~~'", "`-~~~~~~-'", "`~~-~~-~~'"], r: hem(3) },
    },
    moods: { pet: { m: 3, a: 1, t: 1 }, poke: { m: 0, a: fast(0, 1), t: fast(0, 1) }, asleep: { m: 2, a: 0, t: 0 } },
  },
  'axolotl+blob': {
    rows: [BLANK, ' {a} .--. {b} ', '{c} .{E}--{E}. {d}', " _.' {m} '._ ", '({w}){t}'],
    parts: {
      a: { v: ['\\\\', '\\.'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['//', './'], r: lag(wag(2, 2), 1), c: 'magenta' },
      c: { v: ['==', '~='], r: wag(2, 3), c: 'magenta' },
      d: { v: ['==', '=~'], r: lag(wag(2, 3), 1), c: 'magenta' },
      m: { v: ['ww', '--', 'oo', 'vv'], r: special },
      w: { v: ['________', '_.-~~-._', '__.~~.__'], r: wag(3, 3) },
      t: { v: ['  ', '~ '], r: breathe },
    },
    moods: { pet: { m: 3, a: fast(0, 1), b: fast(0, 1), t: 1, w: 1 }, poke: { m: 2, c: 1, d: 1, w: fast(1, 2) }, asleep: { m: 1, a: 0, b: 0, c: 0, d: 0, t: 0, w: 0 } },
  },
  'blob+capybara': {
    rows: [BLANK, '   {e}.--.{f}   ', "  .'{E}  {E}'.  ", ' (  ({n})  ) ', "{w}`-.__.-'{x}"],
    parts: {
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      f: { v: ['n', 'u'], r: twitch(4, 10) },
      n: { v: ['..', 'oo', '::'], r: special },
      w: { v: ['~~', '-~', '~-'], r: wag(3, 2), c: 'cyan' },
      x: { v: ['~~', '~-', '-~'], r: lag(wag(3, 2), 1), c: 'cyan' },
    },
    moods: { pet: { e: 1, f: 1, n: 0 }, poke: { n: 1, w: fast(1, 2), x: fast(2, 1), e: fast(0, 1) }, asleep: { e: 1, f: 1, n: 2, w: 0, x: 0 } },
  },
  'blob+cactus': {
    rows: [BLANK, '{a} .--. {b}', '{c}.{E}  {E}.{d}', "{e}' {m} '{f}", '({w})'],
    parts: { ...arms, m: { v: ['  ', 'ww', 'oo', '--'], r: special }, w: { v: BASE, r: wag(3, 3), c: 'green' } },
    moods: { pet: { ...ARMS(0), m: 1, w: 1 }, poke: { ...ARMS(1), m: 2, w: fast(1, 2) }, asleep: { ...ARMS(2), m: 3, w: 0 } },
  },
  'blob+robot': {
    rows: [BLANK, '  .--{f}---.  ', '  .|{E}  {E}|.  ', " _.'[{m}]'._ ", '({w})'],
    parts: {
      f: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
      m: { v: ['>_', '> ', '<>', 'u '], r: (t, w) => (special(t, w) ? 2 : breathe(t, w)), c: 'green' },
      w: { v: ['__||__||__', '_.||~~||._', '_-||__||-_'], r: wag(3, 3) },
    },
    moods: { pet: { m: 3, f: 1, w: 1 }, poke: { m: 2, f: fast(0, 1), w: fast(1, 2) }, asleep: { m: 1, f: 0, w: 0 } },
  },
  'blob+rabbit': {
    rows: [BLANK, '    {l}{r}    ', '   .{E}{n}{E}.    ', "  .'   '.{t} ", '{w}(")("){x}'],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
      w: { v: ['___', '_.-', '__.'], r: wag(3, 3) },
      x: { v: ['___', '-._', '.__'], r: lag(wag(3, 3), 1) },
    },
    moods: { pet: { l: 2, r: 2, n: 2, t: fast(0, 2), w: 1, x: 1 }, poke: { l: 1, r: 1, n: 1, t: 2, w: fast(1, 2), x: fast(1, 2) }, asleep: { l: 2, r: 2, n: 0, t: 0, w: 0, x: 0 } },
  },
  'blob+mushroom': {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", "  .'{E}{m}{E}'.  ", '({w})'],
    parts: {
      s: { v: [BLANK, '    .  o    ', '   o  .     '], r: special },
      c: { v: ['o--O', 'O--o'], r: wag(2, 4), c: 'red' },
      m: { v: ['__', 'ww', 'oo', '--'], r: lag(special, 2) },
      w: { v: BASE, r: wag(3, 3) },
    },
    moods: { pet: { s: 2, c: 1, m: 1, w: 1 }, poke: { s: fast(1, 2), c: fast(0, 1), m: 2, w: fast(1, 2) }, asleep: { s: 0, c: 0, m: 0, w: 0 } },
  },
  'blob+chonk': {
    rows: [BLANK, '  {a}____{b}  ', '  ( {E} {m} {E} ) ', ' (       ){t}', '{w}{p}{x}'],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
      w: { v: ['___', '_.-', '~-.'], r: wag(3, 3) },
      x: { v: ['___', '-._', '.-~'], r: lag(wag(3, 3), 1) },
    },
    moods: { pet: { m: 1, t: fast(0, 1), w: 1, x: 1 }, poke: { a: 2, b: 2, m: 3, p: 1, w: fast(1, 2) }, asleep: { m: 0, a: 0, b: 0, t: 2, p: 0, w: 0, x: 0 } },
  },
  'blob+imp': {
    rows: [BLANK, ' {h}   ', " .'{E}  {E}'.   ", '(  {m}   ){t}', '({w}{d}{x})  '],
    parts: {
      h: { v: ['(\\    /)', '(|    |)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['vv', 'ww', 'oo', '--'], r: special },
      t: { v: ['~~>', '_/>', '~\\>'], r: wag(3), c: 'red' },
      d: { v: ['v  v', ' vv '], r: step },
      w: { v: ['__', '.-', '_.'], r: wag(3, 3) },
      x: { v: ['__', '-.', '._'], r: lag(wag(3, 3), 1) },
    },
    moods: { pet: { h: 1, m: 1, t: fast(0, 1), w: 1, x: 1 }, poke: { h: 1, m: 2, t: 2, d: 1, w: fast(1, 2) }, asleep: { h: 0, m: 3, t: 1, d: 0, w: 0, x: 0 } },
  },
  'bat+blob': {
    rows: [BLANK, '{l}{f}{r}', '   .{E}--{E}.   ', " _.' {m} '._ ", '({x}{e}{y})'],
    parts: {
      l: { v: ['_____', ' \\___'], r: flap, c: 'green' },
      r: { v: ['_____', '___/ '], r: flap, c: 'green' },
      f: { v: ['""', "''"], r: step },
      m: { v: MOUTH, r: special },
      e: { v: ['\\/\\/', '\\/|/', '\\|\\/'], r: twitch(6, 14) },
      x: { v: ['___', '_.-', '~-.'], r: wag(3, 3) },
      y: { v: ['___', '-._', '.-~'], r: lag(wag(3, 3), 1) },
    },
    moods: { pet: { m: 3, f: fast(0, 1), x: 1, y: 1 }, poke: { m: 2, e: 1, f: 1, l: fast(0, 1), r: fast(0, 1) }, asleep: { m: 0, e: 0, f: 0, l: 0, r: 0, x: 0, y: 0 } },
  },
  'blob+skeleton': {
    rows: [BLANK, '   ({E}  {E})   ', "  .'\\{m}/'.  ", '{a}(={r}=){b}', '({x}{l}{y})'],
    parts: {
      m: { v: ['nn', 'ww', 'oo', '--'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
      x: { v: ['__', '.-', '~-'], r: wag(3, 3) },
      y: { v: ['__', '-.', '-~'], r: lag(wag(3, 3), 1) },
    },
    moods: {
      pet: { m: 1, a: 0, b: 0, l: fast(1, 2), x: 1, y: 1 },
      poke: { m: 2, r: 1, a: 2, b: 2, l: 0, x: fast(1, 2) },
      asleep: { m: 3, a: 2, b: 2, r: 0, l: 0, x: 0, y: 0 },
    },
  },
  'cat+dragon': {
    rows: ['{s}', '   {e}    ', '  ( {E}.{E} )   ', '   {m}    ', '  {p}{t}'],
    parts: {
      s: smoke,
      e: { v: ['/)_(\\', '/)-(\\', '/|_(\\', '-)_(-'], r: ears },
      m: { v: ['> ^ <', '= ^ =', '> o <', '> - <'], r: special },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
      t: { v: ['~vv', '~VV', '~~~'], r: (t, w) => (special(t, w) ? 2 : step(t, w)), c: 'red' },
    },
    moods: { pet: { s: 0, e: 0, m: 1, t: 0 }, poke: { s: fast(1, 2), e: 3, m: 2, t: 2, p: 1 }, asleep: { s: 0, e: 3, m: 3, t: 1, p: 0 } },
  },
  'cat+octopus': {
    rows: [BLANK, '  {e}  ', '  ( {E}{m}{E} ) ', '  {t}  ', ' {u} '],
    parts: {
      e: { v: ['/\\.--./\\', '/|.--./\\', '/\\.--.|\\', '-\\.--./-'], r: ears },
      m: { v: ['>^<', '=^=', '>o<', '>-<'], r: special },
      t: { v: ['/`)  (`\\', '\\`)  (`/', '/`)  (`/'], r: wag(2, 3) },
      u: { v: ['( (    ) )', ') )    ( (', '( )    ( )'], r: lag(wag(2, 3), 1) },
    },
    moods: { pet: { e: 0, m: 1, t: 2, u: 2 }, poke: { e: 3, m: 2, t: fast(0, 1), u: fast(0, 1) }, asleep: { e: 3, m: 3, t: 0, u: 2 } },
  },
  'cat+owl': {
    rows: [BLANK, '   {e}    ', '   ({E}{b}{E})    ', '  {l}( {m} ){r}   ', '  {p}{t}'],
    parts: {
      e: { v: [',\\_/,', ',\\-/,', ',|_/,', '-\\_/-'], r: ears },
      b: { v: [',', 'v'], r: special, c: 'yellow' },
      m: { v: ['^', '-', 'o'], r: lag(special, 2) },
      l: { v: [' ', '/'], r: flap },
      r: { v: [' ', '\\'], r: lag(flap, 1) },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
      t: { v: ['   ', ')  ', ' ) ', '~  '], r: wag(4) },
    },
    moods: { pet: { e: 0, b: 1, l: 1, r: 1, t: fast(1, 2) }, poke: { e: 3, m: 2, l: fast(0, 1), r: fast(1, 0), p: 1, t: 3 }, asleep: { e: 3, b: 0, m: 1, l: 0, r: 0, p: 0, t: 0 } },
  },
  'cat+penguin': {
    rows: [BLANK, '   {e}    ', '  ( {E}{b}{E} )   ', ' {l}( {m} ){r}  ', '   {f}{t} '],
    parts: {
      e: { v: ['/\\_/\\', '/\\-/\\', '/|_/\\', '-\\_/-'], r: ears },
      b: { v: ['>', 'v'], r: special, c: 'yellow' },
      m: { v: ['>w<', '=w=', '>o<', '>-<'], r: lag(special, 2) },
      l: { v: ['/', '|', '\\'], r: fins },
      r: { v: ['\\', '|', '/'], r: fins },
      f: { v: ["`---'", "`--^'", "^---'"], r: step },
      t: { v: ['   ', ')  ', ' ) ', '~  '], r: wag(4) },
    },
    moods: { pet: { e: 0, l: 1, r: 1, b: 1, m: 1, t: fast(1, 2) }, poke: { e: 3, l: 0, r: 0, f: fast(1, 2), m: 2, t: 3 }, asleep: { e: 3, l: 1, r: 1, f: 0, b: 0, m: 3, t: 0 } },
  },
  'cat+turtle': {
    rows: [BLANK, '  _.--._{e}', ' /\\_/\\_/({E}{E})', ' \\_/\\_/\\_{m}/', '{t}{f}'],
    parts: {
      e: { v: ['/\\/\\', '/|/\\', '/\\/|', '-\\/-'], r: ears },
      m: { v: ['^^', '=^', 'oo', '--'], r: special },
      t: { v: ['   ', '  (', ' ( ', '  ~'], r: wag(4) },
      f: { v: [' ""   "" ', '  "" ""  ', '""   ""  '], r: (t, w) => (w ? t % 3 : step(t, w)) },
    },
    moods: { pet: { m: 1, f: 1, t: fast(1, 2) }, poke: { e: 3, m: 2, f: fast(0, 2), t: 3 }, asleep: { e: 3, m: 3, f: 2, t: 0 } },
  },
  'cat+snail': {
    rows: [BLANK, '  .--.  {e}', ' ( {c}  ) ({E}{E})', "  `--'__{m} ", '{t}(_______) '],
    parts: {
      e: { v: ['/\\/\\', '/|/\\', '/\\/|', '-\\/-'], r: ears },
      c: { v: ['@', 'o', '0'], r: special },
      m: { v: ['>^<', '=^=', '>o<', '>-<'], r: lag(special, 2) },
      t: { v: ['  ', ' ~', ' (', '\\_'], r: wag(4) },
    },
    moods: { pet: { e: 0, c: 2, m: 1, t: fast(1, 2) }, poke: { e: 3, c: 1, m: 2, t: 3 }, asleep: { e: 3, c: 0, m: 3, t: 0 } },
  },
}
