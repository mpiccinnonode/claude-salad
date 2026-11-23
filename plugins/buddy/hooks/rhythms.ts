// Rig shapes and the rhythms parts move by, shared by the species rigs and the hybrids.
export type Rhythm = (tick: number, isWorking: boolean) => number
export type Mood = 'pet' | 'poke' | 'asleep' | 'working'
export type Part = { v: readonly string[]; r: Rhythm; c?: string }
// A mood pins a part to one variant, or gives it its own rhythm; parts it doesn't name keep theirs.
export type Rig = { rows: readonly string[]; parts: Record<string, Part>; moods: Partial<Record<Mood, Record<string, number | Rhythm>>> }

export const beat = (t: number) => t % 20
// Each rhythm picks a variant index; different parts get different ones so they move on their own.
export const twitch = (...at: number[]): Rhythm => (t, w) => (w ? (t % 4 === 0 ? 1 : 0) : at.includes(beat(t)) ? 1 : 0)
export const wag = (n: number, slow = 2): Rhythm => (t, w) => (w ? t % n : Math.floor(t / slow) % n)
export const breathe: Rhythm = (t, w) => (w ? t % 2 : Math.floor(beat(t) / 3) % 2)
export const special: Rhythm = (t, w) => (w ? (t % 3 === 2 ? 1 : 0) : beat(t) === 11 ? 1 : beat(t) === 12 ? 2 : 0)
export const step: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 16 || beat(t) === 18 ? 1 : 0)
export const flap: Rhythm = (t, w) => (w ? t % 2 : beat(t) === 4 || beat(t) === 5 ? 1 : 0)
export const arm = (offset: number): Rhythm => (t, w) => (w ? (t + offset) % 3 : ([0, 0, 2, 0, 1][Math.floor((t + offset * 3) / 2) % 5] ?? 0))
export const fast = (a: number, b: number): Rhythm => t => (t % 2 ? b : a)
// The same rhythm `by` ticks late, so a trailing part follows the one that leads it.
export const lag = (r: Rhythm, by: number): Rhythm => (t, w) => r(Math.max(0, t - by), w)

export const BLANK = '            '


export const ears: Rhythm = (t, w) => (w ? t % 3 : beat(t) === 3 ? 2 : beat(t) === 13 ? 1 : 0)
export const smoke = { v: [BLANK, "    '  '    ", "   '    '   "], r: special }
export const tufts = (t: number, w: boolean) => (w ? t % 3 : beat(t) === 2 ? 1 : beat(t) === 14 ? 2 : 0)
export const tuft = (t: number, w: boolean) => (w ? (t % 2 ? 2 : 0) : beat(t) === 12 || beat(t) === 13 ? 1 : 0)
export const hem = (n: number) => (t: number, w: boolean) => (w ? t % n : Math.floor(t / 2) % n)
// Arm poses top to bottom: raised, held out, half-raised.
export const LEFT = [[' _ ', '| |', '\\__'], ['   ', '___', '(__'], ['   ', '| |', '\\__']]
export const RIGHT = [[' _ ', '| |', '__/'], ['   ', '___', '__)'], ['   ', '| |', '__/']]
export const armRow = (side: string[][], row: number) => side.map(pose => pose[row] ?? '')
export const ARMS = (pose: number) => ({ a: pose, b: pose, c: pose, d: pose, e: pose, f: pose })
export const arms = {
  a: { v: armRow(LEFT, 0), r: arm(0) }, c: { v: armRow(LEFT, 1), r: arm(0) }, e: { v: armRow(LEFT, 2), r: arm(0) },
  b: { v: armRow(RIGHT, 0), r: arm(1) }, d: { v: armRow(RIGHT, 1), r: arm(1) }, f: { v: armRow(RIGHT, 2), r: arm(1) },
}
export const typing = (t: number, w: boolean) => (w ? t % 3 : Math.floor(t / 2) % 3)
// A legendary's sparkle: dark most of the beat, then . + * + . from its own offset.
export const glint = (at: number): Part => ({
  v: [' ', '.', '+', '*', '+', '.'],
  r: (t, w) => {
    const k = ((w ? 2 * t : t) + at) % 12
    return k < 6 ? k : 0
  },
  c: 'yellow',
})
