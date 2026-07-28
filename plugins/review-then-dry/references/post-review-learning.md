# Phase 3 — Post-Review Learning

The checklist learning loop: classify findings, track misses, propose
promotions and suppressions, enforce the staged cap, write updates.

Runs after the user has acted on findings. **All proposed checklist changes require user approval.**

If no checklist file exists AND no findings were accepted/rejected, skip Phase 3 entirely.

## Step 1 — Classify Findings

For each finding from the review, based on the user's action and the finding's tag:

| User Action | Finding Tag | Checklist Update |
|---|---|---|
| Accepted | `[check:{id}]` | **Hit:** increment `hit_count`, reset `miss_streak` to 0, set `last_hit` to today |
| Accepted | `[staged]` + `[check:{id}]` | Same as above — staged checks track hits identically |
| Accepted | `[organic]` | **New check candidate:** generate a staged check from this finding |
| Accepted | `[verbosity:{pattern}]` | **Verbosity check candidate:** if a `verbosity-{pattern}` check already exists, treat as a hit. Otherwise generate a staged check with id `verbosity-{pattern}`, severity `minor`, tags `[verbosity]`, rule text summarizing the pattern |
| Rejected | `[verbosity:{pattern}]` | **Suppression candidate:** generate a suppression scoped to that verbosity pattern (prevents re-flagging in future reviews where the verbosity is intentional — e.g., boundary validation the agent misread as defensive-duplicate) |
| Rejected | Any other tag | **Suppression candidate:** generate a suppression entry |
| Skipped | Any tag | **Neutral:** no tracking update |

Additionally: compare accepted `[organic]` findings against frozen checks (see Schema Reference for fuzzy matching). If a match is found, **reactivate the frozen check** (`status → active`, `miss_streak → 0`, increment `hit_count`) instead of creating a new staged entry.

## Step 2 — Track Misses

For each `active` or `staged` check: if the reviewed files included files matching its `applies_to` glob, but the check produced no findings in this review, increment `miss_streak` by 1 and set `last_evaluated` to today.

Checks whose `applies_to` did not match any reviewed file: no change (don't penalize for irrelevant reviews).

## Step 3 — Identify Promotions

Any staged check that now has `hit_count >= 2`: propose promotion to `active`.

## Step 4 — Enforce Staged Cap

Offloaded to `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs` (spec §1.2.3). First, merge new candidates into a scratch copy of the checklist, then run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs" --yaml <scratch-yaml-abs> --cap 30
```

Contract: stdout JSON `{"staged_count":N,"over_cap":bool,"eviction_candidates":[{id, added_date, hit_count}]}`. Candidates = staged entries with `hit_count == 0`, sorted by `added_date` ascending, sliced to the overflow count (staged_count − cap). Non-zero + stderr on missing/invalid argv or malformed YAML. Halt on non-zero. Include returned `eviction_candidates` in the proposal presented to the user.

## Step 5 — Present Proposed Changes

> "**Post-review learning** proposes these checklist updates:
>
> **Hit tracking updates:** {N} checks
> {list: id, hit_count (old → new), miss_streak (old → new)}
>
> **Miss tracking updates:** {N} checks
> {list: id, miss_streak (old → new)}
>
> **New staged checks:** {M}
> {for each: id, severity, rule, applies_to}
>
> **New suppressions:** {K}
> {for each: id, pattern, reason (pending — will ask)}
>
> **Promotions (staged → active):** {P}
> {list: id, hit_count}
>
> **Reactivations (frozen → active):** {R}
> {list: id, matching finding}
>
> **Evictions (staged cap overflow):** {E}
> {list: id, added_date, hit_count}
>
> Apply these changes? (yes / no / edit)"

## Step 6 — Collect Suppression Reasons

For each new suppression the user approved, ask:

> "Want to add a reason for the `{id}` suppression? It helps future reviews understand why this is not a real issue. (Enter reason or press Enter to skip)"

If the user provides a reason, update the `reason` field. If not, keep `"User rejected — pending explanation"`.

## Step 7 — Write Updates

On approval: if no checklist file exists yet, create it with `version: 1` and the new entries. If the file exists, update it following the Safety Protocol (backup → write → delete backup).

On rejection: discard all proposed changes. The review findings are still implemented — only the checklist metadata updates are skipped.

On edit: let user specify which changes to apply, write only those.
