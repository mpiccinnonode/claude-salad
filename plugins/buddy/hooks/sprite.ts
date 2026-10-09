import type { Hat } from '../types'
import { HAT_ART } from './roster.ts'
import { RIGS, rigRow } from './rigs.ts'

export type Row = readonly (readonly [text: string, color: string])[]
export type Action = { kind: 'pet' | 'poke'; age: number }
export type Look = { isWorking: boolean; eye: string; hat: Hat; action?: Action; isAsleep?: boolean }
const C = 'cyan'
const Y = 'yellow'
const H = 'magenta'
const R = 'red'

// Original hat art, trimmed to the 7-cell column; each pair is the hat's two frames.
const HATS: Record<Hat, readonly [string, string]> = {
  none: ['       ', '       '],
  crown: [' \\^^^/ ', ' \\^^^/ '],
  tophat: [' [___] ', ' [___] '],
  propeller: ['  -+-  ', '  =+=  '],
  halo: [' (   ) ', ' (   ) '],
  wizard: ['  /^\\  ', '  /^\\  '],
  beanie: [' (___) ', ' (___) '],
  tinyduck: ['  ,>   ', '  ,>   '],
}

type Pose = {
  head: string
  eyes: readonly [string, string]
  body: string
  feet: string
  shift: 0 | 1
  isJumping?: boolean
  top?: Row
}

const HEAD = ' .---. '
const TUFT = ' .-~-. '
const BOB = ' .-^-. '

const SHUT = ['-', '-'] as const
const HAPPY = ['^', '^'] as const
const CROSS = ['ò', 'ó'] as const
const SPIN = ['@', '@'] as const
const SQUINT = ['×', '×'] as const
const DAZED = ['°', '°'] as const

const REST = '/(   )\\'
const DOWN = '|(   )|'
const FLAP = '\\(   )/'

const STAND = ' `---´ '
const TAP = ' `--.´ '
const STEP_L = ' ´---` '
const AIR: Row = [['  ~ ~  ', C]]
// A drifting z for a buddy left alone too long, centred on a top row `width` cells wide.
const zzz = (width: number, tick: number, color: string): Row => {
  const at = Math.floor(width / 2) + ((tick >> 1) % 3) - 1
  return [[' '.repeat(at), color], [(tick >> 1) % 2 ? 'Z' : 'z', 'white'], [' '.repeat(width - at - 1), color]]
}
const HEARTS: readonly Row[] = [[['  ', C], ['♥', R], ['    ', C]], [['    ', C], ['♥', R], ['  ', C]]]

// Original buddy penguin; 5 rows of 9 cells, a jump lifts it a row with `~ ~` beneath, else the top row wears the hat.
const draw = ({ head, eyes, body, feet, shift, isJumping, top }: Pose): Row[] => {
  const pad = (row: Row): Row => [[' '.repeat(1 + shift), C], ...row, [' '.repeat(1 - shift), C]]
  const rows: Row[] = [
    [[head, C]],
    [[` (${eyes[0]}`, C], ['>', Y], [`${eyes[1]}) `, C]],
    [[body, C]],
    [[feet, C]],
  ]
  return (isJumping ? [...rows, AIR] : [top ?? [['       ', C]], ...rows]).map(pad)
}

// A click plays first; else idle, one 6s cycle: hops, breathes, blinks, darts, ruffles its tuft, spins, taps a foot. Working: waddles and hops.
export function pose(tick: number, { isWorking, eye, hat, action, isAsleep }: Look): Row[] {
  const wide = [eye, eye] as const
  const left = [eye, '·'] as const
  const right = ['·', eye] as const
  const spin = ((isWorking ? tick : tick >> 1) % 2) as 0 | 1
  const top: Row = [[HATS[hat][spin], H]]

  if (isAsleep && !action) return draw({ head: HEAD, eyes: SHUT, body: DOWN, feet: STAND, shift: 0, top: zzz(7, tick, C) })
  if (action?.kind === 'pet')
    return draw({ head: HEAD, eyes: HAPPY, body: DOWN, feet: STAND, shift: 0, top: HEARTS[action.age % 2] })
  if (action?.kind === 'poke')
    return action.age < 2
      ? draw({ head: HEAD, eyes: SQUINT, body: FLAP, feet: STAND, shift: 0, isJumping: true })
      : draw({ head: TUFT, eyes: CROSS, body: REST, feet: action.age % 2 ? TAP : STAND, shift: 0, top })

  if (isWorking) {
    if (tick % 6 < 2) return draw({ head: HEAD, eyes: tick % 6 === 0 ? SQUINT : DAZED, body: FLAP, feet: STAND, shift: 0, isJumping: true })
    const odd = tick % 2 === 1
    return draw({
      head: odd ? BOB : HEAD,
      eyes: tick % 10 === 0 ? SHUT : tick % 4 < 2 ? left : right,
      body: odd ? REST : FLAP,
      feet: odd ? STAND : STEP_L,
      shift: odd ? 1 : 0,
      top,
    })
  }
  const t = tick % 20
  if (t === 4 || t === 5) return draw({ head: HEAD, eyes: SQUINT, body: REST, feet: STAND, shift: 0, isJumping: true })
  return draw({
    head: t === 12 || t === 13 ? TUFT : HEAD,
    eyes: t === 0 ? SHUT : t === 7 || t === 8 ? left : t === 9 || t === 10 ? right : t === 15 ? SPIN : wide,
    body: Math.floor(t / 3) % 2 === 1 ? DOWN : REST,
    feet: t >= 16 && t % 2 === 0 ? TAP : STAND,
    shift: 0,
    top,
  })
}

export const ACTION_TICKS = { pet: 6, poke: 5 } as const

type Beat = { eyes?: 'wide' | 'shut' | 'left' | 'right' | 'spin' | 'squint'; isLifted?: boolean }

// Idle, 20 ticks (6s): blink, hop, look around, spin; the parts keep their own rhythms underneath.
const IDLE: readonly Beat[] = [
  { eyes: 'shut' }, {}, {}, {}, { eyes: 'squint', isLifted: true }, { isLifted: true },
  {}, { eyes: 'left' }, { eyes: 'left' }, { eyes: 'right' }, { eyes: 'right' },
  {}, {}, {}, {}, { eyes: 'spin' }, {}, {}, {}, {},
]
// Working, 6 ticks: a hop, then a waddle with darting eyes.
const BUSY: readonly Beat[] = [{ eyes: 'squint', isLifted: true }, { isLifted: true }, { eyes: 'left' }, { eyes: 'right' }, { eyes: 'left' }, { eyes: 'right' }]

// Every other species: its rig, each part on its own rhythm; a lift drops the empty top row and leaves `~ ~` beneath.
function poseRigged(species: string, tick: number, { isWorking, eye, hat, action, isAsleep }: Look, color: string): Row[] {
  const rig = RIGS[species] ?? RIGS.blob
  if (!rig) return []
  const EYES = { wide: [eye, eye], shut: SHUT, left: [eye, '·'], right: ['·', eye], spin: SPIN, squint: SQUINT } as const
  let beat: Beat = (isWorking ? BUSY[tick % BUSY.length] : IDLE[tick % IDLE.length]) ?? {}
  let eyes: readonly [string, string] = EYES[beat.eyes ?? 'wide']
  let partTick = tick
  let top: Row | undefined
  if (action?.kind === 'pet') {
    beat = {}
    eyes = HAPPY
    top = action.age % 2 ? [['      ', color], ['♥', R], ['     ', color]] : [['    ', color], ['♥', R], ['       ', color]]
  } else if (action?.kind === 'poke') {
    beat = action.age < 2 ? { isLifted: true } : {}
    eyes = action.age < 2 ? SQUINT : CROSS
  } else if (isAsleep) {
    beat = {}
    eyes = SHUT
    partTick = 1
    top = zzz(12, tick, color)
  }
  const art = rig.rows.map(row => rigRow(rig, row, partTick, isWorking || action !== undefined, eyes))
  const isTopFree = !art[0]?.trim()
  const rows: Row[] = art.map((text, i) =>
    i === 0 && isTopFree && top ? top
    : i === 0 && isTopFree && hat !== 'none' ? [[HAT_ART[hat] ?? text, H]]
    : [[text, color]],
  )
  const lifted = beat.isLifted && isTopFree ? [...rows.slice(1), [['    ~ ~     ', color]] as Row] : rows
  const shift = isWorking && !beat.isLifted && tick % 2 ? 1 : 0
  return lifted.map(row => [[' '.repeat(shift), color], ...row, [' '.repeat(1 - shift), color]])
}

export function drawBuddy(species: string, tick: number, look: Look, color: string): Row[] {
  return species === 'penguin' ? pose(tick, look) : poseRigged(species, tick, look, color)
}
