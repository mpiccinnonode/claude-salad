import type { Bones, Rarity, StatName } from '../types'

// Original /buddy roll (wyhash → mulberry32), ported from ramarivera/coding-buddy (MIT) with the original 18 species.
export const SPECIES = ['duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'penguin', 'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot', 'rabbit', 'mushroom', 'chonk'] as const
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
export const STAT_NAMES: readonly StatName[] = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK']
export const EYES = ['·', '✦', '×', '◉', '@', '°'] as const
export const HATS: readonly Bones['hat'][] = ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck']


const WEIGHTS: Record<Rarity, number> = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
const FLOOR: Record<Rarity, number> = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50 }
const SALT = 'friend-2026-401'

const M64 = (1n << 64n) - 1n
const SECRET = [0xa0761d6478bd642fn, 0xe7037ed1a0b428dbn, 0x8ebc6af09c88c6e3n, 0x589965cc75374cc3n] as const
const mum = (a: bigint, b: bigint): [bigint, bigint] => {
  const x = (a & M64) * (b & M64)
  return [x & M64, (x >> 64n) & M64]
}
const mix = (a: bigint, b: bigint) => {
  const [lo, hi] = mum(a, b)
  return (lo ^ hi) & M64
}
const r8 = (buf: Uint8Array, off: number) => {
  let v = 0n
  for (let i = 0; i < 8; i++) v |= BigInt(buf[off + i] ?? 0) << BigInt(i * 8)
  return v
}
const r4 = (buf: Uint8Array, off: number) => {
  let v = 0n
  for (let i = 0; i < 4; i++) v |= BigInt(buf[off + i] ?? 0) << BigInt(i * 8)
  return v
}

// Zig stdlib wyhash v4.2, what Bun.hash computes.
export function wyhash(input: string): bigint {
  const buf = new TextEncoder().encode(input)
  const len = buf.length
  let s0 = mix(SECRET[0], SECRET[1])
  let s1 = s0
  let s2 = s0
  let a: bigint
  let b: bigint
  if (len <= 16) {
    if (len >= 4) {
      const q = (len >> 3) << 2
      a = ((r4(buf, 0) << 32n) | r4(buf, q)) & M64
      b = ((r4(buf, len - 4) << 32n) | r4(buf, len - 4 - q)) & M64
    } else if (len > 0) {
      a = (BigInt(buf[0] ?? 0) << 16n) | (BigInt(buf[len >> 1] ?? 0) << 8n) | BigInt(buf[len - 1] ?? 0)
      b = 0n
    } else {
      a = 0n
      b = 0n
    }
  } else {
    let i = 0
    if (len >= 48) {
      while (i + 48 < len) {
        s0 = mix(r8(buf, i) ^ SECRET[1], r8(buf, i + 8) ^ s0)
        s1 = mix(r8(buf, i + 16) ^ SECRET[2], r8(buf, i + 24) ^ s1)
        s2 = mix(r8(buf, i + 32) ^ SECRET[3], r8(buf, i + 40) ^ s2)
        i += 48
      }
      s0 = (s0 ^ s1 ^ s2) & M64
    }
    const rem = buf.subarray(i)
    for (let ri = 0; ri + 16 < rem.length; ri += 16) s0 = mix(r8(rem, ri) ^ SECRET[1], r8(rem, ri + 8) ^ s0)
    a = r8(buf, len - 16)
    b = r8(buf, len - 8)
  }
  ;[a, b] = mum(a ^ SECRET[1], b ^ s0)
  return mix(a ^ SECRET[0] ^ BigInt(len), b ^ SECRET[1])
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function roll(userId: string): Bones {
  const rng = mulberry32(Number(wyhash(userId + SALT) & 0xffffffffn))
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)] as T
  let left = rng() * 100
  const rarity = RARITIES.find(r => (left -= WEIGHTS[r]) < 0) ?? 'common'
  const species = pick(SPECIES)
  const eye = pick(EYES)
  const hat = rarity === 'common' ? 'none' : pick(HATS)
  const isShiny = rng() < 0.01
  const peak = pick(STAT_NAMES)
  let dump = pick(STAT_NAMES)
  while (dump === peak) dump = pick(STAT_NAMES)
  const floor = FLOOR[rarity]
  const stats = {} as Record<StatName, number>
  for (const name of STAT_NAMES) {
    stats[name] =
      name === peak ? Math.min(100, floor + 50 + Math.floor(rng() * 30))
      : name === dump ? Math.max(1, floor - 10 + Math.floor(rng() * 15))
      : floor + Math.floor(rng() * 40)
  }
  return { rarity, species, eye, hat, isShiny, stats, peak }
}
