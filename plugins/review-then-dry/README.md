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

It needs **Claude Code ≥ 2.1.287**. Older builds silently ignore it; the rest of the plugin works as before.

### What it hooks

Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/review-then-dry`:

```text
❯ ./register.ts hooks: tool.call{tool=Edit}, tool.call{tool=Write}
❯ ./register.ts calls: $.fs.read (via whisper), $.session.root (via whisper)
```

It reads one file, `<project root>/.claude/review-checklist.yaml`, and writes nothing.
