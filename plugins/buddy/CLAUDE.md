# buddy plugin — dev notes

A mod: function hooks only. Needs Claude Code ≥ 2.1.295 (a `Button` holding coloured `Text` children; 2.1.294 and older refuse it).

- `hooks/register.tsx` wires events and draws the band; everything it draws comes from pure modules that the tests drive directly.
- `hooks/bones.ts` is the original roll (wyhash → mulberry32, salt `friend-2026-401`) over the original 18 species. coding-buddy's list has 20, which changes every roll, so keep 18. `bones.test.ts` pins reference values computed with coding-buddy's engine.
- `hooks/sprite.ts`: the penguin has a hand-made rig (`pose`); every other species goes through `hooks/rigs.ts`, where each part has its own variants and rhythm. `rigs.test.ts` checks every variant combination keeps a row 12 cells wide.
- `hooks/roster.ts` holds per-species lines and hats, generated from coding-buddy (MIT, see `THIRD_PARTY_LICENSE-coding-buddy`).
- The validator only lets `$` be passed to functions declared at the top of the module; keep helpers that take `$` at top level.
- Check before pushing: `claude plugin validate plugins/buddy` and `claude plugin test plugins/buddy`. For a type-check, use a scratch `tsconfig.json` with `allowImportingTsExtensions` (the modules import each other as `./x.ts`).
