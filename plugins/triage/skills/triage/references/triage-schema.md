# Triage Record Schema

One YAML file per triaged task, stored at `.claude/triage/<slug>.yaml` (project scope) or the user-global fallback resolved by `resolve-triage-path.sh`.

## Filename

- **Slug**: lowercase, hyphen-separated, derived from the task description. Max 50 chars.
  - Example: task `"Add SSO login for admin users"` → slug `add-sso-login-for-admin-users`.
- **Draft suffix**: while the record is unconfirmed, the file is `<slug>.draft.yaml`. On confirmation, the skill renames it to `<slug>.yaml`. Draft files should be ignored by CI and are fine to `.gitignore` (`.claude/triage/*.draft.yaml`).
- **Collision**: if `<slug>.yaml` already exists for an unrelated task, append `-2`, `-3`, etc.

## Schema

```yaml
task: "<full task description as the user phrased it>"
created: "<ISO-8601 date, e.g. 2026-04-23>"
classification: "<UI Feature|Logic Feature|Mixed Feature|Bug Fix|Refactor|Design|Review|Other>"
confidence: "<High|Medium|Low>"
status: "<draft|in_progress|complete|abandoned>"
abstract_flow: ["Exploration", "Planning", "Implementation", "Review"]
phases:
  - phase: "Exploration"
    skill: "<mapped-skill-name>"             # or "(generic prompt)" if no skill matched
    alternative: null                        # or a second skill for tie-breakers
    scope: "<1-sentence description of what this phase should accomplish for this task>"
    status: "<pending|complete|skipped>"
  - phase: "Planning"
    skill: "<mapped-skill-name>"
    alternative: "<alternative-skill-name>"  # only when Phase 4 left two plausible skills
    scope: "..."
    status: "pending"
  # ...
supporting_skills:                           # optional; tool-shaped skills that augment any phase
  - skill: "<mapped-skill-name>"
    when: "<one-sentence trigger condition for this task — when in the flow it would fire>"
notes:                                       # optional free-form
  - "<any flags from classification, e.g. 'touches mobile-framework prefixes'>"
  - "<open spec references, e.g. 'specs/sso-login.md'>"
```

## Field semantics

- **`status`** (top-level): lifecycle of the whole triage record.
  - `draft` — written at Phase 6, not yet confirmed by user. File is `<slug>.draft.yaml`.
  - `in_progress` — user confirmed; work is underway. File is `<slug>.yaml`.
  - `complete` — all phases complete, or user marked the whole task done.
  - `abandoned` — user explicitly abandoned; preserved for history but excluded from `--active`.
- **`phases[].status`**:
  - `pending` — not started.
  - `complete` — finished (user confirmed or the skill marked it on re-invocation).
  - `skipped` — intentionally bypassed (e.g., Exploration on a trivial scope).
- **`alternative`**: populated only when Phase 4's tie-breaker left two plausible skills for the same phase. The triage output surfaces it as `_Alternative: X — use if Y_`.
- **`supporting_skills`**: tool-shaped skills (code-structure search, library-docs lookup, cross-session memory recall) that augment any phase rather than owning one. Populated by Phase 4's second pass. Omitted entirely if no tool-shaped skill matched. `when` is a per-task trigger condition, not the skill's generic description.

## Invariants

- `abstract_flow` length == `phases` length; entries align by index.
- `phases[].phase` matches the string in `abstract_flow` at the same index.
- A record with top-level `status: draft` is never read by `--active` unless `draft` is explicitly requested (the recall script's `--active` mode includes drafts by design — they represent unfinished planning the next session should resume).
- Records are **append-only** in the git sense: once `in_progress`, don't rewrite `task`/`classification`/`created`. Only `status`, `phases[].status`, and `notes` may change.

## Why YAML and not Markdown

- Structured fields (status, per-phase state) are checked by scripts — YAML gives a clean contract.
- Still human-readable and diffable in PR review.
- One file per task means status updates produce small, isolated diffs; no churn from unrelated triages.
