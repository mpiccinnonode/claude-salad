# Phase 6 — Persist the triage record

Read this before writing a triage record. Covers when the phase fires, the
draft → in_progress confirmation gate, path resolution, slug rules, and what to
do after writing.

Triage produces a durable artifact: one YAML file per task at `.claude/triage/<slug>.yaml`. This is how cross-session retrieval works — a future session invokes `triage-recall.mjs` (Phase 1a) and finds the record that this phase wrote.

## When to fire Phase 6

- **High confidence** → fire automatically, immediately after Phase 5 output. Write with `status: draft` and the filename suffix `.draft.yaml`. The draft exists so nothing is lost if the user walks away; it's explicitly marked so it doesn't pollute `--active` results as a decided plan.
- **Medium / Low confidence** → wait for the user to pick an interpretation (from the "If I Misclassified" block or the two-interpretation surface), then fire with `status: draft`.

## Confirmation gate (promotes draft → in_progress)

After the draft is written, tell the user:

> `Saved as draft at <path>. Say "confirmed" (or start running the first recommended command) to promote to in_progress.`

On confirmation — or when the user's next message clearly proceeds with the flow (e.g., invoking the first recommended skill) — rename `<slug>.draft.yaml` → `<slug>.yaml` and flip `status: draft` → `status: in_progress`. This two-step design prevents the old "user skipped confirmation ⇒ nothing saved" leak while keeping drafts distinguishable in git diffs and in recall.

## Resolving the storage path

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/resolve-triage-path.mjs" --root "$(pwd)" --home "$HOME"
```

Contract: stdout JSON, one of:

- `{"path":"<abs>","scope":"project"}` — preferred; versioned with the project. If the directory doesn't exist yet, create it with `mkdir -p` before writing.
- `{"path":"<abs>","scope":"user"}` — fallback when the project has no `.claude/` dir.
- `{"path":null,"scope":null}` — nothing configured; **skip Phase 6 silently**. Do not attempt to create `.claude/` in the project — that's a project-config decision, not a triage decision.

Non-zero + stderr on missing/relative `--root` or `--home`. Halt on non-zero and surface the diagnostic.

## Slug derivation

- Lowercase, hyphen-separated, max 50 chars, stripped of punctuation.
- If `<slug>.yaml` or `<slug>.draft.yaml` already exists for an unrelated task, append `-2`, `-3`, etc.

## File contents

Write the file using the schema in `references/triage-schema.md` — that document is the source of truth for fields, lifecycle states, and invariants. Read it before writing.

## After writing

- Output the exact first command to copy-paste and stop.
- Do not begin implementation.
- Do not add an entry to MEMORY.md — the triage directory is the index, reached through `triage-recall.mjs`.
