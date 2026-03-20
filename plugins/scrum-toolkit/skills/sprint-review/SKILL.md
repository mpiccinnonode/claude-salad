---
name: sprint-review
version: "1.0.0"
description: Use when a user wants to prepare a sprint review or demo summary showing what was delivered, for stakeholder communication.
argument-hint: "[--sprint=<range>] [--since=<date>] [--until=<date>]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating a sprint review preparation. Work through the steps
below in order.

---

## Step 1 --- Parse Arguments

Extract options from `$ARGUMENTS`:

- `--sprint=<range>` --- sprint identifier or number (used for file naming
  and log filtering if milestone-based dates can be resolved).
- `--since=<date>` --- start date for the review window.
- `--until=<date>` --- end date for the review window.

If no dates or sprint are provided, default to the last two weeks
(`--since="2 weeks ago"`).

$ARGUMENTS

---

## Step 2 --- JIT-Read SCRUM Reference

Use the `Read` tool to load the **Ceremonies** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`. Focus on the Sprint
Review entry for domain context.

---

## Step 3 --- Gather Data

Run the following Bash commands to collect sprint review inputs:

1. **Git log for the sprint range** ---
   `git log --since="<since>" --until="<until>" --oneline --stat`.
2. **Merged PRs** ---
   `gh pr list --state=merged --search="merged:>=$since" --json number,title,url,mergedAt,body`.
3. **Closed issues** ---
   `gh issue list --state=closed --search="closed:>=$since" --json number,title,url,closedAt,labels`.
4. **Sprint milestone** (if available) ---
   `gh api repos/:owner/:repo/milestones --jq '.[] | select(.title | test("<sprint>"))'`.

If a `gh` command fails (CLI not installed or not authenticated), note the
failure and continue with available data. Never hard-fail on missing GitHub
CLI data.

---

## Step 4 --- Dispatch to scrum-architect

Use the **Agent** tool to launch the `scrum-architect` agent with the
following context:

````text
## Phase: Sprint Review Preparation

### Inputs

- Sprint: <sprint identifier or "unspecified">
- Date range: <since> to <until>

- Git log (commits + stats):
<paste git log output>

- Merged PRs:
<paste gh pr list merged output or "unavailable">

- Closed issues:
<paste gh issue list closed output or "unavailable">

- Sprint milestone data:
<paste milestone data or "unavailable">

### SCRUM Reference (Ceremonies)
<paste the JIT-read content from Step 2>

### Instructions

Generate a sprint review document for stakeholder communication with exactly
four sections:

1. **Sprint Goal** --- state the sprint goal and whether it was met, partially
   met, or not met. Derive the goal from milestone data if available;
   otherwise infer from the dominant theme of merged PRs and closed issues.
2. **Delivered Items** --- list every feature, fix, or improvement delivered
   this sprint. Each item should include a brief description and a link to
   the relevant PR. Group by category (Features, Fixes, Improvements) if
   there are more than five items.
3. **Demo Notes** --- identify the key items worth demonstrating to
   stakeholders. Order them by impact (most impressive first). For each,
   provide a one-line description of what to show and why it matters.
4. **Stakeholder Changelog** --- a plain-language summary of what changed,
   written for non-technical readers. No jargon, no PR numbers, no branch
   names. Focus on user-visible outcomes and business value.

Output in markdown format with `##` headers for each section. Use bullet
lists for items and include PR/issue links in the Delivered Items section.
````

---

## Step 5 --- Deliver Output

Ask the user whether they want the sprint review document:

- **A) Written to a file** --- save to `docs/sprint-review-<N>.md` (where
  `<N>` is the sprint identifier, or `undated` if no sprint was specified).
  Create the `docs/` directory if it does not exist.
- **B) Displayed inline** --- print the sprint review directly in the
  conversation.

Default to inline display if the user does not respond. Present the
scrum-architect's output according to their choice.
