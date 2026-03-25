---
name: standup
version: "1.0.0"
description: Use when a user wants to generate or prepare a daily standup report from git activity, open PRs, and work in progress. Trigger for "standup", "daily standup", "scrum update", "what did I do yesterday?", "morning report", "prepare my standup", or "what have I been working on?"
argument-hint: "[--since=<date>] [--format=slack|markdown|plain]"
allowed-tools: [Read, Write, Agent, Bash]
---

You are orchestrating a daily standup report. Bootstrap the project context,
parse the user's arguments, gather data from git and the GitHub Projects v2
board, then dispatch the scrum-architect agent to generate a formatted standup.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence. If bootstrap triggers onboarding, complete onboarding
before proceeding. Produce the **project context object** for subsequent steps.

---

## Step 2 --- Parse Arguments

Extract options from `$ARGUMENTS`:

- `--since=<date>` --- date to look back from (default: yesterday).
- `--format=<fmt>` --- output format: `slack`, `markdown`, or `plain`
  (default: `markdown`).

If neither flag is present, use the defaults.

---

## Step 3 --- JIT-Read SCRUM Reference

Use the `Read` tool to load the **Ceremonies** and **Roles** sections from
`plugins/scrum-toolkit/references/scrum-knowledge.md`. These provide the
domain context the scrum-architect agent needs for standup generation.

---

## Step 4 --- Gather Data

### Git and GitHub CLI data

Run the following Bash commands in parallel to collect standup inputs:

1. **Recent commits** ---
   `git log --since="<since-date>" --oneline --author="$(git config user.name)"`.
2. **Current branch** --- `git branch --show-current`.
3. **Open PRs** ---
   `gh pr list --author=@me --state=open --json number,title,url`.
4. **Assigned issues** ---
   `gh issue list --assignee=@me --state=open --json number,title,url`.

If a `gh` command fails (CLI not installed or not authenticated), note the
failure and continue with the data that is available. Never hard-fail on
missing GitHub CLI data.

### GitHub Projects v2 sprint items (hasRepo only)

When `hasRepo` is true, JIT-read the **"Reading Project State"** section
from `plugins/scrum-toolkit/references/github-api-patterns.md`, then query
the current sprint items from the GitHub Projects v2 board via GraphQL:

- Use the `projectId` and field IDs from the bootstrap context (do NOT
  re-resolve them).
- Fetch all items in the current sprint iteration with their field values.
- For each item extract:
  - **Status** --- from the Status single-select custom field (e.g.,
    Sprint Backlog, In Progress, In Review, Done).
  - **Story points** --- from the Story Points number custom field.
  - **Assignees** --- from the linked issue.
  - **Title and number** --- from the linked issue content.

Read formatting conventions from
`~/.scrum-toolkit/projects/<slug>.json` (`conventions` field) so the
standup report aligns with the team's established patterns.

If the GraphQL query fails, follow the graceful degradation protocol from
the bootstrap reference: log the error, ask for manual input if needed, and
continue with git-only data. Do NOT retry automatically in a loop.

### No-Repo Handling

If `hasRepo` is false: skip all GitHub Projects v2 API steps. The standup
will be generated from git activity and `gh` CLI data only (the same
behavior as the original skill). If the project uses the local JSON
fallback schema, read `backlog` and `currentSprint` from
`~/.scrum-toolkit/projects/<slug>.json` to supplement the report.

---

## Step 5 --- Dispatch to scrum-architect

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the
following context:

````text
## Phase: Daily Standup Generation

### Inputs

- Since date: <since-date>
- Output format: <format>
- User role: <userRole from bootstrap context>
- Commits since last standup:
<paste git log output>

- Current branch: <branch name>

- Open PRs (authored by me):
<paste gh pr list output or "unavailable">

- Assigned issues:
<paste gh issue list output or "unavailable">

### Sprint Board Status (from GitHub Projects v2)
<If hasRepo and board data was retrieved, paste the sprint items grouped
by status column. For each item include: issue number, title, status,
story points, and assignee. Example:

**In Progress:**
- #12 Implement SSO login (5 pts) @developer1
- #15 Add password reset flow (3 pts) @developer2

**In Review:**
- #10 User profile page (3 pts) @developer1

**Sprint Backlog:**
- #18 Email notifications (2 pts)

**Done (since last standup):**
- #9 Database migration (1 pt) @developer2

If hasRepo is false or board data was unavailable, state
"Board data not available --- generating from git activity only."

If using local JSON fallback (no-repo), paste the backlog/currentSprint
items with their statuses instead.>

### Project Conventions
<paste conventions from local JSON, or "none detected">

### SCRUM Reference (Ceremonies + Roles)
<paste the JIT-read content from Step 3>

### Instructions

Generate a daily standup report with exactly three sections:

1. **Done** --- work completed since the last standup (derive from commits,
   recently merged PRs, and board items moved to Done).
2. **Doing** --- current work in progress (derive from current branch,
   open PRs, and board items marked In Progress or In Review).
3. **Blocked** --- any items needing attention (derive from issues with
   blocker labels, PRs awaiting review, stale branches, or board items
   flagged as blocked; if nothing is blocked, state "No blockers").

When board data is available, reference board status (In Progress,
In Review, Done) alongside git activity. Include story points where
available to give a sense of effort.

### Format Rules

- **markdown** --- use `##` headers for each section, bullet lists for
  items.
- **slack** --- use emoji prefixes: `:white_check_mark:` Done,
  `:construction:` Doing, `:no_entry:` Blocked. Bullet points, no headers.
- **plain** --- simple text with section labels and dashes for list items.

Output ONLY the formatted standup report. No preamble or commentary.
````

---

## Step 6 --- Deliver Output

Display the standup report returned by the scrum-architect agent. If the
user requested `slack` format, wrap the output in a code block so emoji
shortcodes are preserved for copy-paste.

---

## Step 7 --- Self-Verification

After the agent completes, verify the output before presenting it to the
user:

- [ ] Bootstrap was executed and produced a valid project context object.
- [ ] Arguments were parsed correctly (since date and format).
- [ ] SCRUM reference was loaded for domain context.
- [ ] Git data (commits, branch, PRs, issues) was gathered.
- [ ] When `hasRepo` is true: sprint items were queried from GitHub
  Projects v2 via GraphQL using bootstrap field IDs.
- [ ] When `hasRepo` is true: board statuses (In Progress, In Review, Done)
  are reflected in the standup report alongside git activity.
- [ ] When `hasRepo` is false: GitHub API steps were skipped; standup was
  generated from git activity only (or local JSON fallback).
- [ ] Standup is **read-only** --- no mutations were executed against
  GitHub.
- [ ] Conventions were read from local JSON for formatting.
- [ ] The report contains exactly three sections: Done, Doing, Blocked.
- [ ] The output format matches the requested format (markdown, slack, or
  plain).
- [ ] API failures were handled gracefully --- not silently swallowed, not
  retried in a loop.

If any check fails, correct the issue before delivering the final output.

$ARGUMENTS
