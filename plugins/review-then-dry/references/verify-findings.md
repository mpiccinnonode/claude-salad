# Verifying findings (default, `--no-verify` to skip)

Default second look at a review agent's findings. A reviewer agent reads code and may misread it; the `findings-verifier` agent re-reads the cited code with fresh context and returns one verdict per finding. Run it on every review unless `$ARGUMENTS` contains `--no-verify`, in which case skip it entirely. A stray `--verify` is a no-op.

## Applies to

`/lifecycled-code-review`, `/dry`, `/perf-review`, and the `/review-then-dry` orchestrator (which passes the flag through to each pass). Not `/checklist-lifecycle` — it produces no findings.

## When it runs

After the review agent(s) of the skill have returned, **before** the report is presented and before triage. Run it once per pass, on that pass's findings. If the pass returned no findings, skip verification for it.

## Dispatch

One call, `subagent_type: review-then-dry:findings-verifier`, no inline system prompt. Prompt:

> "Verify the findings in the report below against the code. Files that were audited: `<resolved list>`. Report: `<the agent's report, verbatim>`."

For `/lifecycled-code-review`, send each agent's findings once (Phase 1 and Phase 2 can go in one call if both are already back). Do not wait for or pass the checklist: the verifier checks claims against code, not against the checklist.

## Presentation

The verifier's table arrives as an Agent tool result, which the user never sees. Put it in your own reply:

1. Present the review report exactly as the skill normally does (verbatim for `/dry` and `/perf-review`, the Output Format structure for `/lifecycled-code-review`). Do not edit it to reflect the verdicts.
2. Directly after it, emit the verifier's `### Verification` table and its summary line verbatim.

## Effect on triage

Only the skills with a triage loop (`/lifecycled-code-review`, `/review-then-dry`) use verdicts:

- **NOT_FOUND:** list it in the triage prompt marked "verifier: not found", and recommend Reject. The user decides; never auto-reject.
- **DOWNGRADED:** list it with the verifier's note, so the user triages the corrected claim.
- **CONFIRMED:** no change.

An accepted finding carries its verdict into the findings spec as `**Verification:** {Confirmed | Downgraded — note}`. Omit the line when verification did not run.

## Cost and limits

One extra agent call per pass. The verifier checks that findings hold in the code; it does not run the code, measure anything, or look for what the reviewer missed. Report that limit as it is: "Verified" means "checked against the code", not "proven".
