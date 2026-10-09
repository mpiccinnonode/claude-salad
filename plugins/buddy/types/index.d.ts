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
export type Quip = string | null
export type Pressed = { kind: 'pet' | 'poke'; at: number } | null

declare module 'claude-code' {
  interface PluginState {
    buddy: { quip: Quip; isHidden: boolean; tick: number; bones: Bones | null; pressed: Pressed; isStats: boolean }
  }
}
