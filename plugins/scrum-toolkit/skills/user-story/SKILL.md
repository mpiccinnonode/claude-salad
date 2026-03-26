---
name: user-story
version: "1.0.0"
description: Use when a user needs to create or author a user story with acceptance criteria, optionally publishing it as a GitHub issue. Trigger for "write a user story", "create a story", "add a story for X", "story with acceptance criteria", or whenever the user describes a feature to implement and wants it captured in story format.
argument-hint: "<description> [--epic=<ref>] [--roadmap=<path>] [--gh-issue] [--bulk]"
allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
---

You are orchestrating user story creation. Bootstrap the project context,
parse the user's arguments, load relevant reference material, then dispatch
the scrum-architect agent with phase-specific context.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence. If bootstrap triggers onboarding, complete onboarding
before proceeding. Produce the **project context object** for subsequent steps.

---

## Step 2 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **description** (required) --- the plain-text story description (everything
  that is not a flag)
- **--epic=\<ref>** (optional) --- reference to a parent epic (name, number,
  or file path)
- **--roadmap=\<path>** (optional) --- path to a roadmap file for sprint/epic
  context
- **--gh-issue** (optional flag) --- publish the story as a GitHub issue after
  authoring
- **--bulk** (optional flag) --- bulk mode: the input is treated as either a
  newline-separated list of story descriptions (plain text) or a JSON array of
  strings (e.g., `["desc1", "desc2"]`). Each item produces one fully-formed
  story. If `--bulk` is present, continue to **Step 2b** after parsing; skip
  the "If no description is provided" guard (an empty list will be caught in
  Step 2b).

If no description is provided and `--bulk` was not detected, ask the user for one before proceeding.

---

## Step 2b --- Parse Bulk Input (only when --bulk)

If `--bulk` was **not** detected in Step 2, skip to Step 3.

Determine the input format from the `$ARGUMENTS` value (excluding flags):

- **JSON array** — if the input starts with `[`, parse it as a JSON array of
  strings. Each element is one story description.
- **Newline-separated plain text** — otherwise, split on `\n`. Trim blank
  lines. Each non-empty line is one story description.

If the resulting list is empty, ask the user:

> **Bulk mode requires at least one story description.** Provide descriptions
> either as a newline-separated list or a JSON array (e.g.,
> `["Add login", "Add logout"]`).

After parsing, record:

- **items** — ordered list of story description strings
- **total** — count of items (used for `[N/TOTAL]` counters throughout the
  bulk loop)

Then continue to Step 3, which now runs **once** for the whole batch (not
per-item). After Step 3 completes, jump to the **Bulk Mode** section instead
of Step 4.

---

## Step 3 --- JIT-Read Reference Material

Read the following sections from `plugins/scrum-toolkit/references/scrum-knowledge.md`
(relative to the plugin root):

- **Artifacts** section --- for user story format, acceptance criteria format,
  INVEST criteria, and estimation scales

If the `--gh-issue` flag is present AND `hasRepo` is true, also read:

- **GitHub Mapping** section --- for issue template conventions, label
  taxonomy, and project board workflow

If `--gh-issue` is present AND `hasRepo` is true, also JIT-read the
**"Writing Project State"** and **"Issue Operations"** sections from
`plugins/scrum-toolkit/references/github-api-patterns.md`. These provide
GraphQL mutation templates and `gh issue create` patterns needed for
publishing.

If `--roadmap` is provided, read the roadmap file at the given path to gather
epic context, sprint boundaries, and priority information.

---

## Step 4 --- Dispatch to scrum-architect

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to dispatch the **scrum-architect** agent with the
following prompt (fill in the bracketed values from Steps 1-3):

````text
## Phase: User Story Authoring

### Inputs

- **Story description:** [description from arguments]
- **Parent epic:** [epic ref if provided, otherwise "none"]
- **Roadmap context:** [summary of roadmap content if provided, otherwise "none"]
- **Bootstrap context:** [the full project context object from Step 1]

### Reference Knowledge

[Paste the Artifacts section content read in Step 3]

[If --gh-issue AND hasRepo, also paste the GitHub Mapping section content]

### Instructions

1. Write a user story in As-a / I-want / So-that format based on the
   description. Apply INVEST criteria to validate the story is well-formed.
2. Write 2-5 acceptance criteria in Given / When / Then format.
3. Assign a MoSCoW priority (Must / Should / Could / Won't) with a one-line
   rationale.
4. Estimate story points using the Fibonacci scale (1, 2, 3, 5, 8, 13).
   Include a one-line sizing rationale.
5. If a parent epic was provided, note how this story fits within the epic
   scope.

### Output Format

```markdown
## User Story

**As a** [role],
**I want** [capability],
**So that** [benefit].

### Acceptance Criteria

1. **Given** [precondition], **When** [action], **Then** [expected result].
2. ...

### Priority

**MoSCoW:** [Must/Should/Could/Won't] --- [rationale]

### Estimate

**Story Points:** [N] --- [rationale]

### Epic Context

[If applicable, otherwise omit this section]
```
````

Display the agent's output to the user.

---

## Step 5 --- GitHub Issue (if --gh-issue)

If the `--gh-issue` flag was **not** provided, skip to Step 6.

### No-Repo Guard

If `--gh-issue` is present but `hasRepo` is **false**, warn the user:

> **Warning:** This project is not connected to a GitHub repository.
> The `--gh-issue` flag requires a linked repo. Skipping GitHub publishing.
> To connect this project, run `/scrum onboard` and configure a repository.

Skip to Step 6 after displaying the warning.

### GitHub Issue Creation (hasRepo is true)

When `--gh-issue` is present AND `hasRepo` is true, create the GitHub issue
directly using the bootstrap context and story output from Step 4.

#### 5a --- Create the issue

Use `gh issue create` with:

- **Title:** a concise summary derived from the user story
- **Body:** the full user story content (As-a / I-want / So-that, acceptance
  criteria as checkboxes, priority, estimate)
- **Labels:** apply `story` type label and a `priority:*` label matching the
  MoSCoW priority (e.g., `priority:must`, `priority:should`, `priority:could`,
  `priority:wont`)
- **Milestone:** if `--epic` was provided and maps to an existing milestone,
  assign it

Check for issue templates in `.github/ISSUE_TEMPLATE/`. If a story template
exists, adapt the issue body to match it.

Capture the issue URL and number from the output.

#### 5b --- Add to project board

Resolve the issue node ID, then add it to the project board:

```text
1. Get the issue node ID via GraphQL (see github-api-patterns.md
   "Resolve issue node ID").
2. Add the issue to the project using addProjectV2ItemById mutation
   (see github-api-patterns.md "Add existing issue to project").
3. Capture the returned project item ID for field updates.
```

#### 5c --- Set custom fields

Using the bootstrap field IDs and the returned project item ID, set:

1. **Story Points** --- use `updateProjectV2ItemFieldValue` with the
   `storyPointsFieldId` and the numeric point value from the story estimate.
2. **Priority** --- use `updateProjectV2ItemFieldValue` with the
   `priorityFieldId` and the option ID matching the MoSCoW priority
   (Must / Should / Could / Won't).
3. **Status** --- use `updateProjectV2ItemFieldValue` with the
   `statusFieldId` and the option ID for "Sprint Backlog" (the default
   status for new items).

Report the created issue URL to the user.

---

## Step 6 --- Summary

Present a brief summary:

- The user story (title-level recap)
- Priority and estimate
- Whether a GitHub issue was created (with URL if applicable)
- Project board fields set (story points, priority, status) if applicable
- Suggested next steps (e.g., "Add more stories to the epic" or "Pull this
  into a sprint during planning")

---

---

## Bulk Mode (only when --bulk)

This section replaces Steps 4–6 when `--bulk` is active. Run after Steps
1–3 complete.

### Bulk Mode: Story Loop

Create a task with subject `Create stories (TOTAL total)` — replace TOTAL
with the count from Step 2b — and mark it `in_progress` immediately using
TaskCreate and TaskUpdate.

For each item `i` in `items` (1-indexed), execute the following loop body:

#### Loop body for item i of TOTAL

Emit a progress line before starting:

```text
[i/TOTAL] Authoring story: <first 60 chars of description>
```

##### a) Dispatch scrum-architect for story authoring

Use the same agent prompt as Step 4 (single-item mode), substituting:

- `[description from arguments]` → `items[i]`
- `[epic ref if provided, otherwise "none"]` → value from `--epic` flag (same
  for all items in the batch)
- `[roadmap context]` → same roadmap context loaded for all items

Capture the story output (title, As-a/I-want/So-that, AC, priority, estimate).

##### b) GitHub issue (if --gh-issue AND hasRepo)

Follow the same logic as Step 5a–5c (single-item mode) for this story:

1. Create the issue with `gh issue create`.
2. Add to project board via `addProjectV2ItemById`.
3. Set Story Points, Priority, and Status custom fields.

Emit:

```text
[i/TOTAL] Created issue #<number>: <title> — <url>
```

##### On failure (any sub-step a or b)

Emit:

```text
[i/TOTAL] FAILED: "<description preview>" — <error message>
```

Append to a local `failures` list: `{ index: i, description: items[i], error: "<error>" }`.
**Continue the loop** — do not abort the batch.

---

After the loop completes, mark the `Create stories (TOTAL total)` task as
`completed`.

### Bulk Mode: Summary

Present a summary in place of Step 6:

````markdown
## Bulk Story Creation — Complete

- **Stories authored:** [success count] / [TOTAL]
- **GitHub issues created:** [issue count] (if --gh-issue was set)
- **Project board fields set:** [field-set count] (if --gh-issue AND hasRepo)

### Created Issues

| # | Title | Points | Priority | URL |
|---|-------|--------|----------|-----|
| [i/TOTAL] | ... | ... | ... | ... |

### Failures

[If any failures, list them here. Otherwise: "None."]

| # | Description Preview | Error |
|---|---------------------|-------|
| [i/TOTAL] | ... | ... |

**Next steps:** Pull stories into a sprint with `/sprint-plan --sprint`.
````

---

## Self-Verification

After the agent completes, verify the output before presenting it to the
user:

- [ ] Bootstrap was executed and produced a valid project context object.
- [ ] The story uses As-a / I-want / So-that format.
- [ ] The story has 2-5 acceptance criteria in Given / When / Then format.
- [ ] Story point estimate uses the Fibonacci scale (1, 2, 3, 5, 8, 13).
- [ ] MoSCoW priority is assigned with rationale.
- [ ] INVEST criteria were applied to validate the story.
- [ ] No `sp:N` labels were used anywhere --- story points are set via
  custom fields only.
- [ ] If `--gh-issue` AND `hasRepo`: issue was created with `story` and
  `priority:*` labels.
- [ ] If `--gh-issue` AND `hasRepo`: issue was added to the project board.
- [ ] If `--gh-issue` AND `hasRepo`: Story Points, Priority, and Status
  custom fields were set on the project board item.
- [ ] If `--gh-issue` AND `hasRepo` AND `--epic`: milestone was assigned
  when a matching milestone exists.
- [ ] If `--gh-issue` AND NOT `hasRepo`: a warning was displayed and
  GitHub publishing was skipped.
- [ ] All output follows markdown formatting conventions.

- [ ] If `--bulk`: input was parsed as JSON array or newline-separated list.
- [ ] If `--bulk`: Steps 1–3 ran once before the loop, not once per item.
- [ ] If `--bulk`: each loop iteration emits `[i/TOTAL]` before starting.
- [ ] If `--bulk` AND `--gh-issue` AND `hasRepo`: each successful item has a
  created issue with `story` and `priority:*` labels, added to the project
  board with Story Points, Priority, and Status fields set.
- [ ] If `--bulk`: failures are accumulated and listed in the summary; the
  loop did not abort on first failure.
- [ ] If `--bulk`: the wrapping Task was created before the loop and marked
  completed after.
- [ ] If `--bulk` is absent: single-item flow is unchanged (no regression).

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
