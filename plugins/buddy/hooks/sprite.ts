import type { Hat } from '../types'
import { HAT_ART } from './roster.ts'
import { RIGS, rigRow } from './rigs.ts'
import type { Mood } from './rigs.ts'

export type Row = readonly (readonly [text: string, color: string])[]
export type Action = { kind: 'pet' | 'poke'; age: number }
export type Look = { isWorking: boolean; eye: string; hat: Hat; action?: Action; isAsleep?: boolean }
const H = 'magenta'
const R = 'red'

const SHUT = ['-', '-'] as const
const HAPPY = ['^', '^'] as const
const CROSS = ['ò', 'ó'] as const
const SPIN = ['@', '@'] as const
const SQUINT = ['×', '×'] as const

// A drifting z for a buddy left alone too long, centred on a top row `width` cells wide.
const zzz = (width: number, tick: number, color: string): Row => {
  const at = Math.floor(width / 2) + ((tick >> 1) % 3) - 1
  return [[' '.repeat(at), color], [(tick >> 1) % 2 ? 'Z' : 'z', 'white'], [' '.repeat(width - at - 1), color]]
}

type Beat = { eyes?: 'wide' | 'shut' | 'left' | 'right' | 'spin' | 'squint'; isLifted?: boolean }

// Idle, 20 ticks (6s): blink, hop, look around, spin; the parts keep their own rhythms underneath.
const IDLE: readonly Beat[] = [
  { eyes: 'shut' }, {}, {}, {}, { eyes: 'squint', isLifted: true }, { isLifted: true },
  {}, { eyes: 'left' }, { eyes: 'left' }, { eyes: 'right' }, { eyes: 'right' },
  {}, {}, {}, {}, { eyes: 'spin' }, {}, {}, {}, {},
]
// Working, 6 ticks: a hop, then a waddle with darting eyes.
const BUSY: readonly Beat[] = [{ eyes: 'squint', isLifted: true }, { isLifted: true }, { eyes: 'left' }, { eyes: 'right' }, { eyes: 'left' }, { eyes: 'right' }]

// Any species: its rig, each part on its own rhythm unless the mood pins it; a lift drops the empty top row and leaves `~ ~` beneath.
export function drawBuddy(species: string, tick: number, { isWorking, eye, hat, action, isAsleep }: Look, color: string): Row[] {
  const rig = RIGS[species] ?? RIGS.blob
  if (!rig) return []
  const EYES = { wide: [eye, eye], shut: SHUT, left: [eye, '·'], right: ['·', eye], spin: SPIN, squint: SQUINT } as const
  let beat: Beat = (isWorking ? BUSY[tick % BUSY.length] : IDLE[tick % IDLE.length]) ?? {}
  let eyes: readonly [string, string] = EYES[beat.eyes ?? 'wide']
  let mood: Mood | undefined = isWorking ? 'working' : undefined
  let partTick = tick
  let top: Row | undefined
  if (action?.kind === 'pet') {
    beat = {}
    eyes = HAPPY
    mood = 'pet'
    top = action.age % 2 ? [['      ', color], ['♥', R], ['     ', color]] : [['    ', color], ['♥', R], ['       ', color]]
  } else if (action?.kind === 'poke') {
    beat = action.age < 2 ? { isLifted: true } : {}
    eyes = action.age < 2 ? SQUINT : CROSS
    mood = 'poke'
  } else if (isAsleep) {
    beat = {}
    eyes = SHUT
    mood = 'asleep'
    partTick = 1
    top = zzz(12, tick, color)
  }
  const rows: Row[] = rig.rows.map(row => rigRow(rig, row, partTick, isWorking || action !== undefined, eyes, color, mood))
  const isTopFree = !rows[0]?.map(([t]) => t).join('').trim()
  const spin = hat === 'propeller' && (isWorking ? tick : tick >> 1) % 2 === 1
  const hatRow: Row = [[spin ? (HAT_ART.propeller ?? '').replace('-+-', '=+=') : (HAT_ART[hat] ?? ''), H]]
  if (isTopFree) rows[0] = top ?? (hat === 'none' ? rows[0] ?? [] : hatRow)
  const lifted = beat.isLifted && isTopFree ? [...rows.slice(1), [['    ~ ~     ', color]] as Row] : rows
  const shift = isWorking && !beat.isLifted && tick % 2 ? 1 : 0
  return lifted.map(row => [[' '.repeat(shift), color], ...row, [' '.repeat(1 - shift), color]])
}

export const ACTION_TICKS = { pet: 6, poke: 5 } as const
