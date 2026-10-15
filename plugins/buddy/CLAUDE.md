# buddy plugin — dev notes

A mod: function hooks only. Needs Claude Code ≥ 2.1.299 (a `Button` holding coloured `Text` children, and `Text mono`; 2.1.296 and older refuse it).

- `hooks/register.tsx` wires events and draws the band; everything it draws comes from pure modules that the tests drive directly.
- `hooks/bones.ts` is the original roll (wyhash → mulberry32, salt `friend-2026-401`) over the original 18 species. coding-buddy's list has 20, which changes every roll, so keep 18. `bones.test.ts` pins reference values computed with coding-buddy's engine.
- `hooks/rigs.ts` rigs all 18 species: each part has its variants, a rhythm, an optional colour, and per-mood pins (`pet`, `poke`, `asleep`, `working`). `hooks/sprite.ts` is the one engine on top: eyes, hop, hat, hearts, sleep. `rigs.test.ts` checks every variant combination keeps a row 12 cells wide and that every mood moves part of the body.
- `hooks/friends.ts` parses and patches the buddies file (`buddiesFile`), and turns a structured personality into prompt text. `upsert` keeps fields it does not know: the file is the user's.
- In `register.tsx`, a file buddy without a `born` entry in the store is an egg; `hatchNew` spends one, rolls a random seed and, when the entry has no personality, asks Haiku (`dreamUp`) and writes it back. `bornOriginal` reads `~/.claude.json` once (`migrated` flag) so users of 0.2.0 keep their buddy; never read it anywhere else.
- Evolution: `together` in the store counts sessions per buddy (`''` is the original); `born[key].stage` counts evolutions spent and `born[key].title` holds the epithet in both languages. `evolveNow` applies `evolve` (bones.ts) and Haiku's new soul (`dreamOn`) only when both succeed; a file buddy's soul goes into the buddies file, the original's into `born`.
- `hooks/roster.ts` holds per-species lines and hats, generated from coding-buddy (MIT, see `THIRD_PARTY_LICENSE-coding-buddy`).
- The validator only lets `$` be passed to functions declared at the top of the module; keep helpers that take `$` at top level.
- Check before pushing: `claude plugin validate plugins/buddy` and `claude plugin test plugins/buddy`. For a type-check, use a scratch `tsconfig.json` with `allowImportingTsExtensions` (the modules import each other as `./x.ts`).
