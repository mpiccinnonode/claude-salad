# CLAUDE.md

scrum-toolkit is a full SCRUM lifecycle plugin for Claude Code — ceremonies,
PM/PO authoring, and DevOps actions with GitHub integration.

## Repository structure

```text
.claude-plugin/
  plugin.json                          # Plugin metadata (name, version, author, repo)

references/
  scrum-knowledge.md                   # JIT-loaded SCRUM reference (roles, ceremonies, artifacts, prioritization, devops, github mapping)

agents/
  scrum-architect.md                   # Phase-agnostic SCRUM expert dispatched by skills (sonnet)

skills/
  plan/SKILL.md                        # Sprint planning, backlog grooming, full roadmap
  standup/SKILL.md                     # Daily standup generation
  retro/SKILL.md                       # Sprint retrospective facilitation
  sprint-review/SKILL.md              # Sprint review and demo prep
  user-story/SKILL.md                 # User story authoring with optional GitHub issue
  epic/SKILL.md                        # Epic creation with feature breakdown
  milestone/SKILL.md                   # Milestone definition
  commit/SKILL.md                      # SCRUM-aware conventional commits
  pr/SKILL.md                          # SCRUM-aware pull request creation
  branch/SKILL.md                      # Feature branch creation
  gh-board/SKILL.md                    # GitHub project board management
```

## Key conventions when editing this plugin

- **Agent frontmatter**: the agent file requires `name:`, `description:` (with `<example>` blocks), and `model:` fields. The `description:` field must use an inline `\n`-escaped quoted string, not a YAML block scalar (`|`). scrum-architect runs on `sonnet`.
- **Skill frontmatter**: every SKILL.md requires `name:`, `version:`, `description:`, `argument-hint:`, and `allowed-tools:` fields. Version must match `plugin.json`.
- **Version sync**: keep `plugin.json` version in sync with the marketplace `marketplace.json` entry and all skill `version:` fields — `plugin.json` is the source of truth.
- **Convention detection**: the scrum-architect agent owns repository convention detection. Skills that touch GitHub include a "detect conventions first" instruction in their dispatch prompt rather than duplicating detection logic.
- **Reference file usage**: skills JIT-load sections from `references/scrum-knowledge.md` by reading specific `##` section headers with offset/limit. Read the full file only when multiple sections are needed.
- **Agent dispatch pattern**: skills parse arguments, load reference material, then dispatch the scrum-architect agent with a phase-specific prompt. The agent follows the skill's instructions — it does not decide which phase to run.
