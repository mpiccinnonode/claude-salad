# Product

<!-- impeccable:product-schema 1 -->

## Platform

terminal

Not one of web/ios/android/adaptive: buddy is a Claude Code mod drawn in the terminal through the mod UI elements (`Box`, `Text`, `Button`, `Input`, `Select`, `Link`), monospace cells, ANSI colour names only.

## Users

People who install `buddy@mpiccinnonode` from the claude-salad marketplace: Claude Code users, many of them missing the original `/buddy` companion removed in 2.1.97. They use it while coding, in Italian or English (`language` option), with the buddy band above the prompt as a side companion, never the main task.

## Product Purpose

Brings back the `/buddy` companion as a mod: animated buddies that sit above the prompt, react to the user's work, hatch from eggs earned by turns together, form a crew and evolve. Success is a companion that feels alive and personal without getting in the way of the work.

## Positioning

Faithful to the original: the same roll algorithm, species and art, so a returning user gets the buddy they had. Beyond the original: a roster of many buddies in one user-owned file, crew of several out at once, turn-based eggs and evolution, Haiku-written personalities.

## Operating Context

- Lives inside a Claude Code session: the band above the prompt (`AbovePrompt`), slash commands `/buddy <verb>`, and panes a mod can open (docked beside the transcript in fullscreen from 110 columns, inline above the prompt otherwise).
- `~/.claude/buddy/buddies.json` is the one source of every buddy's name, species and personality; users edit it by hand too. The plugin store holds only what is rolled or counted (born, stats, tallies, crew).
- Several sessions run at once and the band follows the disk within seconds.

## Capabilities and Constraints

- Per buddy: name, species (21 in `ALL_SPECIES`), rolled body (rarity ★–★★★★★, eyes, hat, five stats), personality (a sentence, or fields: tone, traits, quirks, backstory, speech, catchphrase, likes, dislikes), epithet after evolving, turns left to evolve, crew membership (up to `crewSize`, one lead). Unhatched entries are eggs.
- Rolled facts (rarity, sprite, stats) are never user-editable; evolution is the only way they change.
- Edits must be written into `buddies.json`, keeping fields the plugin does not know; a file that is not valid JSON is never rewritten.
- Keyboard first: every action reachable from the keyboard; clicks are an extra. Number keys act while the band has focus.
- Must work on the main screen (inline, any width) as well as fullscreen docked.
- Every user-facing line exists in Italian and English (`words.ts`).

## Brand Commitments

- Name "buddy"; the original's art, species and reaction lines (adapted from ramarivera/coding-buddy, MIT).
- Rarity colours: common gray, uncommon green, rare cyan, epic magenta, legendary yellow; rarity shown as yellow stars.
- Voice: short, warm, a little playful; the buddies speak, the chrome stays plain.

## Evidence on Hand

- Real roster data lives in the user's `buddies.json`; README shows sample entries (Nino the duck, Pippo, Zed).
- No user research, testimonials or usage metrics; do not invent them.

## Product Principles

1. The file is the user's: anything editable round-trips through `buddies.json` untouched beyond the edited field.
2. Companion, not chore: it never blocks the prompt or demands attention.
3. Rolled is rolled: luck stays visible and honest; nothing lets a user pick rarity or stats.
4. Keyboard before mouse, narrow before wide.
5. Same buddy everywhere: every session and both languages show the same buddy.

## Accessibility & Inclusion

Colour never carries meaning alone (rarity also shows as stars; crew state as marks). Works in a monochrome terminal and at narrow widths.
