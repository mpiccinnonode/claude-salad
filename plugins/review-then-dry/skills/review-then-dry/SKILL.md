---
name: review-then-dry
description: |
  Use to run /lifecycled-code-review and /dry in sequence on the same target files and produce a single
  unified findings spec covering correctness, standards, verbosity, and reuse/extraction.

  Fire when the user:
  - Types `/review-then-dry`
  - Asks for "a full pass" or "review plus reuse audit" or "review and DRY this"
  - Wants both passes consolidated into one spec before opening a PR

  Do NOT fire for: solo correctness reviews (use /lifecycled-code-review), solo extraction audits (use /dry),
  bug fixes, test failures, UX critique.
argument-hint: "[file paths, folder, or glob]"
---

# /review-then-dry — Chained Code Review + Reuse Audit

Orchestrator that runs `/lifecycled-code-review` and `/dry` in sequence on the same scope and synthesizes a single findings spec from both outputs. The two underlying skills stay decoupled — this skill is the only place that knows about both.

## When this fires vs adjacent skills

- **`/review-then-dry` (this skill):** Correctness + verbosity + reuse in one flow, one unified spec at the end.
- **`/lifecycled-code-review`:** Correctness, standards, verbosity. Writes its own findings spec.
- **`/dry`:** Reuse, extraction, deduplication. Read-only, no spec.

If the user only wants one of the two passes, fire the underlying skill directly — do not invoke this orchestrator.

## How the orchestration works

Both underlying skills run **in the same conversation** as this one — via the `Skill` tool, not subagents. There is no return value: when you invoke `/lifecycled-code-review`, that skill's instructions load into your context and you follow them, including the full user-triage loop. The "output" of each underlying skill is whatever ends up in the conversation history. Your job as orchestrator is to:

1. Tell the underlying skill what to do differently (e.g., defer spec generation).
2. Run its flow end-to-end *up to the deferral point*, including user interaction.
3. Retain the relevant facts (report, triage decisions, file list) in working memory.
4. Proceed to the next step.

Do **not** spawn subagents for the underlying skills — that breaks the shared triage loop and the shared user session. Do **not** read their `SKILL.md` and inline-execute — use the `Skill` tool so updates to those skills are picked up automatically.

## Flow

### Step 1 — Run /lifecycled-code-review with spec generation deferred

Invoke `lifecycled-code-review` via the `Skill` tool, passing through this skill's arguments:

```text
Skill(skill="review-then-dry:lifecycled-code-review", args="<this skill's $ARGUMENTS, or empty for branch-diff default>")
```

Before /lifecycled-code-review's instructions take over, prepend the following framing so it knows to defer all durable output to the orchestrator:

> "**Orchestrator note from /review-then-dry:** Run Phase 0 through Phase 3 as normal (Phase 0: checklist lifecycle, Phase 1: correctness, Phase 2: simplification, Phase 3: post-review learning). **Present your full findings report to the user exactly as your Output Format section specifies, then run the triage loop on it** — the user must see every finding with its Impact/Fix/Rationale context before being asked to accept or reject anything. What you defer is only the *durable* output: skip Findings Spec Generation *and* skip your Post-Review Flow session-end handoff (the 'next steps' message). review-then-dry is the sole author of the unified spec file — it will synthesize one spec from your report plus /dry's output. After triage completes and Phase 3 runs, stop and hand control back."

Follow /lifecycled-code-review's flow including the user triage loop. When you reach the point where Findings Spec Generation would start, **stop and return to this skill's instructions** — do not let /lifecycled-code-review emit its own spec or its own session-end "next steps" message. Retain in working memory:

- The full review report (Critical / Major / Minor / Simplification / Well-Structured Patterns / Action Summary)
- The user's triage decisions per finding (Accept / Reject / Skip)
- The branch slug
- The **resolved target file list** — the actual paths /lifecycled-code-review audited, not the raw `$ARGUMENTS`. You will pass these to /dry verbatim.

### Step 2 — Run /dry on the same target files

Invoke `dry` via the `Skill` tool, passing the resolved file list from Step 1 as args (not this skill's original `$ARGUMENTS` — files may have been branch-resolved):

```text
Skill(skill="review-then-dry:dry", args="<space-separated resolved file list from Step 1>")
```

`/dry` accepts file paths as `$ARGUMENTS` and will skip its own resolution step when they are present, guaranteeing scope identity with Step 1.

Follow /dry's flow, including its "Present the Report" step — show the agent's full report verbatim, as /dry's own instructions require. Only **after** the complete report is on screen, override /dry's "end the turn" rule and add a triage loop (which /dry does not normally have). Do not collapse the report into the triage prompt — the condensed finding list in the triage message supplements the full report, it does not replace it:

> "**/dry findings** — triage each before we write the unified spec (same Accept / Reject / Skip pattern as the lifecycled-code-review pass you just completed):
> {list each finding}"

Retain the /dry report and triage decisions in working memory.

### Step 3 — Synthesize unified findings spec

**Skip this step if both passes produced zero accepted findings.** Instead, tell the user:

> "Both /lifecycled-code-review and /dry produced no accepted findings on this scope. Nothing to spec — branch looks clean from these two lenses."

If only one pass has accepted findings, still write the spec — note in the Intent section that the other pass found nothing actionable. Do not skip just because one source is empty.

Otherwise, write a single spec file following the format from `/lifecycled-code-review`'s "Findings Spec Generation" section, with these adaptations:

**Path:** ask the user where to write the unified findings spec — there is no hardcoded default.
Suggest a filename using the branch slug (e.g. `{branch-slug}-review-then-dry-findings.md`) but
let the user supply the directory and confirm before writing.

**Frontmatter** — same as `/lifecycled-code-review` but with:

```yaml
slug: {branch-slug}-review-then-dry-findings
spec-type: review-then-dry-findings
```

**Intent section** — describe the spec as a merged output:

```markdown
## Intent

Unified findings from `/lifecycled-code-review` + `/dry` on branch `{branch}`, reviewed {YYYY-MM-DD}.

- **Correctness/standards/verbosity fixes:** {N_cr} ({accepted_cr} accepted, {skipped_cr} deferred, {rejected_cr} rejected)
- **Reuse/extraction fixes:** {N_dry} ({accepted_dry} accepted, {skipped_dry} deferred, {rejected_dry} rejected)

Resolve in a future session by setting `status: approved`, then implementing the accepted fixes from the spec.
```

**Fix sections** — interleave findings from both sources. Each fix section follows the same `## Fix {N} — {title}` format from `/lifecycled-code-review`. Add a `**Source:**` line distinguishing the origin:

```markdown
## Fix {N} — {title}

**Status:** {Accepted | Skipped}
**Source:** {lifecycled-code-review | dry}
**Severity:** {Critical | Major | Minor} | **{Check | Tag}:** {check-id / organic / verbosity:pattern / extraction-candidate}
**File(s):** {file paths}

**Current:** ...
**Planned change:** ...
```

Ordering rule for the merged list:

1. Critical correctness from `/lifecycled-code-review`
2. Major correctness/standards from `/lifecycled-code-review`
3. Reuse/extraction fixes from `/dry` (these typically touch shared abstractions — group them so the refactor lands cohesively)
4. Verbosity fixes from `/lifecycled-code-review` (low-risk leanness changes, safe to do last)
5. Minor correctness from `/lifecycled-code-review`

The Deferred, Execution Order, and Implementation Plan sections follow `/lifecycled-code-review`'s format. The Execution Order section should reflect the ordering rule above and group interdependent reuse fixes together.

### Step 4 — Present and stop

Write the spec, present the path:

> "Unified findings spec written to `{path}` with `status: draft`.
>
> **{N_total} fixes** ({accepted_total} accepted, {skipped_total} deferred) from `/lifecycled-code-review` + `/dry`.
>
> Next steps:
>
> 1. Review the spec — edit, reorder, or remove fixes as needed
> 2. Set `status: approved` in the frontmatter
> 3. Implement the accepted fixes from the spec in a fresh session"

End the turn.

## Behavioral guardrails

- **Orchestrator owns the durable artifact.** This skill is the *only* author of a spec file and the *only* skill that presents a session-end handoff + next-steps. The underlying skills must not write their own spec file or emit their own session-end handoff: Step 1's orchestrator note suppresses `/lifecycled-code-review`'s spec generation **and** its session-end "next steps" message, and `/dry` never writes a spec. If either underlying skill starts producing its own durable output, stop it and synthesize here instead. Their on-screen findings reports are *not* durable output — those are always presented in full.
- **Report before triage.** In each pass, the user sees the complete findings report (full Output Format for /lifecycled-code-review, verbatim agent report for /dry) *before* being asked to triage anything. Both underlying skills receive their reports as **subagent tool results, which the user never sees** — a report you have read in a tool result has not been presented until you relay it into your own message text. Calling AskUserQuestion with finding summaries is not presenting the report. The check is mechanical: if your last message before the first triage question does not contain the full report, you have skipped it.
- **No hardcoded implement command.** The handoff names no specific implement skill — it tells the user to set `status: approved` and implement the accepted fixes in a fresh session. Do not reintroduce a `/build-feature` (or any other) hardcoded command.
- **Same scope, both passes.** Resolve target files once (during /lifecycled-code-review's resolution step), then pass that exact list to /dry. The two passes must cover identical files or the unified spec is misleading.
- **Phase 3 still runs.** /lifecycled-code-review's checklist learning loop is independent of spec writing and executes normally during Step 1. Only spec writing is deferred.
- **No fixes in-session.** Like both underlying skills, this is review-only. Fixes are resolved in a fresh session via the spec.
- **Empty result is a valid outcome.** If both passes produce zero accepted findings, do not write an empty spec — tell the user and stop.
