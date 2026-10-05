# review-then-dry

Chained code review + reuse audit producing one unified findings spec: `/lifecycled-code-review`, `/dry`, the `/review-then-dry` orchestrator, and `/checklist-lifecycle`. Node-only, Windows-portable.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install review-then-dry@mpiccinnonode
```

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
