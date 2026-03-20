---
name: epic
version: "1.0.0"
description: Use when a user needs to create an epic with feature breakdown and story stubs, optionally publishing to GitHub as a milestone with issues.
argument-hint: "<description> [--roadmap=<path>] [--gh-milestone]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating epic creation with feature breakdown and story stubs.
Follow the steps below in order.

---

## Step 1 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **description** (required) --- the plain-text epic description (everything
  that is not a flag)
- **--roadmap=\<path>** (optional) --- path to a roadmap file for context on
  existing epics, sprints, and priorities
- **--gh-milestone** (optional flag) --- publish the epic as a GitHub milestone
  and create issues for each story stub

If no description is provided, ask the user for one before proceeding.

---

## Step 2 --- JIT-Read Reference Material

Read the following sections from `plugins/scrum-toolkit/references/scrum-knowledge.md`
(relative to the plugin root):

- **Artifacts** section --- for epic structure, user story format, acceptance
  criteria format, and estimation scales
- **Prioritization** section --- for MoSCoW framework used in story-level
  prioritization

If the `--gh-milestone` flag is present, also read:

- **GitHub Mapping** section --- for milestone conventions, issue templates,
  label taxonomy, and project board workflow

If `--roadmap` is provided, read the roadmap file at the given path to gather
context on existing epics, sprint boundaries, and strategic priorities.

---

## Step 3 --- Dispatch to scrum-architect

Use the **Agent** tool to dispatch the **scrum-architect** agent with the
following prompt (fill in the bracketed values from Steps 1-2):

````text
## Phase: Epic Authoring

### Inputs

- **Epic description:** [description from arguments]
- **Roadmap context:** [summary of roadmap content if provided, otherwise "none"]

### Reference Knowledge

[Paste the Artifacts section content read in Step 2]

[Paste the Prioritization section content read in Step 2]

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

Display the agent's output to the user.

---

## Step 4 --- GitHub Milestone and Issues (if --gh-milestone)

If the `--gh-milestone` flag was **not** provided, skip to Step 5.

If `--gh-milestone` is present, dispatch the **scrum-architect** agent with the
following prompt:

````text
## Phase: GitHub Milestone Publishing

### Instructions

Detect repository conventions first. Inspect existing milestones, issues, labels,
templates, and project boards before creating anything.

1. Create a GitHub milestone via `gh api`:
   ```bash
   gh api repos/{owner}/{repo}/milestones -f title="[Epic Title]" \
     -f description="[Business Objective]" -f state="open"
   ```
   Capture the milestone number from the response.

2. For each story stub, create a GitHub issue via `gh issue create` with:
   - Title: concise summary derived from the story stub
   - Body: the full As-a/I-want/So-that text with acceptance criteria placeholders
     as checkboxes
   - Milestone: assign to the newly created milestone
   - Labels: apply detected conventions (story point labels like `sp:N`, priority
     labels, type labels)

3. Check for issue templates in `.github/ISSUE_TEMPLATE/`. If a story template
   exists, adapt the issue body to match it.

4. After creating all issues, report:
   - The milestone URL
   - A table of created issues with their numbers and URLs

### Epic Content

[Paste the epic output from Step 3]
````

Report the created milestone and issue URLs to the user.

---

## Step 5 --- Summary

Present a brief summary:

- Epic title and business objective (one-line recap)
- Feature count and total story points
- Whether a GitHub milestone was created (with URL if applicable)
- Number of issues created (if applicable)
- Suggested next steps (e.g., "Refine story stubs into full stories with
  `/user-story`" or "Pull stories into a sprint with `/plan`")

---

$ARGUMENTS
