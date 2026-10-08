# done-gate plugin — dev notes

A mod: function hooks only, no skills or agents. Needs Claude Code ≥ 2.1.287.

- `hooks/register.ts` holds the per-turn state (edited source files, the checks they require, Bash commands since the last source edit, a blocked flag, cached directory listings), reset on `turn.start`. Module state, not `$.state`: nothing draws it, and a hot reload mid-turn only forgets that turn.
- Detection walks up from each edited file to the root and takes the nearest directory whose markers imply checks; an edit with none above it doesn't count. `done-gate.json` `checks` skip the walk.
- `hooks/gate.ts` is the pure part: config parsing, the detection table, the glob→regex (`$` has no glob), the verdict line.
- Subagent tool calls count toward the turn (their edits and checks are the turn's work); a subagent's own `turn.complete` (`agentId` set) never warns.
- `block` returns `{ block }` from `classic.Stop` once per turn and never when `stop_hook_active` is set, so it cannot loop. It keeps a lower hook's own `block` if one came back.
- Only successful calls count: a denied or errored edit or Bash call is ignored. A check that ran and failed still counts as run, since Claude saw the failure.
- `MultiEdit` is matched via `String(e.tool)`: this build has no such tool, other builds may.
- Check before pushing: `claude plugin validate plugins/done-gate` and `claude plugin test plugins/done-gate`. Neither needs auth. Type-check with a scratch `tsconfig.json` outside the plugin that includes the engine's `claude-code.d.ts`, the built-in tools' declarations, and `hooks/`.
