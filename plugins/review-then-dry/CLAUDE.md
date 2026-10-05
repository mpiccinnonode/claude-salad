# review-then-dry plugin — dev notes

Four-skill suite backported from personal `~/.claude` skills: `lifecycled-code-review`,
`dry`, the `review-then-dry` orchestrator, and the standalone `checklist-lifecycle`.

- Agents: `agents/code-reviewer.md` (dispatched by `lifecycled-code-review`) and
  `agents/reusability-refactor-expert.md` (dispatched by `dry`). These are the dispatch
  targets the skills reference by `subagent_type`; they MUST ship with the plugin or the
  skills fail to dispatch on a fresh install. Backported 1:1 from personal `~/.claude/agents`.
- Skill bodies: `skills/*/SKILL.md`. In-plugin paths use quoted `"${CLAUDE_PLUGIN_ROOT}"`.
- Helper scripts: Node only, no shell/jq/python/yq. Each has a fixed argv signature + stdout
  contract in its header, ported 1:1 from a POSIX `.sh` original.
- YAML parsing uses the vendored `scripts/vendor/js-yaml.mjs`. `js-yaml` is a
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
- `hooks/register.ts` (named under `modules` in `hooks/hooks.json`, beside the command hook) is
  the checklist-whisper mod: after an `Edit`/`Write` succeeds on a file matching an `active`
  check's `applies_to`, it appends `Project rule <id> (<severity>): <rule>` as model-only
  context, once per file per check per load. Never denies. Needs Claude Code ≥ 2.1.287; older
  builds ignore `modules` and keep the heartbeat.
  - `active` only: a `staged` check earns promotion by real review hits, and whispering it would
    pre-empt exactly the violations that prove it. `frozen` checks are frozen because nobody
    violates them.
  - It imports the vendored `scripts/vendor/js-yaml.mjs` (pure ESM, runs in the mod sandbox)
    instead of a sidecar or a hand parser: one source of truth, and real checklists use folded
    `>` and multi-line scalars. Unparseable YAML → silence; the review flow reports it.
  - Glob matching is a small glob→regex in `hooks/whisper.ts` (`$` has none): `**/`, `**`, `*`,
    `?`, `{a,b}`, and comma-separated globs, which real checklists use.
  - Mod tests are `hooks/*.test.ts`, run by `claude plugin test plugins/review-then-dry`; `npm test`
    is scoped to `test/*.test.mjs` because Node ≥ 22 would otherwise pick up the `.ts` files.
