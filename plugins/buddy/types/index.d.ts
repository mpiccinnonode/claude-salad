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
// What is ready to spend: an egg, and the names of the buddies out that can evolve.
export type Ready = { egg: boolean; glow: string[] }
export type Pressed = { kind: 'pet' | 'poke'; at: number; who: string } | null

// The list pane: every buddy in the file, read from disk (`listing`, null while the pane is shut) and what the person picked in it (`pane`).
export type Status = 'lead' | 'crew' | 'bench' | 'egg'
export type Card = { key: string; name: string; species: string; status: Status; personality?: string | Record<string, string | string[]>; bones?: Bones; title?: string; left?: number }
export type Listing = { cards: Card[]; crewSize: number; egg: { done: number; per: number; left: number }; error?: string }
export type Filter = 'all' | Status | 'ready'
export type Draft = { name: string; species: string; soul: string }
export type PaneUi = { sel: string; filter: Filter; rarity: string; species: string; query: string; mode: 'view' | 'add' | 'swap' | 'rm'; note: string; isBusy: boolean; draft: Draft }

declare module 'claude-code' {
  interface PluginState {
    buddy: { quip: Quip; isHidden: boolean; tick: number; members: Member[] | null; pressed: Pressed; isStats: boolean; speaker: number; ready: Ready; listing: Listing | null; pane: PaneUi }
  }
}
