# review-then-dry plugin — dev notes

Three-skill suite backported from personal `~/.claude` skills: `lifecycled-code-review`,
`dry`, and the `review-then-dry` orchestrator. See the design spec at
`docs/superpowers/specs/2026-06-08-review-then-dry-plugin-design.md` for the 11 locked decisions.

- Agents: `agents/code-reviewer.md` (dispatched by `lifecycled-code-review`) and
  `agents/reusability-refactor-expert.md` (dispatched by `dry`). These are the dispatch
  targets the skills reference by `subagent_type`; they MUST ship with the plugin or the
  skills fail to dispatch on a fresh install. Backported 1:1 from personal `~/.claude/agents`.
- Skill bodies: `skills/*/SKILL.md`. In-plugin paths use quoted `"${CLAUDE_PLUGIN_ROOT}"`.
- Helper scripts: Node only, no shell/jq/python/yq. Each has a fixed argv signature + stdout
  contract in its header, ported 1:1 from a POSIX `.sh` original.
- YAML parsing uses the vendored `scripts/vendor/js-yaml.mjs` (decision #11). `js-yaml` is a
  devDependency for CVE hygiene only; it is NOT installed at plugin-install time.
- `lifecycled-code-review` is renamed from the built-in `code-review` to avoid collision; the
  orchestrator's `Skill()` calls use the namespaced `review-then-dry:<skill>` form.
- `checklist-lifecycle` is Phase 0 extracted as a standalone skill, so the lifecycle
  pass can run without paying for a whole review. It shares `lifecycle-pass.mjs` and
  `safe-write-yaml.mjs` with `lifecycled-code-review` — no duplicated rule logic.
- `hooks/checklist-heartbeat.mjs` (SessionStart, auto-discovered from `hooks/hooks.json`)
  is the clock the lifecycle never had: its thresholds are in days, but Phase 0 only
  fired when someone ran a review. The hook detects and reports, never writes.
  Throttled by `--frequency <hours>` (default 24) with state in `${CLAUDE_PLUGIN_DATA}`.
  It returns `additionalContext` and always exits 0 — on SessionStart, exit 2 prints
  stderr to the user and bypasses Claude, which is the wrong direction for a note that
  Claude is supposed to relay.
- Run tests: `npm test` (uses node:test). Run `npm install` first to pull the js-yaml
  devDependency for the parity test.
