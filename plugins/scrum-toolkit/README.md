# scrum-toolkit

A Claude Code plugin for the full SCRUM lifecycle — from project planning
and backlog management through ceremonies, PM/PO authoring, and DevOps
actions. All project state lives in GitHub Projects v2 as the single source
of truth: story points, priority, status, and sprint assignment are stored as
custom fields on the board, not in local files.

## Getting started

```text
/scrum                        # unified entry point — onboards, shows dashboard, routes to skills
/plan --full "Build a task management app with auth and real-time updates"
/gh-board init                # create the GitHub Projects v2 board with custom fields
```

After onboarding, use any skill directly — they all bootstrap from the same
cached project context.

## Skills

### Unified entry point

| Skill | Purpose |
| --- | --- |
| `/scrum` | Project selection, onboarding, dashboard overview, free-form questions, and routing to specialist skills |

### Ceremonies

| Skill | Usage | Purpose |
| --- | --- | --- |
| `/plan` | `[--grooming\|--sprint\|--full] [context]` | Sprint planning, backlog grooming, or full SCRUM roadmap generation |
| `/standup` | `[--since=<date>] [--format=slack\|markdown\|plain]` | Daily standup report from git activity, PRs, and board status |
| `/retro` | `[--sprint=<range>] [--since=<date>] [--until=<date>]` | Sprint retrospective from git history, merged PRs, and velocity metrics |
| `/sprint-review` | `[--sprint=<range>] [--since=<date>] [--until=<date>]` | Sprint review and demo summary for stakeholders |

### PM/PO authoring

| Skill | Usage | Purpose |
| --- | --- | --- |
| `/user-story` | `<description> [--epic=<ref>] [--gh-issue]` | Create user stories with acceptance criteria, publish as GitHub issues |
| `/epic` | `<description> [--roadmap=<path>] [--gh-milestone]` | Create epics with feature breakdown, publish as GitHub milestones with issues |
| `/milestone` | `<goals> [--sprints=<range>] [--gh-milestone]` | Define release milestones with goals and sprint ranges |

### DevOps

| Skill | Usage | Purpose |
| --- | --- | --- |
| `/commit` | `[story ref]` | Stage and commit with SCRUM-aware conventional commit messages |
| `/pr` | `[story ref] [--changelog] [--draft]` | Create pull requests with story references and board status updates |
| `/branch` | `<description or story ref> [--from=<base>]` | Create feature branches following repo naming conventions |
| `/gh-board` | `<init\|sync\|status> [--project=<name>] [--sprint=<N>]` | Initialize, sync, or check status of a GitHub Projects v2 board |

## Agent

| Agent | Purpose |
| --- | --- |
| `scrum-architect` | Phase-agnostic SCRUM expert dispatched by skills for domain reasoning and convention detection |

## How it works

1. **Bootstrap** — every skill reads the shared bootstrap sequence to detect
   the current repo, project slug, and cached conventions before doing
   anything else.
2. **GitHub Projects v2 as SSoT** — story points, priority, status, and
   sprint are custom fields on the GitHub board. Skills read from and write
   to these fields via the GitHub GraphQL API.
3. **Convention detection** — the scrum-architect agent detects repo
   conventions (branch naming, commit format, PR template) once during
   onboarding and caches them locally. Skills reuse the cached result.
4. **Agent dispatch** — skills parse arguments, load reference material, then
   dispatch the scrum-architect agent with a phase-specific prompt. The agent
   follows the skill's instructions.

## Installation

See the [claude-salad marketplace README](../../README.md) for installation
instructions.
