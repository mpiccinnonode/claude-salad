---
name: milestone
version: "1.0.0"
description: Use when a user needs to define a release milestone with goals and sprint ranges, optionally creating a GitHub milestone.
argument-hint: "<goals> [--sprints=<range>] [--gh-milestone]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating release milestone definition. Follow the steps below in order.

---

## Step 1 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **goals** (required) --- the plain-text milestone goals (everything that is
  not a flag)
- **--sprints=\<range>** (optional) --- sprint range for this milestone
  (e.g., "3-5" meaning sprints 3 through 5, or "Q2" for a quarter label)
- **--gh-milestone** (optional flag) --- create a GitHub milestone after
  defining the release milestone

If no goals are provided, ask the user for them before proceeding.

---

## Step 2 --- JIT-Read Reference Material

Read the following sections from `plugins/scrum-toolkit/references/scrum-knowledge.md`
(relative to the plugin root):

- **Artifacts** section --- for epic structure, increment definition, and
  Definition of Done template

If the `--gh-milestone` flag is present, also read:

- **GitHub Mapping** section --- for milestone conventions, iteration mapping,
  and project board workflow

---

## Step 3 --- Dispatch to scrum-architect

Use the **Agent** tool to dispatch the **scrum-architect** agent with the
following prompt (fill in the bracketed values from Steps 1-2):

````text
## Phase: Milestone Definition

### Inputs

- **Goals:** [goals from arguments]
- **Sprint range:** [sprint range if provided, otherwise "not specified"]

### Reference Knowledge

[Paste the Artifacts section content read in Step 2]

### Instructions

1. Define a clear, concise milestone name derived from the goals.
2. Write a goal statement (1-2 sentences) describing what this release achieves.
3. List 3-5 measurable success criteria that determine whether the milestone is
   met. Each criterion should be objectively verifiable.
4. Specify the sprint range (use the provided range, or suggest one if not given).
5. List key deliverables --- the concrete outputs expected by milestone completion.
   Group by feature area if there are more than 5.
6. If sprint dates or cadence can be inferred from the repository (e.g., existing
   milestones, project board iterations), include estimated start and end dates.

### Output Format

```markdown
## Milestone: [Name]

**Goal:** [1-2 sentence goal statement]

**Sprint Range:** [e.g., Sprint 3 -- Sprint 5 (6 weeks)]

**Estimated Dates:** [start -- end, if determinable, otherwise "TBD"]

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

## Step 4 --- GitHub Milestone (if --gh-milestone)

If the `--gh-milestone` flag was **not** provided, skip to Step 5.

If `--gh-milestone` is present, dispatch the **scrum-architect** agent with the
following prompt:

````text
## Phase: GitHub Milestone Creation

### Instructions

Detect repository conventions first. Inspect existing milestones and their naming
patterns before creating anything.

1. Determine the due date:
   - If sprint dates are known (from existing milestones, project board iterations,
     or user input), calculate the due date from the last sprint in the range.
   - If no dates are determinable, omit the due_on field.

2. Create the GitHub milestone via `gh api`:
   ```bash
   gh api repos/{owner}/{repo}/milestones \
     -f title="[Milestone Name]" \
     -f description="[Goal statement and success criteria]" \
     -f state="open" \
     -f due_on="[YYYY-MM-DDT00:00:00Z if known]"
   ```

3. Report the milestone URL and details to the user.

### Milestone Content

[Paste the milestone output from Step 3]
````

Report the created milestone URL to the user.

---

## Step 5 --- Summary

Present a brief summary:

- Milestone name and goal (one-line recap)
- Sprint range and estimated dates (if known)
- Number of success criteria defined
- Whether a GitHub milestone was created (with URL if applicable)
- Suggested next steps (e.g., "Create epics for this milestone with `/epic`"
  or "Plan the first sprint with `/plan`")

---

$ARGUMENTS
