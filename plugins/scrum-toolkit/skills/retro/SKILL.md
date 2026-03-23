---
name: retro
version: "1.0.0"
description: Use when a user wants to facilitate a sprint retrospective by analyzing the sprint's git history, merged PRs, GitHub Projects v2 board data, and velocity metrics to generate a structured retro document.
argument-hint: "[--sprint=<range>] [--since=<date>] [--until=<date>]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating a sprint retrospective. Bootstrap the project context,
parse the user's arguments, gather data from git and the GitHub Projects v2
board, dispatch the scrum-architect agent to generate the retrospective, then
update the `goalMet` field in the local velocity history.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence:

1. **Derive the project slug** from the git remote (or fall back to the
   directory name).
2. **Read `~/.scrum-toolkit/portfolio.json`** --- find the matching project
   entry. If the file or entry is missing, trigger onboarding first.
3. **Read `~/.scrum-toolkit/projects/<slug>.json`** --- extract conventions,
   velocity history, team size, and sprint duration.
4. **Resolve the user role** --- use the project-level `userRole` if set,
   otherwise fall back to `defaults.userRole` from `portfolio.json`.
5. **Resolve GitHub field IDs** (when `hasRepo` is true) --- resolve the
   project board ID from `projectNumber`, then query custom field IDs for
   Story Points, Priority, Status, and Sprint. Identify the current sprint
   iteration.
6. **No-repo projects** (when `repo` is null) --- skip all GitHub API
   steps; the skill will operate against local JSON data and git activity
   only.

If bootstrap triggers onboarding, complete onboarding before proceeding.

Produce the **project context object** (slug, name, repo, projectNumber,
userRole, conventions, velocityHistory, hasRepo, and GitHub field IDs when
applicable) for use in subsequent steps.

---

## Step 2 --- Parse Arguments

Extract options from `$ARGUMENTS`:

- `--sprint=<range>` --- sprint identifier or number (used for file naming
  and log filtering if milestone-based dates can be resolved).
- `--since=<date>` --- start date for the retrospective window.
- `--until=<date>` --- end date for the retrospective window.

If no dates or sprint are provided, default to the last two weeks
(`--since="2 weeks ago"`).

$ARGUMENTS

---

## Step 3 --- JIT-Read SCRUM Reference

Use the `Read` tool to load the **Ceremonies** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`. Focus on the Sprint
Retrospective entry for domain context.

---

## Step 4 --- Gather Data

### Git and GitHub CLI data

Run the following Bash commands to collect retrospective inputs:

1. **Git log for the sprint range** ---
   `git log --since="<since>" --until="<until>" --oneline --stat`.
2. **Merged PRs** ---
   `gh pr list --state=merged --search="merged:>=$since" --json number,title,url,mergedAt`.
3. **Closed issues** ---
   `gh issue list --state=closed --search="closed:>=$since" --json number,title,url,closedAt,labels`.
4. **Carried-over items** --- open PRs and open issues that were created
   before the sprint window:
   `gh pr list --state=open --json number,title,url,createdAt` and
   `gh issue list --state=open --json number,title,url,createdAt`.

If a `gh` command fails (CLI not installed or not authenticated), note the
failure and continue with available data. Never hard-fail on missing GitHub
CLI data.

### GitHub Projects v2 sprint items (hasRepo only)

When `hasRepo` is true, JIT-read the **"Reading Project State"** section
from `plugins/scrum-toolkit/references/github-api-patterns.md`, then query
the target sprint items from the GitHub Projects v2 board via GraphQL:

- Use the `projectId` and field IDs from the bootstrap context (do NOT
  re-resolve them).
- Fetch all items in the target sprint iteration with their field values.
- For each item extract:
  - **Status** --- from the Status single-select custom field (e.g.,
    Sprint Backlog, In Progress, In Review, Done).
  - **Story points** --- from the Story Points number custom field.
  - **Title and number** --- from the linked issue content.
  - **Assignees** --- from the linked issue.
- Identify **carried-over items** --- items NOT in Done status at sprint end.
- Calculate **velocity data**:
  - **Committed points** --- total story points of all items assigned to
    the sprint.
  - **Completed points** --- story points of items in Done status.
- Extract the **sprint goal** from the iteration metadata if available.

Read formatting conventions from
`~/.scrum-toolkit/projects/<slug>.json` (`conventions` field) so the
retro report aligns with the team's established patterns.

If the GraphQL query fails, follow the graceful degradation protocol from
the bootstrap reference: log the error, ask for manual input if needed, and
continue with git-only data. Do NOT retry automatically in a loop.

### No-Repo Handling

If `hasRepo` is false: skip all GitHub Projects v2 API steps. If the
project uses the local JSON fallback schema, read `backlog` and
`currentSprint` from `~/.scrum-toolkit/projects/<slug>.json` to supplement
the retrospective with item statuses, sprint goal, and velocity data.
Otherwise, generate the retro from git activity and `gh` CLI data only.

---

## Step 5 --- Dispatch to scrum-architect

Use the **Agent** tool to launch the `scrum-architect` agent with the
following context:

````text
## Phase: Sprint Retrospective Facilitation

### Inputs

- Sprint: <sprint identifier or "unspecified">
- Date range: <since> to <until>
- User role: <userRole from bootstrap context>
- Sprint goal: <goal from board iteration metadata, local JSON
  currentSprint.goal, or "not available">

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

### Sprint Board Status (from GitHub Projects v2)
<If hasRepo and board data was retrieved, paste all sprint items grouped
by status column. For each item include: issue number, title, status,
story points, and assignee. Example:

**Done:**
- #9 Database migration (1 pt) @developer2
- #10 User profile page (3 pts) @developer1

**In Review:**
- #15 Add password reset flow (3 pts) @developer2

**In Progress:**
- #12 Implement SSO login (5 pts) @developer1

**Sprint Backlog (not started):**
- #18 Email notifications (2 pts)

**Velocity Summary:**
- Committed: 14 pts (across 5 items)
- Completed: 4 pts (2 items in Done)

**Carried-over items (not in Done):**
- #12, #15, #18

If hasRepo is false or board data was unavailable, state
"Board data not available --- generating from git and CLI data only."

If using local JSON fallback (no-repo), paste the backlog/currentSprint
items with their statuses, sprint goal, and velocity data instead.>

### Velocity History (past sprints)
<paste velocityHistory from local JSON for trend analysis, or
"no prior velocity data">

### Project Conventions
<paste conventions from local JSON, or "none detected">

### SCRUM Reference (Ceremonies)
<paste the JIT-read content from Step 3>

### Instructions

Generate a sprint retrospective document with exactly four sections:

1. **Sprint Goal Assessment** --- state the sprint goal and whether it was
   met, partially met, or not met. Use board velocity data (committed vs.
   completed points) and carried-over items to support the assessment. If
   velocity history is available, note the trend compared to prior sprints.
   Conclude with a clear verdict: goalMet = true or goalMet = false.
2. **What Went Well** --- wins during the sprint. Consider: features
   delivered (items in Done), velocity (committed vs. completed points, PRs
   merged), code quality indicators, fast turnaround items, improvements
   over prior sprints.
3. **What Didn't Go Well** --- problems encountered. Consider: carried-over
   items (not in Done at sprint end), missed goals, technical debt
   introduced, slow PRs, reverted commits, velocity drop compared to prior
   sprints.
4. **Action Items** --- specific, assignable improvements for the next
   sprint. Each action item must be concrete (who, what, when) not vague.
   Derive them directly from the "What Didn't Go Well" findings.

Output in markdown format with `##` headers for each section and bullet lists
for items. Include PR/issue links where relevant.
````

---

## Step 6 --- goalMet Write

After the scrum-architect produces the retrospective, update the local
velocity history with the sprint goal assessment.

### Determine goalMet

From the agent's Sprint Goal Assessment section, extract the verdict:

- `true` --- the sprint goal was met (all or nearly all committed work
  completed, goal achieved).
- `false` --- the sprint goal was not met (significant items carried over,
  goal missed or only partially achieved).

### Locate the velocity entry

Read `~/.scrum-toolkit/projects/<slug>.json` and find the most recent
entry in the `velocityHistory` array. This should be the entry for the
sprint being retrospected (written by the sprint-review skill with
`goalMet: null`).

If no matching entry exists (e.g., sprint-review was not run first), skip
this step and note to the user that no velocity entry was found to update.

### Confirm with user

Present the proposed update to the user before writing:

> "Based on the retrospective analysis, I'd like to set `goalMet` to
> `<true|false>` for sprint N in your velocity history. Here's the
> reasoning: <brief summary from the Sprint Goal Assessment>. Shall I
> update your project file? (Y/n)"

If the user declines, skip the write and proceed to delivery.

### Write to project file

On confirmation, read `~/.scrum-toolkit/projects/<slug>.json`, set
`goalMet` to the determined value on the most recent `velocityHistory`
entry, and write the file back. Ensure the JSON remains valid and properly
formatted.

---

## Step 7 --- Deliver Output

Ask the user whether they want the retro document:

- **A) Written to a file** --- save to `docs/retro-sprint-<N>.md` (where
  `<N>` is the sprint identifier, or `undated` if no sprint was specified).
  Create the `docs/` directory if it does not exist.
- **B) Displayed inline** --- print the retrospective directly in the
  conversation.

Default to inline display if the user does not respond. Present the
scrum-architect's output according to their choice.

---

## Step 8 --- Self-Verification

After the agent completes, verify the output before presenting it to the
user:

- [ ] Bootstrap was executed and produced a valid project context object.
- [ ] Arguments were parsed correctly (sprint, since date, until date).
- [ ] SCRUM reference was loaded for domain context.
- [ ] Git data (commits, merged PRs, closed issues, carried-over items)
  was gathered.
- [ ] When `hasRepo` is true: sprint items were queried from GitHub
  Projects v2 via GraphQL using bootstrap field IDs.
- [ ] When `hasRepo` is true: board statuses, story points, and
  carried-over items are reflected in the retrospective alongside git
  activity.
- [ ] When `hasRepo` is true: velocity data (committed and completed
  points) was calculated from board data and used in the Sprint Goal
  Assessment.
- [ ] When `hasRepo` is false: GitHub API steps were skipped; retro was
  generated from git activity and local JSON fallback only.
- [ ] Retro is **read-only against GitHub** --- no mutations were executed
  against the GitHub API.
- [ ] The `goalMet` field was determined from the Sprint Goal Assessment
  and written to `~/.scrum-toolkit/projects/<slug>.json` only after user
  confirmation.
- [ ] Velocity history from prior sprints was included for trend analysis.
- [ ] Conventions were read from local JSON for formatting.
- [ ] The retro contains exactly four sections: Sprint Goal Assessment,
  What Went Well, What Didn't Go Well, Action Items.
- [ ] API failures were handled gracefully --- not silently swallowed, not
  retried in a loop.

If any check fails, correct the issue before delivering the final output.
