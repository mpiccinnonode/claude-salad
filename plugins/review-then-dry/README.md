# review-then-dry

Chained code review + reuse audit producing one unified findings spec: `/lifecycled-code-review`, `/dry`, `/perf-review`, the `/review-then-dry` orchestrator, and `/checklist-lifecycle`. Node-only, Windows-portable.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install review-then-dry@mpiccinnonode
```

## Performance review

`/perf-review` is a read-only audit of what costs more as data or traffic grows: list endpoints that load nested collections for every row, duplicate requests on page or sort change, data loaded eagerly when it is not always needed, missing memoization on row actions, unbounded queries, render cost. It reports with `file:line`, who pays, and what the cost scales with. Run it alone, or add it as an optional third pass: `/review-then-dry --perf`.

## Verifying findings

`/lifecycled-code-review`, `/dry`, `/perf-review` and `/review-then-dry` verify by default: a second agent re-reads the code behind every finding before you see the report. Each finding gets a verdict — confirmed, downgraded (real but overstated, with what is actually true), or not found — in a table right after the unedited report. Not-found findings are flagged in triage with a recommendation to reject; nothing is rejected for you. Pass `--no-verify` to skip it. It costs one extra agent call per pass, and it checks that findings hold in the code, not that they are proven.

## Checklist whisper

Your project's review checklist (`.claude/review-checklist.yaml`) normally only matters when someone runs a review. The checklist whisper brings it forward: right after Claude edits or writes a file, it tells Claude which **active** checks cover that file, so the rule is in front of it while the code is being written, not after.

- Only `active` checks are whispered. `staged` checks still have to prove themselves in real reviews, and `frozen` ones have gone quiet on purpose.
- Each rule is mentioned once per file per session, as a note only Claude reads. It never blocks an edit.
- No checklist, or a file outside it, means no output.

## Report-relay gate

The review agents hand their reports back to Claude as tool results, and you never see tool results. Claude has to repeat the report in its own reply before asking you to triage the findings, and it sometimes skips that and goes straight to the question.

The gate catches that. After a review-then-dry agent returns, the first triage question (`AskUserQuestion`) is held back until Claude's reply has actually covered the report. It holds back once per report at most, so it can't get stuck. Triage questions asked as plain text aren't checked.

## What the mods hook

Both features above are mods: they need **Claude Code ≥ 2.1.287**, and older builds silently ignore them. Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/review-then-dry`:

```text
❯ ./register.ts hooks: tool.call{tool=Edit}, tool.call{tool=Write}, tool.call{tool=Agent}, session.append{door=response}, tool.call{tool=AskUserQuestion}
❯ ./register.ts calls: $.fs.read (via whisper), $.session.root (via whisper)
```

They read one file, `<project root>/.claude/review-checklist.yaml`, and write nothing. The only call they can refuse is a triage question asked before the report was shown.
