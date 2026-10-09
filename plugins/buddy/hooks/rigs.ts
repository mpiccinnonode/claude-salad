// Part-by-part rigs for the 17 non-penguin species, built from the original /buddy frames.
// A row is 12 cells once {E} becomes one eye glyph; {x} is a part whose variants share one width.
type Rhythm = (tick: number, isWorking: boolean) => number
export type Rig = { rows: readonly string[]; parts: Record<string, { v: readonly string[]; r: Rhythm }> }

const beat = (t: number) => t % 20
// Each rhythm picks a variant index; different parts get different ones so they move on their own.
const twitch = (...at: number[]): Rhythm => (t, w) => (w ? (t % 4 === 0 ? 1 : 0) : at.includes(beat(t)) ? 1 : 0)
const wag = (n: number, slow = 2): Rhythm => (t, w) => (w ? t % n : Math.floor(t / slow) % n)
const breathe: Rhythm = (t, w) => (w ? t % 2 : Math.floor(beat(t) / 3) % 2)
const special: Rhythm = (t, w) => (w ? (t % 3 === 2 ? 1 : 0) : beat(t) === 11 ? 1 : beat(t) === 12 ? 2 : 0)
const step: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 16 || beat(t) === 18 ? 1 : 0)
const flap: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 4 || beat(t) === 5 ? 1 : 0)
const arm = (offset: number): Rhythm => (t, w) => (w ? (t + offset) % 3 : ([0, 0, 2, 0, 1][Math.floor((t + offset * 3) / 2) % 5] ?? 0))

const BLANK = '            '

export const RIGS: Record<string, Rig> = {
  duck: {
    rows: [BLANK, '    __      ', '  <({E} ){w}  ', '   (  {b}  ', "    `--'{t}   "],
    parts: { w: { v: ['___', '__/'], r: flap }, b: { v: ['._> ', '.__>'], r: special }, t: { v: [' ', '~'], r: wag(2, 3) } },
  },
  goose: {
    rows: [BLANK, '    {h}', '     ||     ', '   {w}   ', '   {f}   '],
    parts: {
      h: { v: [' ({E}>    ', '({E}>     ', ' ({E}>>   '], r: (t, w) => (special(t, w) ? 2 : wag(2, 4)(t, w)) },
      w: { v: ['_(__)_', '/(__)\\'], r: flap },
      f: { v: [' ^^^^ ', '^^  ^^'], r: step },
    },
  },
  blob: {
    rows: [BLANK, '   {a}   ', '  ( {E}  {E} )  ', '  (  {m}  )  ', '   {b}   '],
    parts: {
      a: { v: ['.----.', '.-~~-.'], r: wag(2, 3) },
      m: { v: ['  ', '--', 'o '], r: special },
      b: { v: ["`----'", "`~~~~'"], r: breathe },
    },
  },
  cat: {
    rows: [BLANK, '   {e}    ', '  ( {E}   {E})  ', '  (  {m}  )   ', '  {p}{t}'],
    parts: {
      e: { v: ['/\\_/\\', '/\\-/\\', '/|_/\\'], r: (t, w) => (w ? t % 3 : beat(t) === 3 ? 2 : beat(t) === 13 ? 1 : 0) },
      m: { v: ['ω', 'o'], r: special },
      p: { v: ['(")_(")', "(')_(\")"], r: step },
      t: { v: ['   ', '~  ', ' ~ '], r: wag(3) },
    },
  },
  dragon: {
    rows: ['{s}', '  /^\\  /^\\  ', ' {l}  {E}  {E}  {r} ', ' (   {f}   ) ', "  `-{c}-'  "],
    parts: {
      s: { v: [BLANK, '   ~    ~   ', '    ~  ~    '], r: special },
      l: { v: ['<', '('], r: breathe },
      r: { v: ['>', ')'], r: breathe },
      f: { v: ['~~', '  '], r: wag(2, 2) },
      c: { v: ['vvvv', 'VvvV'], r: step },
    },
  },
  octopus: {
    rows: ['{o}', '   .----.   ', '  ( {E}  {E} )  ', '  {s}  ', '  {t}  '],
    parts: {
      o: { v: [BLANK, '     o      ', '      O     '], r: special },
      s: { v: ['(______)', '(~~~~~~)'], r: breathe },
      t: { v: ['/\\/\\/\\/\\', '\\/\\/\\/\\/'], r: wag(2, 2) },
    },
  },
  owl: {
    rows: [BLANK, '   {e}   ', '  (({E})({E}))  ', '{l}(  {b}  ){r}', '   {c}   '],
    parts: {
      e: { v: ['/\\  /\\', '/|  /\\', '/\\  |\\'], r: (t, w) => (w ? t % 3 : beat(t) === 2 ? 1 : beat(t) === 14 ? 2 : 0) },
      l: { v: ['  ', '/ '], r: flap },
      r: { v: ['  ', ' \\'], r: flap },
      b: { v: ['><', 'vv'], r: special },
      c: { v: ["`----'", '.----.'], r: breathe },
    },
  },
  turtle: {
    rows: [BLANK, '   _,--._   ', '  ( {E}  {E} )  ', ' /[{s}]\\ ', '{f}'],
    parts: {
      s: { v: ['______', '======', '_/\\/\\_'], r: (t, w) => (special(t, w) ? 1 : wag(2, 5)(t, w) * 2) },
      f: { v: ['  ``    ``  ', '   ``  ``   '], r: step },
    },
  },
  snail: {
    rows: [BLANK, '{a}  .--.  ', '  {k}  ( {c} )  ', "   \\_`--'   ", '  {d}   '],
    parts: {
      a: { v: [' {E}  ', '  {E} '], r: wag(2, 3) },
      k: { v: ['\\', '|'], r: wag(2, 3) },
      c: { v: ['@', 'o', '0'], r: special },
      d: { v: ['~~~~~~~', ' ~~~~~~', '~ ~~~~~'], r: wag(3, 2) },
    },
  },
  ghost: {
    rows: ['{w}', '   .----.   ', '{l}/ {E}  {E} \\{r}', '  |  {m}  |  ', '  {t}  '],
    parts: {
      w: { v: [BLANK, '    ~  ~    '], r: special },
      l: { v: ['  ', ' ~'], r: flap },
      r: { v: ['  ', '~ '], r: flap },
      m: { v: ['  ', 'oo', '--'], r: special },
      t: { v: ['~`~``~`~', '`~`~~`~`', '~~`~~`~~'], r: (t, w) => (w ? t % 3 : Math.floor(t / 2) % 3) },
    },
  },
  axolotl: {
    rows: [BLANK, '{a}(______){b}', '{a}({E} .. {E}){b}', '  ( {c} )  ', '  {d}  '],
    parts: {
      a: { v: ['}~', '~}'], r: wag(2, 2) },
      b: { v: ['~{', '{~'], r: wag(2, 2) },
      c: { v: ['.--.', ' -- '], r: special },
      d: { v: ['(_/  \\_)', '~_/  \\_~'], r: step },
    },
  },
  capybara: {
    rows: ['{s}', '  {e}______n  ', ' ( {E}    {E} ) ', ' (   {n}   ) ', "  `------'  "],
    parts: {
      s: { v: [BLANK, '    ~  ~    '], r: special },
      e: { v: ['n', 'u'], r: twitch(3, 9, 17) },
      n: { v: ['oo', 'Oo', 'oO'], r: wag(3, 3) },
    },
  },
  cactus: {
    rows: [' {p}        {q} ', ' {r}  ____  {s} ', ' {t} |{E}  {E}| {u} ', ' |_|    |_| ', '   |    |   '],
    parts: {
      p: { v: [' ', ' ', 'n'], r: arm(0) },
      r: { v: ['n', ' ', '|'], r: arm(0) },
      t: { v: ['|', 'n', '|'], r: arm(0) },
      q: { v: [' ', ' ', 'n'], r: arm(1) },
      s: { v: ['n', ' ', '|'], r: arm(1) },
      u: { v: ['|', 'n', '|'], r: arm(1) },
    },
  },
  robot: {
    rows: ['{a}', '   .[{l}].   ', '  [ {E}  {E} ]  ', '  [ {m} ]  ', "  `------'  "],
    parts: {
      a: { v: [BLANK, '     *      ', '     +      '], r: special },
      l: { v: ['||', '|-', '-|'], r: wag(3, 2) },
      m: { v: ['====', '-==-', '=--='], r: wag(3, 3) },
    },
  },
  rabbit: {
    rows: [BLANK, '   ({l}__{r})   ', '  ( {E}  {E} )  ', ' =({n})= ', '  {f}  '],
    parts: {
      l: { v: ['\\', '|'], r: twitch(3, 4) },
      r: { v: ['/', '|'], r: twitch(13) },
      n: { v: ['  ..  ', ' .  . '], r: special },
      f: { v: ['(")__(")', "(')__(\")"], r: step },
    },
  },
  mushroom: {
    rows: ['{s}', ' .-{c}-. ', '(__________)', '   |{E}  {E}|   ', '   |____|   '],
    parts: {
      s: { v: [BLANK, '   . o  .   ', '  o  .  o   '], r: special },
      c: { v: ['o-OO-o', 'O-oo-O'], r: wag(2, 4) },
    },
  },
  chonk: {
    rows: [BLANK, '  {a}    {b}  ', ' ( {E}    {E} ) ', ' (   {m}   ) ', "  `------'{t} "],
    parts: {
      a: { v: ['/\\', '/|'], r: twitch(6) },
      b: { v: ['/\\', '/|'], r: twitch(14) },
      m: { v: ['..', 'oo'], r: special },
      t: { v: [' ', '~'], r: wag(2, 3) },
    },
  },
}

// One row of a rig at this tick, eyes filled left to right.
export function rigRow(rig: Rig, row: string, tick: number, isWorking: boolean, eyes: readonly [string, string]): string {
  let n = 0
  const parts = row.replace(/\{([a-z])\}/g, (_, k: string) => {
    const part = rig.parts[k]
    return part ? (part.v[part.r(tick, isWorking) % part.v.length] ?? '') : ''
  })
  return parts.replace(/\{E\}/g, () => eyes[Math.min(n++, 1)] ?? '')
}
