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

Triage never dispatches agents or edits code — it recommends and records a triage decision at `.claude/triage/<slug>.yaml` in your project.
