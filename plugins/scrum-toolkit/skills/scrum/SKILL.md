---
name: scrum
version: "2.1.0"
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

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the fetched project state:

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

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the fetched state and the user's
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
| retro | sprint-retro | `/sprint-retro` |
| review | sprint-review | `/sprint-review` |
| planning, grooming | sprint-plan | `/sprint-plan --sprint` or `/sprint-plan --grooming` |

Example output:

```text
Daily standups are handled by the /standup skill.
Run `/standup` to generate your standup report.
```

### authoring

Dispatch scrum-architect inline. The agent produces the artifact in one
shot; the router does **not** publish to GitHub or run bulk mode. After
the agent returns, surface a follow-up suggestion for the matching
`--gh-*` flag when the user needs publishing or bulk.

Pick the phase by trigger keyword:

| Trigger | Phase | Follow-up suggestion |
| --- | --- | --- |
| story, feature | User Story Authoring (mirrors `/user-story` Step 4) | `/user-story {desc} --gh-issue` (or `--bulk`) |
| epic | Epic Authoring (mirrors `/epic` Step 4) | `/epic {desc} --gh-milestone` |
| milestone | Milestone Definition (mirrors `/milestone` Step 4) | `/milestone {goals} --gh-milestone` |

Dispatch prompt (fill bracketed values; swap the phase block per trigger):

````text
## Phase: {User Story Authoring | Epic Authoring | Milestone Definition}

### Inputs

- **Project:** {name} ({slug})
- **{Story description | Epic description | Goals}:** {remaining $ARGUMENTS}
- **Bootstrap context:** {full project context object from Step 1}

### Reference Knowledge

JIT-read the **Artifacts** section (and **Prioritization** for epic) from
`plugins/scrum-toolkit/references/scrum-knowledge.md` and apply
INVEST / MoSCoW / Fibonacci guidance.

### Instructions

Follow the phase-specific instructions and output format defined in the
matching specialist skill (`/user-story`, `/epic`, or `/milestone`)
Step 4. Router dispatch is **authoring-only**: do NOT publish to GitHub,
create issues, create milestones, or enter bulk mode. If the user clearly
wants publishing, stop and tell them to re-run the specialist skill with
the appropriate `--gh-*` flag.
````

After display, print the follow-up suggestion on a single line.

### devops

Dispatch scrum-architect inline. For `commit`, `pr`, and `branch` the
agent drafts the artifact and presents it for user approval (same
approval gate as the specialist skills) before executing
`git commit` / `gh pr create` / `git checkout -b`. For `board`, the
router only runs the **status** phase (read-only report) — board init
and sync stay behind `/gh-board`.

Pick the phase by trigger keyword:

| Trigger | Phase | Follow-up suggestion |
| --- | --- | --- |
| commit | Conventional Commit Drafting (mirrors `/commit` Step 4) | --- |
| pr | Pull Request Drafting (mirrors `/pr` Step 5) | `/pr --changelog` for changelog entry |
| branch | Branch Name Generation (mirrors `/branch` Step 5) | --- |
| board | GitHub Board Status Report (mirrors `/gh-board` status) | `/gh-board init` to create a board; `/gh-board sync` to push local artifacts |

Dispatch prompt (fill bracketed values; swap the phase block per trigger):

````text
## Phase: {phase name from table}

### Inputs

- **Project:** {name} ({slug})
- **Bootstrap context:** {full project context object from Step 1,
  including field IDs when `hasRepo` is true}
- **User args:** {remaining $ARGUMENTS after intent keyword removal}

### Reference Knowledge

JIT-read the section(s) the matching specialist skill loads:

- commit: none (git log fallback only)
- pr: none for draft; "Writing Project State" only if the user approves
  and a story ref is present
- branch: **DevOps Conventions** from `scrum-knowledge.md`
- board: **Reading Project State** from `github-api-patterns.md`

### Instructions

Follow the phase-specific instructions and output format from the
matching specialist skill (`/commit`, `/pr`, `/branch`, or `/gh-board`
status). The agent fetches whatever local state it needs (`git status`,
`git diff`, `git log`, `gh` queries) — the router does NOT pre-fetch
board state for devops intents.

Scope guards:

- commit / pr / branch: draft first, obtain user approval, then execute.
- board: **read-only**. Report sprint status only. If the user appears
  to want init or sync, stop and tell them to run `/gh-board init` or
  `/gh-board sync` — creating or mutating a board is out of scope for
  the router.
- If `hasRepo` is false: apply the no-repo fallback from the matching
  specialist skill (local JSON for board; skip GitHub-only steps for pr).
````

After the agent returns, print any follow-up suggestion from the table.

### portfolio

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the fetched multi-project state:

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
5. **Artifact language?** --- what language should story descriptions, roadmaps,
   and other generated artifacts be written in? (e.g., English, Italian).
   Default: English.
6. **Estimation scale?** --- Fibonacci (1, 2, 3, 5, 8, 13) or hours
   (1, 2, 4, 8, 16)?

After the user answers all six questions:

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
     "userRole": "<role>",
     "language": "<language from question 5>",
     "estimationScale": "fibonacci" or "hours"
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
- **ceremony** --- route to the specialist skill as usual. Each specialist
  skill handles no-repo mode internally.
- **authoring / devops** --- dispatch scrum-architect as normal; the agent
  applies the no-repo fallback from the matching specialist skill (local
  JSON for board; skip GitHub-only steps for pr/story/epic/milestone).
- **portfolio** --- show local state summary for no-repo projects alongside
  GitHub state for repo-connected projects.

$ARGUMENTS
