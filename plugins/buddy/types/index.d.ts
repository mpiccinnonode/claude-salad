export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type StatName = 'DEBUGGING' | 'PATIENCE' | 'CHAOS' | 'WISDOM' | 'SNARK'
export type Hat = 'none' | 'crown' | 'tophat' | 'propeller' | 'halo' | 'wizard' | 'beanie' | 'tinyduck'
export type Bones = {
  rarity: Rarity
  species: string
  eye: string
  hat: Hat
  isShiny: boolean
  stats: Record<StatName, number>
  peak: StatName
}
// A buddy that is out: `key` is its slot in `born` ('' for the stand-in), `personality` already prompt text.
export type Member = { key: string; name: string; title?: string; personality: string; bones: Bones }
export type Quip = string | null
export type Pressed = { kind: 'pet' | 'poke'; at: number; who: string } | null

declare module 'claude-code' {
  interface PluginState {
    buddy: { quip: Quip; isHidden: boolean; tick: number; members: Member[] | null; pressed: Pressed; isStats: boolean; speaker: number }
  }
}
