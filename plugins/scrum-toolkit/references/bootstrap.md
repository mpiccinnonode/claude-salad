# Shared Bootstrap Reference

Every scrum-toolkit skill JIT-loads sections from this file and follows the
steps before executing its main logic. Each section is self-contained so
skills can read only what they need via offset/limit.

## Bootstrap Sequence

Run these six steps at the start of every skill invocation.

### Step 1 — Derive the project slug

Derive the slug from the git remote:

```text
slug = git remote get-url origin
       -> extract org/repo
       -> replace "/" with "-"

Example: "https://github.com/acme/web-app.git" -> "acme-web-app"
```

If there is no git remote (the directory is not a repo, or has no `origin`
remote), fall back to the directory name:

```text
slug = basename of the current working directory
```

### Step 2 — Read the portfolio file

Read `~/.scrum-toolkit/portfolio.json`.

- If the file is **missing**, trigger the onboarding flow, then re-read.
- Find the project entry whose `slug` matches the derived slug.
- If **no entry matches**, ask the user whether this is a new project and
  run onboarding if they confirm.

### Step 3 — Read the project file

Read `~/.scrum-toolkit/projects/<slug>.json`.

- If the file is **missing**, trigger convention detection and create the
  file from the results.
- Extract: `conventions`, `velocityHistory`, `teamSize`,
  `sprintDurationDays`.

### Step 4 — Resolve the user role

Use the **project-level** `userRole` if it is set in the portfolio entry.
Otherwise fall back to `defaults.userRole` from `portfolio.json`.

Valid roles: `developer`, `scrum-master`, `product-owner`.

### Step 5 — GitHub-connected projects (repo is not null)

When the project entry has a `repo` value:

1. Resolve the GitHub Project board ID from `projectNumber`.
2. Resolve custom field IDs — Story Points, Priority, Status, Sprint.
   - Use cached IDs if they are already available in the session.
   - Otherwise query via GraphQL (see
     `references/github-api-patterns.md` "Field ID Resolution").
3. Identify the current sprint iteration.

### Step 6 — No-repo projects (repo is null)

When the project entry has `repo: null`:

- Skills operate against the local JSON fallback schema (see
  [No-Repo Fallback](#no-repo-fallback--extended-local-schema) below).
- **Skip all GitHub API steps** — no GraphQL queries, no board lookups.

## Bootstrap Output

The bootstrap sequence produces a **project context object** that every
skill receives. It contains:

```text
slug              — derived project identifier
name              — human-readable project name
repo              — "org/repo-name" or null
projectNumber     — GitHub Projects board number (null when no repo)
userRole          — resolved role with fallback (developer | scrum-master | product-owner)
language          — artifact language (e.g., "English", "Italian"); falls back to defaults.language
estimationScale   — "fibonacci" or "hours"; falls back to defaults.estimationScale
conventions       — branch, commit, label conventions from local JSON
velocityHistory   — array of past sprint metrics from local JSON
hasRepo           — boolean that controls GitHub vs. local-fallback path

GitHub field IDs (present only when hasRepo is true):
  projectId            — GitHub Projects v2 node ID
  storyPointsFieldId   — custom field node ID
  priorityFieldId      — custom field node ID
  statusFieldId        — custom field node ID
  sprintFieldId        — custom field node ID
  currentIterationId   — node ID of the active sprint iteration
```

## Local JSON Schemas

### portfolio.json

Located at `~/.scrum-toolkit/portfolio.json`. This is the top-level
registry of all projects the user works with.

```json
{
  "defaults": {
    "sprintDurationDays": 14,
    "estimationScale": "fibonacci",
    "userRole": "product-owner",
    "language": "English"
  },
  "projects": [
    {
      "slug": "org-repo-name",
      "name": "My App",
      "repo": "org/repo-name",
      "projectNumber": 3,
      "userRole": "developer",
      "language": "Italian",
      "estimationScale": "hours"
    }
  ]
}
```

Field notes:

- `defaults.userRole` — one of `developer`, `scrum-master`, or
  `product-owner`.
- `projects[].userRole` — optional; when absent the skill falls back to
  `defaults.userRole`.
- `projects[].language` — optional; when absent falls back to
  `defaults.language` (default: `"English"`). Controls the language of
  generated artifacts (stories, roadmaps, retros).
- `projects[].estimationScale` — optional; when absent falls back to
  `defaults.estimationScale`. Valid values: `"fibonacci"` or `"hours"`.
- `sprintDurationDays` — integer; common values are 7, 14, or 21.

### projects/\<slug>.json

Located at `~/.scrum-toolkit/projects/<slug>.json`. One file per project,
holding conventions and velocity data.

```json
{
  "teamSize": 4,
  "sprintDurationDays": 14,
  "estimationScale": "fibonacci",
  "conventions": {
    "branches": "feature/<id>-description",
    "commits": "conventional",
    "labels": [
      "priority:must",
      "priority:should",
      "priority:could",
      "priority:wont"
    ],
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

Field notes:

- `conventions.detectedAt` — ISO date of the last auto-detection run.
- `conventions.autoRefresh` — when `true`, the model suggests
  re-detection if `detectedAt` is older than 30 days.
- `velocityHistory` — append-only array; written by the sprint-review
  skill at the end of each sprint.

## No-Repo Fallback — Extended Local Schema

When `repo` is `null`, the project file at
`~/.scrum-toolkit/projects/<slug>.json` gains two additional top-level
fields:

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

These fields **only exist when `repo` is null**. They are deleted when the
user migrates the project to a GitHub repository.

## Graceful Degradation

When a GitHub API call fails during any skill execution:

1. **Log the error** — show the user the specific error message and which
   API call failed.
2. **Ask for manual input** — prompt the user to provide the data that the
   API call would have returned.
3. **Continue with user-provided data** — never block the skill entirely
   because of an API failure.
4. **Do NOT retry automatically in a loop** — a single failed call should
   not trigger repeated retries. Surface the problem and let the user
   decide.

## Convention Auto-Detection

Runs once during onboarding. Results are cached to
`~/.scrum-toolkit/projects/<slug>.json` under the `conventions` key.

### Detection steps

1. **Labels** — scan existing labels for taxonomy, naming scheme, and
   color groupings.
2. **Milestones** — identify naming pattern and cadence from existing
   milestones.
3. **Branches** — infer naming pattern from recent branches.
4. **Commits** — determine message style from recent commit history.
5. **Project boards** — inspect existing column structure and custom
   fields.
6. **Issue templates** — check for existing templates in `.github/`.

### Re-detection triggers

- The user explicitly requests it via `/scrum detect-conventions`.
- The model suggests re-detection when `detectedAt` is older than 30
  days.
- Observed patterns during normal operation conflict with cached
  conventions.
