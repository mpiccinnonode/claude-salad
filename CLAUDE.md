# CLAUDE.md

claude-salad is a multi-plugin marketplace for Claude Code. Most plugins are pure markdown executed by Claude Code; a plugin MAY ship runtime helper scripts (e.g. Node `.mjs`) and its own self-contained test suite when its skill needs executable logic (see `plugins/triage`).

## Lint

```bash
npx markdownlint-cli2 "**/*.md"        # lint all markdown (matches CI)
npx markdownlint-cli2 "plugins/config-doctor/**/*.md"  # lint one plugin
```

CI runs this on every push to `main` and on pull requests via `.github/workflows/lint.yml`. Config lives in `.markdownlint.yaml` at the repo root.

## Repository structure

```text
.claude-plugin/
  marketplace.json        # Marketplace registry — lists every plugin with name, version, source path

plugins/<plugin-name>/    # Each plugin is self-contained
  .claude-plugin/
    plugin.json           # Plugin metadata (name, version, author, repo)
  CLAUDE.md               # Plugin-specific conventions (agent frontmatter, skill flags, etc.)
  agents/                 # Agent definitions — deployed to user's .claude/agents/ on install
  skills/                 # Skill definitions (not all plugins have skills)
  scripts/ or test/       # Optional — runtime helper scripts + their tests, for plugins with executable logic
  package.json            # Optional — only for plugins that ship a Node test suite (e.g. triage)
```

## Conventions

- **Plugin independence**: each plugin under `plugins/` is fully self-contained with its own CLAUDE.md, agents, skills, and plugin.json. No shared agents across plugins.
- **Version sync**: a plugin's version appears in three places that must stay in sync — `plugins/<name>/.claude-plugin/plugin.json` (source of truth), the matching entry in `.claude-plugin/marketplace.json`, and any `version:` field in skill frontmatter. Update all three together.
- **Agent frontmatter**: every agent `.md` file requires `name:`, `description:` (with `<example>` blocks), and `model:` fields in YAML frontmatter. See each plugin's CLAUDE.md for model assignments.
- **Runtime scripts & tests are allowed**: a plugin may ship runtime helper scripts (Node `.mjs`, no transpile step) and a self-contained test suite (`node --test`, zero deps) when its skill needs executable logic. Keep them minimal and dependency-free — avoid heavyweight build tooling, bundlers, or compiled artifacts. Markdown-only plugins remain the norm.
- **Markdown lint**: all markdown files are validated by CI. Run `npx markdownlint-cli2 "**/*.md"` locally before pushing.
- **Plugin-level conventions**: see each plugin's own `CLAUDE.md` for plugin-specific rules (skill flags, subagent dispatch patterns, etc.).
