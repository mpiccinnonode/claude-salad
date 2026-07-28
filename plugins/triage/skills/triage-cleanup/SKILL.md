---
name: triage-cleanup
description: Use when `.claude/triage/` has filled up with finished, abandoned, or forgotten records, or when old `specs/`/`plans/` files are cluttering the repo — including when the user only gestures at the clutter without naming a file. Trigger on requests to clean up, prune, close out, sweep, or tidy triage records, specs, or implementation plans.
allowed-tools:
  - Read
  - Bash
  - Grep
argument-hint: "[optional: scope hints, e.g. 'drafts only' or a specific age threshold]"
---

# Triage Cleanup Skill

Find stale triage records, specs, and implementation plans — then **delete the ones the user confirms**. Deletion is destructive, so this skill is built around a hard rule: a deterministic script decides what *could* be stale, the user decides what *actually* goes, and a second jailed script does the removal. Nothing is deleted before the user sees the list and says yes.

## Core Concept

Cleanup is **report → confirm → delete**, never delete-on-sight:

1. **Scan (deterministic)** — `scan-stale.mjs` reads every triage YAML and every spec/plan/doc, classifies each as a stale *candidate* (with a confidence) or *active*, and emits JSON. No judgment, no deletion.
2. **Present (judgment)** — group candidates by confidence, show what's safe vs. what merely warrants a look, and flag anything not recoverable after deletion.
3. **Confirm (gate)** — the user approves a concrete list. Low-confidence "flag-only" items are never deleted unless the user picks them by hand.
4. **Delete (jailed)** — `delete-targets.mjs` removes exactly that list, refusing anything outside the triage/spec/plan roots.

The split matters: the script can't be talked into deleting the wrong thing, and the skill can't delete without showing its work first.

---

## What counts as stale

`scan-stale.mjs` applies these rules. Confidence drives how the candidate is presented — **high** is safe to delete after a glance; **low / flag-only** must never be auto-included.

### Triage records (`.claude/triage/*.yaml`)

| Situation | Verdict | Confidence |
|---|---|---|
| `status: abandoned` | stale — explicitly given up | **high** |
| `status: complete` AND every phase closed out | stale — work finished | **high** |
| `status: complete` but a phase is still open | stale, but odd — surface the mismatch | medium |
| `status: draft` older than `--draft-age` (default 30d) | stale — never confirmed | medium |
| `status: in_progress` untouched longer than `--inprogress-age` (default 60d) | **flag only** — likely dead, but could be real work | low |
| `status` off-schema (anything but `draft`/`in_progress`/`complete`/`abandoned`) | **flag only** — invisible to recall *and* to every rule above, so it would live forever | low |
| no `status` field at all | **flag only** — cannot be resumed or closed | low |
| active drafts, recently-touched in_progress | not a candidate | — |

The last two rows are the lifecycle's blind spots, and deleting is usually the *wrong* fix for them — the record may be live work whose status was written wrong. Offer `validate-record.mjs` (in the `triage` skill's scripts) to repair the record instead, and only delete if the user says the work is over.

Ages come from **git's last-commit date** for tracked files, falling back to mtime only for untracked ones. Each candidate carries `ageSource` saying which. This matters: mtime is stamped at checkout, so on a fresh clone every artifact reports the same fabricated age. Never present an mtime-derived age as authoritative for a tracked file.

### Specs & plans (`specs/`, `plans/`, `docs/**/plans/`)

| Situation | Verdict | Confidence |
|---|---|---|
| Path referenced by a `complete`/`abandoned` triage | stale — the work it described is over | **high** |
| *Filename* matches a reference, but not the path | stale, but the match is a guess | medium |
| Referenced by any non-finished triage | not a candidate — live work | — |
| No triage reference AND older than `--orphan-age` (default 30d) | **flag only** — possible abandoned scaffolding | low |
| Plain `docs/` file with no triage link | not a candidate — treated as permanent | — |

The filename-only row exists because `specs/sso.md` and `docs/archive/sso.md` share a basename: that match can be right, but it must never reach the high-confidence set Phase 5 offers by default. Protection works the other way — *any* match strength against a live triage protects the file, since a wrongly-protected file costs nothing and a wrongly-deleted one is gone.

`git-merged` is a *third* signal you layer on in Phase 3 — a spec/plan whose work already landed on the main branch is strong evidence it's safe to delete, even when the triage status didn't say so.

---

## Phase 1 — Resolve scope & scan

Find where triage records live, then scan. Reuse the triage plugin's path resolver so cleanup reads from exactly the same place triage writes:

```bash
TRIAGE_DIR="$(node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/resolve-triage-path.mjs" \
  --root "$(pwd)" --home "$HOME" --path-only)"
```

If `TRIAGE_DIR` is empty, persistence is unconfigured — there are no triage records to clean. Say so and continue to the spec/plan scan anyway (those can still exist).

Run the scan. Pass today's date explicitly — the script does age math against it and stays deterministic. Pass `--triage-dir "$TRIAGE_DIR"` unconditionally: the scanner treats an empty value as "no triage records configured" and still scans `specs/`/`plans/`. (Avoid conditional shell expansions like `${TRIAGE_DIR:+...}` here — they collapse the flag and its value into one argument under some shells and the scan errors out.)

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage-cleanup/scripts/scan-stale.mjs" \
  --root "$(pwd)" \
  --now "$(date +%F)" \
  --triage-dir "$TRIAGE_DIR"
```

The script emits one JSON object: `{ summary, candidates[], active[] }`. Each candidate carries `kind` (`triage`/`spec`/`plan`/`doc`), `path`, `reason`, `confidence`, `flagOnly`, `ageDays` (record age), `touchedDays` + `ageSource` (last change, and where that date came from), and `needsRepair` on records whose `status` or `created` field breaks the schema. `summary.needsRepair` counts those across both candidates and active records. On non-zero exit, surface the stderr line and halt — a broken scan must not degrade into hand-rolled `ls`/`find` over the triage dir.

Honor user scope hints from `$ARGUMENTS` by passing the matching flag, e.g. "only drafts" → still scan all, but in Phase 4 present only `kind: triage` draft candidates; "anything older than 90 days" → `--draft-age 90 --orphan-age 90`.

---

## Phase 2 — Locate spec/plan artifacts (only if needed)

`scan-stale.mjs` already scans `specs/`, `plans/`, and `docs/` under the project root. If the scan found **zero** spec/plan candidates *and* none of those directories exist, the project may keep plans somewhere else. Ask before assuming there's nothing to clean:

Use AskUserQuestion: "I didn't find a `specs/`, `plans/`, or `docs/` directory. Where do this project's specs and implementation plans live?" Offer a couple of likely paths and an "elsewhere / none" option. If the user names a directory, re-run the scan with `--dir "<abs-path>"` (repeatable) added.

Skip this phase entirely when the default directories exist or candidates were already found — don't interrupt the user to confirm what the scan already saw.

---

## Phase 3 — Git-merged enrichment (optional, when in a git repo)

For **spec/plan** candidates, a strong independent signal that the work is over is that the file already landed on the main branch. Unlike commit *dates* — which the scanner reads, because they're a plain fact — merge detection is judgment: branch naming and squash-merges vary. That's why it lives here rather than in the scanner.

If `git rev-parse --is-inside-work-tree` succeeds, for each spec/plan candidate check whether it exists on the main branch and is unchanged there:

```bash
git ls-tree -r --name-only main -- "<relpath>"   # present on main?
git diff --quiet main -- "<relpath>"             # identical to main? (exit 0 = yes)
```

Pick the actual default branch (`main`, `master`, `develop` — check `git remote show origin` or the repo's convention) rather than hardcoding. Treat "present and identical on the default branch" as upgrading a low-confidence orphan to a confident delete, and note it in the report ("already merged to `main`"). Never let a *missing* git repo block cleanup — this phase is additive.

---

## Phase 4 — Present the report

Translate the JSON into a clear, skimmable summary. Lead with the safe deletes, separate the judgment calls, and make recoverability explicit.

```text
## Triage Cleanup — <N> candidate(s)

### Safe to delete (high confidence)
- [triage] add-sso-login.yaml — complete, all phases finished
- [spec]   specs/sso-login.md — referenced by complete triage add-sso-login
- [plan]   plans/sso-rollout.md — already merged to main

### Worth a look (medium)
- [triage] old-refactor.draft.yaml — stale draft, 47d old, never confirmed

### Flagged, not auto-included (low) — I won't delete these unless you pick them
- [triage] half-done-feature.yaml — in_progress, 80d untouched, may still be real work
- [spec]   14 orphaned specs in specs/, 91–118d old — no triage references them (say "list them" for the full set)

### Needs repair, not deletion (`needsRepair`)
- [triage] permission-checking-backend.yaml — off-schema status "implementation_complete"
- [triage] mobile-permissions-p5.yaml — date in `created_at`, schema field is `created`

⚠️ Not under git: <list any untracked targets> — deleting these is unrecoverable.
```

**Collapse long groups.** Beyond ~8 items of the same kind and reason, show a count, the directory, and the age range instead of every filename — an unreadable 60-line list is a report nobody acts on. Keep the full list one request away.

**`needsRepair` records get their own section, not the delete list.** These are lifecycle breakage, not finished work, and a mislabelled record is often live work — never present one as "likely dead". Run the validator to name the exact violation, and report it. This skill has no write tools, so repairing the record is the user's call (or the `triage` skill's):

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/validate-record.mjs" --file "<abs path>"
```

Only offer deletion for these if the user confirms the work itself is over.

Before showing the warning line, check which targets git is tracking (`git ls-files --error-unmatch "<path>"` exits 0 if tracked). Untracked files have no git history to restore from, so call them out loudly — that's the difference between a reversible cleanup and permanent loss.

If there are zero candidates, say the triage area is clean and stop. Don't manufacture work.

---

## Phase 5 — Confirmation gate

Deletion only proceeds on explicit approval. Ask plainly, e.g.: "Delete the high-confidence items? You can also say 'include the drafts', name specific files, or 'all of them'."

Rules for building the final delete list:

- **flag-only** candidates (low confidence) are excluded by default. Include one only if the user names it or explicitly says to include the low-confidence/flagged group.
- Default the offer to the high-confidence set; let the user widen or narrow it.
- If the user says nothing actionable, or hesitates, do **not** delete. A skipped cleanup is always safe; a wrong delete is not.
- Echo the exact files about to be deleted one more time if the list includes anything untracked by git.

---

## Phase 6 — Delete

Hand the approved list to the jailed executor. Pass every directory the targets legitimately live in as an `--allow-root`, so the script can refuse anything that slipped outside (the triage dir plus `specs`/`plans`/`docs` or any user-named dir from Phase 2):

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage-cleanup/scripts/delete-targets.mjs" \
  --allow-root "$TRIAGE_DIR" \
  --allow-root "$(pwd)/specs" --allow-root "$(pwd)/plans" --allow-root "$(pwd)/docs" \
  --target "<abs path>" --target "<abs path>"
```

Run it once with `--dry-run` first if the list is large or includes untracked files — the output names exactly what would go. Then run for real. The script aborts the whole batch (exit 2, nothing deleted) if any target escapes the allow-roots or is a directory; surface that diagnostic rather than working around it.

Report the result from the script's JSON: what was deleted, what was skipped (e.g. already gone), and remind the user that git-tracked deletions are recoverable via `git restore` / `git checkout` until committed.

---

## Constraints

- **Never delete without an explicit, post-report confirmation.** Report-then-confirm is the whole safety model; do not collapse it.
- **Never auto-include flag-only / low-confidence candidates.** They require the user to pick them by name.
- **Never read or delete the triage dir directly** with inline `ls`/`find`/`rm`. Scanning goes through `scan-stale.mjs`; deletion goes through `delete-targets.mjs` with its jail.
- **Never widen the jail** to cover paths the user didn't intend. Allow-roots are the artifact directories only.
- Works on projects with no `.claude/triage/` (nothing to scan → say so) and outside git (skip Phase 3, warn that everything is unrecoverable).
- Halt and surface diagnostics on any non-zero script exit; never fall back to hand-rolled file operations the scripts exist to prevent.
- This skill never edits triage record contents — its only mutation is deletion of whole stale files the user approved. To change a record's status instead of deleting it, that's the `triage` skill's job.
