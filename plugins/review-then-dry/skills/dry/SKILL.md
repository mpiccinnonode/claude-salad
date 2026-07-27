---
name: dry
description: |
  Read-only audit of existing code for what can be extracted, shared, or deduplicated — it reports, it never rewrites. Use when the intent is "tell me what to pull out" or "where is the duplication", including when a file or template is simply too long and parts should become their own components (single-consumer extraction counts). Not for correctness review — that is lifecycled-code-review.
allowed-tools:
  - Read
  - Bash
  - Agent
  - mcp__serena__find_symbol
  - mcp__serena__get_symbols_overview
  - mcp__serena__find_referencing_symbols
  - mcp__serena__search_for_pattern
  - mcp__serena__find_file
argument-hint: "[file paths, folder, or glob]"
---

# /dry — Reusability & Extraction Audit

A thin, one-shot dispatcher around the `reusability-refactor-expert` agent. The agent does the work; this skill resolves target files and presents the report verbatim. No checklist lifecycle, no learning loop, no two-pass review — that's `/lifecycled-code-review`.

## When this fires vs adjacent skills

- **`/dry` (this skill):** "Find what to extract" — duplication, reuse candidates, single-consumer template extraction for readability. Read-only audit.
- **`/lifecycled-code-review`:** Full two-pass review (correctness + reuse + simplification + checklist). Use before PRs.
- **code-simplifier:** In-place leanness (delete unused, inline single-use) with no extraction.
- **code-architect:** Designs new architectures pre-implementation.

If the request is generic ("review this", "anything wrong?") prefer `/lifecycled-code-review`. If the request is about a bug, test failure, or visual/UX, do not fire.

## Determine Target Files

Use the shared offload script (also used by `/lifecycled-code-review` — do not duplicate logic):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/get-review-targets.mjs" --repo "$(pwd)" [--args "$ARGUMENTS"]
```

Contract: stdout JSON array of file paths. Strategy: user `$ARGUMENTS` (paths/globs, no extension filter) → branch diff vs `origin/HEAD` (default `develop`) → last 3 commits with source-extension filter (`ts tsx js jsx vue html scss css go py rs rb java kt swift mjs cjs`). Non-zero + stderr on missing `--repo` or non-git repo — halt and surface the error.

State which files are being audited and how the set was determined (user-args / diff / recent) before dispatching.

If the resolved set is empty: report "No target files detected (no diff vs main, no recent commits with source files). Pass paths/globs as arguments to scope the audit." and stop.

## Dispatch

Dispatch the agent with `subagent_type: review-then-dry:reusability-refactor-expert`, passing the resolved file list. Use the existing agent configuration — do not compose an inline system prompt or constrain its analysis.

Standard instruction to include in the dispatch prompt:

> "Use `mcp__serena__*` tools for code exploration (pre-activated, no setup needed). Check the project's shared and core directories for existing abstractions before recommending new ones. Files to audit: `<resolved list>`."

## Present the Report

The agent's report arrives as an Agent tool result, which is **never displayed to the user** — you must re-emit it in your own reply text or the user has seen nothing. Show the agent's report verbatim. Do not re-summarize, re-grade, or add a wrapper section. The agent's output format (Priority Findings → Secondary Suggestions → Well-Structured Patterns → Summary Table, with the 8-bucket taxonomy) is the deliverable.

After the report, end the turn. Do not propose fixes, do not write a spec, do not enter a triage loop — `/dry` is one-shot. If the user wants to act on findings, they can run `/lifecycled-code-review` for the full lifecycle or implement fixes manually.

## Behavioral guardrails

- **Read-only.** Never apply edits in this skill. The agent is configured the same way; if it produces diffs, that's a regression — flag it.
- **No correctness findings.** If the agent volunteers bug/standards findings, that's also a regression — `/lifecycled-code-review` Phase 1 owns that. Reuse and extraction only.
- **Don't call `/lifecycled-code-review`.** They share the agent but `/dry` is the standalone entry point. Calling `/lifecycled-code-review` from here would loop the agent through Phase 0 / Phase 3 unnecessarily.
