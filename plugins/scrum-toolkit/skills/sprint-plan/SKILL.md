---
name: sprint-plan
version: "2.2.0"
description: Use when a user needs sprint planning, backlog grooming, or a full SCRUM roadmap from a project idea or requirements. Trigger for "plan next sprint", "groom the backlog", "estimate our stories", "create a roadmap", "break this into sprints", "what goes into sprint N?", or any request to organize or prioritize project work.
argument-hint: "[--grooming|--sprint|--full|--bulk-import] [backlog or project context]"
allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
---

You are orchestrating SCRUM planning. Bootstrap the project context, parse the
user's arguments, load relevant reference material, then dispatch the
scrum-architect agent with phase-specific context.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence. If bootstrap triggers onboarding, complete onboarding
before proceeding. Produce the **project context object** for subsequent steps.

---

## Step 2 --- Parse Arguments

Read `$ARGUMENTS` and determine the mode:

| Flag | Mode | Description |
| --- | --- | --- |
| `--full` | Full Roadmap | Complete 5-phase SCRUM roadmap (default) |
| `--sprint` | Sprint Planning | Sprint goal, story selection, capacity planning |
| `--grooming` | Backlog Grooming | Backlog prioritization, story refinement, estimation |
| *(no flag)* | Full Roadmap | Same as `--full` |
| `--bulk-import` | Bulk Import | Parse a structured backlog document (markdown table or JSON array) and publish all items to GitHub as issues, adding each to the project board |

Everything after the flag is the **project context** (idea description, path to
a requirements doc, or backlog reference). If no context is provided, ask the
user before proceeding.

For `--bulk-import` mode, everything after the flag is treated as a **file
path** to the input document. If the path is missing or the file does not
exist, ask the user for a valid path before proceeding. (This overrides the
"if no context is provided" guard above — for `--bulk-import`, the file path
is the required context.) After determining the mode, jump to the appropriate
step:

- `--bulk-import` → after Step 3, jump to the **Mode: Bulk Import** section
  (skip the scrum-architect dispatch in Step 4)

---

## Step 3 --- JIT-Read Reference Material

Use the Read tool to load sections from the SCRUM reference file at
`plugins/scrum-toolkit/references/scrum-knowledge.md`. Load only what the
selected mode requires:

| Mode | Sections to read |
| --- | --- |
| Full Roadmap | Ceremonies, Artifacts, Prioritization |
| Sprint Planning | Ceremonies (Sprint Planning entry), Artifacts (Sprint Backlog, Definition of Done) |
| Backlog Grooming | Artifacts (Product Backlog, User Story Format, Estimation Scales), Prioritization |
| Bulk Import | `"Reading Project State"` and `"Writing Project State"` sections from `github-api-patterns.md`; the `"Issue Operations"` section from the same file |

Additionally, for `--sprint` and `--grooming` modes, load the **"Reading
Project State"** section from
`plugins/scrum-toolkit/references/github-api-patterns.md`. This provides
GraphQL query templates needed to fetch sprint items and backlog from GitHub.

For `--bulk-import`, also JIT-read the **"GitHub Mapping"** section from
`scrum-knowledge.md` to understand label taxonomy and status field option IDs.

Keep the loaded reference in context for the agent dispatch in Step 4.

---

## Step 4 --- Dispatch to scrum-architect

If the mode is **Full Roadmap**, create a task with subject `Generate full SCRUM roadmap (5 phases)` and mark it `in_progress` immediately using TaskCreate and TaskUpdate.

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent. Include the
bootstrap project context, loaded reference material, and the mode-specific
prompt from the appropriate section below.

---

### No-Repo Handling

If `hasRepo` is false from the bootstrap context, apply these overrides
before dispatching:

- **Full Roadmap** --- works identically (produces the markdown artifact
  regardless of whether a repo exists).
- **Sprint Planning** --- use `currentSprint` and `backlog` from
  `~/.scrum-toolkit/projects/<slug>.json` instead of querying GitHub.
  Velocity history and capacity data come from the same local file.
- **Backlog Grooming** --- use `backlog` from
  `~/.scrum-toolkit/projects/<slug>.json` instead of querying GitHub.
  When re-estimating, update point values in the local JSON directly.

---

### Mode: Full Roadmap (`--full` or default)

Dispatch prompt:

````text
## Phase: Full SCRUM Roadmap

### Inputs

- **User context:** {user's project context from $ARGUMENTS}
- **Bootstrap context:** {the full project context object from Step 1}

### Reference Knowledge

{Paste the loaded SCRUM reference sections from Step 3}

### Instructions

Execute all five phases in order. For each phase, produce the output
described below.

**Phase 1 --- Discovery & Decomposition**

- Define the product vision (1-2 sentence elevator pitch).
- Identify 2-5 user personas with name, role, and primary goal.
- List functional requirements (what the system must do).
- List non-functional requirements (performance, security, scalability).
- State assumptions the plan depends on.
- List open questions that need stakeholder input.

**Phase 2 --- Epic & Feature Mapping**

- Group requirements into epics (large bodies of work).
- Break each epic into features, then into user stories using the
  As-a / I-want / So-that format.
- Write 2-5 acceptance criteria per story using Given / When / Then format.
- Assign MoSCoW priority (Must / Should / Could / Won't) to each story.

**Phase 3 --- Estimation & Dependency Analysis**

- Estimate each story in Fibonacci story points (1, 2, 3, 5, 8, 13).
- Flag stories >= 13 points as candidates for splitting.
- Map dependencies between stories (which must complete before others can
  start).
- Identify technical spikes (unknowns that need investigation before
  estimation).
- List risks with likelihood, impact, and proposed mitigation.

**Phase 4 --- Sprint Planning & Roadmap**

- Recommend a sprint cadence (1 or 2 weeks) with justification.
- Use `sprintDurationDays` and `teamSize` from the bootstrap context when
  available; otherwise state assumptions.
- Reference `velocityHistory` from the bootstrap context to inform
  velocity assumptions.
- Sequence stories into sprints respecting dependencies and velocity.
- Define a Sprint Goal for each sprint.
- Identify release milestones and the MVP boundary.

**Phase 5 --- Ceremonies & Governance**

- Write a Definition of Done checklist for the project.
- Propose a ceremony schedule (planning, standup, review, retro) with
  day/time slots.
- Assign SCRUM roles (PO, SM, Dev Team) --- if unknown, describe the
  responsibilities.
- Recommend metrics to track (velocity, burndown, sprint goal success
  rate).

### Output

This document is an **intermediate artifact**. It will be synced to GitHub
Projects v2 by running `/gh-board sync` as a separate step.

Produce a single markdown document with these sections:

```markdown
# Project Roadmap: {project name}

## Vision
## Personas
## Epics Overview
<!-- table: Epic | Stories | Total Points | MoSCoW | Target Sprint -->

## Detailed Backlog
<!-- for each epic: stories with acceptance criteria, points, priority -->

## Sprint Plan
<!-- table per sprint: Sprint N | Goal | Stories | Points | Cumulative -->

## Release Milestones
<!-- table: Milestone | Sprints | Key Deliverables | Date Estimate -->

## Risks & Mitigations
<!-- table: Risk | Likelihood | Impact | Mitigation -->

## Open Questions

## Team Structure & Ceremonies
<!-- roles, ceremony schedule, metrics -->

## Next Steps
<!-- Always include: Run `/gh-board sync` to push this plan to GitHub -->
```

Write the completed document to `docs/project-roadmap.md`.

After writing, inform the user:
**"Run `/gh-board sync` to push this plan to GitHub."**
````

---

### Mode: Sprint Planning (`--sprint`)

Dispatch prompt:

````text
## Phase: Sprint Planning

### Inputs

- **User context:** {user's project context from $ARGUMENTS}
- **Bootstrap context:** {the full project context object from Step 1,
  including resolved field IDs: projectId, storyPointsFieldId,
  priorityFieldId, statusFieldId, sprintFieldId, currentIterationId}

### Reference Knowledge

{Paste the loaded SCRUM reference sections and GitHub API patterns
"Reading Project State" section from Step 3}

### Instructions

Detect repository conventions first.

#### Fetch Current State

**When `hasRepo` is true:**

1. **Read current sprint items** from GitHub via GraphQL --- use the
   bootstrap field IDs (projectId, sprintFieldId, currentIterationId) to
   query all items assigned to the current sprint iteration. For each item
   retrieve: title, status (from Status custom field), story points (from
   Story Points custom number field), priority (from Priority custom
   single-select field), assignees, and linked issue number.
2. **Read velocity history** from `velocityHistory` in the bootstrap
   context (sourced from `~/.scrum-toolkit/projects/<slug>.json`).
3. **Read the backlog** from GitHub --- query project board items that are
   NOT assigned to any sprint iteration (or are in a future sprint). These
   are candidates for sprint selection.

**When `hasRepo` is false:**

1. Read `currentSprint` and `backlog` from
   `~/.scrum-toolkit/projects/<slug>.json`.
2. Read `velocityHistory` from the same file.

#### Plan the Sprint

1. **Review the backlog** --- use the fetched backlog items (from GitHub
   or local JSON). If a `docs/project-roadmap.md` exists, read it for
   prior planning context.
2. **Set the Sprint Goal** --- propose a clear, outcome-oriented goal for
   the upcoming sprint.
3. **Story selection** --- select stories from the backlog that fit within
   the team's velocity, respecting dependencies. Use story points from
   the custom number field (not labels). Present as a table:
   | Story | Points | Priority | Dependencies |
4. **Capacity planning** --- use `teamSize` and `sprintDurationDays` from
   the bootstrap context to calculate capacity (members x available days
   x focus factor). If these values are not available, state assumptions.
5. **Sprint commitment** --- summarize total points vs. capacity and flag
   any overcommitment risk. Compare against average velocity from
   `velocityHistory`.

Output the sprint plan inline (do not write to a file). Use markdown
tables for structured data.
````

---

### Mode: Backlog Grooming (`--grooming`)

Dispatch prompt:

````text
## Phase: Backlog Grooming

### Inputs

- **User context:** {user's project context from $ARGUMENTS}
- **Bootstrap context:** {the full project context object from Step 1,
  including resolved field IDs: projectId, storyPointsFieldId,
  priorityFieldId, statusFieldId, sprintFieldId, currentIterationId}

### Reference Knowledge

{Paste the loaded SCRUM reference sections and GitHub API patterns
"Reading Project State" section from Step 3}

### Instructions

Detect repository conventions first.

#### Fetch Current Backlog

**When `hasRepo` is true:**

1. **Read backlog items** from GitHub via GraphQL --- use the bootstrap
   field IDs (projectId) to query all project board items. For each item
   retrieve: title, status (from Status custom field), story points (from
   Story Points custom number field), priority (from Priority custom
   single-select field), sprint assignment, and linked issue number.
2. Focus on items that are in the backlog (not yet in an active sprint or
   done).

**When `hasRepo` is false:**

1. Read `backlog` from `~/.scrum-toolkit/projects/<slug>.json`.

#### Groom the Backlog

1. **Backlog review** --- use the fetched backlog items (from GitHub or
   local JSON). If a `docs/project-roadmap.md` exists, read it for prior
   context.
2. **Story refinement** --- for each story that lacks detail:
   - Rewrite in As-a / I-want / So-that format if not already.
   - Add or improve acceptance criteria (Given / When / Then).
   - Flag stories that are too large (>= 13 points) and suggest splits.
3. **Estimation** --- assign or re-estimate story points using Fibonacci
   scale. Explain reasoning for any estimate changes. Note that updated
   point values will be pushed to the GitHub board via `/gh-board sync`
   or can be set directly via the GitHub API using the Story Points
   custom number field.
4. **Prioritization** --- apply MoSCoW or Value-vs-Effort to reorder the
   backlog. Use the Priority custom single-select field (not labels).
   Present a prioritized backlog table:
   | Rank | Story | Points | Priority | Status |
5. **Grooming notes** --- list decisions made, stories deferred, and open
   questions for the PO.

Output the grooming results inline (do not write to a file). Use markdown
tables for structured data.
````

---

### Mode: Bulk Import (`--bulk-import`)

This section runs when `--bulk-import` is set. It does **not** dispatch the
scrum-architect agent — it mechanically imports a structured document.

#### No-Repo Guard

If `hasRepo` is **false**, warn the user:

> **Warning:** `--bulk-import` requires a GitHub repository connection.
> Run `/scrum onboard` to configure one, then retry.

Stop execution after the warning.

#### Step A --- Parse the Input Document

Read the file at the path provided after `--bulk-import`.

**JSON array format** — file starts with `[`:

```json
[
  { "title": "As a user, I want login", "points": 3, "priority": "Must" },
  { "title": "As a user, I want logout", "points": 1, "priority": "Should" }
]
```

Required fields per item: `title` (string). Optional: `points` (integer,
Fibonacci), `priority` (Must/Should/Could/Won't), `epic` (milestone name).
Default `points` to `0` if absent. Default `priority` to `"Should"` if absent.

**Markdown table format** — file contains a markdown table with a header row:

```markdown
| Title | Points | Priority | Epic |
|-------|--------|----------|------|
| As a user, I want login | 3 | Must | Authentication |
| As a user, I want logout | 1 | Should | Authentication |
```

Required column: `Title`. Optional columns: `Points`, `Priority`, `Epic`
(case-insensitive header matching). Apply the same defaults as JSON.

If the file cannot be parsed in either format, report the error and stop.

Record:

- **items** — ordered list of parsed objects (title, points, priority, epic)
- **total** — count of items

#### Step B --- GitHub Publishing Loop

Create a task with subject `Bulk import: create issues (TOTAL total)` —
replace TOTAL with the count from Step A — and mark it `in_progress`
immediately using TaskCreate and TaskUpdate.

For each item `i` (1-indexed) in `items`:

Emit before starting:

```text
[i/TOTAL] Creating issue: <title preview (60 chars)>
```

##### b1 — Create the issue

Use `gh issue create` with:

- **Title:** `items[i].title`
- **Body:**

```markdown
## User Story

{items[i].title}

### Acceptance Criteria

- [ ] (to be refined)

### Priority

**MoSCoW:** {items[i].priority}

### Estimate

**Story Points:** {items[i].points}
```

- **Labels:** `story` and `priority:<lowercase-priority>` (e.g.,
  `priority:must`, `priority:should`, `priority:could`, `priority:wont`)
- **Milestone:** if `items[i].epic` is set and a matching GitHub milestone
  exists (check with `gh api repos/<OWNER>/<REPO>/milestones`), assign it

On success, capture the issue URL and number. Emit:

```text
[i/TOTAL] Created issue #<number>: <url>
```

On failure, emit:

```text
[i/TOTAL] FAILED: "<title preview>" — <error>
```

Append to `failures`. Continue the loop.

##### b2 — Add to project board

For each successfully created issue:

1. Resolve the issue node ID via GraphQL (see github-api-patterns.md
   "Resolve issue node ID").
2. Add the issue to the project using `addProjectV2ItemById` mutation.
   Capture the returned project item ID.

On failure, emit:

```text
[i/TOTAL] BOARD FAILED: issue #<number> — <error>
```

Append to `failures`. Continue the loop.

##### b3 — Set custom fields

Using the bootstrap field IDs and the returned project item ID:

1. **Story Points** — `updateProjectV2ItemFieldValue` with
   `storyPointsFieldId` and `items[i].points` (integer).
2. **Priority** — `updateProjectV2ItemFieldValue` with `priorityFieldId`
   and the option ID matching `items[i].priority`.
3. **Status** — `updateProjectV2ItemFieldValue` with `statusFieldId` and
   the option ID for "Sprint Backlog".

On any field-setting failure, emit:

```text
[i/TOTAL] FIELD FAILED: issue #<number> — <field name>: <error>
```

Append to `failures`. Continue the loop.

---

After the loop, mark the `Bulk import: create issues (TOTAL total)` task
as `completed`.

#### Step C --- Summary

```markdown
## Bulk Import — Complete

- **Issues created:** [success count] / [TOTAL]
- **Project board items added:** [board-add count]
- **Fields set:** [field-set count]

### Created Issues

| # | Title | Points | Priority | URL |
|---|-------|--------|----------|-----|
| [i/TOTAL] | ... | ... | ... | ... |

### Failures

[List failures, or "None."]

**Next steps:** Run `/sprint-plan --sprint` to pull these items into the
current sprint.
```

---

If the mode was **Full Roadmap**, mark the `Generate full SCRUM roadmap (5 phases)` task as `completed` immediately after the agent dispatch returns.

## Step 5 --- Self-Verification

After the agent completes, verify the output before presenting it to the
user:

- [ ] Bootstrap was executed and produced a valid project context object.
- [ ] Every story uses As-a / I-want / So-that format.
- [ ] Every story has 2-5 acceptance criteria.
- [ ] Story point estimates use Fibonacci scale (1, 2, 3, 5, 8, 13).
- [ ] No story exceeds 13 points without a split recommendation.
- [ ] Sprint plans respect stated velocity and dependencies.
- [ ] MoSCoW priorities are assigned to all stories.
- [ ] Open questions are surfaced, not silently assumed away.
- [ ] For `--full` mode: `docs/project-roadmap.md` was written
  successfully.
- [ ] For `--full` mode: output mentions `/gh-board sync` as the next
  step to push the plan to GitHub.
- [ ] For `--sprint` mode: when `hasRepo` is true, sprint items and
  backlog were read from GitHub via GraphQL using bootstrap field IDs.
- [ ] For `--sprint` mode: when `hasRepo` is false, data was read from
  local JSON (`currentSprint`, `backlog`).
- [ ] For `--sprint`/`--grooming` mode: output is inline, not written to
  a file.
- [ ] For `--grooming` mode: when `hasRepo` is true, backlog items were
  read from GitHub via GraphQL using bootstrap field IDs.
- [ ] For `--grooming` mode: when `hasRepo` is false, data was read from
  local JSON (`backlog`).
- [ ] Story points and priority use custom fields, not labels.
- [ ] No-repo projects: GitHub API calls were skipped; local JSON
  fallback was used instead.
- [ ] All output follows markdown formatting conventions.
- [ ] For `--full` mode: wrapping Task was created before the agent dispatch.
- [ ] For `--full` mode: wrapping Task was marked completed immediately after the agent returns.
- [ ] For `--bulk-import` mode: input document was parsed (JSON array or
  markdown table).
- [ ] For `--bulk-import` mode: if the file cannot be parsed in either format,
  an error was reported and execution stopped before the publishing loop.
- [ ] For `--bulk-import` mode: only runs when `hasRepo` is true; a warning
  was shown and execution stopped when `hasRepo` is false.
- [ ] For `--bulk-import` mode: each item has a created GitHub issue with
  `story` and `priority:*` labels.
- [ ] For `--bulk-import` mode: each issue was added to the project board and
  Status was set to "Sprint Backlog".
- [ ] For `--bulk-import` mode: b2 board-add failures emit `BOARD FAILED` and
  are accumulated; the loop did not abort.
- [ ] For `--bulk-import` mode: Story Points and Priority custom fields were
  set from the source document values (not inferred).
- [ ] For `--bulk-import` mode: `[i/TOTAL]` progress was emitted per item.
- [ ] For `--bulk-import` mode: failures were accumulated; loop did not abort
  on first failure.
- [ ] For `--bulk-import` mode: the wrapping Task was created and completed.
- [ ] For all other modes: existing behaviour is unchanged (no regression).

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
