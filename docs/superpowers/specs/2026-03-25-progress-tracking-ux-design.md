# Progress Tracking UX for scrum-toolkit

**Date:** 2026-03-25
**Status:** Approved

## Problem

Bulk-creation operations in scrum-toolkit skills (creating N GitHub issues,
setting N board fields, syncing N backlog items) give no visibility into
progress. Users wait with no feedback until the entire operation completes.
If something fails mid-loop, there is no indication of how far the operation
got.

## Solution

Hybrid approach: **phase-level Tasks in the Claude Code task panel** +
**inline `[N/TOTAL]` counters** emitted during bulk loops.

- Phase Tasks are fixed-count (4-6 per skill) regardless of item count —
  constant token overhead (~1,200 tokens in tool calls).
- Inline counters are plain text output — zero tool call overhead.

## Architecture: two execution models

This feature behaves differently depending on where the bulk loop runs:

**Skill-driven loops** — the SKILL.md file itself loops over items after the
agent returns. The skill can create and complete Tasks between each phase
because it controls the execution flow. Example: `epic` Steps 5a-5c run in
the skill after the agent finishes Step 4. Skill-driven loops accumulate
failures in a local list and append a failure block to the final summary.

**Agent-driven loops** — the agent executes all phases inside a single
dispatch. The skill cannot insert Task operations between agent-internal
phases. In this case, Tasks are created before the dispatch and completed
after it returns. The skill inspects the agent output to detect skipped
or partially failed operations and renames Tasks accordingly. Inline
counters emitted by the agent provide per-item feedback during execution
loops only (not during diff/read/approval phases, which use free-form prose).

All Task creation and completion (`TaskCreate`, `TaskUpdate`) happens in the
**skill file**, not inside agent dispatch prompts. TaskCreate and TaskUpdate
are not guaranteed to be available in a subagent's tool scope.

Count `N` for failure subjects by counting lines that begin with `FAILED:` in
the agent output. This keeps the `FAILED:` prefix and rename subjects
consistent.

## Affected Skills

Four skills receive this treatment. Other skills (`user-story`, `branch`,
`commit`, `pr`, `sprint-plan --sprint`, `sprint-plan --grooming`,
`milestone`, `standup`, `sprint-review`, `sprint-retro`) are single-item
or produce inline output with no bulk GitHub ops — no changes needed.

### `epic` (skill-driven loop)

Steps 4 and 5 are separate: the agent runs Step 4 (content generation),
then the skill executes Steps 5a-5c directly. Tasks can be phase-granular.

| Phase Task subject | Created/completed by | Conditional |
| --- | --- | --- |
| `Generate epic content` | skill, before/after Step 4 dispatch | always |
| `Create GitHub milestone` | skill, before/after Step 5a | `--gh-milestone` + `hasRepo` |
| `Create issues (N total)` | skill, before/after Step 5b loop | `--gh-milestone` + `hasRepo` |
| `Set project board fields (N items)` | skill, before/after Step 5c loop | `--gh-milestone` + `hasRepo` |

N is known after Step 4 returns (story count from agent output), so the
subject can be templated before starting the loop.

Inline counters are emitted by the skill directly in the Step 5b and 5c
loops — no agent instruction needed. The skill accumulates failures in a
local list and appends a failure block to Step 6 (Summary) output.

### `sprint-plan --full` (agent-driven, single-Task wrapping)

One wrapping Task spans the single agent dispatch, marked `completed`
immediately after the agent dispatch returns. No execution loops and no
failure-rename logic — this skill has no bulk GitHub operations.

| Phase Task subject | Created/completed by | Conditional |
| --- | --- | --- |
| `Generate full SCRUM roadmap (5 phases)` | skill, before/after Step 4 dispatch | always |

Self-verification for this skill uses a minimal 2-item checklist (see
Self-verification additions below).

### `gh-board sync` (agent-driven)

The diff presentation, user approval gate, and execute loop all run inside
a single agent dispatch. Both Tasks are created before the dispatch.

| Phase Task subject | Created by | Conditional |
| --- | --- | --- |
| `Read artifacts & compute diff` | skill, before dispatch | always |
| `Execute approved changes` | skill, before dispatch | always |

After the agent dispatch returns, apply the first matching case, completing
`Read artifacts & compute diff` first, then `Execute approved changes`:

| Agent output indicates | `Read artifacts & compute diff` | `Execute approved changes` |
| --- | --- | --- |
| Error before approval gate (no diff output) | completed — subject: `Read artifacts & compute diff — failed` | completed — subject: `Execute approved changes — skipped (pre-flight error)` |
| User rejected changes | completed | completed — subject: `Execute approved changes — skipped (user declined)` |
| `FAILED:` lines present | completed | completed — subject: `Execute approved changes — N item(s) failed` |
| Clean execution | completed | completed |

The agent emits `[N/TOTAL]` counters only during the execute loop (Step 5
of dispatch prompt). The diff/read/approval phases use free-form prose.

### `gh-board init` (agent-driven)

All creation steps run inside a single agent dispatch. Tasks are created
before the dispatch and completed after it returns.

| Phase Task subject | Created by | Conditional |
| --- | --- | --- |
| `Create project board` | skill, before dispatch | always |
| `Create custom fields` | skill, before dispatch | always |
| `Create repo labels` | skill, before dispatch | always |

After the agent dispatch returns, inspect the agent output:

- If `Create project board` or `Create custom fields` failed, mark the
  failed Task completed with subject `<original subject> — failed` and mark
  remaining Tasks completed with subject `<original subject> — skipped`.
- If the label loop contains `FAILED:` lines, mark `Create repo labels`
  completed with subject `Create repo labels — N item(s) failed`.
- Otherwise mark all three Tasks completed with subjects unchanged.

The agent emits `[N/TOTAL]` counters only during the label creation loop
(Step 4 of dispatch prompt).

## Mechanics

### Skill-side changes

1. Add `TaskCreate` and `TaskUpdate` to `allowed-tools` in each affected
   skill's frontmatter.
1. For skill-driven loops (`epic`): create each Task immediately before its
   phase begins, mark it `completed` immediately after the phase ends.
   Accumulate loop failures in a local list; append a failure block to the
   final summary output.
1. For agent-driven loops (`gh-board`, `sprint-plan`): create all Tasks
   before the agent dispatch. After the agent returns, inspect output and
   complete Tasks using the outcome tables defined per skill above.

### Agent dispatch prompt changes

For agent-driven loops, add one instruction line to each execution loop in
the dispatch prompt:

> Prefix each action with `[N/TOTAL]` — e.g., `[1/7] Created issue #42: As a user...`
> For failures: `[3/7] FAILED: "As a user..." — gh: 422 Unprocessable`

This instruction applies to execution loops only — not to read, diff,
or approval phases:

- `gh-board sync` execute loop (Step 5 of dispatch prompt)
- `gh-board init` label creation loop (Step 4 of dispatch prompt)

For `epic`, inline counters are emitted by the skill itself in the Step 5b
and 5c loops — no dispatch prompt change needed.

### Error handling

- Mid-loop failures emit: `[3/7] FAILED: issue "As a user..." — gh: 422 Unprocessable`
- The loop continues; failures are collected and surfaced in the final summary
- If a skill exits before marking Tasks `completed`, the task panel shows
  `in_progress` permanently — this is the intended stall signal
- On caught errors, do NOT attempt a final `TaskUpdate` before exiting;
  the `in_progress` state is self-documenting and avoids a second tool call
  at the point of failure

### Self-verification additions

In each affected skill's existing **Self-Verification** checklist section,
add the appropriate variant:

For skill-driven loops (`epic`):

```text
- [ ] Phase Tasks were created before each step and completed after.
- [ ] Skill emits [N/TOTAL] counters directly in the loop body.
- [ ] Loop failures are accumulated and appended to the final summary.
- [ ] All Tasks were marked completed before the final summary.
```

For single-Task wrapping (`sprint-plan --full`):

```text
- [ ] Wrapping Task was created before the agent dispatch.
- [ ] Wrapping Task was marked completed immediately after the agent returns.
```

For agent-driven loops with outcome tables (`gh-board sync`, `gh-board init`):

```text
- [ ] All phase Tasks were created before the agent dispatch.
- [ ] Dispatch prompt instructs agent to emit [N/TOTAL] counters in execution loops only.
- [ ] Agent output was inspected and Tasks renamed per the outcome table.
- [ ] All Tasks were marked completed after the agent dispatch returns.
```

## Non-goals

- No per-item Tasks (O(N) tool call overhead — rejected as too expensive)
- No changes to bootstrap sequence, reference files, or agent architecture
- No progress tracking for read-only operations (status, grooming output)
