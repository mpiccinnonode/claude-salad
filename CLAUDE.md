# CLAUDE.md

claude-salad is a multi-plugin marketplace for Claude Code. No build step or test suite -- content is markdown files executed by Claude Code.

## Repository structure

```text
.claude-plugin/
  marketplace.json   # Marketplace registry listing all plugins

plugins/
  config-doctor/     # Deep-scan and audit a project's Claude configuration
  scrum-toolkit/     # Transform project ideas into SCRUM roadmaps
```

## Conventions

- **Plugin independence**: each plugin under `plugins/` is fully self-contained with its own CLAUDE.md, agents, skills, and plugin.json. No shared agents across plugins.
- **Version sync**: each plugin's `plugin.json` version must match the corresponding entry in the root `marketplace.json`.
- **No build artifacts**: do not introduce package managers, build tools, or compiled assets. This marketplace is pure markdown.
- **Markdown lint**: all markdown files are validated by CI via `.markdownlint.yaml` at the repo root.
- **Plugin-level conventions**: see each plugin's own `CLAUDE.md` for plugin-specific rules (agent frontmatter, skill frontmatter, etc.).
