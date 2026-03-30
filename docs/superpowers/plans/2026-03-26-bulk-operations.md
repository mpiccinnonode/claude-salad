# Bulk Operations — scrum-toolkit skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--bulk` flag to `user-story` and `branch` skills, and `--bulk-import` mode to `sprint-plan`, so multiple items can be created in a single skill invocation.

**Architecture:** Each skill file gains a new argument branch. Bootstrap and reference loading still happen once per invocation. `user-story --bulk` loops per-item dispatching scrum-architect. `branch --bulk` dispatches scrum-architect once for all names then creates each branch. `sprint-plan --bulk-import` parses a structured document and publishes items directly to GitHub (no scrum-architect needed). All bulk paths emit `[N/TOTAL]` progress counters, accumulate failures, and report them in the final summary. Single-item paths are unchanged.

**Tech Stack:** Markdown skill files (`SKILL.md`), GitHub CLI (`gh`), GraphQL via `gh api graphql`, `TaskCreate`/`TaskUpdate` tools.

---

## Context: Reference Pattern

The `epic` skill (`plugins/scrum-toolkit/skills/epic/SKILL.md`) is the gold-standard reference for the bulk pattern. Before touching any file, review it to understand:

- How `[M/N]` counters are emitted inline in the loop step
- How failures are accumulated and appended to the summary
- How `TaskCreate`/`TaskUpdate` wrap each phase

---

## Task 1: `user-story` — bulk mode (`--bulk`)

**Acceptance criteria covered:** AC #1, AC #4, AC #5

**Files:**
- Modify: `plugins/scrum-toolkit/skills/user-story/SKILL.md`

### What changes

| Location | Change |
|---|---|
| Frontmatter `argument-hint` | Add `[--bulk]` |
| Frontmatter `allowed-tools` | Add `TaskCreate, TaskUpdate` |
| Step 2 Parse Arguments | Document `--bulk` flag; add routing note |
| New Step 2b | Parse bulk input list |
| New "## Bulk Mode" section | Loop path: per-item story authoring + publishing |
| Step 5 (GitHub Issue) | No change — single-item path unchanged |
| Self-Verification checklist | Add bulk-specific checks |

---

- [ ] **Step 1: Edit frontmatter**

In `plugins/scrum-toolkit/skills/user-story/SKILL.md`, replace:

```yaml
argument-hint: "<description> [--epic=<ref>] [--roadmap=<path>] [--gh-issue]"
allowed-tools: [Read, Write, Agent, Bash]
```

with:

```yaml
argument-hint: "<description> [--epic=<ref>] [--roadmap=<path>] [--gh-issue] [--bulk]"
allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
```

- [ ] **Step 2: Update Step 2 — Parse Arguments**

Append the following to the existing bullet list of flags in Step 2 (after the `--gh-issue` bullet):

```markdown
- **--bulk** (optional flag) --- bulk mode: the input is treated as either a
  newline-separated list of story descriptions (plain text) or a JSON array of
  strings (e.g., `["desc1", "desc2"]`). Each item produces one fully-formed
  story. If `--bulk` is present, continue to **Step 2b** after parsing; skip
  the "If no description is provided" guard (an empty list will be caught in
  Step 2b).
```

- [ ] **Step 3: Add Step 2b — Parse Bulk Input**

Insert the following block immediately after Step 2, before Step 3:

````markdown
## Step 2b --- Parse Bulk Input (only when --bulk)

If `--bulk` was **not** detected in Step 2, skip to Step 3.

Determine the input format from the `$ARGUMENTS` value (excluding flags):

- **JSON array** — if the input starts with `[`, parse it as a JSON array of
  strings. Each element is one story description.
- **Newline-separated plain text** — otherwise, split on `\n`. Trim blank
  lines. Each non-empty line is one story description.

If the resulting list is empty, ask the user:

> **Bulk mode requires at least one story description.** Provide descriptions
> either as a newline-separated list or a JSON array (e.g.,
> `["Add login", "Add logout"]`).

After parsing, record:

- **items** — ordered list of story description strings
- **total** — count of items (used for `[N/TOTAL]` counters throughout the
  bulk loop)

Then continue to Step 3, which now runs **once** for the whole batch (not
per-item). After Step 3 completes, jump to the **Bulk Mode** section instead
of Step 4.

````

- [ ] **Step 4: Add the Bulk Mode section**

Append the following section to the skill file, before the Self-Verification section:

````markdown
---

## Bulk Mode (only when --bulk)

This section replaces Steps 4–6 when `--bulk` is active. Run after Steps
1–3 complete.

### Bulk Mode: Story Loop

Create a task with subject `Create stories (TOTAL total)` — replace TOTAL
with the count from Step 2b — and mark it `in_progress` immediately using
TaskCreate and TaskUpdate.

For each item `i` in `items` (1-indexed), execute the following loop body:

#### Loop body for item i of TOTAL

Emit a progress line before starting:

```text
[i/TOTAL] Authoring story: <first 60 chars of description>
```

**a) Dispatch scrum-architect for story authoring**

Use the same agent prompt as Step 4 (single-item mode), substituting:

- `[description from arguments]` → `items[i]`
- `[epic ref if provided, otherwise "none"]` → value from `--epic` flag (same
  for all items in the batch)
- `[roadmap context]` → same roadmap context loaded for all items

Capture the story output (title, As-a/I-want/So-that, AC, priority, estimate).

**b) GitHub issue (if --gh-issue AND hasRepo)**

Follow the same logic as Step 5a–5c (single-item mode) for this story:

1. Create the issue with `gh issue create`.
2. Add to project board via `addProjectV2ItemById`.
3. Set Story Points, Priority, and Status custom fields.

Emit:

```text
[i/TOTAL] Created issue #<number>: <title> — <url>
```

**On failure (any sub-step a or b)**

Emit:

```text
[i/TOTAL] FAILED: "<description preview>" — <error message>
```

Append to a local `failures` list: `{ index: i, description: items[i], error: "<error>" }`.
**Continue the loop** — do not abort the batch.

---

After the loop completes, mark the `Create stories (TOTAL total)` task as
`completed`.

### Bulk Mode: Summary

Present a summary in place of Step 6:

```markdown
## Bulk Story Creation — Complete

- **Stories authored:** [success count] / [TOTAL]
- **GitHub issues created:** [issue count] (if --gh-issue was set)
- **Project board fields set:** [field-set count] (if --gh-issue AND hasRepo)

### Created Issues

| # | Title | Points | Priority | URL |
|---|-------|--------|----------|-----|
| [i/TOTAL] | ... | ... | ... | ... |

### Failures

[If any failures, list them here. Otherwise: "None."]

| # | Description Preview | Error |
|---|---------------------|-------|
| [i/TOTAL] | ... | ... |

**Next steps:** Pull stories into a sprint with `/sprint-plan --sprint`.
```

````

- [ ] **Step 5: Add bulk-specific checks to Self-Verification**

Append to the Self-Verification checklist (before the closing "If any check fails..." line):

```markdown
- [ ] If `--bulk`: input was parsed as JSON array or newline-separated list.
- [ ] If `--bulk`: Steps 1–3 ran once before the loop, not once per item.
- [ ] If `--bulk`: each loop iteration emits `[i/TOTAL]` before starting.
- [ ] If `--bulk` AND `--gh-issue` AND `hasRepo`: each successful item has a
  created issue with `story` and `priority:*` labels, added to the project
  board with Story Points, Priority, and Status fields set.
- [ ] If `--bulk`: failures are accumulated and listed in the summary; the
  loop did not abort on first failure.
- [ ] If `--bulk`: the wrapping Task was created before the loop and marked
  completed after.
- [ ] If `--bulk` is absent: single-item flow is unchanged (no regression).
```

- [ ] **Step 6: Lint**

```bash
npx markdownlint-cli2 "plugins/scrum-toolkit/skills/user-story/SKILL.md"
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add plugins/scrum-toolkit/skills/user-story/SKILL.md
git commit -m "feat(user-story): add --bulk flag for batch story creation with [N/TOTAL] counters"
```

---

## Task 2: `branch` — bulk mode (`--bulk`)

**Acceptance criteria covered:** AC #2, AC #4, AC #5

**Files:**
- Modify: `plugins/scrum-toolkit/skills/branch/SKILL.md`

### What changes

| Location | Change |
|---|---|
| Frontmatter `argument-hint` | Add `[--bulk]` |
| Frontmatter `allowed-tools` | Add `TaskCreate, TaskUpdate` |
| Step 2 Parse Arguments | Document `--bulk` flag; add routing note |
| New Step 2b | Parse bulk input list |
| New "## Bulk Mode" section | Single scrum-architect dispatch for all names → user confirmation → create loop, skip existing |
| Self-Verification checklist | Add bulk-specific checks |

---

- [ ] **Step 1: Edit frontmatter**

In `plugins/scrum-toolkit/skills/branch/SKILL.md`, replace:

```yaml
argument-hint: "<description or story ref> [--from=<base>]"
allowed-tools: [Read, Agent, Bash]
```

with:

```yaml
argument-hint: "<description or story ref> [--from=<base>] [--bulk]"
allowed-tools: [Read, Agent, Bash, TaskCreate, TaskUpdate]
```

- [ ] **Step 2: Update Step 2 — Parse Arguments**

Append to the existing token table in Step 2, adding a new row:

```markdown
| `--bulk` | Bulk mode: the input is a newline-separated list of descriptions or story references; create one branch per item. After parsing, continue to **Step 2b**. |
```

Also add below the table:

```markdown
If `--bulk` is present and the description list is provided as
newline-separated text, each non-empty line is one branch input. If the input
starts with `[`, parse it as a JSON array of strings. After parsing, continue
to **Step 2b** and then jump to the **Bulk Mode** section instead of Step 5.
```

- [ ] **Step 3: Add Step 2b — Parse Bulk Input**

Insert the following block immediately after Step 2, before Step 3:

````markdown
## Step 2b --- Parse Bulk Input (only when --bulk)

If `--bulk` was **not** detected in Step 2, skip to Step 3.

Parse the input:

- **JSON array** — if the input (excluding flags) starts with `[`, parse it as
  a JSON array of strings.
- **Newline-separated plain text** — otherwise, split on `\n`, trim blank lines.

If the list is empty, ask the user for at least one description before
proceeding.

Record:

- **items** — ordered list of description/ref strings
- **total** — count of items

Continue to Step 3 (convention detection and reference loading run once for the
whole batch), then jump to the **Bulk Mode** section instead of Step 5.

````

- [ ] **Step 4: Add the Bulk Mode section**

Append the following section before the Self-Verification section:

````markdown
---

## Bulk Mode (only when --bulk)

This section replaces Steps 5–6 when `--bulk` is active. Run after Steps
1–4 complete.

### Bulk Mode: Generate All Branch Names

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` and
send **all** items in a single dispatch with the following prompt:

```text
You are generating branch names for a list of descriptions. Apply the same
rules as single-item mode for each entry.

<items>
{numbered list of items from Step 2b, one per line: "1. <desc>"}
</items>

<base-branch>
{value from --from flag, or "current branch: {name}" if not specified}
</base-branch>

<repository-conventions>
{conventions.branches value from the project file, or branch naming patterns
observed from git branch -r in Step 3}
</repository-conventions>

<reference>
{loaded DevOps Conventions section from Step 4}
</reference>

For each item, apply:
1. Appropriate prefix (feature/, bugfix/, hotfix/, release/)
2. Ticket/story ref inclusion if present
3. kebab-case, under 60 characters
4. Match the repo's detected naming convention

Output ONLY a numbered list matching the input order — one branch name per
line, no commentary. Example:
1. feature/14-add-auth
2. bugfix/ST-22-fix-timeout
```

Capture the returned list. Map each line to `proposed[i]`.

### Bulk Mode: User Confirmation

Present the full proposed list for a **single approval**:

```text
Proposed branches:

  [1/TOTAL] feature/14-add-auth  (from: "add user auth")
  [2/TOTAL] bugfix/ST-22-fix-timeout  (from: "#22 fix timeout")
  ...

Create all? (yes / edit <i> <new-name> / abort)
```

- **yes** — proceed to creation loop
- **edit i new-name** — replace `proposed[i]` with the given name and
  re-display the full list for another confirmation round
- **abort** — stop without creating any branches

### Bulk Mode: Creation Loop

Create a task with subject `Create branches (TOTAL total)` — replace TOTAL
with the count — and mark it `in_progress` immediately using TaskCreate and
TaskUpdate.

For each `i` in `proposed` (1-indexed):

1. Check if the branch already exists:

```bash
git branch --list "<proposed[i]>"
```

2. If the branch already exists:

```text
[i/TOTAL] SKIPPED: <proposed[i]> already exists
```

   Append to `skipped` list. Continue loop.

3. If the branch does not exist, create it:

```bash
git checkout -b <proposed[i]> <base-branch-or-current>
```

   On success:

```text
[i/TOTAL] Created: <proposed[i]>
```

   On failure:

```text
[i/TOTAL] FAILED: <proposed[i]> — <git error>
```

   Append to `failures` list. Continue loop.

After the loop, mark the `Create branches (TOTAL total)` task as `completed`.

### Bulk Mode: Summary

```markdown
## Bulk Branch Creation — Complete

- **Created:** [success count] / [TOTAL]
- **Skipped (already exist):** [skipped count]
- **Failed:** [failure count]

### Skipped

[List skipped branches, or "None."]

### Failures

[List failed branches with errors, or "None."]
```

````

- [ ] **Step 5: Add bulk-specific checks to Self-Verification**

Append to the Self-Verification checklist:

```markdown
- [ ] If `--bulk`: input was parsed as JSON array or newline-separated list.
- [ ] If `--bulk`: convention detection (Steps 3–4) ran once, not per-item.
- [ ] If `--bulk`: scrum-architect was dispatched once for all branch names.
- [ ] If `--bulk`: user approved the full list before any branch was created.
- [ ] If `--bulk`: branches that already exist were skipped with a warning,
  not treated as failures.
- [ ] If `--bulk`: failures are accumulated; the loop did not abort on first
  failure.
- [ ] If `--bulk`: the wrapping Task was created before the loop and marked
  completed after.
- [ ] If `--bulk` is absent: single-item approval flow is unchanged.
```

- [ ] **Step 6: Lint**

```bash
npx markdownlint-cli2 "plugins/scrum-toolkit/skills/branch/SKILL.md"
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add plugins/scrum-toolkit/skills/branch/SKILL.md
git commit -m "feat(branch): add --bulk flag for batch branch creation with skip-on-exist guard"
```

---

## Task 3: `sprint-plan` — bulk import mode (`--bulk-import`)

**Acceptance criteria covered:** AC #3, AC #4, AC #5

**Files:**
- Modify: `plugins/scrum-toolkit/skills/sprint-plan/SKILL.md`

### What changes

| Location | Change |
|---|---|
| Frontmatter `argument-hint` | Add `--bulk-import` |
| Step 2 mode table | Add `--bulk-import` row |
| New "Mode: Bulk Import" section | Parse document → create issues → add to board → set fields |
| Step 5 Self-Verification | Add bulk-import checks |

---

- [ ] **Step 1: Edit frontmatter**

In `plugins/scrum-toolkit/skills/sprint-plan/SKILL.md`, replace:

```yaml
argument-hint: "[--grooming|--sprint|--full] [backlog or project context]"
```

with:

```yaml
argument-hint: "[--grooming|--sprint|--full|--bulk-import] [backlog or project context]"
```

- [ ] **Step 2: Update Step 2 — Parse Arguments**

Add a new row to the mode table:

```markdown
| `--bulk-import` | Bulk Import | Parse a structured backlog document (markdown table or JSON array) and publish all items to GitHub as issues, adding each to the project board |
```

Also add below the table:

```markdown
For `--bulk-import` mode, everything after the flag is treated as a **file
path** to the input document. If the path is missing or the file does not
exist, ask the user for a valid path before proceeding. After determining
the mode, jump to the appropriate step:

- `--bulk-import` → after Step 3, jump to the **Mode: Bulk Import** section
  (skip the scrum-architect dispatch in Step 4)
```

- [ ] **Step 3: Update Step 3 — JIT-Read Reference Material**

Add `--bulk-import` to the reference loading table. Append a new row:

```markdown
| Bulk Import | `"Reading Project State"` and `"Writing Project State"` sections from `github-api-patterns.md`; the `"Issue Operations"` section from the same file |
```

Also add after the existing table:

```markdown
For `--bulk-import`, also JIT-read the **"GitHub Mapping"** section from
`scrum-knowledge.md` to understand label taxonomy and status field option IDs.
```

- [ ] **Step 4: Add the Bulk Import mode section**

Insert the following section after the existing "Mode: Backlog Grooming" section and before the "If the mode was Full Roadmap..." paragraph:

````markdown
---

### Mode: Bulk Import (`--bulk-import`)

This section runs when `--bulk-import` is set. It does **not** dispatch the
scrum-architect agent — it mechanically imports a structured document.

#### No-Repo Guard

If `hasRepo` is **false**, warn the user:

> **Warning:** `--bulk-import` requires a GitHub repository connection.
> Run `/scrum onboard` to configure one, then retry.

Stop execution after the warning.

#### Step A --- Parse the Input Document

Read the file at the path provided after `--bulk-import`.

**JSON array format** — file starts with `[`:

```json
[
  { "title": "As a user, I want login", "points": 3, "priority": "Must" },
  { "title": "As a user, I want logout", "points": 1, "priority": "Should" }
]
```

Required fields per item: `title` (string). Optional: `points` (integer,
Fibonacci), `priority` (Must/Should/Could/Won't), `epic` (milestone name).
Default `points` to `0` if absent. Default `priority` to `"Should"` if absent.

**Markdown table format** — file contains a markdown table with a header row:

```markdown
| Title | Points | Priority | Epic |
|-------|--------|----------|------|
| As a user, I want login | 3 | Must | Authentication |
| As a user, I want logout | 1 | Should | Authentication |
```

Required column: `Title`. Optional columns: `Points`, `Priority`, `Epic`
(case-insensitive header matching). Apply the same defaults as JSON.

If the file cannot be parsed in either format, report the error and stop.

Record:

- **items** — ordered list of parsed objects (title, points, priority, epic)
- **total** — count of items

#### Step B --- GitHub Publishing Loop

Create a task with subject `Bulk import: create issues (TOTAL total)` —
replace TOTAL with the count from Step A — and mark it `in_progress`
immediately using TaskCreate and TaskUpdate.

For each item `i` (1-indexed) in `items`:

Emit before starting:

```text
[i/TOTAL] Creating issue: <title preview (60 chars)>
```

**b1 — Create the issue**

Use `gh issue create` with:

- **Title:** `items[i].title`
- **Body:**

```markdown
## User Story

{items[i].title}

### Acceptance Criteria

- [ ] (to be refined)

### Priority

**MoSCoW:** {items[i].priority}

### Estimate

**Story Points:** {items[i].points}
```

- **Labels:** `story` and `priority:<lowercase-priority>` (e.g.,
  `priority:must`, `priority:should`, `priority:could`, `priority:wont`)
- **Milestone:** if `items[i].epic` is set and a matching GitHub milestone
  exists (check with `gh api repos/<OWNER>/<REPO>/milestones`), assign it

On success, capture the issue URL and number. Emit:

```text
[i/TOTAL] Created issue #<number>: <url>
```

On failure, emit:

```text
[i/TOTAL] FAILED: "<title preview>" — <error>
```

Append to `failures`. Continue the loop.

**b2 — Add to project board**

For each successfully created issue:

1. Resolve the issue node ID via GraphQL (see github-api-patterns.md
   "Resolve issue node ID").
2. Add the issue to the project using `addProjectV2ItemById` mutation.
   Capture the returned project item ID.

**b3 — Set custom fields**

Using the bootstrap field IDs and the returned project item ID:

1. **Story Points** — `updateProjectV2ItemFieldValue` with
   `storyPointsFieldId` and `items[i].points` (integer).
2. **Priority** — `updateProjectV2ItemFieldValue` with `priorityFieldId`
   and the option ID matching `items[i].priority`.
3. **Status** — `updateProjectV2ItemFieldValue` with `statusFieldId` and
   the option ID for "Sprint Backlog".

On any field-setting failure, emit:

```text
[i/TOTAL] FIELD FAILED: issue #<number> — <field name>: <error>
```

Append to `failures`. Continue the loop.

---

After the loop, mark the `Bulk import: create issues (TOTAL total)` task
as `completed`.

#### Step C --- Summary

```markdown
## Bulk Import — Complete

- **Issues created:** [success count] / [TOTAL]
- **Project board items added:** [board-add count]
- **Fields set:** [field-set count]

### Created Issues

| # | Title | Points | Priority | URL |
|---|-------|--------|----------|-----|
| [i/TOTAL] | ... | ... | ... | ... |

### Failures

[List failures, or "None."]

**Next steps:** Run `/sprint-plan --sprint` to pull these items into the
current sprint.
```

````

- [ ] **Step 5: Add bulk-import checks to Self-Verification**

In the Step 5 Self-Verification section, append:

```markdown
- [ ] For `--bulk-import` mode: input document was parsed (JSON array or
  markdown table).
- [ ] For `--bulk-import` mode: only runs when `hasRepo` is true; a warning
  was shown and execution stopped when `hasRepo` is false.
- [ ] For `--bulk-import` mode: each item has a created GitHub issue with
  `story` and `priority:*` labels.
- [ ] For `--bulk-import` mode: each issue was added to the project board and
  Status was set to "Sprint Backlog".
- [ ] For `--bulk-import` mode: Story Points and Priority custom fields were
  set from the source document values (not inferred).
- [ ] For `--bulk-import` mode: `[i/TOTAL]` progress was emitted per item.
- [ ] For `--bulk-import` mode: failures were accumulated; loop did not abort
  on first failure.
- [ ] For `--bulk-import` mode: the wrapping Task was created and completed.
- [ ] For all other modes: existing behaviour is unchanged (no regression).
```

- [ ] **Step 6: Lint**

```bash
npx markdownlint-cli2 "plugins/scrum-toolkit/skills/sprint-plan/SKILL.md"
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add plugins/scrum-toolkit/skills/sprint-plan/SKILL.md
git commit -m "feat(sprint-plan): add --bulk-import mode for structured backlog publishing to GitHub"
```

---

## Task 4: Final Lint and Verification

- [ ] **Step 1: Lint all three skills together**

```bash
npx markdownlint-cli2 "plugins/scrum-toolkit/skills/user-story/SKILL.md" \
  "plugins/scrum-toolkit/skills/branch/SKILL.md" \
  "plugins/scrum-toolkit/skills/sprint-plan/SKILL.md"
```

Expected: zero errors across all three files.

- [ ] **Step 2: Full plugin lint**

```bash
npx markdownlint-cli2 "plugins/scrum-toolkit/**/*.md"
```

Expected: zero errors.

- [ ] **Step 3: Verify AC coverage**

Check each AC from GitHub issue #14 against the plan:

| AC | Covered by |
|---|---|
| `user-story --bulk` → `[N/TOTAL]` per item, issue with labels + fields | Task 1, Bulk Mode: Story Loop |
| `branch --bulk` → all branches created, existing skipped | Task 2, Bulk Mode: Creation Loop |
| `sprint-plan --bulk-import` → issues created, Status = Sprint Backlog, fields preserved | Task 3, Step B |
| Failures listed, successful items committed, no silent swallowing | Tasks 1–3, all accumulate `failures` |
| Absent flags leave single-item behaviour unchanged | Tasks 1–3, Self-Verification regression checks |

---

## Self-Review

**Spec coverage:**
- AC #1 (user-story bulk): Task 1 ✓
- AC #2 (branch bulk): Task 2 ✓
- AC #3 (sprint-plan bulk-import): Task 3 ✓
- AC #4 (failure handling): all three tasks accumulate failures ✓
- AC #5 (no regression): Self-Verification checklists in all three tasks ✓

**Placeholder scan:** No TBD, TODO, or "implement later" in any step. All loop bodies show exact text. All commands are exact CLI invocations.

**Type consistency:** `items`, `total`, `failures`, `skipped` used consistently throughout each task's Bulk Mode section.
