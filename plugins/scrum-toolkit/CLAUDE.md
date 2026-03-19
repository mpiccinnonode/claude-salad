# CLAUDE.md

scrum-toolkit is a Claude Code plugin for SCRUM-based project planning. No build step or test suite -- content is markdown files executed by Claude Code.

## Repository structure

```text
.claude-plugin/
  plugin.json             # Plugin metadata (name, version, author, repo)

agents/
  scrum-architect.md      # Transforms project ideas into SCRUM roadmaps (sonnet)
```

## Key conventions when editing this plugin

- **Agent frontmatter**: each agent file requires `name:`, `description:` (with `<example>` blocks), and `model:` fields. scrum-architect runs on `sonnet`.
- **Version sync**: keep `plugin.json` version in sync with the marketplace `marketplace.json` entry.
- **No build artifacts**: do not introduce package managers, build tools, or compiled assets. This plugin is pure markdown.
- **No skills yet**: this plugin currently bundles only the scrum-architect agent. Future skills (e.g., `/roadmap`) may be added under `skills/`.
