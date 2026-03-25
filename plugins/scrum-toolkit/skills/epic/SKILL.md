---
name: epic
version: "1.0.0"
description: Use when a user needs to create an epic with feature breakdown and story stubs, optionally publishing to GitHub as a milestone with issues. Trigger for "create an epic", "define an epic for X", "break this into features and stories", "I need an epic for Y", or any request to group related stories into a larger unit of work.
argument-hint: "<description> [--roadmap=<path>] [--gh-milestone]"
allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
---

You are orchestrating epic creation with feature breakdown and story stubs.
Bootstrap the project context, parse the user's arguments, load relevant
reference material, then dispatch the scrum-architect agent with
phase-specific context.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence. If bootstrap triggers onboarding, complete onboarding
before proceeding. Produce the **project context object** for subsequent steps.

---

## Step 2 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **description** (required) --- the plain-text epic description (everything
  that is not a flag)
- **--roadmap=\<path>** (optional) --- path to a roadmap file for context on
  existing epics, sprints, and priorities
- **--gh-milestone** (optional flag) --- publish the epic as a GitHub milestone
  and create issues for each story stub

If no description is provided, ask the user for one before proceeding.

---

## Step 3 --- JIT-Read Reference Material

Read the following sections from `plugins/scrum-toolkit/references/scrum-knowledge.md`
(relative to the plugin root):

- **Artifacts** section --- for epic structure, user story format, acceptance
  criteria format, and estimation scales
- **Prioritization** section --- for MoSCoW framework used in story-level
  prioritization

If the `--gh-milestone` flag is present AND `hasRepo` is true, also read:

- **GitHub Mapping** section --- for milestone conventions, issue templates,
  label taxonomy, and project board workflow

If `--gh-milestone` is present AND `hasRepo` is true, also JIT-read the
**"Milestone Operations"**, **"Issue Operations"**, and **"Writing Project
State"** sections from `plugins/scrum-toolkit/references/github-api-patterns.md`.
These provide REST and GraphQL templates needed for milestone creation, issue
creation, and setting custom fields on project board items.

If `--roadmap` is provided, read the roadmap file at the given path to gather
context on existing epics, sprint boundaries, and strategic priorities.

---

## Step 4 --- Dispatch to scrum-architect

Create a task with subject `Generate epic content` and mark it `in_progress` immediately using TaskCreate and TaskUpdate.

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to dispatch the **scrum-architect** agent with the
following prompt (fill in the bracketed values from Steps 1-3):

````text
## Phase: Epic Authoring

### Inputs

- **Epic description:** [description from arguments]
- **Roadmap context:** [summary of roadmap content if provided, otherwise "none"]
- **Bootstrap context:** [the full project context object from Step 1]

### Reference Knowledge

[Paste the Artifacts section content read in Step 3]

[Paste the Prioritization section content read in Step 3]

### Instructions

1. Define the epic with a clear title and business objective derived from the
   description.
2. Break the epic into numbered features (logical groupings of related work).
3. For each feature, write 1-3 story stubs in As-a / I-want / So-that format.
4. For each story stub, assign:
   - A MoSCoW priority (Must / Should / Could / Won't)
   - A story point estimate using the Fibonacci scale (1, 2, 3, 5, 8, 13)
5. If roadmap context was provided, align the epic and its features with the
   roadmap's strategic priorities and timeline.

### Output Format

```markdown
## Epic: [Title]

**Business Objective:** [one-paragraph description of the value this epic delivers]

**Success Metrics:** [2-3 measurable outcomes]

**Target Milestone:** [if known from roadmap, otherwise "TBD"]

---

### Feature 1: [Name]

[Brief description of this feature group]

| # | Story | Priority | SP |
|---|-------|----------|----|
| 1.1 | As a [role], I want [capability], So that [benefit] | Must | 5 |
| 1.2 | ... | ... | ... |

### Feature 2: [Name]

...

---

### Summary

| Metric | Value |
|--------|-------|
| Total Features | N |
| Total Stories | N |
| Total Story Points | N |
| Must-have Points | N |
| Should-have Points | N |
| Could-have Points | N |
```
````

Mark the `Generate epic content` task as `completed`.

Display the agent's output to the user.

---

## Step 5 --- GitHub Milestone and Issues (if --gh-milestone)

If the `--gh-milestone` flag was **not** provided, skip to Step 6.

### No-Repo Guard

If `--gh-milestone` is present but `hasRepo` is **false**, warn the user:

> **Warning:** This project is not connected to a GitHub repository.
> The `--gh-milestone` flag requires a linked repo. Skipping GitHub publishing.
> To connect this project, run `/scrum onboard` and configure a repository.

Skip to Step 6 after displaying the warning.

### GitHub Publishing (hasRepo is true)

When `--gh-milestone` is present AND `hasRepo` is true, create the milestone
and issues directly using the bootstrap context and epic output from Step 4.

Create a task with subject `Create GitHub milestone` and mark it `in_progress` immediately using TaskCreate and TaskUpdate.

#### 5a --- Create the milestone

Use `gh api` to create a GitHub milestone:

```text
gh api repos/<OWNER>/<REPO>/milestones -X POST \
  -f title="<Epic Title>" \
  -f description="<Business Objective>"
```

Capture the milestone number from the response.

Mark the `Create GitHub milestone` task as `completed`.

Count the story stubs from the agent output (call this N). Create a task with subject `Create issues (N total)` — replace N with the actual count — and mark it `in_progress` immediately.

#### 5b --- Create issues for each story stub

For each story stub from the epic output, use `gh issue create` with:

- **Title:** a concise summary derived from the story stub
- **Body:** the full As-a / I-want / So-that text with acceptance criteria
  placeholders as checkboxes
- **Labels:** apply `story` type label and a `priority:*` label matching the
  MoSCoW priority (e.g., `priority:must`, `priority:should`, `priority:could`,
  `priority:wont`)
- **Milestone:** assign to the newly created milestone

Check for issue templates in `.github/ISSUE_TEMPLATE/`. If a story template
exists, adapt the issue body to match it.

Capture each issue URL and number from the output. If any `gh issue create`
call fails, continue with the remaining story stubs. Collect all failures and
include them in the Step 6 summary for manual retry.

Prefix each `gh issue create` attempt with `[M/N]` — e.g., `[1/7] Creating issue: As a user...`. For failures, emit `[M/N] FAILED: "story title" — <error>`. Continue the loop on failure and accumulate failures in a local list.

Mark the `Create issues (N total)` task as `completed`.

#### 5c --- Add issues to project board and set custom fields

Create a task with subject `Set project board fields (N items)` — replace N with the issue count from Step 5b — and mark it `in_progress` immediately.

Prefix each field-setting sequence (steps 1-3 per issue) with `[M/N]` — e.g., `[1/7] Setting fields for issue #42`. For failures, emit `[M/N] FAILED: issue #42 — <error>`. Continue on failure and accumulate in the local failures list.

For each created issue:

1. **Resolve the issue node ID** via GraphQL (see github-api-patterns.md
   "Resolve issue node ID").
2. **Add the issue to the project** using `addProjectV2ItemById` mutation
   (see github-api-patterns.md "Add existing issue to project"). Capture the
   returned project item ID.
3. **Set custom fields** on the project board item using the bootstrap field
   IDs and `updateProjectV2ItemFieldValue`:
   - **Story Points** --- set the `storyPointsFieldId` to the numeric point
     value from the story stub estimate.
   - **Priority** --- set the `priorityFieldId` to the option ID matching
     the MoSCoW priority (Must / Should / Could / Won't).
   - **Status** --- set the `statusFieldId` to the option ID for
     "Sprint Backlog" (the default status for new items).

Mark the `Set project board fields (N items)` task as `completed`.

Report the created milestone URL and a table of created issues with their
numbers, URLs, and assigned custom field values to the user.

---

## Step 6 --- Summary

Present a brief summary:

- Epic title and business objective (one-line recap)
- Feature count and total story points
- Whether a GitHub milestone was created (with URL if applicable)
- Number of issues created (if applicable)
- Project board fields set (story points, priority, status) on each issue
  if applicable
- Suggested next steps (e.g., "Refine story stubs into full stories with
  `/user-story`" or "Pull stories into a sprint with `/plan`")
- If any issue creation or field-setting failures were accumulated, append a **Failures** block listing each failure with its `[M/N]` counter and error message, and note which items require manual retry.

---

## Self-Verification

After the agent completes, verify the output before presenting it to the
user:

- [ ] Bootstrap was executed and produced a valid project context object.
- [ ] The epic has a clear title and business objective.
- [ ] Features are logically grouped with 1-3 story stubs each.
- [ ] Every story stub uses As-a / I-want / So-that format.
- [ ] Story point estimates use the Fibonacci scale (1, 2, 3, 5, 8, 13).
- [ ] MoSCoW priorities are assigned to all story stubs.
- [ ] No `sp:N` labels were used anywhere --- story points are set via
  custom fields only.
- [ ] If `--gh-milestone` AND `hasRepo`: milestone was created via
  `gh api`.
- [ ] If `--gh-milestone` AND `hasRepo`: issues were created with `story`
  and `priority:*` labels (no `sp:N` labels).
- [ ] If `--gh-milestone` AND `hasRepo`: each issue was added to the
  project board via `addProjectV2ItemById`.
- [ ] If `--gh-milestone` AND `hasRepo`: Story Points, Priority, and Status
  custom fields were set on each project board item.
- [ ] If `--gh-milestone` AND NOT `hasRepo`: a warning was displayed and
  GitHub publishing was skipped.
- [ ] If `--roadmap`: epic aligns with the roadmap's strategic priorities.
- [ ] All output follows markdown formatting conventions.
- [ ] Phase Tasks were created before each step and completed after.
- [ ] Skill emits `[N/TOTAL]` counters directly in the issue creation and field-setting loops.
- [ ] Loop failures are accumulated and appended to the Step 6 summary.
- [ ] All Tasks were marked completed before the final summary.

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
