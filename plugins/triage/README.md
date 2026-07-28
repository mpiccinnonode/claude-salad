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

You don't have to remember to run it. A `SessionStart` hook checks the triage directory once a day and mentions it only when something is actually actionable, staying quiet otherwise. It never deletes anything itself. To change the cadence or how insistent it is, edit `hooks/hooks.json`:

```text
--frequency 24     hours between checks (0 checks every session)
--min-flagged 5    how many likely-dead records alone are worth mentioning
```
