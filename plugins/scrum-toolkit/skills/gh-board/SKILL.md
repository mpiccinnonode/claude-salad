---
name: gh-board
version: "1.0.0"
description: "Use when a user wants to initialize, sync, or check the status of a GitHub project board. Manages GitHub Projects v2 custom fields (Story Points, Priority, Status, Sprint) and bridges local planning artifacts to GitHub via a sync workflow."
argument-hint: "<init|sync|status> [--project=<name>] [--sprint=<N>]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating GitHub project board management for SCRUM workflows.
Bootstrap the project context, parse the user's arguments, load relevant
reference material, then dispatch the scrum-architect agent with
subcommand-specific context.

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
   steps; skills will operate against local JSON fallback.

If bootstrap triggers onboarding, complete onboarding before proceeding.

Produce the **project context object** (slug, name, repo, projectNumber,
userRole, conventions, velocityHistory, hasRepo, and GitHub field IDs when
applicable) for use in subsequent steps.

---

## Step 2 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **subcommand** (required) --- one of `init`, `sync`, or `status`
- **--project=\<name>** (optional) --- name of the GitHub Project board to
  target. If omitted, use the project name from the bootstrap context.
- **--sprint=\<N>** (optional) --- sprint/iteration number to scope
  operations to. If omitted, use the current or most recent sprint from the
  bootstrap context.

If no subcommand is provided, ask the user which operation they want
(`init`, `sync`, or `status`) before proceeding.

---

## Step 3 --- JIT-Read Reference Material

Use the Read tool to load sections from
`plugins/scrum-toolkit/references/github-api-patterns.md`.

Load only the sections relevant to the subcommand:

- **init** --- "Writing Project State", "Field ID Resolution"
- **sync** --- "Reading Project State", "Writing Project State",
  "Issue Operations"
- **status** --- "Reading Project State"

Keep the loaded reference in context for the agent dispatch in Step 4.

---

## Step 4 --- Dispatch to scrum-architect

Use the Agent tool to launch the **scrum-architect** agent. Include the
bootstrap project context, loaded reference material, and the
subcommand-specific prompt from the appropriate section below.

---

### No-Repo Handling

If `hasRepo` is false from the bootstrap context, apply these overrides
before dispatching:

- **init** --- Skip entirely. Report to the user that a GitHub repository
  is required before a project board can be initialized.
- **sync** --- Operate against the local JSON fallback. Read/write
  `backlog` and `currentSprint` fields in
  `~/.scrum-toolkit/projects/<slug>.json` instead of calling GitHub APIs.
- **status** --- Report from the local JSON `backlog` and `currentSprint`
  fields instead of querying GitHub.

---

### Subcommand: init

Dispatch prompt:

````text
## Phase: GitHub Project Board Initialization

### Inputs

- **Project name:** {--project value, or project name from bootstrap context}
- **Owner:** {detected from `gh repo view --json owner`}
- **Bootstrap context:** {the full project context object from Step 1}

### Reference Knowledge

{Paste the loaded API patterns sections from Step 3}

### Instructions

Detect repository conventions first. Inspect existing project boards,
labels, milestones, and issue templates before creating anything.

1. **Check existing boards** --- run `gh project list --owner=<owner> --format=json`
   to see if a project board already exists for this repository.
   - If a matching board exists, report its current structure and ask the
     user if they want to modify it or create a new one.
   - If no board exists, proceed with creation.

2. **Create the project board** using
   `gh project create --owner=<owner> --title="<name>"`.

3. **Create custom fields** on the Projects v2 board:
   - **Status** --- single-select field with options:
     Sprint Backlog, In Progress, In Review, Done
   - **Story Points** --- number field for velocity calculation
   - **Priority** --- single-select field with options:
     Must, Should, Could, Won't
   - **Sprint** --- iteration field for sprint tracking

4. **Create repo labels** --- check existing labels first
   (`gh label list`), then create only what is missing:
   - Priority labels: `priority:must`, `priority:should`,
     `priority:could`, `priority:wont`
     (use red for must, orange for should, gray for could, gray for wont)
   - Type labels: `story`, `bug`, `spike`, `epic`
     (use green for story/epic, red for bug, yellow for spike)
   - Status label: `blocked`
     (use red)

   **Do NOT create `sp:N` labels.** Story points are tracked exclusively
   via the custom number field on the project board.

5. **Update local project file** --- after successful creation, update
   `~/.scrum-toolkit/projects/<slug>.json` with the new `projectNumber`
   from the created board. Also update the matching entry in
   `~/.scrum-toolkit/portfolio.json`.

6. **Report what was created** --- list all new resources (board, custom
   fields, labels) and propose any additional structure the team might want
   (e.g., milestones for epics, issue templates, automation rules).
````

---

### Subcommand: sync

Dispatch prompt:

````text
## Phase: GitHub Board Sync

Sync bridges local planning artifacts to GitHub. It reads intermediate
artifacts produced by `plan --full`, computes a diff against current
GitHub state, and applies approved changes.

### Inputs

- **Project name:** {--project value, or project name from bootstrap context}
- **Sprint:** {--sprint value, or "current"}
- **Owner:** {detected from `gh repo view --json owner`}
- **Bootstrap context:** {the full project context object from Step 1,
  including resolved field IDs: projectId, storyPointsFieldId,
  priorityFieldId, statusFieldId, sprintFieldId, currentIterationId}

### Reference Knowledge

{Paste the loaded API patterns sections from Step 3}

### Instructions

1. **Read local planning artifacts** --- check for the following files and
   read them if they exist:
   - `docs/project-roadmap.md` --- full roadmap with epics, stories, and
     sprint plan
   - `docs/sprint-*.md` --- sprint-specific plans
   These are intermediate artifacts produced by `plan --full`. Extract
   stories, story points, priorities, epic assignments, and sprint
   allocations from them.

2. **Query current GitHub state** via GraphQL --- use the bootstrap field
   IDs (do NOT re-resolve them):
   - Project board items with field values (status, story points, priority,
     sprint iteration)
   - Open issues with labels, milestones, and assignees
   - Existing milestones

3. **Compute diff** --- compare local artifacts to GitHub state and
   identify:
   - **New issues to create** --- stories in docs that have no matching
     GitHub issue
   - **Custom field values to set** --- story points via the number field,
     priority via the single-select field (NOT via labels)
   - **Milestone assignments** --- epics/stories that should be linked to
     milestones
   - **Board item additions** --- issues that exist but are not on the
     project board
   - **Board column moves** --- items whose status in docs differs from
     their board status
   - **Missing milestones** --- epics in docs with no corresponding
     milestone

4. **Present the diff to the user** --- display a summary table:

   | Action | Item | Details |
   | --- | --- | --- |
   | Create issue | "As a user, I want..." | 5 pts, Must, Epic: Auth |
   | Set story points | #12 | 3 pts (via custom field) |
   | Set priority | #12 | Should (via custom field) |
   | Move column | #8 | Sprint Backlog -> In Progress |
   | Create milestone | "Auth Epic" | 3 stories, 21 points |

   Ask the user to approve, modify, or reject the proposed changes.

5. **Execute approved changes** --- use GraphQL mutations from the API
   patterns reference. Batch operations to stay within rate limits:
   - Create issues with type and priority labels, milestone assignments
   - Add new issues to the project board
   - Set custom field values (story points via number field, priority via
     single-select field, status via single-select field, sprint via
     iteration field)
   - Report each action as it completes

6. **Summary** --- report what was synced, what was skipped, and any items
   that need manual attention.
````

---

### Subcommand: status

Dispatch prompt:

````text
## Phase: GitHub Board Status Report

### Inputs

- **Project name:** {--project value, or project name from bootstrap context}
- **Sprint:** {--sprint value, or "current"}
- **Owner:** {detected from `gh repo view --json owner`}
- **Bootstrap context:** {the full project context object from Step 1,
  including resolved field IDs: projectId, storyPointsFieldId,
  priorityFieldId, statusFieldId, sprintFieldId, currentIterationId}

### Reference Knowledge

{Paste the loaded API patterns sections from Step 3}

### Instructions

Use the bootstrap context for all field IDs --- do NOT re-resolve them.

1. **Identify the sprint** --- if `--sprint` was provided, find that
   iteration using the Sprint field's iteration list. Otherwise, use the
   `currentIterationId` from the bootstrap context.

2. **Query board items** --- fetch all items in the target sprint via
   GraphQL using the iteration field to scope results. For each item
   retrieve:
   - Status (from the Status single-select custom field)
   - Story points (from the Story Points number custom field)
   - Priority (from the Priority single-select custom field)
   - Assignees
   - Labels
   - Linked issue (number, title, state)

3. **Compute metrics** from custom field values:
   - **Items by status** --- count and list items in each column
   - **Velocity** --- total story points in Done for this sprint
     (read from the custom number field, not from labels)
   - **Remaining** --- total story points NOT in Done
   - **Burndown** --- points remaining vs. sprint duration (if iteration
     dates are available)
   - **Blockers** --- items labeled `blocked` or flagged as blocked
   - **Velocity trend** --- compare current sprint velocity against
     `velocityHistory` from the bootstrap context

4. **Format the report** for standup or stakeholder consumption:

   ```markdown
   # Sprint {N} Status

   ## Summary
   | Metric | Value |
   | --- | --- |
   | Sprint Goal | {goal from iteration description} |
   | Total Items | {count} |
   | Completed | {done count} ({done points} pts) |
   | In Progress | {count} ({points} pts) |
   | Remaining | {count} ({points} pts) |
   | Velocity (this sprint) | {done points} pts |
   | Avg Velocity (history) | {average from velocityHistory} pts |

   ## Items by Status

   ### Done
   - [x] #{number} {title} ({points} pts) @{assignee}

   ### In Progress
   - [ ] #{number} {title} ({points} pts) @{assignee}

   ### In Review
   - [ ] #{number} {title} ({points} pts) @{assignee}

   ### Sprint Backlog
   - [ ] #{number} {title} ({points} pts)

   ## Blockers
   - #{number} {title} --- {reason}

   ## Notes
   {any observations: overcommitment risk, unpointed items, unassigned work}
   ```

   Display the report inline. Do not write to a file.
````

---

## Step 5 --- Self-Verification

After the agent completes, verify the output before presenting it to the
user:

- [ ] Bootstrap was executed and produced a valid project context object.
- [ ] The correct subcommand was executed (`init`, `sync`, or `status`).
- [ ] Repository conventions were detected before any creation or
  modification.
- [ ] For `init`: existing resources were checked before creating
  duplicates.
- [ ] For `init`: custom fields were created (Status, Story Points,
  Priority, Sprint) --- NO `sp:N` labels were created.
- [ ] For `init`: repo labels include priority labels (`priority:must`,
  etc.) and type labels --- NOT story-point labels.
- [ ] For `sync`: local planning artifacts were read before querying
  GitHub.
- [ ] For `sync`: a diff was presented and user approval was obtained
  before executing changes.
- [ ] For `sync`: story points and priority were set via custom fields, not
  via labels.
- [ ] For `sync`: operations were batched to respect rate limits.
- [ ] For `status`: metrics include velocity calculated from custom field
  values, not from labels.
- [ ] For `status`: velocity trend is included when history is available.
- [ ] For `status`: output is formatted for standup/stakeholder
  consumption.
- [ ] All `gh api graphql` calls use field IDs from the bootstrap context
  (not hardcoded, not re-resolved).
- [ ] No-repo projects: GitHub API calls were skipped; local JSON fallback
  was used instead.
- [ ] Error handling: API failures are reported clearly, not silently
  swallowed.
- [ ] All output follows markdown formatting conventions.

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
