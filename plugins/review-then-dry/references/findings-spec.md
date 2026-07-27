# Findings Spec Generation

How to turn triaged findings into a durable spec file, plus the spec template
itself. Read it after the user has triaged findings — unless an orchestrator
told you to defer spec generation.

Runs after the user has triaged all findings (accept/reject/skip). Produces a durable spec file that a future session can pick up to implement the fixes.

**Skip when invoked by an orchestrator.** If the invoking prompt instructs you to defer spec generation (e.g., `/review-then-dry` collecting outputs from multiple skills to synthesize a unified spec), return the report + triage decisions and stop here — write **no** spec file and emit **no** session-end handoff (the orchestrator owns the final report and next-steps). Phase 3 still runs — the checklist learning loop is independent of spec writing.

## Step 1 — Determine Spec Path

1. Run `git branch --show-current` to get the current branch name.
2. Strip everything up to and including the first `/` (e.g., `feature/3-e2-s1-schermata-di-login` → `3-e2-s1-schermata-di-login`).
3. **Ask the user for the output path — there is no default.**

> "Where should I write the code-review findings spec? (provide a path, e.g. `docs/specs/<name>.md`)"

   Use the branch slug (from step 2) only as a *suggested filename* in the prompt, not as an auto-applied default directory.

1. Create the parent directory if it does not exist.
2. If a file already exists at that path (same branch, same date): append a suffix (`-2`, `-3`, etc.) and re-confirm with the user.

## Step 2 — Build the Spec

Generate the spec from the review findings and the user's triage decisions. The spec has five sections:

**Frontmatter:**

```yaml
---
slug: {branch-slug}-lifecycled-code-review-findings
status: draft
spec-type: lifecycled-code-review-findings
category: data-only
branch: {full branch name}
review-date: {YYYY-MM-DD}
created: {YYYY-MM-DD}
---
```

- `status: draft` — the user sets this to `approved` before implementing the fixes
- `category: data-only` — marks these as structural (non-visual) fixes, so a downstream implement step can skip any UI design phase

**Intent section:**

```markdown
## Intent

Code review findings for branch `{branch}`, reviewed {YYYY-MM-DD}.
{N} findings: {accepted} accepted, {rejected} rejected, {skipped} deferred.
This spec captures the planned fixes so they can be resolved in a future session.
```

**Fix sections — one per finding (accepted and skipped only):**

Each finding becomes a numbered section following this structure:

```markdown
## Fix {N} — {title}

**Status:** {Accepted | Skipped}
**Severity:** {Critical | Major | Minor} | **{Check | Tag}:** {check-id (status)} or {organic}
**File(s):** {file paths}

**Current:**

\`\`\`{lang}
{the relevant code snippet — keep it focused, not the whole file}
\`\`\`

**Planned change:**

- {bullet points describing the concrete fix}

**{Optional sections as needed: Open question, Risk, Note, Alternative (rejected)}**
```

Guidelines for writing each fix section:

- **Title:** concise description of the fix, not the problem (e.g., "Lazy-load terminal login route" not "Route is eagerly loaded")
- **Current:** include only the relevant code snippet — enough to understand what changes, not the whole file. Use the language identifier in the code fence.
- **Planned change:** specific, actionable bullet points. Reference exact class names, method names, import paths. A future session reading this spec should be able to implement each fix without re-analyzing the codebase.
- **Severity and check/tag:** carry these directly from the review report findings — they tie the spec back to the checklist for traceability.

**Rejected findings** are excluded from the fix sections. They feed into Phase 3 as suppression candidates — they don't belong in an implementation spec.

**Deferred section:**

```markdown
## Deferred (not in scope)

- **{title}** — {one-line reason for deferral}
```

Include findings from the review that were identified but explicitly recommended for deferral (from the Refactoring Opportunities section or findings the agents flagged as low-priority). Also include any finding the user marked as **Skip** with a note that it was deferred by the reviewer.

**Execution order section:**

```markdown
## Execution order

1. Fix {N} ({reason for ordering — e.g., "investigate first", "quick independent change", "interdependent with Fix M"})
2. Fix {M} ...
...
{last}. Run lint + tests to verify
```

Order fixes by:

1. Investigation-required fixes first (unknowns resolved early)
2. Independent quick wins next
3. Interdependent changes grouped together
4. Style/naming fixes last
5. Always end with a verification step

**Implementation Plan section (implementer compatibility):**

```markdown
## Implementation Plan

### Files to modify

- {path} — Fix {N}: {one-line summary}
- {path} — Fix {M}, Fix {P}: {one-line summary}

### Files to create

- {path} — Fix {N}: {one-line summary}
(or "None" if no new files are needed)

### Architecture notes

Fixes are independent unless noted in the execution order. Follow the fix sections
above for detailed planned changes per file.
```

This section exists so a downstream implement step can consume the spec using a standard flow — it reads Implementation Plan as the task list.

## Step 3 — Write and Present

1. Write the spec file to the determined path.
2. Present the path to the user:

> "Findings spec written to `{path}` with `status: draft`.
>
> **{N} fixes** ({accepted} accepted, {skipped} deferred) | **{rejected} rejected** (excluded — fed to checklist as suppressions)
>
> To resolve in a future session:
>
> 1. Review the spec — edit, reorder, or remove fixes as needed
> 2. Set `status: approved` in the frontmatter
> 3. Implement the accepted fixes from the spec in a fresh session"

1. Return to the Post-Review Flow — the next step is Phase 3 (Post-Review Learning).
