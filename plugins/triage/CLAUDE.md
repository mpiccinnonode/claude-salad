# triage plugin — dev notes

Single-skill plugin packaging the `/triage` classifier.

- Skill body: `skills/triage/SKILL.md`. In-plugin paths use `${CLAUDE_PLUGIN_ROOT}`.
- Helper scripts: `skills/triage/scripts/*.mjs` — Node only, no shell/jq/python/yq.
- Each script has a fixed argv signature + stdout contract documented in its header. Three were ported 1:1 from POSIX `.sh`; parity is locked by golden-output tests in `test/`.
- `discover-skills.mjs` additionally discovers MCP servers (project `.mcp.json`, `~/.claude.json` per-project entry, and plugin `.mcp.json`).
- Run tests: `npm test` (uses node:test, no deps).
