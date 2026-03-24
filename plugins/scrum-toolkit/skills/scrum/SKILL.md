---
name: scrum
version: "1.0.0"
description: Use when a user wants a SCRUM project overview, health check, or dashboard, needs to navigate between projects, or needs routing to the right SCRUM skill. Also trigger for "how's my sprint?", "what should I work on today?", "project status", "show my board", or any SCRUM request without a more specific skill match.
argument-hint: "[project] [free-form intent or question]"
allowed-tools: [Read, Write, Agent, Bash]
---

You are the unified entry point for the scrum-toolkit plugin. Work through the
steps below in order to resolve the target project, detect the user's intent,
and either handle the request directly or route to a specialist skill.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
bootstrap sequence:

1. **Read `~/.scrum-toolkit/portfolio.json`** --- load the portfolio registry.
   If the file is missing, skip directly to Step 6 (Onboarding).
2. If the portfolio file exists, continue to Step 2.

---

## Step 2 --- Project Selection

Parse `$ARGUMENTS` for an explicit project name or slug.

- **Explicit match** --- if `$ARGUMENTS` contains a token that matches a
  project `name` or `slug` in `portfolio.json`, select that project.
- **Single project** --- if the portfolio has exactly one project, select it
  automatically.
- **Multiple projects, no match** --- prompt the user:

  ```text
  Which project?
  1. {Project Name} (Sprint {N})
  2. {Other Project} (Sprint {N})
  3. Add a new project
  ```

  Wait for the user's reply before proceeding. If the user picks "Add a new
  project", go to Step 6 (Onboarding).

Once a project is selected, complete the remaining bootstrap steps: read
`~/.scrum-toolkit/projects/<slug>.json`, resolve the user role, and resolve
GitHub field IDs (when `hasRepo` is true).

---

## Step 3 --- Intent Detection

Detect the user's intent from `$ARGUMENTS` (after removing any project name
token consumed in Step 2).

| Intent | Triggers |
| --- | --- |
| `overview` | no remaining arguments, "status", "how are we doing", "dashboard" |
| `question` | free-form question about project state |
| `ceremony` | "standup", "retro", "review", "planning", "grooming" |
| `authoring` | "story", "epic", "milestone", "feature" |
| `devops` | "commit", "pr", "branch", "board" |
| `portfolio` | "all projects", "portfolio" |
| `onboarding` | "add project", "new project" |

If the intent is ambiguous, default to `overview`.

---

## Step 4a --- Fetch GitHub State

This step applies only to `overview`, `question`, and `portfolio` intents.
For all other intents, skip to Step 4b (Intent Execution).

The wrapper skill itself fetches GitHub project state before dispatching the
scrum-architect agent. The agent does NOT fetch state on its own.

JIT-read the "Reading Project State" section from
`plugins/scrum-toolkit/references/github-api-patterns.md` for the GraphQL
queries.

### For `overview` and `question` intents

When `hasRepo` is true:

- Query all items in the current sprint iteration using the bootstrap
  `projectId` and `currentIterationId`.
- Extract: item titles, statuses, story points, assignees, blockers (items
  with the `blocked` label), and the sprint goal (from the iteration
  description or title).

When `hasRepo` is false:

- Read `backlog` and `currentSprint` from
  `~/.scrum-toolkit/projects/<slug>.json` instead of querying GitHub.

### For `portfolio` intent

- Iterate over every project in `portfolio.json`.
- For each project with `hasRepo` true: query the current sprint summary
  (item count, done count, blocker count).
- For each project with `hasRepo` false: read local `currentSprint` data.

---

## Step 4b --- Intent Execution

### overview

Dispatch the **scrum-architect** agent with the fetched project state:

````text
## Phase: Sprint Overview

### Inputs

- **Project:** {name} ({slug})
- **Bootstrap context:** {full project context object}
- **Current sprint state:** {fetched GitHub or local state from Step 4a}

### Instructions

Produce a concise sprint overview with these labeled sections (no tables):

- **Sprint** --- sprint number and goal.
- **Status** --- one-line health assessment with rationale.
- **Blockers** --- list open blockers, or "None" if clear.
- **Next action** --- single most impactful suggested action.

Keep it short. No invented data --- use only the state provided.
````

### question

Dispatch the **scrum-architect** agent with the fetched state and the user's
question:

````text
## Phase: Project Question

### Inputs

- **Project:** {name} ({slug})
- **Bootstrap context:** {full project context object}
- **Current sprint state:** {fetched GitHub or local state from Step 4a}
- **User question:** {the free-form question from $ARGUMENTS}

### Instructions

Answer the question in 1-3 sentences using only the provided state. Do not
invent data. If the answer cannot be determined from the available state, say
so and suggest where to find the information.
````

### ceremony

Do NOT re-implement ceremony logic. Tell the user which specialist skill
handles their request and suggest they invoke it directly:

| Trigger | Skill | Suggested invocation |
| --- | --- | --- |
| standup | standup | `/standup` |
| retro | retro | `/retro` |
| review | sprint-review | `/sprint-review` |
| planning, grooming | plan | `/plan --sprint` or `/plan --grooming` |

Example output:

```text
Daily standups are handled by the /standup skill.
Run `/standup` to generate your standup report.
```

### authoring

Route to the appropriate specialist skill:

| Trigger | Skill | Suggested invocation |
| --- | --- | --- |
| story, feature | user-story | `/user-story {remaining args}` |
| epic | epic | `/epic {remaining args}` |
| milestone | milestone | `/milestone {remaining args}` |

Example output:

```text
User story authoring is handled by the /user-story skill.
Run `/user-story {your description}` to create a story.
```

### devops

Route to the appropriate specialist skill:

| Trigger | Skill | Suggested invocation |
| --- | --- | --- |
| commit | commit | `/commit` |
| pr | pr | `/pr` |
| branch | branch | `/branch {description}` |
| board | gh-board | `/gh-board status` |

Example output:

```text
Pull request creation is handled by the /pr skill.
Run `/pr` to create a SCRUM-aware pull request.
```

### portfolio

Dispatch the **scrum-architect** agent with the fetched multi-project state:

````text
## Phase: Portfolio Overview

### Inputs

- **Portfolio:** {list of all projects with their current sprint summaries}
- **Bootstrap context:** {default settings from portfolio.json}

### Instructions

Produce a portfolio summary:

- One line per project: name, current sprint number, health indicator, blocker
  count.
- Attention flags for any project with blockers or low velocity.
- A single "focus for today" recommendation across all projects.

Keep it concise. No invented data.
````

### onboarding

Go to Step 6 (Onboarding).

---

## Step 5 --- Post-execution

No automatic portfolio sync after intent execution. Only update
`portfolio.json` if a new project was added during onboarding (Step 6).

---

## Step 6 --- Onboarding

Walk the user through project setup, asking one question at a time:

1. **Project name?** --- the human-readable name for this project.
2. **GitHub repo?** --- format `org/repo` (e.g., `acme/web-app`). If the user
   says "none" or "local only", set `repo: null`.
3. **Sprint duration?** --- 1 week, 2 weeks, or 3 weeks.
4. **Your role?** --- Product Owner, Scrum Master, or Developer.

After the user answers all four questions:

1. **Derive the slug** --- from the repo (`org/repo` becomes `org-repo`) or
   from the project name (lowercase, spaces to hyphens) if no repo.
2. **Detect conventions** --- if `repo` is not null, use the `gh` CLI to
   inspect labels, branches, commits, milestones, and project boards. Cache
   results to the conventions object.
3. **Find or create GitHub Project board** --- if `repo` is not null, check
   for an existing board. If none exists, offer to create one (this delegates
   to `/gh-board init`).
4. **Save portfolio entry** --- append the new project to
   `~/.scrum-toolkit/portfolio.json`:

   ```json
   {
     "slug": "<derived-slug>",
     "name": "<project-name>",
     "repo": "<org/repo>" or null,
     "projectNumber": <board-number> or null,
     "userRole": "<role>"
   }
   ```

5. **Save project file** --- create
   `~/.scrum-toolkit/projects/<slug>.json` with detected conventions,
   empty velocity history, and (for no-repo projects) empty `backlog` and
   `currentSprint` fields.
6. **Confirm** --- tell the user their project is set up and suggest
   `/scrum` to see the overview.

---

## No-Repo Handling

When `hasRepo` is false for the selected project:

- **overview / question** --- use local JSON `backlog` and `currentSprint`
  fields instead of GitHub queries. Dispatch to scrum-architect as normal.
- **ceremony / authoring / devops** --- route to the specialist skill as
  usual. Each specialist skill handles no-repo mode internally.
- **portfolio** --- show local state summary for no-repo projects alongside
  GitHub state for repo-connected projects.

$ARGUMENTS
