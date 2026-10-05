# triage

Advisory task classifier for Claude Code. Describe a task in natural language and `/triage` classifies it into a workflow shape, then maps each phase to the best-matching skill, agent, or MCP server you actually have installed — or emits a copy-pasteable prompt when nothing matches.

## Requirements

- **Node ≥ 18** (the only runtime dependency; all helper scripts are Node — no shell, jq, python, or yq needed).

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install triage@mpiccinnonode
```

## Usage

```text
/triage <task description>
```

Triage never dispatches agents or edits code — it recommends and records a triage decision at `.claude/triage/<slug>.yaml` in your project. Every record it writes is checked against the schema, so it stays resumable in a later session and closable later on.

### Cleaning up

```text
/triage-cleanup
```

Finds finished, abandoned, and forgotten records — plus the specs and plans belonging to work that's over — and deletes only what you confirm. Nothing is removed before you've seen the list: a deterministic scan decides what *could* be stale, you decide what actually goes.

You don't have to remember to run it. A `SessionStart` hook checks the triage directory once a day and mentions it only when something is actually actionable, staying quiet otherwise. It never deletes anything itself. To change the cadence or how insistent it is, edit the args in `hooks/hooks.json` (a plugin update overwrites local edits):

```text
--frequency 24     hours between checks (0 checks every session)
--min-flagged 5    how many likely-dead records alone are worth mentioning
```

### Record check

Every triage record is checked against the schema when it's written, because a record with an off-schema `status` or a misspelled date field becomes invisible to recall and cleanup. The skill already runs that check as a step. In Claude Code ≥ 2.1.287 a mod also runs it automatically after every `Write` or `Edit` to a record, and hands any violations straight to Claude to fix, so the check no longer depends on Claude remembering the step. Older builds silently ignore the mod and keep the skill's own step. It runs a command through the mod API, which is documented as CLI-only. Wherever that isn't available, the mod stays silent and the skill's step still covers it.

Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/triage`:

```text
❯ ./register.ts hooks: tool.call{tool=Write}, tool.call{tool=Edit}
❯ ./register.ts calls: $.process.run (via check)
```

The one command it runs is `node <plugin>/skills/triage/scripts/validate-record.mjs --file <record>`. It never blocks a write.
