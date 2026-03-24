# scrum-toolkit — /scrum Wrapper Skill Design

Generated: 2026-03-21 — companion to State Schema Design

---

## Overview

`/scrum` is the unified entry point for the scrum-toolkit plugin. Serves both PMs (primary) and devs (overview and navigation). Does not execute SCRUM phases directly — selects the right project, detects intent, and dispatches to specialist skills or the scrum-architect agent.

---

## Skill Frontmatter

```yaml
---
name: scrum
version: "1.0.0"
description: Unified entry point for PM and dev. Handles project selection,
  portfolio navigation, onboarding, dashboard overview, free-form project
  questions, and dispatches to specialist skills.
argument-hint: "[project] [free-form intent or question]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---
```

---

## Step 1 — Bootstrap

Read `~/.scrum-toolkit/portfolio.md`. If missing → run Onboarding (Step 6).

---

## Step 2 — Project Selection

Parse `$ARGUMENTS` for an explicit project name or slug.

If no project identified → **always ask**:

```
Which project are you referring to?
1. My App (Sprint 12 — on-track)
2. Other Project (Sprint 4 — at-risk)
3. Add a new project
```

Wait for reply. If user selects "Add a new project" → run Onboarding (Step 6).

---

## Step 3 — Intent Detection

| Intent | Triggers |
| --- | --- |
| `overview` | no arguments, "status", "how are we doing", "dashboard" |
| `question` | free-form question about the project state |
| `ceremony` | "standup", "retro", "review", "planning", "grooming" |
| `authoring` | "story", "epic", "milestone", "feature" |
| `devops` | "commit", "pr", "branch", "board" |
| `portfolio` | "all projects", "portfolio", "general overview" |
| `onboarding` | "add project", "new project" |

If ambiguous → default to `overview`.

---

## Step 4 — Intent Execution

### `overview`

Dispatch scrum-architect for minimal dashboard:

- Sprint number and goal
- Status (on-track / at-risk / off-track) + one-line rationale
- Open blockers
- Suggested next action

No tables — short labeled sections. Plain language.

### `question`

Dispatch scrum-architect with full project state + user question verbatim. Answer directly in 1–3 sentences. No invented data.

### `ceremony`

| Keyword | Skill |
| --- | --- |
| standup | standup |
| retro / retrospective | retro |
| review | sprint-review |
| planning / grooming | plan |

### `authoring`

| Keyword | Skill |
| --- | --- |
| story | user-story |
| epic | epic |
| milestone | milestone |

### `devops`

| Keyword | Skill |
| --- | --- |
| commit | commit |
| pr / pull request | pr |
| branch | branch |
| board | gh-board |

### `portfolio`

Dispatch scrum-architect with full portfolio + Current Sprint section of each project. Output: one line per project, ⚠️ for attention items, single "Focus for today" recommendation.

### `onboarding`

Run Onboarding flow (Step 6).

---

## Step 5 — Post-execution

After any intent execution: if project state was modified, update `Status` and `End` in `portfolio.md`. No follow-up questions unless dispatched skill requires input.

---

## Step 6 — Onboarding Flow

Ask one at a time:

1. What is the project name?
2. GitHub repo? (e.g. `org/repo`)
3. Sprint duration? (1 / 2 / 3 weeks)
4. Your role? (Product Owner / Scrum Master / Developer)

After replies: derive slug, infer conventions via `gh` CLI, create state files, confirm: *"Project added. Would you like to run sprint planning or start with a user story?"*

---

## Design Notes

- **Intent defaults to `overview`** — `/scrum` alone gives the PM a dashboard immediately
- **Specialist skills unchanged** — `/scrum` invokes them as subagents; devs using direct skills are unaffected
- **Post-execution portfolio sync** — status updated automatically after every skill execution
- **Plain language** — all dispatches instruct scrum-architect to avoid technical jargon

---

## Open Decisions

- [ ]  Intent detection when user mixes project name and intent (e.g. `/scrum my-app retro`)
- [ ]  `portfolio` intent filtering by status (e.g. "show only at-risk projects")
- [ ]  Localization: onboarding questions in English — consider accepting replies in any language