---
name: sprint-review
version: "2.1.0"
description: Use when a user wants to prepare a sprint review, demo, or stakeholder update showing what was delivered this sprint. Trigger for "sprint review", "sprint demo", "what did we ship?", "show stakeholders what we delivered", "sprint summary", or "prepare for demo day".
argument-hint: "[--sprint=<range>] [--since=<date>] [--until=<date>]"
allowed-tools: [Read, Write, Agent, Bash]
---

You are orchestrating a sprint review preparation. Bootstrap the project
context, parse the user's arguments, gather data from git and the GitHub
Projects v2 board, dispatch the scrum-architect agent to generate a formatted
review, then record velocity data for the completed sprint.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence. If bootstrap triggers onboarding, complete onboarding
before proceeding. Produce the **project context object** for subsequent steps.

---

## Step 2 --- Parse Arguments

Extract options from `$ARGUMENTS`:

- `--sprint=<range>` --- sprint identifier or number (used for file naming
  and log filtering if milestone-based dates can be resolved).
- `--since=<date>` --- start date for the review window.
- `--until=<date>` --- end date for the review window.

If no dates or sprint are provided, default to the last two weeks
(`--since="2 weeks ago"`).

---

## Step 3 --- JIT-Read SCRUM Reference

Use the `Read` tool to load the **Ceremonies** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`. Focus on the Sprint
Review entry for domain context.

---

## Step 4 --- Gather Data

### Git and GitHub CLI data

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

### GitHub Projects v2 sprint items (hasRepo only)

When `hasRepo` is true, JIT-read the **"Reading Project State"** section
from `plugins/scrum-toolkit/references/github-api-patterns.md`, then query
the completed sprint items from the GitHub Projects v2 board via GraphQL:

- Use the `projectId` and field IDs from the bootstrap context (do NOT
  re-resolve them).
- Fetch all items in the target sprint iteration with their field values.
- For each item extract:
  - **Status** --- from the Status single-select custom field (e.g.,
    Sprint Backlog, In Progress, In Review, Done).
  - **Story points** --- from the Story Points number custom field.
  - **Title and number** --- from the linked issue content.
  - **Assignees** --- from the linked issue.
- Identify items in **Done** status for velocity calculation.
- Extract the **sprint goal** from the iteration metadata if available.
- Calculate **committed points** (all items in the sprint) and
  **completed points** (items in Done status).

Read formatting conventions from
`~/.scrum-toolkit/projects/<slug>.json` (`conventions` field) so the
review report aligns with the team's established patterns.

If the GraphQL query fails, follow the graceful degradation protocol from
the bootstrap reference: log the error, ask for manual input if needed, and
continue with git-only data. Do NOT retry automatically in a loop.

### No-Repo Handling

If `hasRepo` is false: skip all GitHub Projects v2 API steps. If the
project uses the local JSON fallback schema, read `backlog` and
`currentSprint` from `~/.scrum-toolkit/projects/<slug>.json` to supplement
the review with item statuses and sprint goal. Otherwise, generate the
review from git activity and `gh` CLI data only.

---

## Step 5 --- Dispatch to scrum-architect

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the
following context:

````text
## Phase: Sprint Review Preparation

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

- Sprint milestone data:
<paste milestone data or "unavailable">

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

**Sprint Backlog:**
- #18 Email notifications (2 pts)

**Velocity Summary:**
- Committed: 14 pts (across 5 items)
- Completed: 4 pts (2 items in Done)

If hasRepo is false or board data was unavailable, state
"Board data not available --- generating from git and CLI data only."

If using local JSON fallback (no-repo), paste the backlog/currentSprint
items with their statuses and the sprint goal instead.>

### Project Conventions
<paste conventions from local JSON, or "none detected">

### SCRUM Reference (Ceremonies)
<paste the JIT-read content from Step 3>

### Instructions

Generate a sprint review document for stakeholder communication with exactly
four sections:

1. **Sprint Goal** --- state the sprint goal and whether it was met, partially
   met, or not met. Use the goal from the board iteration metadata or local
   JSON if available; otherwise infer from the dominant theme of merged PRs
   and closed issues. When board data is available, reference the velocity
   summary (committed vs. completed points) to support the assessment.
2. **Delivered Items** --- list every feature, fix, or improvement delivered
   this sprint. Each item should include a brief description and a link to
   the relevant PR. Group by category (Features, Fixes, Improvements) if
   there are more than five items. When board data is available, include
   story points for each item.
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

## Step 6 --- Velocity Write

After the agent produces the review, record the sprint velocity data.

### Prepare the velocity entry

Build a velocity record from the data gathered in Step 4:

```json
{
  "sprint": N,
  "goal": "sprint goal text",
  "committed": total_points_in_sprint,
  "completed": points_in_done_status,
  "goalMet": null
}
```

Field sources:

- `sprint` --- the sprint number from the `--sprint` argument, or the
  iteration number from the board. If neither is available, use the next
  integer after the last entry in `velocityHistory`.
- `goal` --- from the board iteration metadata, `currentSprint.goal`
  (no-repo), or inferred from the review content.
- `committed` --- total story points of all items assigned to the sprint.
  If board data is unavailable, set to `null`.
- `completed` --- story points of items in Done status. If board data is
  unavailable, set to `null`.
- `goalMet` --- always `null` at this stage. The retro skill fills this
  in later.

### Confirm with user

Present the velocity entry to the user and ask for confirmation before
writing. Show the entry as formatted JSON and ask:

> "I'd like to record this velocity data for sprint N. Shall I append it
> to your project file? (Y/n)"

If the user declines, skip the write and proceed to delivery.

### Write to project file

On confirmation, read `~/.scrum-toolkit/projects/<slug>.json`, append the
velocity entry to the `velocityHistory` array, and write the file back.
Ensure the JSON remains valid and properly formatted.

---

## Step 7 --- Deliver Output

Ask the user whether they want the sprint review document:

- **A) Written to a file** --- save to `docs/sprint-review-<N>.md` (where
  `<N>` is the sprint identifier, or `undated` if no sprint was specified).
  Create the `docs/` directory if it does not exist.
- **B) Displayed inline** --- print the sprint review directly in the
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
- [ ] Git data (commits, merged PRs, closed issues, milestone) was gathered.
- [ ] When `hasRepo` is true: sprint items were queried from GitHub
  Projects v2 via GraphQL using bootstrap field IDs.
- [ ] When `hasRepo` is true: board statuses and story points are reflected
  in the review alongside git activity.
- [ ] When `hasRepo` is true: velocity data (committed and completed
  points) was calculated from board data.
- [ ] When `hasRepo` is false: GitHub API steps were skipped; review was
  generated from git activity and local JSON fallback only.
- [ ] Sprint review is **read-only against GitHub** --- no mutations were
  executed against the GitHub API.
- [ ] Velocity entry was written to local
  `~/.scrum-toolkit/projects/<slug>.json` only after user confirmation.
- [ ] The `goalMet` field in the velocity entry is `null` (retro fills it
  in later).
- [ ] Conventions were read from local JSON for formatting.
- [ ] The review contains exactly four sections: Sprint Goal, Delivered
  Items, Demo Notes, Stakeholder Changelog.
- [ ] API failures were handled gracefully --- not silently swallowed, not
  retried in a loop.

$ARGUMENTS
