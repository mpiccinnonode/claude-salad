---
name: standup
version: "1.0.0"
description: Use when a user wants to generate a daily standup status report from their current git activity, open PRs, and work in progress.
argument-hint: "[--since=<date>] [--format=slack|markdown|plain]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating a daily standup report. Work through the steps below in
order.

---

## Step 1 --- Parse Arguments

Extract options from `$ARGUMENTS`:

- `--since=<date>` --- date to look back from (default: yesterday).
- `--format=<fmt>` --- output format: `slack`, `markdown`, or `plain`
  (default: `markdown`).

If neither flag is present, use the defaults.

$ARGUMENTS

---

## Step 2 --- JIT-Read SCRUM Reference

Use the `Read` tool to load the **Ceremonies** and **Roles** sections from
`plugins/scrum-toolkit/references/scrum-knowledge.md`. These provide the
domain context the scrum-architect agent needs for standup generation.

---

## Step 3 --- Gather Data

Run the following Bash commands in parallel to collect standup inputs:

1. **Recent commits** --- `git log --since="<since-date>" --oneline --author="$(git config user.name)"`.
2. **Current branch** --- `git branch --show-current`.
3. **Open PRs** --- `gh pr list --author=@me --state=open --json number,title,url`.
4. **Assigned issues** --- `gh issue list --assignee=@me --state=open --json number,title,url`.

If a `gh` command fails (CLI not installed or not authenticated), note the
failure and continue with the data that is available. Never hard-fail on
missing GitHub CLI data.

---

## Step 4 --- Dispatch to scrum-architect

Use the **Agent** tool to launch the `scrum-architect` agent with the
following context:

````text
## Phase: Daily Standup Generation

### Inputs

- Since date: <since-date>
- Output format: <format>
- Commits since last standup:
<paste git log output>

- Current branch: <branch name>

- Open PRs (authored by me):
<paste gh pr list output or "unavailable">

- Assigned issues:
<paste gh issue list output or "unavailable">

### SCRUM Reference (Ceremonies + Roles)
<paste the JIT-read content from Step 2>

### Instructions

Generate a daily standup report with exactly three sections:

1. **Done** --- work completed since the last standup (derive from commits
   and any recently merged PRs).
2. **Doing** --- current work in progress (derive from current branch and
   open PRs).
3. **Blocked** --- any items needing attention (derive from issues with
   blocker labels, PRs awaiting review, or stale branches; if nothing is
   blocked, state "No blockers").

### Format Rules

- **markdown** --- use `##` headers for each section, bullet lists for items.
- **slack** --- use emoji prefixes: `:white_check_mark:` Done,
  `:construction:` Doing, `:no_entry:` Blocked. Bullet points, no headers.
- **plain** --- simple text with section labels and dashes for list items.

Output ONLY the formatted standup report. No preamble or commentary.
````

---

## Step 5 --- Deliver Output

Display the standup report returned by the scrum-architect agent. If the user
requested `slack` format, wrap the output in a code block so emoji shortcodes
are preserved for copy-paste.
