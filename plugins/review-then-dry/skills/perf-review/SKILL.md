---
name: perf-review
description: |
  Read-only audit of code for performance and optimization problems — over-fetching and payload bloat (list endpoints loading nested collections), duplicate requests on page/sort change, eager loading that is not always needed, missing memoization on row actions, unbounded queries, render cost. Reports, never rewrites. Use when the intent is "is this slow", "check performance", or before a PR that adds list endpoints, tables, or data-heavy pages. Not for correctness review (use lifecycled-code-review) or reuse audits (use dry).
allowed-tools:
  - Read
  - Bash
  - Agent
  - mcp__serena__find_symbol
  - mcp__serena__get_symbols_overview
  - mcp__serena__find_referencing_symbols
  - mcp__serena__search_for_pattern
  - mcp__serena__find_file
argument-hint: "[file paths, folder, or glob] [--no-verify]"
---

# /perf-review — Performance & Optimization Audit

A thin, one-shot dispatcher around the `performance-reviewer` agent. The agent does the work; this skill resolves target files and presents the report verbatim. No checklist lifecycle, no learning loop, no spec — chain it with the other passes via `/review-then-dry --perf`.

## When this fires vs adjacent skills

- **`/perf-review` (this skill):** cost that scales with data or frequency — payload size, fetching, request patterns, recomputation, render cost. Read-only audit.
- **`/lifecycled-code-review`:** correctness, security, standards, verbosity.
- **`/dry`:** duplication and extraction.
- **`/review-then-dry --perf`:** all three, one unified spec.

If the request is generic ("review this", "anything wrong?") prefer `/lifecycled-code-review`. If it is about a bug, test failure, or visual/UX, do not fire.

## Determine Target Files

Verification is on by default; if `$ARGUMENTS` contains `--no-verify`, skip the Verify step. Either way, remove `--no-verify` (and a stray `--verify`, now a no-op) from the arguments before the script below — they are not paths.

Use the shared offload script (also used by `/dry` and `/lifecycled-code-review` — do not duplicate logic):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/get-review-targets.mjs" --repo "$(pwd)" [--args "$ARGUMENTS"]
```

Contract: stdout JSON array of file paths. Strategy: user `$ARGUMENTS` (paths/globs, no extension filter) → branch diff vs `origin/HEAD` (default `develop`) → last 3 commits, excluding non-source noise. Non-zero + stderr on missing `--repo` or non-git repo — halt and surface the error.

State which files are being audited and how the set was determined (user-args / diff / recent) before dispatching.

If the resolved set is empty: report "No target files detected (no diff vs the default branch, no recent commits with source files). Pass paths/globs as arguments to scope the audit." and stop.

## Dispatch

Dispatch the agent with `subagent_type: review-then-dry:performance-reviewer`, passing the resolved file list. Use the existing agent configuration — do not compose an inline system prompt or constrain its analysis.

Standard instruction to include in the dispatch prompt:

> "Use `mcp__serena__*` tools for code exploration when available. Trace each changed endpoint, query, or component to its consumers and callers beyond the diff — performance cost usually shows up there. Files to audit: `<resolved list>`."

## Verify (default; skipped with `--no-verify`)

After the agent returns and before presenting, run `${CLAUDE_PLUGIN_ROOT}/references/verify-findings.md` on its report. Skip when `--no-verify` was passed.

## Present the Report

The agent's report arrives as an Agent tool result, which is **never displayed to the user** — you must re-emit it in your own reply text or the user has seen nothing. Show the agent's report verbatim. Do not re-summarize, re-grade, or add a wrapper section. Unless `--no-verify`, the verifier's `### Verification` table follows the report, also verbatim — the report itself stays unedited. The agent's output format (Priority Findings → Secondary Suggestions → Well-Optimized Patterns → Summary Table) is the deliverable.

After the report, end the turn. Do not propose fixes, do not write a spec, do not enter a triage loop — `/perf-review` is one-shot.

## Behavioral guardrails

- **Read-only.** Never apply edits in this skill. If the agent produces diffs, that's a regression — flag it.
- **Performance only.** If the agent volunteers correctness, standards, or reuse findings, that's a regression — the other skills own those.
- **Don't call `/lifecycled-code-review` or `/dry`.** This is the standalone entry point.
