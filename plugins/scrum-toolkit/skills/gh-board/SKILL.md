---
name: gh-board
version: "1.0.0"
description: Use when a user wants to initialize, sync, or check the status of a GitHub project board used for sprint tracking and backlog management.
argument-hint: "<init|sync|status> [--project=<name>] [--sprint=<N>]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating GitHub project board management for SCRUM workflows.
Parse the user's arguments, load relevant reference material, then dispatch
the scrum-architect agent with subcommand-specific context.

---

## Step 1 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **subcommand** (required) --- one of `init`, `sync`, or `status`
- **--project=\<name>** (optional) --- name of the GitHub Project board to target.
  If omitted, auto-detect from the repository.
- **--sprint=\<N>** (optional) --- sprint/iteration number to scope operations to.
  If omitted, use the current or most recent sprint.

If no subcommand is provided, ask the user which operation they want
(`init`, `sync`, or `status`) before proceeding.

---

## Step 2 --- JIT-Read Reference Material

Use the Read tool to load the **GitHub Mapping** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`.

This section defines how SCRUM artifacts map to GitHub primitives (milestones,
labels, project board iterations, etc.) and is required context for all three
subcommands.

Keep the loaded reference in context for the agent dispatch in Step 3.

---

## Step 3 --- Dispatch to scrum-architect

Use the Agent tool to launch the **scrum-architect** agent. Include the loaded
reference material and the subcommand-specific prompt from the appropriate
section below.

### GitHub API Guidance (include in every dispatch)

Include the following API notes in every agent dispatch so the agent uses the
correct tools and patterns:

````text
## GitHub API Notes

GitHub Projects v2 uses GraphQL. Use `gh api graphql` for all project board
operations. Use the `gh` CLI for issues, labels, and milestones.

### Key patterns

- **Detect org vs user context** before running queries. Run
  `gh repo view --json owner` to determine if the repo belongs to an org or
  a user. Org and user projects have different GraphQL query paths.

- **Project ID lookup:**

  ```bash
  gh project list --owner=<owner> --format=json
  ```

- **Field ID lookups** are required before setting custom field values (story
  points, sprint iteration). Query project fields first:

  ```bash
  gh api graphql -f query='
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes { ... on ProjectV2SingleSelectField { id name options { id name } }
                    ... on ProjectV2IterationField { id name configuration { iterations { id title } } }
                    ... on ProjectV2Field { id name } }
          }
        }
      }
    }
  ' -f projectId="<PROJECT_ID>"
  ```

- **Rate limiting:** batch operations during `sync`. Do not fire individual
  mutations for each item --- group GraphQL mutations where possible.

- **Item operations:** adding an issue to a project board requires the issue
  node ID and the project ID:

  ```bash
  gh api graphql -f query='
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }
  ' -f projectId="<PROJECT_ID>" -f contentId="<ISSUE_NODE_ID>"
  ```

- **Moving items between columns/statuses** requires the Status field ID and
  the target option ID:

  ```bash
  gh api graphql -f query='
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }
  ' -f projectId="<PROJECT_ID>" -f itemId="<ITEM_ID>" \
    -f fieldId="<FIELD_ID>" -f optionId="<OPTION_ID>"
  ```
````

---

### Subcommand: init

Dispatch prompt:

````text
## Phase: GitHub Project Board Initialization

### Inputs

- **Project name:** {--project value, or repo name as default}
- **Owner:** {detected from `gh repo view --json owner`}

### Reference Knowledge

{Paste the GitHub Mapping section content read in Step 2}

{Paste the GitHub API Notes above}

### Instructions

Detect repository conventions first. Inspect existing project boards, labels,
milestones, and issue templates before creating anything.

1. **Check existing boards** --- run `gh project list --owner=<owner> --format=json`
   to see if a project board already exists for this repository.
   - If a matching board exists, report its current structure and ask the user
     if they want to modify it or create a new one.
   - If no board exists, proceed with creation.

2. **Create the project board** using `gh project create --owner=<owner> --title="<name>"`.

3. **Configure board columns/status field** --- set up the Status single-select
   field with SCRUM-appropriate options:
   - Sprint Backlog
   - In Progress
   - In Review
   - Done

4. **Create labels** --- check existing labels first (`gh label list`), then
   create only what is missing:
   - Story point labels: `sp:1`, `sp:2`, `sp:3`, `sp:5`, `sp:8`, `sp:13`
     (use a blue color family)
   - Type labels: `story`, `bug`, `spike`, `epic`
     (use a green color family for story/epic, red for bug, yellow for spike)
   - Priority labels: `must`, `should`, `could`
     (use red for must, orange for should, gray for could)

5. **Create custom fields** on the Projects v2 board:
   - **Sprint** --- iteration field for sprint tracking
   - **Story Points** --- number field for velocity calculation

6. **Report what was created** --- list all new resources (board, labels, fields)
   and propose any additional structure the team might want (e.g., milestones
   for epics, issue templates, automation rules).
````

---

### Subcommand: sync

Dispatch prompt:

````text
## Phase: GitHub Board Sync

### Inputs

- **Project name:** {--project value, or auto-detected}
- **Sprint:** {--sprint value, or "current"}
- **Owner:** {detected from `gh repo view --json owner`}

### Reference Knowledge

{Paste the GitHub Mapping section content read in Step 2}

{Paste the GitHub API Notes above}

### Instructions

Detect repository conventions first. Inspect existing project boards, labels,
milestones, and issues before proposing changes.

1. **Read local SCRUM artifacts** --- check for the following files and read
   them if they exist:
   - `docs/project-roadmap.md` --- full roadmap with epics, stories, sprint plan
   - `docs/sprint-*.md` --- sprint-specific plans
   - `docs/backlog.md` --- standalone backlog if present
   - Any other markdown files in `docs/` that contain user stories or epics

2. **Query GitHub state** --- gather the current state:
   - Open issues: `gh issue list --state=open --json number,title,labels,milestone,assignees`
   - Project board items: query the board via GraphQL for item statuses, field values
   - Milestones: `gh api repos/{owner}/{repo}/milestones`
   - Labels: `gh label list --json name,color`

3. **Compute diff** --- compare local artifacts to GitHub state and identify:
   - **New issues to create** --- stories in docs that have no matching issue
   - **Labels to apply** --- stories with points or priorities not reflected in issue labels
   - **Milestone assignments** --- epics/stories that should be linked to milestones
   - **Board column moves** --- items whose status in docs differs from board status
   - **Missing milestones** --- epics in docs with no corresponding milestone

4. **Present the diff to the user** --- display a summary table:

   | Action | Item | Details |
   | --- | --- | --- |
   | Create issue | "As a user, I want..." | sp:5, must, Epic: Auth |
   | Apply label | #12 | Add `sp:3` |
   | Move column | #8 | Sprint Backlog -> In Progress |
   | Create milestone | "Auth Epic" | 3 stories, 21 points |

   Ask the user to approve, modify, or reject the proposed changes.

5. **Execute approved changes** --- batch operations to stay within rate limits:
   - Create issues in groups, applying labels and milestones in the same call
   - Add new issues to the project board
   - Update board item field values (status, story points, sprint)
   - Report each action as it completes

6. **Summary** --- report what was synced, what was skipped, and any items that
   need manual attention.
````

---

### Subcommand: status

Dispatch prompt:

````text
## Phase: GitHub Board Status Report

### Inputs

- **Project name:** {--project value, or auto-detected}
- **Sprint:** {--sprint value, or "current"}
- **Owner:** {detected from `gh repo view --json owner`}

### Reference Knowledge

{Paste the GitHub Mapping section content read in Step 2}

{Paste the GitHub API Notes above}

### Instructions

Detect repository conventions first. Identify the project board and current
sprint iteration before querying.

1. **Locate the project board** --- find the board by name or auto-detect from
   the repository. Get the project ID and field IDs.

2. **Identify the sprint** --- if `--sprint` was provided, find that iteration.
   Otherwise, find the current active iteration based on date range.

3. **Query board items** --- fetch all items in the target sprint with their:
   - Status (column: Sprint Backlog, In Progress, In Review, Done)
   - Story points value
   - Assignees
   - Labels
   - Linked issues (number, title, state)

4. **Compute metrics:**
   - **Items by status** --- count and list items in each column
   - **Velocity** --- total story points in Done for this sprint
   - **Remaining** --- total story points NOT in Done
   - **Burndown** --- points remaining vs. sprint duration (if iteration dates are available)
   - **Blockers** --- items labeled `blocker` or flagged as blocked

5. **Format the report** for standup or stakeholder consumption:

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

## Step 4 --- Self-Verification

After the agent completes, verify the output before presenting it to the user:

- [ ] The correct subcommand was executed (`init`, `sync`, or `status`).
- [ ] Repository conventions were detected before any creation or modification.
- [ ] For `init`: existing resources were checked before creating duplicates.
- [ ] For `init`: all label categories were created (story points, types, priorities).
- [ ] For `sync`: a diff was presented and user approval was obtained before executing changes.
- [ ] For `sync`: operations were batched to respect rate limits.
- [ ] For `status`: metrics include velocity, remaining points, and blockers.
- [ ] For `status`: output is formatted for standup/stakeholder consumption.
- [ ] All `gh api graphql` calls use correct field and option IDs (not hardcoded).
- [ ] Error handling: API failures are reported clearly, not silently swallowed.
- [ ] All output follows markdown formatting conventions.

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
