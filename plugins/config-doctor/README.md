# config-doctor

A Claude Code plugin that deep-scans and audits a project's Claude configuration — agents, rules, skills, and memory files — then produces a quality report, tooling gap analysis, and memory optimization recommendations.

## What it does

Runs a five-phase audit:

1. **Orientation** — inventories all `.claude/` configuration files
2. **Agent & Rules Quality Audit** — evaluates every agent against a rubric (0–50), flags rule contradictions, duplicates, and gaps
3. **Tooling Gap Analysis** — identifies missing linters, MCP servers, and LSP integrations for the project's tech stack
4. **Memory Optimization** — finds redundant, verbose, and dead rules; projects token savings
5. **Enforcement** — optionally applies safe fixes automatically or all recommendations with confirmation

## Bundled agents

The plugin ships four agents used internally by the audit:

| Agent | Purpose |
| ------- | --------- |
| `agent-architect` | Evaluates agent and rules quality using a structured rubric |
| `code-quality-scouter` | Audits developer tooling and recommends MCP/LSP additions |
| `memory-optimizer` | Audits memory files for token waste and redundancy |
| `skill-evaluator` | Evaluates skill files for quality using a structured rubric |

The `memory-optimizer` is only used if the project does not already have a custom one in `.claude/agents/`. If a project-level `memory-optimizer` exists, it takes priority.

## Usage

### Via slash command

```text
/audit
/audit --report-only
/audit --apply-safe
/audit --apply-all
/audit --skip-tooling
/audit --skip-memory
/audit /path/to/other/project
```

### Via natural language (skill auto-trigger)

Ask Claude to run the config doctor, audit your Claude configuration, or check your `.claude/` setup.

## Optional: Serena MCP for reduced token usage

config-doctor works out of the box with native Claude Code tools. For ~60% lower token usage during audits, add [Serena](https://github.com/oraios/serena) to your Claude Code MCP configuration. config-doctor detects Serena automatically when available — no extra setup needed.

## Arguments reference

| Flag | Effect |
| ------ | -------- |
| `--report-only` | Phases 1–4 only; no changes applied |
| `--apply-safe` | Auto-applies unambiguously safe fixes |
| `--apply-all` | Applies all recommendations (confirms each significant change) |
| `--skip-tooling` | Skips Phase 2 (tooling gap analysis) |
| `--skip-memory` | Skips Phase 3 (memory optimization) |
| `/path/to/project` | Targets a specific directory instead of cwd |

## Installation

See the [claude-salad marketplace README](../../README.md) for installation instructions.
