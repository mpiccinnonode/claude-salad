---
name: user-story
version: "1.0.0"
description: Use when a user needs to create a user story with acceptance criteria, optionally publishing it as a GitHub issue.
argument-hint: "<description> [--epic=<ref>] [--roadmap=<path>] [--gh-issue]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating user story creation. Follow the steps below in order.

---

## Step 1 --- Parse Arguments

Extract the following from `$ARGUMENTS`:

- **description** (required) --- the plain-text story description (everything that is not a flag)
- **--epic=\<ref>** (optional) --- reference to a parent epic (name, number, or file path)
- **--roadmap=\<path>** (optional) --- path to a roadmap file for sprint/epic context
- **--gh-issue** (optional flag) --- publish the story as a GitHub issue after authoring

If no description is provided, ask the user for one before proceeding.

---

## Step 2 --- JIT-Read Reference Material

Read the following sections from `plugins/scrum-toolkit/references/scrum-knowledge.md`
(relative to the plugin root):

- **Artifacts** section --- for user story format, acceptance criteria format, INVEST
  criteria, and estimation scales

If the `--gh-issue` flag is present, also read:

- **GitHub Mapping** section --- for issue template conventions, label taxonomy,
  and project board workflow

If `--roadmap` is provided, read the roadmap file at the given path to gather
epic context, sprint boundaries, and priority information.

---

## Step 3 --- Dispatch to scrum-architect

Use the **Agent** tool to dispatch the **scrum-architect** agent with the
following prompt (fill in the bracketed values from Steps 1-2):

````text
## Phase: User Story Authoring

### Inputs

- **Story description:** [description from arguments]
- **Parent epic:** [epic ref if provided, otherwise "none"]
- **Roadmap context:** [summary of roadmap content if provided, otherwise "none"]

### Reference Knowledge

[Paste the Artifacts section content read in Step 2]

[If --gh-issue, also paste the GitHub Mapping section content]

### Instructions

1. Write a user story in As-a / I-want / So-that format based on the description.
   Apply INVEST criteria to validate the story is well-formed.
2. Write 2-5 acceptance criteria in Given / When / Then format.
3. Assign a MoSCoW priority (Must / Should / Could / Won't) with a one-line
   rationale.
4. Estimate story points using the Fibonacci scale (1, 2, 3, 5, 8, 13).
   Include a one-line sizing rationale.
5. If a parent epic was provided, note how this story fits within the epic scope.

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

## Step 4 --- GitHub Issue (if --gh-issue)

If the `--gh-issue` flag was **not** provided, skip to Step 5.

If `--gh-issue` is present, dispatch the **scrum-architect** agent with the
following prompt:

````text
## Phase: GitHub Issue Publishing

### Instructions

Detect repository conventions first. Inspect existing issues, labels, templates,
and project boards before creating anything.

1. Check for issue templates in `.github/ISSUE_TEMPLATE/`. If a story template
   exists, use it. Otherwise use the story content directly.
2. Check existing labels. Map the story point estimate to an `sp:N` label if that
   convention exists. Map MoSCoW priority to a priority label if one exists.
3. Create the GitHub issue using `gh issue create` with:
   - Title: a concise summary derived from the user story
   - Body: the full user story content (As-a/I-want/So-that, acceptance criteria
     as checkboxes, priority, estimate)
   - Labels: apply any detected labels that match (story points, priority, type)
   - Milestone: if a parent epic maps to a milestone, assign it
4. After creating the issue, check if a GitHub Project board exists.
   If one is found, offer to add the issue to the board.

### Story Content

[Paste the story output from Step 3]
````

Report the created issue URL to the user.

---

## Step 5 --- Summary

Present a brief summary:

- The user story (title-level recap)
- Priority and estimate
- Whether a GitHub issue was created (with URL if applicable)
- Suggested next steps (e.g., "Add more stories to the epic" or "Pull this
  into a sprint during planning")

---

$ARGUMENTS
