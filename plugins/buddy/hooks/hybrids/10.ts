import type { Rig } from '../rhythms.ts'
import { BLANK, twitch, wag, breathe, special, step, flap, fast, lag, ears } from '../rhythms.ts'

const SPORES = [BLANK, '    .  o    ', '   o  .     ']
const CAP = ['o--O', 'O--o']
const BOT = ['>_', '> ', '<>', 'u ', '--']
const FANGS = ['vv', 'ww', 'oo', '--']
const JAW = ['nn', 'ww', 'oo', '--']
const TAIL = ['~~>', '_/>', '~\\>']
const FEET = ['\\/\\/', '\\/|/', '\\|\\/']
const botMouth = (t: number, w: boolean) => (special(t, w) ? 2 : breathe(t, w))

export const BATCH: Record<string, Rig> = {
  'rabbit+robot': {
    rows: [BLANK, '  .{l}--{r}.  ', '  |[{E}  {E}]|  ', '  |[ {m} ]|  ', "  '(\")(\"){f}'{t}"],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['/)', '|)', '_)'], r: twitch(13) },
      m: { v: ['>.', '>x', '<>', 'w ', '- '], r: botMouth, c: 'green' },
      f: { v: ['-', 'o'], r: wag(2, 3), c: 'green' },
      t: { v: ['o', 'O', ' '], r: wag(2, 3) },
    },
    moods: { pet: { l: 2, r: 2, m: 3, f: 1, t: fast(0, 1) }, poke: { l: 1, r: 1, m: 2, f: fast(0, 1), t: 1 }, asleep: { l: 2, r: 2, m: 4, f: 0, t: 0 } },
  },
  'mushroom+robot': {
    rows: ['{s}', '  .-{c}-.  ', " `-.____.-' ", '   [{E}{m}{E}]   ', "   '-|{f}|-'  "],
    parts: {
      s: { v: [BLANK, '    *  .    ', '   .  *     '], r: special, c: 'green' },
      c: { v: CAP, r: wag(2, 4), c: 'red' },
      m: { v: BOT, r: botMouth, c: 'green' },
      f: { v: ['o', '-'], r: wag(2, 3), c: 'green' },
    },
    moods: { pet: { s: 2, c: 1, m: 3, f: 0 }, poke: { s: fast(1, 2), m: 2, f: fast(0, 1) }, asleep: { s: 0, c: 0, m: 4, f: 1 } },
  },
  'chonk+robot': {
    rows: [BLANK, ' {a}_{b}      ', '[ {E}{m}{E} ]__.  ', ' [___{f}___]{t}', '  {p}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', '>', 'o', 'x', 'w', '_'], r: special, c: 'green' },
      f: { v: ['o', '-'], r: wag(2, 3), c: 'green' },
      t: { v: ['~o', ')o', '_o'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { m: 4, f: 0, t: fast(0, 1) }, poke: { a: 2, b: 2, m: 3, p: 1, f: fast(0, 1) }, asleep: { m: 5, a: 0, b: 0, t: 2, p: 0, f: 1 } },
  },
  'imp+robot': {
    rows: [BLANK, '  {h}  ', '  [ {E}  {E} ]  ', '   [_{m}_]{t}', '   {d}   '],
    parts: {
      h: { v: ['(\\.--./)', '(|.--.|)'], r: twitch(3, 13), c: 'red' },
      m: { v: ['>v', 'vv', '<>', 'ww', '--'], r: botMouth, c: 'green' },
      t: { v: TAIL, r: wag(3), c: 'red' },
      d: { v: ["'v''v'", "'-vv-'"], r: step },
    },
    moods: { pet: { h: 1, m: 3, t: fast(0, 1) }, poke: { h: 1, m: 2, t: 2, d: 1 }, asleep: { h: 0, m: 4, t: 1, d: 0 } },
  },
  'bat+robot': {
    rows: [BLANK, '{l}.--.{r}', '   [{E}  {E}]   ', '   [_{m}_]   ', '   {f}{e}{f}   '],
    parts: {
      l: { v: ['____', '\\___'], r: flap, c: 'green' },
      r: { v: ['____', '___/'], r: flap, c: 'green' },
      m: { v: ['>v', '>_', '<>', 'uv', '--'], r: botMouth, c: 'green' },
      e: { v: FEET, r: twitch(6, 14) },
      f: { v: ['o', '-'], r: wag(2, 3), c: 'green' },
    },
    moods: { pet: { l: 1, r: 1, m: 3, f: 0 }, poke: { l: fast(0, 1), r: fast(0, 1), m: 2, e: 1 }, asleep: { l: 0, r: 0, m: 4, e: 0, f: 1 } },
  },
  'robot+skeleton': {
    rows: [BLANK, '  .------.  ', '  |({E}  {E})|  ', "   '\\{m}/'   ", '{a}[={r}=]{b}'],
    parts: {
      m: { v: ['nn', '>_', 'oo', 'ww', '--'], r: botMouth },
      r: { v: ['||', '::'], r: wag(2, 4), c: 'green' },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
    },
    moods: { pet: { m: 3, a: 0, b: 0 }, poke: { m: 2, r: 1, a: 2, b: 2 }, asleep: { m: 4, a: 2, b: 2, r: 0 } },
  },
  'mushroom+rabbit': {
    rows: ['{s}', '    {l}{r}    ', '  .-{c}-.  ', " `-.({E}{n}{E}).-'", '   (")("){t} '],
    parts: {
      s: { v: SPORES, r: special },
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      c: { v: CAP, r: wag(2, 4), c: 'red' },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
    },
    moods: { pet: { l: 2, r: 2, n: 2, c: 1, t: fast(0, 2) }, poke: { l: 1, r: 1, n: 1, s: fast(1, 2), t: 2 }, asleep: { l: 2, r: 2, n: 0, s: 0, c: 0, t: 0 } },
  },
  'chonk+rabbit': {
    rows: [BLANK, '  {l}{r}      ', '( {E}{n}{E} )__.  ', ' (       ){t}', '  {p}  '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(6) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(14) },
      n: { v: ['.', 'x', 'w'], r: special },
      t: { v: ['o ', 'O ', 'o_'], r: wag(3, 2) },
      p: { v: ['(")__(")', '(")--(")'], r: step },
    },
    moods: { pet: { l: 2, r: 2, n: 2, t: fast(0, 1) }, poke: { l: 1, r: 1, n: 1, p: 1, t: 1 }, asleep: { l: 2, r: 2, n: 0, t: 0, p: 0 } },
  },
  'imp+rabbit': {
    rows: [BLANK, '    {l}{r}    ', '   ( {E}{n}{E} )  ', '   ( {m} ){t}', '   (")(")   '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 13), c: 'red' },
      r: { v: ['(\\', '(|', '(_'], r: twitch(4, 13), c: 'red' },
      n: { v: ['.', 'x', 'w'], r: special },
      m: { v: FANGS, r: wag(2, 5) },
      t: { v: TAIL, r: wag(3), c: 'red' },
    },
    moods: { pet: { l: 2, r: 2, n: 2, m: 1, t: fast(0, 1) }, poke: { l: 1, r: 1, n: 1, m: 2, t: 2 }, asleep: { l: 2, r: 2, n: 0, m: 3, t: 1 } },
  },
  'bat+rabbit': {
    rows: [BLANK, '{l}{e}{r}', '   ( {E}{n}{E})   ', '    (")(")  ', '    {f}    '],
    parts: {
      l: { v: ['____', '/\\__'], r: flap, c: 'green' },
      r: { v: ['____', '__/\\'], r: flap, c: 'green' },
      e: { v: ['(\\(\\', '(|(|', '(_(_'], r: ears },
      n: { v: ['.', 'x', 'w'], r: special },
      f: { v: FEET, r: twitch(6, 14) },
    },
    moods: { pet: { e: 2, l: 1, r: 1, n: 2 }, poke: { e: 1, n: 1, f: 1, l: fast(0, 1), r: fast(0, 1) }, asleep: { e: 2, n: 0, f: 0, l: 0, r: 0 } },
  },
  'rabbit+skeleton': {
    rows: [BLANK, '    {l}{r}    ', '   ({E}  {E})   ', '    \\{m}/    ', '  (={b}=){t}  '],
    parts: {
      l: { v: ['(\\', '(|', '(_'], r: twitch(3, 4) },
      r: { v: ['(\\', '(|', '(_'], r: twitch(13) },
      m: { v: JAW, r: special },
      b: { v: ['||', '::'], r: wag(2, 4) },
      t: { v: ['o_', 'o-', 'O_'], r: wag(2, 3) },
    },
    moods: { pet: { l: 2, r: 2, m: 1, t: fast(0, 2) }, poke: { l: 1, r: 1, m: 2, b: 1, t: 2 }, asleep: { l: 2, r: 2, m: 3, b: 0, t: 0 } },
  },
  'chonk+mushroom': {
    rows: ['{s}', '{a}.-{c}-.{b}', "`-.______.-'", ' ( {E}{m}{E}   ){t}', '  ({p})  '],
    parts: {
      s: { v: SPORES, r: special },
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      c: { v: CAP, r: wag(2, 4), c: 'red' },
      m: { v: ['.', 'w', 'o', 'x', '-'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      p: { v: ['uu--uu', 'u-u-uu'], r: step },
    },
    moods: { pet: { s: 2, c: 1, m: 1, t: fast(0, 1) }, poke: { s: fast(1, 2), a: 2, b: 2, m: 3, p: 1 }, asleep: { s: 0, c: 0, m: 4, a: 0, b: 0, t: 2, p: 0 } },
  },
  'imp+mushroom': {
    rows: ['{s}', '  {h}  ', " `-.____.-' ", '   ({E}{m}{E})   ', '   {g}{t}'],
    parts: {
      s: { v: SPORES, r: special },
      h: { v: ['(\\o--O/)', '(|O--o|)'], r: wag(2, 4), c: 'red' },
      m: { v: FANGS, r: special },
      g: { v: ['(____)', '(_/\\_)'], r: step },
      t: { v: TAIL, r: wag(3), c: 'red' },
    },
    moods: { pet: { s: 2, h: 1, m: 1, t: fast(0, 1) }, poke: { s: fast(1, 2), m: 2, t: 2, g: 1 }, asleep: { s: 0, h: 0, m: 3, t: 1, g: 0 } },
  },
  'bat+mushroom': {
    rows: ['{s}', '{l}.{c}.{r}', " `-.____.-' ", '   ({E}  {E})   ', '    {e}    '],
    parts: {
      s: { v: SPORES, r: special },
      l: { v: ['___', '\\__'], r: flap, c: 'green' },
      r: { v: ['___', '__/'], r: flap, c: 'green' },
      c: { v: CAP, r: wag(2, 4), c: 'red' },
      e: { v: FEET, r: twitch(6, 14) },
    },
    moods: { pet: { s: 2, l: 1, r: 1, c: 1 }, poke: { s: fast(1, 2), e: 1, l: fast(0, 1), r: fast(0, 1) }, asleep: { s: 0, l: 0, r: 0, c: 0, e: 0 } },
  },
  'mushroom+skeleton': {
    rows: ['{s}', '  .-{c}-.  ', " `-({E}  {E})-' ", '    \\{m}/    ', '{a}(={r}=){b}'],
    parts: {
      s: { v: SPORES, r: special },
      c: { v: CAP, r: wag(2, 4), c: 'red' },
      m: { v: JAW, r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      b: { v: ['_/ ', '__ ', '\\  '], r: lag(wag(3, 2), 1) },
    },
    moods: { pet: { s: 2, c: 1, m: 1, a: 0, b: 0 }, poke: { s: fast(1, 2), m: 2, r: 1, a: 2, b: 2 }, asleep: { s: 0, c: 0, m: 3, a: 2, b: 2, r: 0 } },
  },
  'chonk+imp': {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{m}{E} )__.  ', ' (      ){t}', '  {d}    '],
    parts: {
      a: { v: ['(\\', '(|'], r: twitch(6), c: 'red' },
      b: { v: ['/)', '|)'], r: twitch(14), c: 'red' },
      m: { v: ['v', 'w', 'o', '-'], r: special },
      t: { v: TAIL, r: wag(3), c: 'red' },
      d: { v: ['vv--vv', 'v-v-vv'], r: step },
    },
    moods: { pet: { m: 1, t: fast(0, 1) }, poke: { a: 1, b: 1, m: 2, t: 2, d: 1 }, asleep: { m: 3, a: 0, b: 0, t: 1, d: 0 } },
  },
  'bat+chonk': {
    rows: [BLANK, '{l}{a}{b}{r}', '  ( {E}{m}{E} )__.', '  (      ){t}', '   {e}     '],
    parts: {
      l: { v: ['____', '\\___'], r: flap, c: 'green' },
      r: { v: ['____', '___/'], r: flap, c: 'green' },
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['.', 'w', 'o', 'x', '-'], r: special },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      e: { v: FEET, r: twitch(4, 16) },
    },
    moods: { pet: { m: 1, l: 1, r: 1, t: fast(0, 1) }, poke: { a: 2, b: 2, m: 3, e: 1, l: fast(0, 1), r: fast(0, 1) }, asleep: { m: 4, a: 0, b: 0, t: 2, e: 0, l: 0, r: 0 } },
  },
  'chonk+skeleton': {
    rows: [BLANK, ' {a}_{b}      ', '( {E}{m}{E} )__.  ', ' (=={r}==){t} ', '  {l}    '],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '|\\', '-\\'], r: twitch(14) },
      m: { v: ['n', 'w', 'o', '-'], r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      t: { v: ['~ ', ') ', '_/'], r: wag(3, 2) },
      l: { v: ['_/  \\_', '_|  \\_', '_/  |_'], r: step },
    },
    moods: { pet: { m: 1, t: fast(0, 1), l: fast(1, 2) }, poke: { a: 2, b: 2, m: 2, r: 1, l: 0 }, asleep: { m: 3, a: 0, b: 0, t: 2, r: 0, l: 0 } },
  },
  'bat+imp': {
    rows: [BLANK, '{l}{h}{r}', '   ({E}  {E})   ', '    ({m}){t} ', '    {e}    '],
    parts: {
      l: { v: ['___', '\\__'], r: flap, c: 'green' },
      r: { v: ['___', '__/'], r: flap, c: 'green' },
      h: { v: ['(\\  /)', '(|  |)'], r: twitch(3, 13), c: 'red' },
      m: { v: FANGS, r: special },
      t: { v: TAIL, r: wag(3), c: 'red' },
      e: { v: FEET, r: twitch(6, 14) },
    },
    moods: { pet: { h: 1, m: 1, l: 1, r: 1, t: fast(0, 1) }, poke: { h: 1, m: 2, t: 2, e: 1 }, asleep: { h: 0, m: 3, t: 1, e: 0, l: 0, r: 0 } },
  },
  'imp+skeleton': {
    rows: [BLANK, '   {h}   ', '   ({E}  {E})   ', '    \\{m}/    ', '{a}(={r}=){t}'],
    parts: {
      h: { v: ['(\\  /)', '(|  |)'], r: twitch(3, 13), c: 'red' },
      m: { v: FANGS, r: special },
      r: { v: ['||', '::'], r: wag(2, 4) },
      a: { v: [' \\_', ' __', '  /'], r: wag(3, 2) },
      t: { v: TAIL, r: lag(wag(3), 1), c: 'red' },
    },
    moods: { pet: { h: 1, m: 1, a: 0, t: fast(0, 1) }, poke: { h: 1, m: 2, r: 1, a: 2, t: 2 }, asleep: { h: 0, m: 3, a: 2, r: 0, t: 1 } },
  },
  'bat+skeleton': {
    rows: [BLANK, '{l}{f}{r}', '   ({E}  {E})   ', '    \\{m}/    ', '   (={b}=)   '],
    parts: {
      l: { v: ['=-=-=', '\\=-=-'], r: flap },
      r: { v: ['=-=-=', '-=-=/'], r: flap },
      f: { v: ['""', "''"], r: step },
      m: { v: JAW, r: special },
      b: { v: ['||', '::'], r: wag(2, 4) },
    },
    moods: { pet: { m: 1, l: 1, r: 1, f: fast(0, 1) }, poke: { m: 2, b: 1, f: 1, l: fast(0, 1), r: fast(0, 1) }, asleep: { m: 3, b: 0, f: 0, l: 0, r: 0 } },
  },
}
