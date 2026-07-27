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

## Review Checklist

The checklist lives at `.claude/review-checklist.yaml`. Its schema — fields,
lifecycle thresholds, suppressions, and the mandatory safe-write protocol — is
the source of truth in `${CLAUDE_PLUGIN_ROOT}/references/checklist-schema.md`.
Read it before touching the file; never hand-write the YAML from memory.

---

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

Runs after the user has triaged all findings, producing a spec a future session
can pick up. **Skip it entirely when an orchestrator (e.g. `/review-then-dry`)
says it owns the final report** — return the report plus triage decisions and
stop. Phase 3 still runs either way.

When it does run, follow
`${CLAUDE_PLUGIN_ROOT}/references/findings-spec.md` for the path rules and the
spec template.

---

## Phase 3 — Post-Review Learning

Runs after the user has acted on findings, and feeds the checklist's hit/miss
telemetry so useless checks decay and proven ones get promoted. **All proposed
changes require user approval.**

Skip entirely when no checklist file exists AND nothing was accepted or
rejected. Otherwise follow
`${CLAUDE_PLUGIN_ROOT}/references/post-review-learning.md`.

---

## Seed Mode

`/lifecycled-code-review --seed` seeds the checklist from the project's
`.claude/rules/`. Every generated check starts `staged` and must earn promotion
through the lifecycle. Procedure:
`${CLAUDE_PLUGIN_ROOT}/references/seed-mode.md`.
