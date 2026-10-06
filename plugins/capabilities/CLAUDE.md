# capabilities plugin — dev notes

Two skills: `/capabilities` reads every `CAPABILITIES.md` in a GitHub org and answers "have we already built this?"; `/capabilities-add` creates the file and its CLAUDE.md upkeep instruction in a repo that lacks them.

- Skill body: `skills/capabilities/SKILL.md`. In-plugin paths use `${CLAUDE_PLUGIN_ROOT}`.
- `skills/capabilities/scripts/fetch-index.mjs` — Node only, shells out to `gh`. One paginated GraphQL query reads `HEAD:CAPABILITIES.md` from every non-archived repo (no code-search index, so no lag after a merge), concatenated into `~/.cache/claude-capabilities/<org>.md`, 24h cache.
- Matching is left to the model on purpose: the whole index fits in context and semantic matching beats keyword search for non-technical phrasing.
- The `CAPABILITIES.md` format (frontmatter `project`, `client`, `domain`, `stack`, `status`, `updated`; sections "Cosa sa fare", "Servizi esterni", "Da sapere") is the contract the skill reads — change it together with `skills/capabilities-add/templates/` (`CAPABILITIES.md` and the `CLAUDE-snippet.md` it appends between `<!-- capabilities:start/end -->` markers). The file is written for non-technical readers: no code conventions, tech debt or security issues in it.
- Run tests: `npm test` (uses node:test, no deps).
