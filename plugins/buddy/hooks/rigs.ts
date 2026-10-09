// Part-by-part rigs for all 18 species, built from the original /buddy frames.
// A row is 12 cells once {E} becomes one eye glyph; {x} is a part whose variants share one width.
type Rhythm = (tick: number, isWorking: boolean) => number
export type Mood = 'pet' | 'poke' | 'asleep' | 'working'
type Part = { v: readonly string[]; r: Rhythm; c?: string }
// A mood pins a part to one variant, or gives it its own rhythm; parts it doesn't name keep theirs.
export type Rig = { rows: readonly string[]; parts: Record<string, Part>; moods: Partial<Record<Mood, Record<string, number | Rhythm>>> }

const beat = (t: number) => t % 20
// Each rhythm picks a variant index; different parts get different ones so they move on their own.
const twitch = (...at: number[]): Rhythm => (t, w) => (w ? (t % 4 === 0 ? 1 : 0) : at.includes(beat(t)) ? 1 : 0)
const wag = (n: number, slow = 2): Rhythm => (t, w) => (w ? t % n : Math.floor(t / slow) % n)
const breathe: Rhythm = (t, w) => (w ? t % 2 : Math.floor(beat(t) / 3) % 2)
const special: Rhythm = (t, w) => (w ? (t % 3 === 2 ? 1 : 0) : beat(t) === 11 ? 1 : beat(t) === 12 ? 2 : 0)
const step: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 16 || beat(t) === 18 ? 1 : 0)
const flap: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 4 || beat(t) === 5 ? 1 : 0)
const arm = (offset: number): Rhythm => (t, w) => (w ? (t + offset) % 3 : ([0, 0, 2, 0, 1][Math.floor((t + offset * 3) / 2) % 5] ?? 0))
// Alternates between two given variants every tick.
const fast = (a: number, b: number): Rhythm => t => (t % 2 ? b : a)

const BLANK = '            '
const ARMS = (state: number) => ({ p: state, r: state, t: state, q: state, s: state, u: state })

export const RIGS: Record<string, Rig> = {
  penguin: {
    rows: [BLANK, '  {h}     ', '  ({E}{b}{E})     ', ' {l}(   ){r}    ', '  {f}     '],
    parts: {
      h: { v: ['.---.', '.-~-.', '.-^-.'], r: (t, w) => (w ? (t % 2 ? 2 : 0) : beat(t) === 12 || beat(t) === 13 ? 1 : 0) },
      b: { v: ['>'], r: () => 0, c: 'yellow' },
      l: { v: ['/', '|', '\\'], r: (t, w) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2) },
      r: { v: ['\\', '|', '/'], r: (t, w) => (w ? (t % 2 ? 0 : 2) : Math.floor(beat(t) / 3) % 2) },
      f: { v: ['`---´', '`--.´', '´---`'], r: (t, w) => (w ? (t % 2 ? 0 : 2) : beat(t) >= 16 && beat(t) % 2 === 0 ? 1 : 0) },
    },
    moods: { pet: { l: 1, r: 1, h: 0, f: 0 }, poke: { h: 1, l: 0, r: 0, f: fast(0, 1) }, asleep: { h: 0, l: 1, r: 1, f: 0 } },
  },
  duck: {
    rows: [BLANK, '    {c}      ', '  <({E} ){w}  ', '   (  {b}  ', "    `--'{t}   "],
    parts: {
      c: { v: ['__', '~~'], r: twitch(8) },
      w: { v: ['___', '__/'], r: flap },
      b: { v: ['._> ', '.__>'], r: special, c: 'yellow' },
      t: { v: [' ', '~'], r: wag(2, 3) },
    },
    moods: { pet: { c: 1, w: 1, t: fast(0, 1) }, poke: { b: 1, c: 1, w: fast(0, 1) }, asleep: { b: 0, w: 0, t: 0, c: 0 } },
  },
  goose: {
    rows: [BLANK, '    {h}', '     {n}     ', '   {w}   ', '   {f}   '],
    parts: {
      h: { v: [' ({E}>    ', '({E}>     ', ' ({E}>>   '], r: (t, w) => (special(t, w) ? 2 : wag(2, 4)(t, w)) },
      n: { v: ['||', '/|'], r: wag(2, 4) },
      w: { v: ['_(__)_', '/(__)\\'], r: flap },
      f: { v: [' ^^^^ ', '^^  ^^'], r: step, c: 'yellow' },
    },
    moods: { pet: { h: 2, n: 0, w: 1 }, poke: { h: 2, n: 0, w: fast(0, 1), f: fast(0, 1) }, asleep: { h: 1, n: 1, w: 0, f: 0 } },
  },
  blob: {
    rows: [BLANK, '   {a}   ', '  ( {E}  {E} )  ', '{x}(  {m}  ){y}', '   {b}   '],
    parts: {
      a: { v: ['.----.', '.-~~-.'], r: wag(2, 3) },
      x: { v: ['  ', ' ~'], r: breathe },
      y: { v: ['  ', '~ '], r: breathe },
      m: { v: ['  ', '--', 'o ', 'uu'], r: special },
      b: { v: ["`----'", "`~~~~'"], r: breathe },
    },
    moods: { pet: { m: 3, x: fast(0, 1), y: fast(0, 1) }, poke: { m: 2, a: 1, b: 1 }, asleep: { m: 1, a: 0, b: 0, x: 0, y: 0 } },
  },
  cat: {
    rows: [BLANK, '   {e}    ', '  ( {E}   {E})  ', '  (  {m}  )   ', '  {p}{t}'],
    parts: {
      e: { v: ['/\\_/\\', '/\\-/\\', '/|_/\\', '-\\_/-'], r: (t, w) => (w ? t % 3 : beat(t) === 3 ? 2 : beat(t) === 13 ? 1 : 0) },
      m: { v: ['ω', 'o', 'w'], r: special },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
      t: { v: ['   ', '~  ', ' ~ ', '|  '], r: wag(3) },
    },
    moods: { pet: { e: 0, m: 2, t: fast(1, 2) }, poke: { e: 3, m: 1, t: 3, p: 1 }, asleep: { e: 3, m: 0, t: 0, p: 0 } },
  },
  dragon: {
    rows: ['{s}', '  /^\\  /^\\  ', ' {l}  {E}  {E}  {r} ', ' (   {f}   ) ', "  `-{c}-'  "],
    parts: {
      s: { v: [BLANK, '   ~    ~   ', '    ~  ~    '], r: special },
      l: { v: ['<', '('], r: breathe },
      r: { v: ['>', ')'], r: breathe },
      f: { v: ['~~', '  ', '^^'], r: wag(2, 2), c: 'red' },
      c: { v: ['vvvv', 'VvvV'], r: step },
    },
    moods: { pet: { s: 2, l: 1, r: 1, f: 0 }, poke: { s: fast(1, 2), f: 2, l: fast(0, 1), r: fast(0, 1) }, asleep: { s: 0, l: 0, r: 0, f: 1 } },
  },
  octopus: {
    rows: ['{o}', '   .----.   ', '  ( {E}  {E} )  ', '  {s}  ', '  {t}  '],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special },
      s: { v: ['(______)', '(~~~~~~)'], r: breathe },
      t: { v: ['/\\/\\/\\/\\', '\\/\\/\\/\\/', '_/\\__/\\_'], r: wag(2, 2) },
    },
    moods: { pet: { t: 2, s: 1 }, poke: { o: 2, s: 1, t: fast(0, 1) }, asleep: { t: 2, o: 0, s: 0 } },
  },
  owl: {
    rows: [BLANK, '   {e}   ', '  (({E})({E}))  ', '{l}(  {b}  ){r}', '   {c}   '],
    parts: {
      e: { v: ['/\\  /\\', '/|  /\\', '/\\  |\\', '-\\  /-'], r: (t, w) => (w ? t % 3 : beat(t) === 2 ? 1 : beat(t) === 14 ? 2 : 0) },
      l: { v: ['  ', '/ '], r: flap },
      r: { v: ['  ', ' \\'], r: flap },
      b: { v: ['><', 'vv'], r: special, c: 'yellow' },
      c: { v: ["`----'", '.----.'], r: breathe },
    },
    moods: { pet: { c: 1, b: 1, e: 0 }, poke: { e: 3, l: 1, r: 1, b: 1 }, asleep: { c: 1, e: 3, l: 0, r: 0, b: 0 } },
  },
  turtle: {
    rows: [BLANK, '   _,--._   ', '{h}', ' /[{s}]\\ ', '{f}'],
    parts: {
      h: { v: ['  ( {E}  {E} )  ', '  (  --  )  '], r: () => 0 },
      s: { v: ['______', '======', '_/\\/\\_'], r: (t, w) => (special(t, w) ? 1 : wag(2, 5)(t, w) * 2) },
      f: { v: ['  ``    ``  ', '   ``  ``   ', '            '], r: step },
    },
    moods: { pet: { s: 2, f: fast(0, 1) }, poke: { h: 1, f: 2, s: 1 }, asleep: { h: 1, f: 2, s: 0 } },
  },
  snail: {
    rows: [BLANK, '{a}  .--.  ', '  {k}  ( {c} )  ', "   \\_`--'   ", '  {d}   '],
    parts: {
      a: { v: [' {E}  ', '  {E} ', '    '], r: wag(2, 3) },
      k: { v: ['\\', '|', ' '], r: wag(2, 3) },
      c: { v: ['@', 'o', '0'], r: special },
      d: { v: ['~~~~~~~', ' ~~~~~~', '~ ~~~~~'], r: wag(3, 2) },
    },
    moods: { pet: { c: 2, d: fast(1, 2) }, poke: { a: 2, k: 2, c: 1 }, asleep: { a: 2, k: 2, c: 0, d: 0 } },
  },
  ghost: {
    rows: ['{w}', '   .----.   ', '{l}/ {E}  {E} \\{r}', '  |  {m}  |  ', '  {t}  '],
    parts: {
      w: { v: [BLANK, '    ~  ~    '], r: special },
      l: { v: ['  ', ' ~'], r: flap },
      r: { v: ['  ', '~ '], r: flap },
      m: { v: ['  ', 'oo', '--', 'O '], r: special },
      t: { v: ['~`~``~`~', '`~`~~`~`', '~~`~~`~~'], r: (t, w) => (w ? t % 3 : Math.floor(t / 2) % 3) },
    },
    moods: { pet: { m: 1, l: 1, r: 1, w: 1 }, poke: { m: 3, l: 1, r: 1, t: (t: number) => t % 3 }, asleep: { m: 2, l: 0, r: 0, w: 0, t: 0 } },
  },
  axolotl: {
    rows: [BLANK, '{a}(______){b}', '{a}({E} {m} {E}){b}', '  ( {c} )  ', '  {d}  '],
    parts: {
      a: { v: ['}~', '~}'], r: wag(2, 2), c: 'magenta' },
      b: { v: ['~{', '{~'], r: wag(2, 2), c: 'magenta' },
      m: { v: ['..', 'ww', 'oo'], r: special },
      c: { v: ['.--.', ' -- '], r: special },
      d: { v: ['(_/  \\_)', '~_/  \\_~'], r: step },
    },
    moods: { pet: { m: 1, a: fast(0, 1), b: fast(0, 1), c: 1 }, poke: { m: 2, d: 1, a: 0, b: 0 }, asleep: { m: 0, a: 0, b: 0, d: 0 } },
  },
  capybara: {
    rows: ['{s}', '  {e}______n  ', ' ( {E}    {E} ) ', ' (   {n}   ) ', "  `------'  "],
    parts: {
      s: { v: [BLANK, '    ~  ~    ', '     (o)    '], r: special, c: 'yellow' },
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      n: { v: ['oo', 'Oo', 'oO'], r: wag(3, 3) },
    },
    moods: { pet: { s: 2, n: 0, e: 0 }, poke: { e: 1, n: 1, s: 1 }, asleep: { s: 1, n: 0, e: 1 } },
  },
  cactus: {
    rows: [' {p}        {q} ', ' {r}  {k}  {s} ', ' {t} |{E}  {E}| {u} ', ' |_|    |_| ', '   |    |   '],
    parts: {
      p: { v: [' ', ' ', 'n'], r: arm(0) },
      r: { v: ['n', ' ', '|'], r: arm(0) },
      t: { v: ['|', 'n', '|'], r: arm(0) },
      q: { v: [' ', ' ', 'n'], r: arm(1) },
      s: { v: ['n', ' ', '|'], r: arm(1) },
      u: { v: ['|', 'n', '|'], r: arm(1) },
      k: { v: ['____', '_**_'], r: () => 0, c: 'magenta' },
    },
    moods: { pet: { ...ARMS(2), k: 1 }, poke: { ...ARMS(1), k: 0 }, asleep: { ...ARMS(1), k: 0 } },
  },
  robot: {
    rows: ['{a}', '   .[{l}].   ', '  [ {E}  {E} ]  ', '  [ {m} ]  ', "  `------'  "],
    parts: {
      a: { v: [BLANK, '     *      ', '     +      '], r: special, c: 'yellow' },
      l: { v: ['||', '|-', '-|', '..'], r: wag(3, 2), c: 'green' },
      m: { v: ['====', '-==-', '=--=', '\\__/'], r: wag(3, 3) },
    },
    moods: { pet: { m: 3, a: 2 }, poke: { m: 2, a: fast(1, 2), l: fast(1, 2) }, asleep: { l: 3, m: 1, a: 0 } },
  },
  rabbit: {
    rows: [BLANK, '   ({l}__{r})   ', '  ( {E}  {E} )  ', '{x}({n}){y}', '  {f}  '],
    parts: {
      l: { v: ['\\', '|', '_'], r: twitch(3, 4) },
      r: { v: ['/', '|', '_'], r: twitch(13) },
      x: { v: [' =', ' -'], r: twitch(8, 9) },
      y: { v: ['= ', '- '], r: twitch(8, 9) },
      n: { v: ['  ..  ', ' .  . ', '  ^^  '], r: special },
      f: { v: ['(")__(")', "(')__(\")"], r: step },
    },
    moods: { pet: { l: 1, r: 1, n: 2 }, poke: { l: 0, r: 0, f: fast(0, 1), x: fast(0, 1), y: fast(0, 1) }, asleep: { l: 2, r: 2, n: 0, x: 0, y: 0 } },
  },
  mushroom: {
    rows: ['{s}', ' .-{c}-. ', '(__________)', '   |{E}  {E}|   ', '   |{g}|   '],
    parts: {
      s: { v: [BLANK, '   . o  .   ', '  o  .  o   '], r: special },
      c: { v: ['o-OO-o', 'O-oo-O'], r: wag(2, 4), c: 'red' },
      g: { v: ['____', '_/\\_'], r: step },
    },
    moods: { pet: { s: 2, c: 1 }, poke: { s: fast(1, 2), c: fast(0, 1), g: 1 }, asleep: { s: 0, c: 0, g: 0 } },
  },
  chonk: {
    rows: [BLANK, '  {a}    {b}  ', ' ( {E}    {E} ) ', ' (   {m}   ) ', "  `------'{t} "],
    parts: {
      a: { v: ['/\\', '/|', '/-'], r: twitch(6) },
      b: { v: ['/\\', '/|', '-\\'], r: twitch(14) },
      m: { v: ['..', 'oo', '><', 'ww'], r: special },
      t: { v: [' ', '~'], r: wag(2, 3) },
    },
    moods: { pet: { m: 3, t: fast(0, 1) }, poke: { a: 2, b: 2, m: 2 }, asleep: { m: 0, a: 0, b: 0, t: 0 } },
  },
}

export type Segment = readonly [text: string, color: string]

// One row of a rig at this tick in this mood: coloured segments, eyes filled left to right.
export function rigRow(rig: Rig, row: string, tick: number, isWorking: boolean, eyes: readonly [string, string], color: string, mood?: Mood): Segment[] {
  const out: Segment[] = []
  let n = 0
  const push = (text: string, c: string) => {
    if (!text) return
    const last = out[out.length - 1]
    if (last && last[1] === c) out[out.length - 1] = [last[0] + text, c]
    else out.push([text, c])
  }
  const fill = (text: string) => text.replace(/\{E\}/g, () => eyes[Math.min(n++, 1)] ?? '')
  for (const piece of row.split(/(\{[a-z]\})/)) {
    const key = /^\{([a-z])\}$/.exec(piece)?.[1]
    const part = key ? rig.parts[key] : undefined
    if (!key || !part) {
      push(fill(piece), color)
      continue
    }
    const pinned = mood ? rig.moods[mood]?.[key] : undefined
    const index = typeof pinned === 'number' ? pinned : (pinned ?? part.r)(tick, isWorking)
    push(fill(part.v[index % part.v.length] ?? ''), part.c ?? color)
  }
  return out
}
