---
name: release
description: >-
  Release workflow for claude-salad plugins. Creates a release branch from
  develop, detects which plugins changed, bumps their versions (patch, minor, or
  major per plugin), generates a changelog from commits, and opens a PR to main.
  Use this skill whenever the user wants to cut a release, bump plugin versions,
  prepare a release PR, or ship a new version of one or more plugins.
---

You are executing the claude-salad plugin release workflow. This is a
multi-step process that modifies version numbers across the repo and opens a PR.
Follow each phase in order, confirming with the user at decision points.

## Phase 1 — Detect changed plugins

Identify which plugins have changes on `develop` that are not yet on `main`.

```bash
git diff --name-only main...develop -- plugins/
```

Extract the unique plugin names from the changed file paths (the directory
immediately under `plugins/`). If no plugins have changes, tell the user
there is nothing to release and stop.

Classify each changed file as **functional** or **non-functional**:

- **Functional**: agent definitions, skill definitions, plugin.json —
  anything that affects behavior.
- **Non-functional**: `CLAUDE.md`, `.markdownlint.yaml`, `references/`
  subdirectories — documentation and lint config only.

For each changed plugin, read its current version from
`plugins/<name>/.claude-plugin/plugin.json` — that file is the version
source of truth.

Present the results as a table, distinguishing functional from non-functional
changes:

```text
| Plugin         | Current | Functional | Docs-only | Status          |
|----------------|---------|------------|-----------|-----------------|
| config-doctor  | 1.1.0   | 7          | 2         | ready           |
| scrum-toolkit  | 0.1.0   | 0          | 2         | docs-only ⚠️    |
```

Plugins marked "docs-only" have no functional changes. Ask the user whether
to include them in the release or skip them before proceeding to Phase 2.

## Phase 2 — Choose bump type per plugin

Use the AskUserQuestion tool to ask the user which semver bump to apply to
each changed plugin. Offer three options per plugin: **patch**, **minor**,
**major**. Show the current version and what each bump would produce.

For example, if config-doctor is at 1.1.0:

- patch → 1.1.1
- minor → 1.2.0
- major → 2.0.0

If only one plugin changed, a single question is fine. If multiple changed,
ask one question per plugin.

## Phase 3 — Create the release branch

Branch from `develop`. The branch name depends on what changed:

- **Single plugin**: `release/<plugin-name>-v<new-version>`
  Example: `release/config-doctor-v1.2.0`
- **Multiple plugins**: `release/<date>`
  Example: `release/2026-03-20`

```bash
git checkout develop
git pull origin develop
git checkout -b <branch-name>
```

## Phase 4 — Bump versions

For each plugin being released, update the version in **all three locations**:

1. **`plugins/<name>/.claude-plugin/plugin.json`** — the `"version"` field
2. **`.claude-plugin/marketplace.json`** — the matching plugin entry's `"version"` field
3. **Skill frontmatter** (if the plugin has skills) — the `version:` field in
   each `SKILL.md` under `plugins/<name>/skills/`

Use the Edit tool for each file. After editing, verify all three locations
match by reading the changed values back.

## Phase 5 — Generate changelog

Gather the commit log between `main` and the current branch:

```bash
git log main..HEAD --oneline --no-merges
```

For each commit, determine which plugin files it touched using:

```bash
git diff-tree --no-commit-id --name-only -r <sha> -- plugins/
```

### Classify commits

Assign each commit to one of three buckets:

- **Plugin-specific**: touches files under exactly one plugin's directory
  (excluding `references/` subdirectories and documentation-only files like
  `CLAUDE.md`, `.markdownlint.yaml`).
- **Shared**: touches files under two or more plugins.
- **General fixes**: touches only non-functional files — documentation
  (`CLAUDE.md`), lint config (`.markdownlint.yaml`), or `references/`
  subdirectories. These are not code changes and should be noted but do not
  by themselves justify a version bump.

If a plugin's only changes are general fixes (no plugin-specific or shared
commits touch its functional files), ask the user whether to include it in
the release or skip it.

### Format the changelog

```markdown
## config-doctor 1.1.0 → 1.2.0

- feat: add new audit phase for hooks
- fix: correct model assignment in skill-evaluator

## scrum-toolkit 0.1.0 → 0.2.0

- feat: add velocity tracking to sprint plans

## Shared

- chore: agents format (config-doctor, scrum-toolkit)
- fix: md lint (config-doctor, scrum-toolkit)

## General fixes

- docs: update plugin CLAUDE.md conventions
```

The "General fixes" section is optional — only include it if there are
commits that touch only non-functional files. Each shared commit should list
the affected plugins in parentheses.

Write this to `CHANGELOG.md` at the repo root. If `CHANGELOG.md` already
exists, prepend the new release section above existing content (below any
top-level heading). If it does not exist, create it with a `# Changelog`
heading.

## Phase 6 — Commit and push

Stage all changed files and commit:

```bash
git add .claude-plugin/marketplace.json
git add plugins/*/.claude-plugin/plugin.json
git add plugins/*/skills/*/SKILL.md
git add CHANGELOG.md
git commit -m "release: <summary of bumps>"
git push -u origin <branch-name>
```

The commit message should list each plugin and its version bump, for example:
`release: config-doctor 1.1.0 → 1.2.0, scrum-toolkit 0.1.0 → 0.2.0`

## Phase 7 — Open PR to main

Use `gh pr create` to open a pull request from the release branch to `main`.

- **Title**: `release: <plugin> v<version>` (single plugin) or
  `release: <date> — <plugin1> v<ver1>, <plugin2> v<ver2>` (multiple)
- **Body**: include the changelog content generated in Phase 5, plus a
  checklist:

```markdown
## Changelog

<paste changelog sections here>

## Post-merge checklist

- [ ] Create git tags after merge (see below)
- [ ] Open sync PR from main → develop
```

After the PR is created, display the PR URL.

## Phase 8 — Post-merge steps

After the release PR is created, tell the user what happens next. Do NOT
execute these steps yet — they should happen after the release PR is reviewed
and merged.

### Tagging

```bash
After merging the release PR, run:

git checkout main
git pull origin main
git tag -a config-doctor/v1.2.0 -m "config-doctor v1.2.0"
git push origin --tags
```

Adjust tag names and versions to match what was actually released. Create one
tag per bumped plugin.

### Sync PR (main → develop)

After tagging, open a PR from `main` back into `develop` to sync the version
bumps and changelog:

```bash
gh pr create --base develop --head main \
  --title "chore: sync main → develop after release" \
  --body "Syncs version bumps and changelog from the release back into develop."
```

Display the sync PR URL alongside the release PR URL so the user has both.

## Error handling

- If `gh` CLI is not authenticated, tell the user to run `gh auth login` first.
- If `main` and `develop` are already in sync (no diff), report that and stop.
- If the release branch already exists, ask the user whether to reuse it or
  create a new one.
- Always run `npx markdownlint-cli2 "**/*.md"` before committing to ensure
  markdown passes CI lint.
