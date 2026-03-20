# scrum-toolkit

A Claude Code plugin for the full SCRUM lifecycle — from project planning and backlog management through ceremonies, PM/PO authoring, and DevOps actions with GitHub integration.

## Skills

### Ceremonies

| Skill | Purpose |
| --- | --- |
| `/plan` | Sprint planning, backlog grooming, or full SCRUM roadmap generation |
| `/standup` | Daily standup report from git activity, PRs, and assigned issues |
| `/retro` | Sprint retrospective from git history and merged PRs |
| `/sprint-review` | Sprint review and demo summary for stakeholders |

### PM/PO Authoring

| Skill | Purpose |
| --- | --- |
| `/user-story` | Create user stories with acceptance criteria, optionally as GitHub issues |
| `/epic` | Create epics with feature breakdown and story stubs, optionally as GitHub milestones |
| `/milestone` | Define release milestones with goals and sprint ranges |

### DevOps

| Skill | Purpose |
| --- | --- |
| `/commit` | Stage and commit with SCRUM-aware conventional commit messages |
| `/pr` | Create pull requests with story references and changelog generation |
| `/branch` | Create feature branches following repo naming conventions |
| `/gh-board` | Initialize, sync, or check status of a GitHub project board |

## Agent

| Agent | Purpose |
| --- | --- |
| `scrum-architect` | Phase-agnostic SCRUM expert dispatched by skills for domain reasoning |

## Quick start

```text
/plan --full "Build a task management app with user auth and real-time updates"
/user-story "Add SSO login support" --gh-issue
/commit ST-42 --log
/gh-board init
```

## Installation

See the [claude-salad marketplace README](../../README.md) for installation instructions.
