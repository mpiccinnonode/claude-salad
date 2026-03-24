# scrum-toolkit — Revised Architecture Spec

Generated: 2026-03-23 — supersedes State Schema Design and /scrum Wrapper Skill
Design documents.

Last revised: 2026-03-23 — incorporated pre-check decisions.

---

## 1. Design Goals

- Target both developers and product managers/owners.
- Use **GitHub Projects v2** as the single source of truth for all live sprint
  state (backlog, statuses, points, assignees, iterations).
- Keep local storage minimal: project index + config + velocity history only.
- Gracefully degrade when GitHub API is unavailable — prompt the user for data
  directly rather than failing silently.
- Provide `/scrum` as a unified entry point that routes to specialist skills.

---

## 2. Architecture Overview

```text
GitHub Projects v2 (SSoT for live state)
  Issues            -> user stories, bugs, tasks
  Custom fields     -> Story Points (number), Priority (single-select), Status
                       (single-select), Sprint (iteration)
  Labels            -> priority:must/should/could/wont (supplementary, for
                       filtering outside the board)
  Milestones        -> epics / release targets
  Project board     -> sprint backlog, status columns, iteration views

~/.scrum-toolkit/ (local — config and index only)
  portfolio.json              -> project index + user preferences
  projects/<slug>.json        -> per-project config + velocity history

<project-root>/
  .scrum/                     -> DROPPED — no repo-local mirror
```

### Story Points and Priority — Custom Fields as Primary

**Story Points** are stored as a **custom number field** on the GitHub Project
board. This enables summing, filtering, and velocity calculation via GraphQL.
`sp:N` labels are **not created** — custom fields replace them entirely.

**Priority** is stored as a **custom single-select field** on the Project board
with options: `Must`, `Should`, `Could`, `Won't`. Additionally,
`priority:must/should/could/wont` **labels** are created on the repo for
filtering issues outside the board context (e.g., `gh issue list --label
priority:must`). The custom field is the primary source; labels are
supplementary.

### Why GitHub as SSoT

- Eliminates concurrent-write conflicts (GitHub handles atomicity).
- Eliminates markdown table parsing/editing — the hardest part of the original
  design.
- PMs already use GitHub Projects; no new tool to learn.
- Skills interact via `gh` CLI / GraphQL instead of custom state formats.

### Why Local JSON Still Exists

GitHub has no native concept for:

| Data | Why local |
| --- | --- |
| Velocity history | Historical append-only data across sprints |
| Team conventions | Branch naming, commit style, label taxonomy |
| Estimation scale | Config, not state |
| Team size | Config, not state |
| Sprint duration | Config, not state |

These are **config and history**, not live state. They change rarely and have no
concurrency risk.

---

## 3. Local Storage Schemas

### 3.1 `~/.scrum-toolkit/portfolio.json`

```json
{
  "defaults": {
    "sprintDurationDays": 14,
    "estimationScale": "fibonacci",
    "userRole": "product-owner"
  },
  "projects": [
    {
      "slug": "org-repo-name",
      "name": "My App",
      "repo": "org/repo-name",
      "projectNumber": 3,
      "userRole": "developer"
    }
  ]
}
```

- `slug` derived deterministically: `git remote get-url origin` -> extract
  `org/repo` -> replace `/` with `-`.
- `defaults.userRole` is `developer`, `scrum-master`, or `product-owner` —
  calibrates output verbosity across all skills. Can be overridden per project
  via `projects[].userRole`.
- `sprintDurationDays` is an integer (days). Common values: 7, 14, 21.
- `projects[].userRole` is optional — if omitted, falls back to
  `defaults.userRole`.
- `projects` array is the only index; no duplication of sprint state.
- If missing -> agent starts guided onboarding.

### 3.2 `~/.scrum-toolkit/projects/<slug>.json`

```json
{
  "teamSize": 4,
  "sprintDurationDays": 14,
  "estimationScale": "fibonacci",
  "conventions": {
    "branches": "feature/<id>-description",
    "commits": "conventional",
    "labels": ["priority:must", "priority:should", "priority:could", "priority:wont"],
    "issueTemplates": ["story", "bug"],
    "detectedAt": "2026-03-23",
    "autoRefresh": true
  },
  "velocityHistory": [
    {
      "sprint": 11,
      "goal": "User profile",
      "committed": 34,
      "completed": 31,
      "goalMet": true
    }
  ]
}
```

- `conventions` is populated during onboarding via `gh` CLI auto-detection, then
  editable by the user.
- `conventions.detectedAt` records when auto-detection last ran.
- `conventions.autoRefresh` — when true, the model periodically suggests
  re-detection (e.g., after 30 days or when conventions look inconsistent). The
  user can also trigger re-detection on demand via `/scrum detect-conventions`.
- `velocityHistory` is append-only. Written by `sprint-review` skill at sprint
  close.
- No sprint backlog, no issue statuses, no points — all of that lives in GitHub.

---

## 4. GitHub Projects v2 — Field Mapping

Skills read and write GitHub state using these mappings:

| SCRUM concept | GitHub primitive | Access method |
| --- | --- | --- |
| Sprint backlog | Project items in current iteration | GraphQL: project items filtered by iteration |
| Story points | Custom number field `Story Points` | GraphQL: field value read/write |
| Status | Custom single-select field `Status` | GraphQL: field value update |
| Priority | Custom single-select field `Priority` + repo labels | GraphQL for field; `gh issue edit --add-label` for labels |
| Sprint iteration | Custom iteration field `Sprint` | GraphQL: iteration read/set |
| Sprint goal | Iteration title or description | GraphQL: iteration metadata |
| Epic grouping | Milestone | `gh issue edit --milestone` |
| Assignee | Issue assignee | `gh issue edit --add-assignee` |
| Blockers | Label `blocked` + linked issue | `gh issue edit --add-label` |

**Custom fields created on board init:**

- `Story Points` — number field
- `Priority` — single-select: Must, Should, Could, Won't
- `Status` — single-select: Sprint Backlog, In Progress, In Review, Done
- `Sprint` — iteration field

**Labels created on repo init** (supplementary, for outside-board filtering):

- `priority:must`, `priority:should`, `priority:could`, `priority:wont`
- `story`, `bug`, `spike`, `epic` (type labels)
- `blocked` (blocker flag)

`sp:N` labels are **not created** — story points live exclusively in the custom
number field.

### 4.1 Convention Auto-Detection

Runs once during onboarding and caches results to
`projects/<slug>.json`.conventions. Does **not** re-run automatically on every
skill invocation.

**Re-detection triggers:**

- User explicitly requests via `/scrum detect-conventions` or similar.
- Model suggests re-detection when `conventions.detectedAt` is older than 30
  days, or when observed repo patterns conflict with cached conventions.

**Detection steps:**

1. **Labels** — existing label taxonomy, naming scheme, color groupings.
2. **Milestones** — naming pattern and cadence.
3. **Branches** — naming pattern from recent branches.
4. **Commits** — message style from recent history.
5. **Project boards** — existing column structure and custom fields.
6. **Issue templates** — existing templates in `.github/`.

Detected conventions are saved to `projects/<slug>.json`. When conventions have
gaps, the agent proposes additions and explains reasoning — never silently
invents.

---

## 5. GitHub API Reference File

A new reference file `references/github-api-patterns.md` provides JIT-loadable
GraphQL query templates for common operations. Skills load only the queries they
need via section-header offset/limit reads.

### 5.1 Planned Sections

```text
## Project Discovery
  - Find project by number for a repo
  - List all projects for an org/repo

## Reading Project State
  - Get all items in current iteration with field values
  - Get single item by issue number
  - Get project custom field definitions (IDs for points, status, iteration,
    priority)

## Writing Project State
  - Update item status field
  - Update item story points field
  - Update item priority field
  - Move item to iteration
  - Add existing issue to project

## Issue Operations
  - Create issue with labels and milestone
  - Update issue labels
  - Close/reopen issue

## Milestone Operations
  - List milestones
  - Create milestone with due date

## Field ID Resolution
  - Look up custom field node IDs (required before any field update)
  - Cache strategy: resolve once per session, pass IDs to subsequent queries
```

### 5.2 Graceful Degradation

When a GitHub API call fails (network, auth, rate limit):

1. Log the specific error for the user.
2. Ask the user to provide the data manually (e.g., "I couldn't reach GitHub.
   What issues are in your current sprint?").
3. Continue with user-provided data — never block the workflow entirely.
4. Do NOT retry automatically in a loop.

---

## 6. Shared Bootstrap Step

Every skill that interacts with GitHub state or local config must run this
bootstrap sequence before its main logic. This is a **common pattern documented
here** and referenced by all skills — not duplicated in each skill file.

### 6.1 Bootstrap Sequence

```text
1. Derive slug from `git remote get-url origin`
   - Extract org/repo, replace `/` with `-`
   - If no git remote (no repo): slug = directory name

2. Read `~/.scrum-toolkit/portfolio.json`
   - If missing: trigger onboarding flow, then re-read
   - Find project entry matching slug
   - If no match: ask user if this is a new project -> onboarding

3. Read `~/.scrum-toolkit/projects/<slug>.json`
   - If missing: trigger convention detection + create file
   - Extract: conventions, velocityHistory, teamSize, sprintDurationDays

4. Resolve user role
   - Use project-level `userRole` if set
   - Otherwise fall back to `defaults.userRole` from portfolio.json

5. If project has a repo (repo != null):
   a. Resolve GitHub Project board ID from projectNumber
   b. Resolve custom field IDs (Story Points, Priority, Status, Sprint)
      - Use cached IDs if available in the session
      - Otherwise query via GraphQL (see references/github-api-patterns.md
        "Field ID Resolution")
   c. Identify current sprint iteration

6. If project has no repo (repo == null):
   - Skills operate against local JSON fallback schema (Section 8)
   - Skip all GitHub API steps
```

### 6.2 Bootstrap Output

The bootstrap produces a **project context object** that skills consume:

```text
- slug, name, repo, projectNumber
- userRole (resolved with fallback)
- conventions (from local JSON)
- velocityHistory (from local JSON)
- GitHub field IDs (projectId, storyPointsFieldId, priorityFieldId,
  statusFieldId, sprintFieldId, currentIterationId)
- hasRepo (boolean — controls GitHub vs. local-fallback path)
```

Skills reference this context instead of independently querying for project
metadata.

---

## 7. Skill State Responsibilities

Which skill reads/writes what:

### 7.1 GitHub State (via API)

| Skill | Reads | Writes |
| --- | --- | --- |
| `plan` | Product backlog, current iteration | Create/update iteration, move items to sprint |
| `standup` | Current sprint items + statuses | — (read-only) |
| `sprint-review` | Current sprint items, completed work | — (read-only; triggers local velocity write) |
| `retro` | Current sprint items, velocity | — (read-only; triggers local goalMet write) |
| `user-story` | Labels, milestones, templates | Create issue, add to project, set custom fields |
| `epic` | Milestones, related issues | Create milestone, update issue milestones |
| `milestone` | Milestones | Create/update milestone |
| `commit` | — | — (commit skill only commits; no GitHub state updates) |
| `pr` | Current sprint items, blockers | Update item status, remove blocked label |
| `gh-board` | Project board structure | Create/configure project, add custom fields |
| `branch` | — | — (read-only, uses cached conventions for naming) |

**Note on `commit`:** The commit skill stages and commits changes only. It does
**not** update GitHub project item statuses. Status transitions (e.g.,
todo -> in-progress) happen via `pr` or manual board updates. The `--log` flag
from the original skill is **removed** — sprint state lives in GitHub, not in
local log files.

### 7.2 Local JSON

| Skill | Reads | Writes |
| --- | --- | --- |
| `plan` | Conventions, velocity history | — |
| `sprint-review` | Velocity history | Append to velocityHistory |
| `retro` | Velocity history | Update goalMet on latest entry |
| `standup` | Conventions | — |
| `commit` | Conventions | — |
| `pr` | Conventions | — |
| `branch` | Conventions | — |
| `user-story` | Conventions | — |
| `epic` | Conventions | — |
| `milestone` | Conventions | — |
| `gh-board` | Project config | Update projectNumber |
| `scrum` (wrapper) | Portfolio index | Add project on onboarding |

---

## 8. `/scrum` Wrapper Skill

### 8.1 Purpose

Unified entry point for both PMs and devs. Routes to specialist skills or the
scrum-architect agent. Does not execute SCRUM phases directly.

### 8.2 Frontmatter

```yaml
name: scrum
version: "1.0.0"
description: >-
  Unified entry point for PM and dev. Handles project selection, portfolio
  navigation, onboarding, dashboard overview, free-form project questions,
  and dispatches to specialist skills.
argument-hint: "[project] [free-form intent or question]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
```

### 8.3 Flow

**Step 1 — Bootstrap.**
Run the shared bootstrap (Section 6). Read `~/.scrum-toolkit/portfolio.json`.
If missing -> run Onboarding (Step 6).

**Step 2 — Project Selection.**
Parse `$ARGUMENTS` for an explicit project name or slug. If not found and
portfolio has multiple projects -> ask:

```text
Which project?
1. My App (Sprint 12)
2. Other Project (Sprint 4)
3. Add a new project
```

If portfolio has exactly one project, select it automatically.

**Step 3 — Intent Detection.**

| Intent | Triggers |
| --- | --- |
| `overview` | no arguments, "status", "how are we doing", "dashboard" |
| `question` | free-form question about project state |
| `ceremony` | "standup", "retro", "review", "planning", "grooming" |
| `authoring` | "story", "epic", "milestone", "feature" |
| `devops` | "commit", "pr", "branch", "board" |
| `portfolio` | "all projects", "portfolio" |
| `onboarding` | "add project", "new project" |

If ambiguous -> default to `overview`.

**Step 4a — Fetch GitHub State (for `overview`, `question`, `portfolio`).**
Before dispatching scrum-architect for these intents, the **wrapper skill
itself** fetches GitHub project state using the bootstrap context:

- For `overview` and `question`: read current sprint items, statuses, blockers,
  and sprint goal from the selected project.
- For `portfolio`: read current sprint summary from each project in
  `portfolio.json`.

This data is passed to the scrum-architect agent in the dispatch prompt. The
agent does not fetch GitHub state itself.

**Step 4b — Intent Execution.**

- **`overview`** — Dispatch scrum-architect with fetched project state. Output:
  sprint number + goal, status with one-line rationale, open blockers, suggested
  next action. Short labeled sections, no tables.
- **`question`** — Dispatch scrum-architect with fetched state + user question.
  Answer in 1-3 sentences. No invented data.
- **`ceremony`** — Dispatch to matching skill: `standup`, `retro`,
  `sprint-review`, `plan`.
- **`authoring`** — Dispatch to: `user-story`, `epic`, `milestone`.
- **`devops`** — Dispatch to: `commit`, `pr`, `branch`, `gh-board`.
- **`portfolio`** — Dispatch scrum-architect with fetched multi-project state.
  One line per project, attention flags, single "focus for today" recommendation.
- **`onboarding`** — Run onboarding flow (Step 6).

**Step 5 — Post-execution.**
No automatic portfolio status sync (state lives in GitHub). Only update
`portfolio.json` if a new project was added.

**Step 6 — Onboarding.**
Ask one at a time:

1. Project name?
2. GitHub repo? (e.g. `org/repo`) — if none, create local-only project.
3. Sprint duration? (1 / 2 / 3 weeks)
4. Your role? (Product Owner / Scrum Master / Developer)

After replies: derive slug, detect conventions via `gh` CLI, find or create
GitHub Project board, save to `portfolio.json` and `projects/<slug>.json`.

---

## 9. `plan --full` and `gh-board sync` — Intermediate Artifact Workflow

### 9.1 `plan --full` Output

The `plan --full` skill generates a markdown roadmap document
(`docs/project-roadmap.md`). This is an **intermediate artifact** — a
human-readable planning document, not the live source of truth.

The document contains epics, user stories, sprint assignments, and estimates.
It is meant to be reviewed and edited by the team before being pushed to GitHub.

### 9.2 `gh-board sync` — Push Intermediate Artifacts to GitHub

Under the new architecture, `gh-board sync` is redefined as:

> "Read local planning artifacts and reconcile them with GitHub state."

Specifically:

1. Read `docs/project-roadmap.md` and any `docs/sprint-*.md` files.
2. Query current GitHub state (issues, milestones, project board items).
3. Compute a diff: what exists locally but not in GitHub, what has changed.
4. Present the diff to the user for approval.
5. Execute approved changes: create issues, assign milestones, set custom
   fields, add items to project board.

This makes `sync` the bridge between the planning artifact and the GitHub SSoT.
It is always user-approved — never runs automatically.

### 9.3 Workflow Summary

```text
/plan --full        -> generates docs/project-roadmap.md (intermediate)
  team reviews and edits the document
/gh-board sync      -> reads the document, diffs against GitHub, pushes approved changes
  GitHub Projects v2 is now the SSoT
  subsequent skills read from GitHub, not the markdown file
```

---

## 10. No-Repo Fallback

For projects without a GitHub repo:

- `portfolio.json` entry has `"repo": null` and `"projectNumber": null`.
- Local `projects/<slug>.json` gains a temporary `backlog` array and
  `currentSprint` object to hold state that would normally live in GitHub.
- Skills detect `repo: null` (via bootstrap `hasRepo` flag) and operate against
  local JSON instead of the API.
- When a repo is later connected, onboarding migrates: creates GitHub Issues
  from the local backlog, sets up the Project board, and removes the local
  state fields.

### 10.1 Extended Local Schema (no-repo only)

```json
{
  "backlog": [
    {
      "id": "local-1",
      "title": "SSO login support",
      "points": 5,
      "priority": "must",
      "status": "todo",
      "epic": "Auth"
    }
  ],
  "currentSprint": {
    "number": 1,
    "goal": "MVP auth flow",
    "start": "2026-03-23",
    "end": "2026-04-06",
    "items": ["local-1", "local-2"]
  }
}
```

These fields are **only present** when `repo` is null. They are deleted during
migration to GitHub.

**Assignees:** No assignee field in the local schema. If the user needs to
communicate what tasks are theirs (e.g., during standup), they tell the model
directly. Assignee tracking starts when the project migrates to GitHub.

---

## 11. Open Decisions

- [ ] Mixed intent parsing in `/scrum` (e.g., `/scrum my-app retro yesterday`)
  — need a resolution strategy beyond defaulting to overview.
- [ ] Multi-repo projects (monorepo, separate frontend + backend sharing one
  sprint) — single project board across repos or separate boards?
- [ ] Rate limit handling — should skills batch multiple GraphQL queries into
  fewer requests where possible?
- [ ] Portfolio filtering (e.g., `/scrum portfolio at-risk`) — defer to post-v1?

---

## 12. Migration from Original Design

The original State Schema Design proposed:

- `~/.scrum-toolkit/portfolio.md` + `projects/<slug>.md` with full sprint state
  in markdown tables.
- `.scrum/state.md` repo-local mirror synced by commit/pr skills.

This revised spec replaces that with:

| Original | Revised | Reason |
| --- | --- | --- |
| Markdown state files | GitHub Projects v2 | Eliminates parse/write complexity and conflicts |
| `portfolio.md` | `portfolio.json` | Simpler to parse, index-only |
| `projects/<slug>.md` | `projects/<slug>.json` | Config + velocity only, not state |
| `.scrum/state.md` | Dropped | No need for local mirror when GitHub is SSoT |
| Markdown table surgery in skills | GraphQL via `gh` CLI | Reliable, atomic, API-backed |
| `sp:N` labels for story points | Custom number field on Project board | Enables summing, filtering, velocity calculation |
| `commit --log` local sprint log | Removed | Sprint state tracked in GitHub, not local files |

---

## 13. Resolved Decisions Log

Decisions made during the pre-check review (2026-03-23):

1. **Story points: custom field only.** `sp:N` labels dropped. Custom number
   field on project board is the sole store for story points.
2. **Priority: custom field + labels.** Custom single-select field is primary.
   `priority:*` labels are supplementary for outside-board filtering.
3. **`gh-board sync` redefined.** Now reads local planning artifacts and pushes
   to GitHub (Section 9), not the reverse.
4. **`plan --full` output is an intermediate artifact.** Markdown document for
   human review; `gh-board sync` bridges it to GitHub SSoT.
5. **`commit` skill is commit-only.** No GitHub state updates, no `--log` flag.
   Status transitions happen via `pr` or manual board updates.
6. **`sprint-review` and `retro` write to local velocity history.** These skills
   must include a step to append/update `projects/<slug>.json`.
7. **Shared bootstrap step.** All skills reference the common bootstrap sequence
   (Section 6) instead of independently resolving project context.
8. **Detect-once-and-cache conventions.** Auto-detection runs during onboarding,
   caches results. Model periodically suggests re-detection. User can trigger
   on demand.
9. **Wrapper fetches GitHub state before dispatching.** For `overview`,
   `question`, and `portfolio` intents, the wrapper skill reads GitHub state
   and passes it to scrum-architect. The agent does not fetch state itself.
10. **`userRole` supports portfolio default + per-project override.** Moved to
    `defaults.userRole` with optional `projects[].userRole` override.
