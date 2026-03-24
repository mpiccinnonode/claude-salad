# scrum-toolkit — State Schema Design

Generated: 2026-03-21 — reference document for plugin restructuring

---

## Two-Layer Architecture

```
~/.scrum-toolkit/
  portfolio.md                    # portfolio index (PM-facing)
  projects/
    <repo-slug>.md                # per-project state (e.g. mpiccinnonode-my-app.md)

<project-root>/
  .scrum/
    state.md                      # local mirror, updated by DevOps skills (dev only)
```

**Principles:**

- `~/.scrum-toolkit/` is always accessible regardless of working directory — serves both devs (global install) and PMs (no fixed project directory)
- `.scrum/state.md` in the repo is a dev-only mirror, updated automatically by the `commit` and `pr` skills
- The slug is derived deterministically from the git remote: `git remote get-url origin` → extract `org/repo` → replace `/` with `-` (e.g. `mpiccinnonode-my-app`)

---

## `portfolio.md` schema

```markdown
# SCRUM Portfolio
_Last updated: YYYY-MM-DD by scrum-architect_

## Active Projects
| Slug | Name | Repo | Sprint | End | Status |
|------|------|------|--------|-----|--------|
| mpiccinnonode-my-app | My App | mpiccinnonode/my-app | 12 | 2026-03-28 | on-track |

## Needs Attention
- **my-app** — refinement to schedule

## Settings
- Default sprint duration: 2 weeks
- Estimation scale: fibonacci
- User role: product-owner
```

**Notes:**

- `user-role` is either `developer` or `product-owner` — calibrates output verbosity
- `Needs Attention` is regenerated on every update
- If missing → agent starts guided onboarding

---

## `projects/<slug>.md` schema

```markdown
# Project State — <Project Name>
_Slug: <slug>_
_Repo: <org/repo>_
_Last updated: YYYY-MM-DD by scrum-architect (skill: <skill-name>)_

## Config
- Sprint duration: 2 weeks
- Velocity avg (last 3): 34 sp
- Team size: 4
- Estimation: fibonacci

## Conventions
- Branches: `feature/<id>-description`
- Commits: conventional commits
- Labels: `sp:N`, `priority:must/should/could/wont`
- Issue templates: story, bug
- Project board: yes (id: 3)

## Current Sprint
- **Number:** 12
- **Goal:** <sprint goal>
- **Start:** YYYY-MM-DD | **End:** YYYY-MM-DD
- **Committed:** 34 sp | **Completed:** 10 sp | **Remaining:** 24 sp

### Sprint Backlog
| Issue | Title | Points | Status | Assignee |
|-------|-------|--------|--------|----------|
| #42 | SSO login support | 5 | in-progress | @max |

### Blockers
| Issue | Description | Owner | Since |
|-------|-------------|-------|-------|
| #43 | Missing BE endpoint | @backend-team | YYYY-MM-DD |

## Product Backlog (top 10)
| Issue | Title | Epic | Points | Priority |
|-------|-------|------|--------|----------|
| #51 | Google SSO | Auth | 8 | Must |

## Epics
| Name | Milestone | Issues | Status |
|------|-----------|--------|--------|
| Auth | v1.2 | #42,#43,#44 | in-progress |

## Sprint History
| Sprint | Goal | Velocity | Completed | Goal Met |
|--------|------|----------|-----------|----------|
| 11 | User profile | 31 sp | 31 sp | ✅ |
```

---

## Update Rules — State Management for `AGENT.md`

### Read

Always read `~/.scrum-toolkit/projects/<slug>.md` at the start of every dispatch.

- If file does not exist → run onboarding
- Derive slug from: repo field in `portfolio.md`, or `git remote get-url origin`

### Write — which skill updates what

| Skill | Sections updated |
| --- | --- |
| `plan` | Current Sprint (full replace), Product Backlog |
| `standup` | Sprint Backlog statuses, Blockers |
| `sprint-review` | Current Sprint completed sp, Sprint History (append) |
| `retro` | Sprint History goal-met field |
| `user-story` | Product Backlog (append), Epics if `--epic` provided |
| `epic` | Epics table |
| `milestone` | Epics milestone field |
| `commit` | Sprint Backlog status (todo → in-progress → done) |
| `pr` | Sprint Backlog status, Blockers (remove if resolved) |
| `gh-board` | Conventions.project-board |

### Read-only (never write)

`branch`, `scrum` (wrapper), `standup`

### Sync to repo

After `commit` and `pr`: mirror updated state to `.scrum/state.md` in repo root.

### Append vs Replace

- **Replace:** Current Sprint (after `plan`)
- **Append:** Sprint History (after `sprint-review`), Product Backlog (after `user-story`)
- **Partial update:** individual Sprint Backlog rows (after `commit`, `standup`)

---

## PM Onboarding — Guided Flow

Triggered when `portfolio.md` does not exist or when adding a new project.

Ask questions **one at a time**:

1. What is the project name?
2. Does it have a GitHub repo? (e.g. `org/repo`)
3. How long are your sprints? (1 / 2 / 3 weeks)
4. What is your role? (Product Owner / Scrum Master / Developer)

After replies: infer conventions via `gh` CLI, create state files, confirm to user.

---

## Open Decisions

- [ ]  Multi-repo handling (monorepo, separate frontend + backend)
- [ ]  Conflict resolution if dev and PM update state concurrently
- [ ]  `/scrum` wrapper skill schema — see companion page