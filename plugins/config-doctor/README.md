# config-doctor

A Claude Code plugin that deep-scans and audits a project's Claude configuration — agents, rules, skills, and memory files — then produces a quality report, tooling gap analysis, and memory optimization recommendations.

## What it does

### /audit

Runs a five-phase audit:

1. **Orientation** — inventories all `.claude/` configuration files
2. **Agent & Rules Quality Audit** — evaluates every agent against a rubric (0–50), flags rule contradictions, duplicates, and gaps
3. **Tooling Gap Analysis** — identifies missing linters, MCP servers, and LSP integrations for the project's tech stack
4. **Memory Optimization** — finds redundant, verbose, and dead rules; projects token savings
5. **Enforcement** — optionally applies safe fixes automatically or all recommendations with confirmation

### /bootstrap

Day-0 setup for new projects. Detects your stack and generates a tailored `.claude/` configuration — CLAUDE.md, agents, rules, and memory structure. Supports `.claude-bootstrap.yaml` template contracts for locked files and inject rules.

**New in 1.4.0:** `--import=<repo-url>` scaffolds a full project from a remote GitHub template — not just Claude config, but also source code, build configs, and assets. Use `--granularity=[config|code|all]` to control what gets imported (default: `all`).

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

### /audit

```text
/audit
/audit --report-only
/audit --apply-safe
/audit --apply-all
/audit --skip-tooling
/audit --skip-memory
/audit /path/to/other/project
```

### /bootstrap

```text
/bootstrap
/bootstrap --dry-run
/bootstrap --import=https://github.com/owner/template-repo
/bootstrap --import=owner/repo --granularity=config
/bootstrap /path/to/project
```

### Via natural language (skill auto-trigger)

Ask Claude to run the config doctor, audit your Claude configuration, or check your `.claude/` setup.
Ask Claude to bootstrap, initialize, or set up Claude Code configuration for a project.

## Optional: Serena MCP for reduced token usage

config-doctor works out of the box with native Claude Code tools. For ~60% lower token usage during audits, add [Serena](https://github.com/oraios/serena) to your Claude Code MCP configuration. config-doctor detects Serena automatically when available — no extra setup needed.

## Arguments reference

### /audit

| Flag | Effect |
| ------ | -------- |
| `--report-only` | Phases 1–4 only; no changes applied |
| `--apply-safe` | Auto-applies unambiguously safe fixes |
| `--apply-all` | Applies all recommendations (confirms each significant change) |
| `--skip-tooling` | Skips Phase 2 (tooling gap analysis) |
| `--skip-memory` | Skips Phase 3 (memory optimization) |
| `/path/to/project` | Targets a specific directory instead of cwd |

### /bootstrap

| Flag | Effect |
| ------ | -------- |
| `--dry-run` | Detects stack and shows what would be generated; writes nothing |
| `--import=<url>` | Import from a remote GitHub template repo (full URL, `github.com/owner/repo`, or `owner/repo`) |
| `--granularity=<mode>` | What to import: `config` (Claude config only), `code` (project source only), `all` (both, default) |
| `/path/to/project` | Targets a specific directory instead of cwd |

## Installation

See the [claude-salad marketplace README](../../README.md) for installation instructions.
