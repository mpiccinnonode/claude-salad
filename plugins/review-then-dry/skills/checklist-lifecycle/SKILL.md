---
name: checklist-lifecycle
description: >
  Run the review checklist's lifecycle pass on its own — prune staged checks that
  never earned promotion, freeze active checks nobody violates, expire stale
  suppressions. Use when the SessionStart heartbeat reports pending changes, when
  the user asks to tidy or prune the review checklist, or before a review on a
  repo that has not been reviewed in a while. Not a code review — it touches only
  `.claude/review-checklist.yaml`, never source files.
allowed-tools: Bash Read
argument-hint: "[path to review-checklist.yaml]"
---

# /checklist-lifecycle

Phase 0 of `/lifecycled-code-review` runs the same pass, but only as part of a full
review. The thresholds are measured in days, so a repo nobody reviews for months
accumulates stale entries with nothing to notice. This is that pass, standalone.

Detection is the `SessionStart` heartbeat's job; this skill owns the decision and
the write.

## 1 — Locate the checklist

`$ARGUMENTS` if given, otherwise `.claude/review-checklist.yaml` under the project
root. If it does not exist, say so and stop — suggest `/lifecycled-code-review --seed`
to create one. Do not create it here.

## 2 — Run the pass

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/lifecycle-pass.mjs" <checklist-path> $(date -u +%Y-%m-%d)
```

Read the JSON on stdout: `{prune, freeze, expire, glob_warnings}`. On non-zero exit,
surface the stderr diagnostic verbatim and stop — do not reimplement the rules here.

If all four arrays are empty, report that the checklist is healthy and stop.

## 3 — Present, and wait

Show every proposed change grouped by kind, each with its id, its rule text, and the
date that triggered it. State the threshold that fired so the reasoning is visible:
45 days for prune, 90 for expire, and the per-severity `miss_streak` for freeze.

Then stop and ask which to apply — all, some, or none. **Never write without an
answer.** These entries encode the team's own review knowledge; a check that never
fired may mean the team internalised it, or may mean nobody looks at that dimension.
The script cannot tell those apart and neither can you. Say so when a finding looks
like it could be either.

## 4 — Apply what was approved

- **prune** — remove the check from `checks`
- **freeze** — set the check's `status` to `frozen`
- **expire** — set the suppression's `status` to `expired` (keep the entry; it is a record)
- **glob_warnings** — never auto-fix; report and let the user amend the pattern

Leave `last_evaluated` alone. This pass compares dates, it does not evaluate anything
against code, and bumping it would claim otherwise.

Write through the safe-write script, never with `Edit` — it backs up, writes
atomically, and drops the `.bak` only on success:

```bash
cat <<'YAML' | node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/safe-write-yaml.mjs" --path <checklist-path>
# ...full updated YAML...
YAML
```

Preserve the file's existing formatting and section comments. Re-run step 2 afterwards
and confirm the pass now returns empty.

See `${CLAUDE_PLUGIN_ROOT}/references/checklist-schema.md` for field semantics and the
full lifecycle state machine.
