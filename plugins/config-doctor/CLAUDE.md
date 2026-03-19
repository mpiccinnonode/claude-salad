# CLAUDE.md

config-doctor is a Claude Code plugin. No build step or test suite — content is markdown files executed by Claude Code.

## Repository structure

```text
.claude-plugin/
  plugin.json        # Plugin metadata (name, version, author, repo)

agents/              # Bundled subagents — deployed to the user's .claude/agents/ on install
  agent-architect.md      # Evaluates agent/rules quality via a 0–50 rubric (runs on claude opus)
  code-quality-scouter.md # Audits developer tooling and recommends MCP/LSP additions (sonnet)
  memory-optimizer.md     # Audits memory files for token waste and redundancy (sonnet)
  skill-evaluator.md      # Evaluates skill files for quality via a 0-50 rubric (sonnet)

skills/audit/
  SKILL.md           # The full multi-phase audit orchestration logic (7 phases, dual Phase 2 dispatch)

.gitignore           # OS and IDE artifact exclusions
.markdownlint.yaml   # Markdown lint rules for CI validation
```

## Optional MCP enhancement: Serena

Subagents use native Claude Code tools (`Read`, `Glob`, `Grep`) by default. If the user has [Serena](https://github.com/oraios/serena) configured in their environment (detected as `mcp__serena__*` or `mcp__plugin_*_serena__*`), agents will prefer its structured semantic tools for lower token cost. No bundled MCP server — Serena is detected from the user's own configuration.

## Key conventions when editing this plugin

- **Agent frontmatter**: each agent file requires `name:`, `description:` (with `<example>` blocks), and `model:` fields. `agent-architect` runs on `opus`; others run on `sonnet`.
- **Skill frontmatter**: `skills/audit/SKILL.md` requires `name:`, `description:`, `version:`, and `allowed-tools:`. The `argument-hint:` field controls slash command autocomplete.
- **`$ARGUMENTS`**: the skill receives user flags (`--report-only`, `--apply-safe`, `--apply-all`, `--phase=<names>`, `--skip-agents`, `--skip-skills`, `--skip-tooling`, `--skip-memory`, or a path) via the `$ARGUMENTS` placeholder at the end of `SKILL.md`. `--phase` accepts comma-separated phase names (`agents`, `skills`, `tooling`, `memory`) and takes priority over `--skip-*` flags if both are present.
- **Version sync**: `plugin.json` and `SKILL.md` both declare a `version` field. Keep them in sync — `plugin.json` is the source of truth.
- **No build artifacts**: do not introduce package managers, build tools, or compiled assets. This plugin is pure markdown.
