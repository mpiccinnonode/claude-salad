---
name: lifecycled-code-review
description: >
  Use when reviewing code after implementing or modifying a feature, component, service, store,
  or page. Use before creating a pull request. Use when the user says "review", "check my code",
  "anything wrong?", or "look over this". Use proactively after writing significant code to
  catch correctness, standards, and verbosity issues early.
  Do NOT use for: reuse/extraction audits (use /dry skill), design-only reviews (use design skill),
  visual/UX review (use ui-ux-review skill).
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Agent
  - AskUserQuestion
  - mcp__serena__find_symbol
  - mcp__serena__get_symbols_overview
  - mcp__serena__find_referencing_symbols
  - mcp__serena__search_for_pattern
  - mcp__serena__find_file
argument-hint: "[file paths, folder, or glob] [--seed] [--simplify-only]"
---

# Code Review Skill

Two-pass review with lifecycle-managed checklist. The **code-reviewer** agent runs twice with different lenses: first for correctness and standards compliance, then for verbosity (Simplification Lens). A dynamic checklist (`.claude/review-checklist.yaml`) guides the agent and evolves through use.

For reuse, extraction, or deduplication audits, run `/dry` separately — that is a dedicated read-only audit dispatched against the `reusability-refactor-expert` agent. The two skills are deliberately decoupled; chain them via `/review-then-dry` when you want both passes plus a unified findings spec.

**Core principle:** The checklist is an overlay, not a replacement. The agent reviews with full judgment — the checklist ensures known-important patterns are explicitly evaluated and suppressions prevent known false positives.

## Argument Parsing

Parse `$ARGUMENTS` before doing anything else:

- If `$ARGUMENTS` contains `--seed`: enter **Seed Mode** — skip to the [Seed Mode](#seed-mode) section below.
- If `$ARGUMENTS` contains `--simplify-only`: skip Phase 1 entirely. Run Phase 0 → Phase 2 (with the Simplification lens only) → triage → Phase 3. Use when you want a leanness pass on already-reviewed or already-merged code.
- Otherwise: proceed with the standard review flow (Phase 0 → Phase 1 → Phase 2 → Phase 3).

## Review Checklist YAML Schema Reference

File: `.claude/review-checklist.yaml`

This section is the single source of truth for the checklist format. All phases reference this section — do not re-describe the schema elsewhere.

### Checks

```yaml
checks:
  - id: kebab-case-id          # unique within checks
    severity: critical          # critical | major | minor
    rule: "one-line description of what to check"
    applies_to: "**/*.ts"      # glob — only evaluate on matching files
    tags: [optional, tags]
    added_by: seed              # seed | lifecycled-code-review | manual
    added_date: 2026-04-03     # ISO date
    status: active              # active | staged | frozen
    hit_count: 0                # reviews where this check found >= 1 violation
    miss_streak: 0              # consecutive reviews (on matching files) with 0 hits
    last_hit: null              # ISO date of last review with a violation
    last_evaluated: null        # ISO date of last review with matching files
```

### Suppressions

```yaml
suppressions:
  - id: kebab-case-id          # unique within suppressions
    pattern: "what the agent would flag"
    reason: "why this is not a real issue"
    applies_to: "**/*.ts"      # optional — scope the suppression
    added_by: lifecycled-code-review       # lifecycled-code-review | manual
    added_date: 2026-04-03
    last_relevant: 2026-04-03  # last review where this suppression prevented a false positive
    status: active              # active | expired
```

### Project Context

```yaml
project_context:
  - key: descriptive-key
    context: "free-text domain knowledge injected into every review"
```

### Lifecycle Thresholds

| Severity | miss_streak to freeze | Rationale |
|---|---|---|
| critical | 25 | Security/correctness — rare violations still important |
| major | 15 | Standard architectural checks |
| minor | 8 | Style/naming — team internalizes quickly |

- **Staged → Active:** when `hit_count >= 2` (violations in 2+ separate reviews)
- **Staged → Removed:** when `added_date > 45 days` ago AND `hit_count == 0`
- **Active → Frozen:** when `miss_streak` exceeds severity threshold
- **Frozen → Active:** manual reset OR agent finds matching violation via `.claude/rules/` fallback
- **Suppression → Expired:** when `last_relevant > 90 days` ago
- **Staged cap:** maximum 30 staged checks; when exceeded, evict oldest with `hit_count == 0` (FIFO)

### Safety Protocol

Every write to `review-checklist.yaml` is performed by `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/safe-write-yaml.mjs` (spec §1.2.4):

```bash
cat <<'YAML' | node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/safe-write-yaml.mjs" --path <abs-path>
# ...new YAML content on stdin...
YAML
```

Contract: backup existing → atomic rename write → delete `.bak` on success. Emits `{"path","bak_deleted","existed_before"}` on stdout. Non-zero + stderr on I/O failure leaves `.bak` in place.

**On next read**, if YAML fails to parse:

- If `.bak` exists — restore from `.bak`, warn user, retry.
- If no `.bak` — rename to `.corrupt`, warn user, proceed without checklist.

## Phase 0 — Lifecycle Pass

Runs at the start of every review, before dispatching agents. **All proposed changes require user approval.**

Rule evaluation (prune / freeze / expire / glob-mismatch) is offloaded to `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/lifecycle-pass.mjs`. Do NOT re-traverse the YAML in the skill body — the script is authoritative. See `${CLAUDE_PLUGIN_ROOT}/references/offload-scripts.md` for the script contract.

1. **Check** for `.claude/review-checklist.yaml`.
   - **If the file does not exist:** stop and prompt the user (this is a hard gate on *flow*, not *outcome*):

     > "No `.claude/review-checklist.yaml` found. Seed one from `.claude/rules/` first (`--seed`)? [yes / no]"

     - **Yes** → run Seed Mode (see the [Seed Mode](#seed-mode) section), then continue this review with the freshly seeded checklist.
     - **No** → fall through to the cold-start path: skip the rest of Phase 0 and proceed to Phase 1 (agents fall back to `.claude/rules/` with no checklist).

     Do not auto-proceed without an answer. When invoked by the `review-then-dry` orchestrator, this prompt still fires and still blocks — surface it rather than silently choosing cold start, since seeding materially changes the findings.

2. **Backup** the current file to `.claude/review-checklist.yaml.bak`.

3. **Run the lifecycle pass script:**

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/lifecycle-pass.mjs" .claude/review-checklist.yaml $(date -u +%Y-%m-%d)
   ```

   - **On zero exit:** parse the JSON payload from stdout. Shape: `{prune: [...], freeze: [...], expire: [...], glob_warnings: [...]}` (see spec §1.2.1 / the script's header comment for the per-array entry schema).
   - **On non-zero exit:** surface the one-line stderr diagnostic to the user verbatim, follow the Safety Protocol (restore `.bak` if the YAML is corrupt, or rename to `.corrupt` if the script could not parse it), and proceed to Phase 1 without checklist. Do not attempt to recompute lifecycle rules in the skill body — that defeats the offload and bypasses the audited implementation.

4. **If all four arrays are empty:** delete `.bak`, proceed to Phase 1. No user-visible Phase 0 output.

5. **Present proposed changes to user:**

   > "**Lifecycle pass** for review-checklist.yaml:
   >
   > **Prune (remove):** {prune.length} staged checks past 45 days with no hits
   > {list each: id, rule, added_date}
   >
   > **Freeze:** {freeze.length} active checks past miss_streak threshold
   > {list each: id, rule, miss_streak, threshold}
   >
   > **Expire:** {expire.length} suppressions not relevant in 90+ days
   > {list each: id, pattern, last_relevant}
   >
   > **Warnings:** {glob_warnings.length} active checks with null `last_evaluated` while ≥5 others have been evaluated
   > {list each: id}
   >
   > Apply these changes? (yes / no / edit)"

6. **On approval:** write updated YAML following Safety Protocol, delete `.bak`.
7. **On rejection:** delete `.bak`, proceed with current checklist as-is.
8. **On edit:** let user specify which changes to apply, write only those.

## Spec Context Lookup

Offloaded to `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/get-spec-context.mjs` (spec §1.2.5):

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/get-spec-context.mjs" --repo "$(pwd)"
```

Contract: stdout JSON `{"branch":"<name>","spec_path":"<abs>"|null}`. Branch slug = `${branch#*/}`. Spec file = `<repo>/specs/<slug>-spec.md`. Non-zero + stderr on non-git repo. Halt on non-zero.

If `spec_path` is non-null, read the **Intent** section of that file. Use it to understand what was being built and why — hold this as context for the review, not as a verification checklist. If null, proceed without spec context.

## Determine Target Files

Offloaded to `${CLAUDE_PLUGIN_ROOT}/scripts/get-review-targets.mjs` (spec §1.2.2):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/get-review-targets.mjs" --repo "$(pwd)" [--args "$ARGUMENTS"]
```

Contract: stdout JSON array of file paths. Strategy ranking inside the script: user `--args` (no extension filter) → branch diff vs `origin/HEAD` main branch (default `develop`) → last 3 commits. Source-extension filter applies to diff and log strategies: `ts tsx js jsx vue html scss css go py rs rb java kt swift mjs cjs`. Non-zero + stderr on missing `--repo` or non-git repo. Halt on non-zero.

State which files you are reviewing and how you determined the set (user-args / diff / recent) before starting analysis.

## Phase 1 — Standards and Correctness

Dispatch the **code-reviewer** agent (subagent type: `review-then-dry:code-reviewer`) with the target files. Do NOT compose an inline system prompt — use the existing agent configuration.

**Checklist injection:** If Phase 0 produced a valid checklist (or the file existed and Phase 0 was skipped because no changes were needed), include in the agent dispatch prompt:

> "The review checklist at `.claude/review-checklist.yaml` is available. Read it and follow the Checklist Protocol in your agent configuration. Tag all findings with the appropriate tags: `[check:{id}]`, `[organic]`, `[staged]`, `[suppressed:{id}]`. Phase 1 covers correctness and standards only — verbosity is handled in Phase 2; do not pre-emptively flag verbosity here."

**If no checklist exists (cold start):** dispatch the agent without checklist instructions. The agent falls back to `.claude/rules/` as its knowledge base. Do NOT mention the checklist or tags — the agent's existing behavior handles this.

**Token budget check:** If the checklist file exceeds approximately 2000 tokens (roughly 80+ YAML lines), log a warning to the user:
> "Note: review-checklist.yaml is large ({N} entries). Consider reviewing frozen/staged entries to keep it lean."

Instruct the agent: "Use `mcp__serena__*` tools for code exploration (pre-activated, no setup needed). Read `.claude/rules/` for the full project conventions checklist."

## Phase 2 — Simplification (Verbosity Lens)

Dispatch the **code-reviewer** agent (subagent type: `review-then-dry:code-reviewer`) a second time with the same target files, this time focused exclusively on verbosity — code that is technically correct but heavier than it needs to be. Do NOT compose an inline system prompt for the agent's core behavior — use its existing configuration. Pass the verbosity instructions below as the task framing.

Instruct the agent: "Scan the target files for verbosity patterns only — do not re-report correctness or standards issues already covered by Phase 1. Flag each finding with the `[verbosity:{pattern}]` tag. Patterns to detect:

- **impossible-case-handling** — error handling, null checks, or fallbacks for cases that cannot happen given internal contracts or framework guarantees. Validate at system boundaries only (user input, external APIs).
- **narrating-comment** — comments that restate what well-named code already says. Keep comments only when they encode non-obvious *why* (hidden constraint, workaround, surprising behavior).
- **single-use-abstraction** — helper functions, classes, or config objects with exactly one call site and no planned second consumer. Inline them.
- **speculative-parameter** — function parameters, options fields, or flags that are never passed a non-default value in the codebase.
- **intermediate-variable** — variables assigned once, used once, on the next line, with no clarifying name benefit.
- **compat-shim** — backwards-compatibility wrappers, re-exports, or deprecation comments for code that has no external consumers and could just change.
- **defensive-duplicate** — input validation that repeats a check already guaranteed by an upstream layer (framework, type system, boundary validator).
- **task-context-leak** — comments referencing the current task, fix, PR, issue number, or caller (belongs in commit message / PR description, not code).

For each finding: name the pattern, show the current snippet, and give a leaner rewrite. Do not propose simplifications that reduce readability or lose information — when in doubt, leave it.

Use `mcp__serena__*` tools for code exploration (pre-activated, no setup needed)."

When both agents have returned, proceed to the **Post-Review Flow** below. Its first step is presenting the unified report — not triage.

## Out of Scope — Reuse and Extraction

`/lifecycled-code-review` does **not** cover reuse, deduplication, or extraction audits. For those, run `/dry` separately. To get both passes plus a unified findings spec in one flow, use `/review-then-dry`.

If Phase 1 surfaces a finding that is really about extraction or duplication rather than correctness, note it briefly in the Major Issues section as a pointer ("consider running `/dry` to evaluate extraction") but do not attempt to characterize the refactor — that is the `reusability-refactor-expert` agent's job, dispatched by `/dry`.

## Output Format

The two review agents return their findings as Agent tool results. **Tool results are never displayed to the user** — until you write the report into your own reply text, the user has seen nothing. "Presenting the report" means emitting it as message text in the structure below; spawning the agents and reading their output does not count, and neither does listing findings inside AskUserQuestion options.

Present a single unified report with this structure:

### Review Summary

- **Files reviewed:** list each file path
- **Overall rating:** Excellent / Good / Needs Improvement / Requires Refactoring
- 2-3 sentence assessment covering correctness, standards, and verbosity

### Critical Issues

Standards violations or bugs that break functionality, cause runtime errors, or violate non-negotiable project rules. For each:

- `[tag]` — **Issue** — what is wrong and where (file + line range)
- **Impact** — what breaks or degrades
- **Fix** — specific action with a code example

### Major Issues

Missing patterns or standards deviations that degrade maintainability. For each:

- `[tag]` — **Issue** — what is wrong and where
- **Category** — standards violation / convention deviation / missing pattern
- **Recommendation** — precise action, referencing the specific shared component, base class, store type, or mapping class to use

### Minor Issues

Naming, style, structural nits, and low-priority improvements. Brief format:

- `[tag]` — **Issue** — what and where
- **Suggestion** — one-line fix

### Simplification

Verbosity findings from Phase 2. Code that works but is heavier than it needs to be. These are leanness concerns only — extraction/reuse concerns are out of scope (run `/dry`). For each:

- `[verbosity:{pattern}]` — **What** — file + line range
- **Current:** brief snippet of the verbose code
- **Leaner:** one-line rewrite or bullet describing the reduction
- **Rationale:** only when the cut might surprise a reader (e.g., why the validation is safe to drop)

Omit this section if no verbosity findings. Do NOT propose cuts that reduce readability or lose information — agent should self-filter before this section reaches the report.

### Well-Structured Patterns

Call out 2-5 things done correctly that are worth replicating. Skip only if there is genuinely nothing positive.

### Action Summary

A prioritized table for quick reference:

| # | Severity | File | Issue | Action |
|---|----------|------|-------|--------|

## Post-Review Flow

After both review agents return (and after any cross-check verification of their findings), run these steps in order. Do not implement any fixes in this session — fixes are resolved in a fresh session using the spec as the plan.

1. **Present the unified report** — emit the full report (structure defined in Output Format above) as message text in your reply. The agents' findings exist only in tool results at this point, and the user has seen none of them; this step is what puts the review on screen. It is a real step, not a formality — skipping it and going straight to triage is the single most common failure of this skill.

2. **Triage findings** — ask the user to act on each finding:
   - **Accept** — will be fixed (counts as a hit for checklist tracking)
   - **Reject** — false positive (candidate for new suppression)
   - **Skip** — defer for later (neutral — no hit, no miss)

   Triage starts only after step 1 is complete. If you are about to ask a triage question (AskUserQuestion or inline) and the full report has not yet appeared in your own reply, stop and do step 1 first — the user cannot make accept/reject calls from the compact labels of a triage question; they need the Impact/Fix/Rationale context that only the full report carries.

3. **Proceed to Findings Spec Generation** — write the spec from the triage decisions before doing anything else. The spec is the durable output of this session.

4. **Proceed to Phase 3 (Post-Review Learning)** — update the checklist based on the triage decisions.

5. **Session-end handoff** — after Phase 3 completes, present:

   > "Review session complete.
   >
   > Findings spec at `{path}` — set `status: approved` to resolve in a new session.
   > Implement the accepted fixes from the spec in a fresh session."

## Findings Spec Generation

Runs after the user has triaged all findings (accept/reject/skip). Produces a durable spec file that a future session can pick up to implement the fixes.

**Skip when invoked by an orchestrator.** If the invoking prompt instructs you to defer spec generation (e.g., `/review-then-dry` collecting outputs from multiple skills to synthesize a unified spec), return the report + triage decisions and stop here — write **no** spec file and emit **no** session-end handoff (the orchestrator owns the final report and next-steps). Phase 3 still runs — the checklist learning loop is independent of spec writing.

### Step 1 — Determine Spec Path

1. Run `git branch --show-current` to get the current branch name.
2. Strip everything up to and including the first `/` (e.g., `feature/3-e2-s1-schermata-di-login` → `3-e2-s1-schermata-di-login`).
3. **Ask the user for the output path — there is no default.**

> "Where should I write the code-review findings spec? (provide a path, e.g. `docs/specs/<name>.md`)"

   Use the branch slug (from step 2) only as a *suggested filename* in the prompt, not as an auto-applied default directory.

1. Create the parent directory if it does not exist.
2. If a file already exists at that path (same branch, same date): append a suffix (`-2`, `-3`, etc.) and re-confirm with the user.

### Step 2 — Build the Spec

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

### Step 3 — Write and Present

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

## Phase 3 — Post-Review Learning

Runs after the user has acted on findings. **All proposed checklist changes require user approval.**

If no checklist file exists AND no findings were accepted/rejected, skip Phase 3 entirely.

### Step 1 — Classify Findings

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

### Step 2 — Track Misses

For each `active` or `staged` check: if the reviewed files included files matching its `applies_to` glob, but the check produced no findings in this review, increment `miss_streak` by 1 and set `last_evaluated` to today.

Checks whose `applies_to` did not match any reviewed file: no change (don't penalize for irrelevant reviews).

### Step 3 — Identify Promotions

Any staged check that now has `hit_count >= 2`: propose promotion to `active`.

### Step 4 — Enforce Staged Cap

Offloaded to `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs` (spec §1.2.3). First, merge new candidates into a scratch copy of the checklist, then run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs" --yaml <scratch-yaml-abs> --cap 30
```

Contract: stdout JSON `{"staged_count":N,"over_cap":bool,"eviction_candidates":[{id, added_date, hit_count}]}`. Candidates = staged entries with `hit_count == 0`, sorted by `added_date` ascending, sliced to the overflow count (staged_count − cap). Non-zero + stderr on missing/invalid argv or malformed YAML. Halt on non-zero. Include returned `eviction_candidates` in the proposal presented to the user.

### Step 5 — Present Proposed Changes

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

### Step 6 — Collect Suppression Reasons

For each new suppression the user approved, ask:

> "Want to add a reason for the `{id}` suppression? It helps future reviews understand why this is not a real issue. (Enter reason or press Enter to skip)"

If the user provides a reason, update the `reason` field. If not, keep `"User rejected — pending explanation"`.

### Step 7 — Write Updates

On approval: if no checklist file exists yet, create it with `version: 1` and the new entries. If the file exists, update it following the Safety Protocol (backup → write → delete backup).

On rejection: discard all proposed changes. The review findings are still implemented — only the checklist metadata updates are skipped.

On edit: let user specify which changes to apply, write only those.

## Seed Mode

Alternative entry point: `/lifecycled-code-review --seed`

Seeds the review checklist from existing `.claude/rules/` files. All generated checks start as `staged` — they must prove value through the lifecycle before promoting to `active`.

### Step 1 — Read Rules

Read all files matching `.claude/rules/**/*.md`. For each file, identify individual rules — look for:

- Bullet points or numbered lists describing conventions
- Headings followed by prescriptive statements
- Bold "MUST", "should", "never" statements

### Step 2 — Generate Check Candidates

For each identified rule, generate a check entry:

- **id:** kebab-case from the rule's key phrase, max 50 characters
- **severity:** infer from language:
  - `MUST`, `never`, `always` + safety/correctness context → `critical`
  - `MUST`, `should` + architecture/pattern context → `major`
  - Convention, preference, naming, style → `minor`
- **rule:** condense to one clear line
- **applies_to:** infer a glob from file type context in the rule (e.g., "components" → `**/*.component.ts`, "services" → `**/*.service.ts`). Default to `**/*.ts` if unclear.
- **tags:** infer from the rule file location (e.g., `angular.md` → `[angular]`, `style.md` → `[style]`)

### Step 3 — Filter

Remove candidates that:

- Are shorter than 10 words (too vague to evaluate)
- Contain only subjective language ("prefer", "consider", "when possible") without a concrete action verb ("use", "return", "extend", "implement")
- Describe organizational rules rather than code patterns (e.g., "files should be in src/app/")

### Step 4 — Deduplicate

Compare each candidate against existing checks in `.claude/review-checklist.yaml` (if the file exists). Skip candidates where 3+ significant words (nouns, verbs — not articles/prepositions) match an existing check's `rule`, regardless of the existing check's `status`.

Also deduplicate within the generated candidates — if two rules from different files describe the same check, keep the more specific one.

### Step 5 — Enforce Staged Cap

Offloaded to `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs` (spec §1.2.3). Same contract as Phase 3 Step 4.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs" --yaml <scratch-yaml-abs> --cap 30
```

If `over_cap` is true, warn the user and present only the top 30 candidates by severity (critical first, then major, then minor, sorted by specificity within severity). The returned `eviction_candidates` list identifies seed-generated entries that would be evicted under FIFO+hit_count=0 rules; use it to drop seed candidates before writing.

### Step 6 — Present to User

> "**Seed from rules:** generated {N} staged check candidates from `.claude/rules/`:
>
> **Critical ({n}):**
> {for each: id — rule — applies_to — source file}
>
> **Major ({n}):**
> {for each: id — rule — applies_to — source file}
>
> **Minor ({n}):**
> {for each: id — rule — applies_to — source file}
>
> **Filtered out:** {M} rules (too vague, subjective, or organizational)
> **Deduplicated:** {D} rules (already covered by existing checks)
>
> Options:
>
> - **Approve all** — write all candidates to the checklist
> - **Edit** — select which candidates to include
> - **Cancel** — discard all candidates"

### Step 7 — Write

On approval: set `added_by: seed`, `added_date: today`, `status: staged`, all lifecycle counters to 0/null. Write following the Safety Protocol.

If the checklist file doesn't exist yet, create it with `version: 1`, the approved checks, empty `suppressions`, and the default `project_context` entries from the template.
