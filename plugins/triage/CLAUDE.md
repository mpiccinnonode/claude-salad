# triage plugin — dev notes

Two skills: `/triage` (classifier) and `/triage-cleanup` (stale-artifact deletion). They share the
storage-path convention — cleanup reads from exactly where triage writes.

- Skill bodies: `skills/triage/SKILL.md`, `skills/triage-cleanup/SKILL.md`. In-plugin paths use `${CLAUDE_PLUGIN_ROOT}`.
- Helper scripts: `skills/<skill>/scripts/*.mjs` — Node only, no shell/jq/python/yq.
- Each script has a fixed argv signature + stdout contract documented in its header. Golden-output tests in `test/` lock the behavior of the three scripts ported from POSIX `.sh`.
- `discover-skills.mjs` additionally discovers MCP servers (project `.mcp.json`, `~/.claude.json` per-project entry, and plugin `.mcp.json`).
- `triage-cleanup` is built on report → confirm → delete: `scan-stale.mjs` classifies stale candidates (deterministic; takes `--now` for testable age math, never deletes), the skill body presents and gates, and `delete-targets.mjs` removes only the confirmed list — refusing any path outside its `--allow-root` jails. Git-merged/tracked checks stay in the skill body (heuristic, not deterministic).
- Two sanctioned cross-skill references, both because the skills must agree or they silently diverge (see `skills/triage/references/offload-scripts.md` §Exception):
  - `triage-cleanup` invokes `skills/triage/scripts/resolve-triage-path.mjs` — both skills must agree on *where* records live.
  - `scan-stale.mjs` and `triage-recall.mjs` both import `skills/triage/scripts/yaml-fields.mjs` — all scripts must agree on *how* a record is read. This module owns field extraction and the schema's allowed status values; nothing that a skill decides belongs in it.
- `validate-record.mjs` is the schema's enforcement point, called at the end of triage's Phase 5. Exit 1 = violations printed on stdout, and the skill body must fix and re-run. Without it the lifecycle drifts: measured on 35 real records, 2 used `created_at` instead of `created` and 1 had an off-schema status, and all three were invisible to both recall and cleanup.
- `scan-stale.mjs` asks git for last-commit dates (a fact) but never for merge state (a heuristic — that stays in the skill body). mtime is a checkout timestamp, so it silently reports identical ages for every file in a fresh clone; each candidate carries `ageSource` to say which date it used.
- `hooks/triage-heartbeat.mjs` (SessionStart, registered in `hooks/hooks.json`) is the clock cleanup otherwise lacks: staleness is measured in days, but only `/triage-cleanup` ever evaluated it, and the repos that need it most are the ones where triage stopped being used — so the triggering event never comes again. Detection only, 24h throttle in `${CLAUDE_PLUGIN_DATA}`, always exits 0, never `exit 2` (on SessionStart that bypasses Claude and prints straight to the user).
  - It gates on the triage dir *existing and holding a `.yaml`*: `resolve-triage-path.mjs` answers "where records would live", which is a path in any project with a `.claude/` dir, so without the gate the hook would report orphaned specs in repos that never triaged.
  - Speaks only when something is actionable: `autoDeletable ≥ 1`, or `needsRepair ≥ 1`, or flagged records ≥ `--min-flagged` (default 5). A directory whose every candidate is flag-only has no safe move behind it, and offering cleanup anyway is a recurring nag.
  - `needsRepair` is keyed on the schema's own field names, not on the tolerant read, so it reaches the same verdict as `validate-record.mjs`. Repair cases are never counted as "likely dead".
- Run tests: `npm test` (uses node:test, no deps).
- `hooks/register.ts` (named under `modules` in `hooks/hooks.json`, beside the heartbeat) is a mod
  that runs `validate-record.mjs` after every successful `Write`/`Edit` to a record, meaning a
  `.yaml` directly under `.claude/triage/` or `~/.claude/projects/<slug>/triage/`. On exit 1 it
  hands the violations to the model as context (the user doesn't see it). This is the measured drift above, caught at the
  write instead of left to the skill remembering Phase 5's validate step. That step stays, for
  builds older than 2.1.287 and for renames done with `mv`, which raise no `Write`.
  - It shells out through `$.process.run` (`node` + the script), because a mod has no Node and the
    validator needs `yaml-fields.mjs`. `$.process` is documented CLI-only: where the call fails, the
    mod stays silent.
  - Mod tests are `hooks/*.test.ts`, run by `claude plugin test plugins/triage`; `npm test` is
    scoped to `test/*.test.mjs` because Node ≥ 22 would otherwise pick up the `.ts` files.
