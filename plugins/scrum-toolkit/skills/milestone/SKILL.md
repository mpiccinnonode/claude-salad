---
name: milestone
version: "2.2.0"
description: Use when a user needs to define a release milestone with goals and sprint ranges, optionally creating a GitHub milestone. Trigger for "create a milestone", "define a release", "set up v1.0", "what's our Q2 scope?", "define release goals", "plan a release milestone", or any request to mark a meaningful delivery checkpoint.
argument-hint: "<goals> [--sprints=<range>] [--gh-milestone]"
allowed-tools: [Read, Write, Agent, Bash]
---

You are orchestrating release milestone definition. Bootstrap the project
context, parse the user's arguments, load relevant reference material, then
dispatch the scrum-architect agent with phase-specific context.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence. If bootstrap triggers onboarding, complete onboarding
before proceeding. Produce the **project context object** for subsequent steps.

---

## Step 2 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **goals** (required) --- the plain-text milestone goals (everything that is
  not a flag)
- **--sprints=\<range>** (optional) --- sprint range for this milestone
  (e.g., "3-5" meaning sprints 3 through 5, or "Q2" for a quarter label)
- **--gh-milestone** (optional flag) --- create a GitHub milestone after
  defining the release milestone

If no goals are provided, ask the user for them before proceeding.

---

## Step 3 --- JIT-Read Reference Material

Read the following sections from `plugins/scrum-toolkit/references/scrum-knowledge.md`
(relative to the plugin root):

- **Artifacts** section --- for epic structure, increment definition, and
  Definition of Done template

If the `--gh-milestone` flag is present AND `hasRepo` is true, also read:

- **GitHub Mapping** section --- for milestone conventions, iteration mapping,
  and project board workflow

If `--gh-milestone` is present AND `hasRepo` is true, also JIT-read the
**"Milestone Operations"** section from
`plugins/scrum-toolkit/references/github-api-patterns.md`. This provides
REST templates needed for milestone creation and listing.

---

## Step 4 --- Dispatch to scrum-architect

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to dispatch the **scrum-architect** agent with the
following prompt (fill in the bracketed values from Steps 1-3):

````text
## Phase: Milestone Definition

### Inputs

- **Goals:** [goals from arguments]
- **Sprint range:** [sprint range if provided, otherwise "not specified"]
- **Bootstrap context:** [the full project context object from Step 1]

### Reference Knowledge

[Paste the Artifacts section content read in Step 3]

### Sprint Date Calculation

Use `sprintDurationDays` from the bootstrap context (sourced from
`~/.scrum-toolkit/projects/<slug>.json`) to calculate milestone due dates:

1. If a sprint range is provided (e.g., "3-5"), identify the last sprint
   number in the range.
2. If GitHub iteration metadata is available (from bootstrap field IDs and
   the current sprint iteration), use iteration start dates and
   `sprintDurationDays` to calculate the end date of the last sprint in the
   range.
3. If no iteration metadata is available, use `sprintDurationDays` and the
   current date to estimate:
   `due_date = today + (sprints_remaining * sprintDurationDays)`
4. If no sprint range is provided and no dates are determinable, set
   estimated dates to "TBD".

### Instructions

Detect repository conventions first. Inspect existing milestone naming patterns
before producing output.

1. Define a clear, concise milestone name derived from the goals.
2. Write a goal statement (1-2 sentences) describing what this release achieves.
3. List 3-5 measurable success criteria that determine whether the milestone is
   met. Each criterion should be objectively verifiable.
4. Specify the sprint range (use the provided range, or suggest one if not given).
5. List key deliverables --- the concrete outputs expected by milestone completion.
   Group by feature area if there are more than 5.
6. Calculate estimated start and end dates using the sprint date calculation
   logic above.

### Output Format

```markdown
## Milestone: [Name]

**Goal:** [1-2 sentence goal statement]

**Sprint Range:** [e.g., Sprint 3 -- Sprint 5 (6 weeks)]

**Estimated Dates:** [start -- end, calculated from sprint duration and iteration
metadata, or "TBD" if not determinable]

---

### Success Criteria

1. [Measurable criterion]
2. [Measurable criterion]
3. [Measurable criterion]

### Key Deliverables

| # | Deliverable | Target Sprint | Status |
|---|-------------|---------------|--------|
| 1 | [deliverable description] | Sprint N | Planned |
| 2 | ... | ... | ... |

### Dependencies and Risks

- [Any known dependencies or risks, if inferable from context]
```
````

Display the agent's output to the user.

---

## Step 5 --- GitHub Milestone (if --gh-milestone)

If the `--gh-milestone` flag was **not** provided, skip to Step 6.

### No-Repo Guard

If `--gh-milestone` is present but `hasRepo` is **false**, warn the user:

> **Warning:** This project is not connected to a GitHub repository.
> The `--gh-milestone` flag requires a linked repo. Skipping GitHub milestone
> creation. To connect this project, run `/scrum onboard` and configure a
> repository.

Skip to Step 6 after displaying the warning.

### GitHub Milestone Creation (hasRepo is true)

When `--gh-milestone` is present AND `hasRepo` is true, create the milestone
directly using the bootstrap context and milestone output from Step 4.

1. Determine the due date:
   - Use the estimated dates from Step 4 (calculated from `sprintDurationDays`
     and iteration metadata).
   - If dates were "TBD", omit the `due_on` field.

2. Create the GitHub milestone via `gh api` (see github-api-patterns.md
   "Milestone Operations"):

   ```text
   gh api repos/<OWNER>/<REPO>/milestones -X POST \
     -f title="<Milestone Name>" \
     -f description="<Goal statement and success criteria>" \
     -f due_on="<YYYY-MM-DD>T00:00:00Z"
   ```

3. Report the milestone URL and details to the user.

---

## Step 6 --- Summary

Present a brief summary:

- Milestone name and goal (one-line recap)
- Sprint range and estimated dates (if known)
- Number of success criteria defined
- Whether a GitHub milestone was created (with URL if applicable)
- Suggested next steps (e.g., "Create epics for this milestone with `/epic`"
  or "Plan the first sprint with `/plan`")

---

## Self-Verification

After the agent completes, verify the output before presenting it to the
user:

- [ ] Bootstrap was executed and produced a valid project context object.
- [ ] Milestone has a clear name and goal statement.
- [ ] 3-5 measurable success criteria are defined.
- [ ] Key deliverables are listed with target sprints.
- [ ] Sprint dates were calculated using `sprintDurationDays` from local JSON
  and iteration metadata (when available), not hardcoded.
- [ ] If `--gh-milestone` AND `hasRepo`: milestone was created via `gh api`
  using patterns from github-api-patterns.md.
- [ ] If `--gh-milestone` AND `hasRepo`: existing milestones were inspected
  for naming conventions before creating.
- [ ] If `--gh-milestone` AND NOT `hasRepo`: a warning was displayed and
  GitHub milestone creation was skipped.
- [ ] All output follows markdown formatting conventions.

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
