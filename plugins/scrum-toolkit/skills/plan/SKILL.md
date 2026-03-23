---
name: plan
version: "1.0.0"
description: Use when a user needs sprint planning, backlog grooming, or a full SCRUM roadmap from a project idea or requirements document.
argument-hint: "[--grooming|--sprint|--full] [backlog or project context]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating SCRUM planning. Bootstrap the project context, parse the
user's arguments, load relevant reference material, then dispatch the
scrum-architect agent with phase-specific context.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence:

1. **Derive the project slug** from the git remote (or fall back to the
   directory name).
2. **Read `~/.scrum-toolkit/portfolio.json`** --- find the matching project
   entry. If the file or entry is missing, trigger onboarding first.
3. **Read `~/.scrum-toolkit/projects/<slug>.json`** --- extract conventions,
   velocity history, team size, and sprint duration.
4. **Resolve the user role** --- use the project-level `userRole` if set,
   otherwise fall back to `defaults.userRole` from `portfolio.json`.
5. **Resolve GitHub field IDs** (when `hasRepo` is true) --- resolve the
   project board ID from `projectNumber`, then query custom field IDs for
   Story Points, Priority, Status, and Sprint. Identify the current sprint
   iteration.
6. **No-repo projects** (when `repo` is null) --- skip all GitHub API
   steps; the skill will operate against local JSON fallback.

If bootstrap triggers onboarding, complete onboarding before proceeding.

Produce the **project context object** (slug, name, repo, projectNumber,
userRole, conventions, velocityHistory, hasRepo, and GitHub field IDs when
applicable) for use in subsequent steps.

---

## Step 2 --- Parse Arguments

Read `$ARGUMENTS` and determine the mode:

| Flag | Mode | Description |
| --- | --- | --- |
| `--full` | Full Roadmap | Complete 5-phase SCRUM roadmap (default) |
| `--sprint` | Sprint Planning | Sprint goal, story selection, capacity planning |
| `--grooming` | Backlog Grooming | Backlog prioritization, story refinement, estimation |
| *(no flag)* | Full Roadmap | Same as `--full` |

Everything after the flag is the **project context** (idea description, path to
a requirements doc, or backlog reference). If no context is provided, ask the
user before proceeding.

---

## Step 3 --- JIT-Read Reference Material

Use the Read tool to load sections from the SCRUM reference file at
`plugins/scrum-toolkit/references/scrum-knowledge.md`. Load only what the
selected mode requires:

| Mode | Sections to read |
| --- | --- |
| Full Roadmap | Ceremonies, Artifacts, Prioritization (full file) |
| Sprint Planning | Ceremonies (Sprint Planning entry), Artifacts (Sprint Backlog, Definition of Done) |
| Backlog Grooming | Artifacts (Product Backlog, User Story Format, Estimation Scales), Prioritization |

Additionally, for `--sprint` and `--grooming` modes, load the **"Reading
Project State"** section from
`plugins/scrum-toolkit/references/github-api-patterns.md`. This provides
GraphQL query templates needed to fetch sprint items and backlog from GitHub.

Keep the loaded reference in context for the agent dispatch in Step 4.

---

## Step 4 --- Dispatch to scrum-architect

Use the Agent tool to launch the **scrum-architect** agent. Include the
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

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
