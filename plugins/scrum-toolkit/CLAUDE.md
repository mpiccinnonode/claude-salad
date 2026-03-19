# CLAUDE.md

scrum-toolkit is a Claude Code plugin for SCRUM-based project planning.

## Repository structure

```text
.claude-plugin/
  plugin.json             # Plugin metadata (name, version, author, repo)

agents/
  scrum-architect.md      # Transforms project ideas into SCRUM roadmaps (sonnet)
```

## Key conventions when editing this plugin

- **Agent frontmatter**: each agent file requires `name:`, `description:` (with `<example>` blocks), and `model:` fields. scrum-architect runs on `sonnet`.
- **Version sync**: keep `plugin.json` version in sync with the marketplace `marketplace.json` entry — `plugin.json` is the source of truth.
