---
name: retro
version: "1.0.0"
description: Use when a user wants to facilitate a sprint retrospective by analyzing the sprint's git history, merged PRs, and issues to generate a structured retro document.
argument-hint: "[--sprint=<range>] [--since=<date>] [--until=<date>]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating a sprint retrospective. Work through the steps below in
order.

---

## Step 1 --- Parse Arguments

Extract options from `$ARGUMENTS`:

- `--sprint=<range>` --- sprint identifier or number (used for file naming
  and log filtering if milestone-based dates can be resolved).
- `--since=<date>` --- start date for the retrospective window.
- `--until=<date>` --- end date for the retrospective window.

If no dates or sprint are provided, default to the last two weeks
(`--since="2 weeks ago"`).

$ARGUMENTS

---

## Step 2 --- JIT-Read SCRUM Reference

Use the `Read` tool to load the **Ceremonies** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`. Focus on the Sprint
Retrospective entry for domain context.

---

## Step 3 --- Gather Data

Run the following Bash commands to collect retrospective inputs:

1. **Git log for the sprint range** ---
   `git log --since="<since>" --until="<until>" --oneline --stat`.
2. **Merged PRs** ---
   `gh pr list --state=merged --search="merged:>=$since" --json number,title,url,mergedAt`.
3. **Closed issues** ---
   `gh issue list --state=closed --search="closed:>=$since" --json number,title,url,closedAt`.
4. **Carried-over items** --- open PRs and open issues that were created
   before the sprint window:
   `gh pr list --state=open --json number,title,url,createdAt` and
   `gh issue list --state=open --json number,title,url,createdAt`.

If a `gh` command fails (CLI not installed or not authenticated), note the
failure and continue with available data. Never hard-fail on missing GitHub
CLI data.

---

## Step 4 --- Dispatch to scrum-architect

Use the **Agent** tool to launch the `scrum-architect` agent with the
following context:

````text
## Phase: Sprint Retrospective Facilitation

### Inputs

- Sprint: <sprint identifier or "unspecified">
- Date range: <since> to <until>

- Git log (commits + stats):
<paste git log output>

- Merged PRs:
<paste gh pr list merged output or "unavailable">

- Closed issues:
<paste gh issue list closed output or "unavailable">

- Carried-over PRs (still open):
<paste open PRs or "unavailable">

- Carried-over issues (still open):
<paste open issues or "unavailable">

### SCRUM Reference (Ceremonies)
<paste the JIT-read content from Step 2>

### Instructions

Generate a sprint retrospective document with exactly three sections:

1. **What Went Well** --- wins during the sprint. Consider: features
   delivered, velocity (commit volume, PRs merged), code quality indicators,
   fast turnaround items.
2. **What Didn't Go Well** --- problems encountered. Consider: blockers,
   missed goals (carried-over items), technical debt introduced, slow PRs,
   reverted commits.
3. **Action Items** --- specific, assignable improvements for the next
   sprint. Each action item must be concrete (who, what, when) not vague.
   Derive them directly from the "What Didn't Go Well" findings.

Output in markdown format with `##` headers for each section and bullet lists
for items. Include PR/issue links where relevant.
````

---

## Step 5 --- Deliver Output

Ask the user whether they want the retro document:

- **A) Written to a file** --- save to `docs/retro-sprint-<N>.md` (where
  `<N>` is the sprint identifier, or `undated` if no sprint was specified).
  Create the `docs/` directory if it does not exist.
- **B) Displayed inline** --- print the retrospective directly in the
  conversation.

Default to inline display if the user does not respond. Present the
scrum-architect's output according to their choice.
