---
name: branch
version: "2.2.0"
description: Use when a user wants to create a feature branch following the repository's naming conventions, optionally linked to a story or epic. Trigger for "create a branch", "make a feature branch", "branch for this story", "new branch for X", "start work on this feature", or any request to create a new git branch.
argument-hint: "<description or story ref> [--from=<base>] [--bulk]"
allowed-tools: [Read, Agent, Bash, TaskCreate, TaskUpdate]
---

You are orchestrating SCRUM-aware branch creation. Bootstrap the project
context, parse the user's arguments, detect repository branch naming
conventions, then dispatch the scrum-architect agent to generate the branch
name.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
bootstrap sequence. The branch skill only needs local conventions — it does
**not** interact with the GitHub API, so skip Steps 5–6 of the bootstrap
(GitHub-connected and no-repo project board logic). The key outputs you
need are:

- **slug** — derived project identifier
- **conventions** — from `~/.scrum-toolkit/projects/<slug>.json`

---

## Step 2 --- Parse Arguments

Read `$ARGUMENTS` and extract:

| Token | Meaning |
| --- | --- |
| Description or story reference | The purpose of the branch (e.g., `ST-42`, `add user auth`, `#42 login page`) |
| `--from=<base>` | Base branch to create from (e.g., `--from=develop`, `--from=main`) |
| `--bulk` | Bulk mode: the input is a newline-separated list of descriptions or story references; create one branch per item. After parsing, continue to **Step 2b**. |
| *(no arguments)* | Ask the user what the branch is for before proceeding |

If `--bulk` is present and the description list is provided as
newline-separated text, each non-empty line is one branch input. If the input
starts with `[`, parse it as a JSON array of strings. After parsing, continue
to **Step 2b** and then jump to the **Bulk Mode** section instead of Step 5.

If no description or story reference is provided and `--bulk` is not active,
ask the user before proceeding. The `--from` flag is optional; the default
base is the current branch.

---

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

---

## Step 3 --- Detect Repository Branch Naming Conventions

Check the `conventions.branches` field from the project file
(`~/.scrum-toolkit/projects/<slug>.json`) loaded during bootstrap.

- If `conventions.branches` **exists and is not empty**, use it as the
  canonical branch naming pattern (e.g., `"feature/<id>-description"`).
- If `conventions.branches` is **missing or the project file was not
  found**, fall back to git branch analysis:

```bash
git branch -r --format='%(refname:short)' | head -30
```

Note the patterns: does the repo use `feature/` prefixes? Are ticket IDs
included? What separator is used (hyphens, slashes, underscores)? Is there
a `develop` branch or does everything branch from `main`?

Also check the current branch context:

```bash
git branch --show-current
```

---

## Step 4 --- JIT-Read Reference Material

Use the Read tool to load the **DevOps Conventions** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`.

This section covers branch naming patterns (`feature/`, `bugfix/`, `hotfix/`,
`release/`). Keep the loaded reference in context for the agent dispatch in
Step 5.

---

## Step 5 --- Dispatch to scrum-architect

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the following
prompt:

````text
You are generating a branch name. The user provided this context:

<description>
{description or story reference from $ARGUMENTS}
</description>

<base-branch>
{value from --from flag, or "current branch: {name}" if not specified}
</base-branch>

<repository-conventions>
{conventions.branches value from the project file, or branch naming
patterns observed from git branch -r in Step 3}
</repository-conventions>

<reference>
{loaded DevOps Conventions section from Step 4}
</reference>

Generate a branch name following these rules:

1. Determine the appropriate prefix based on context:
   - `feature/` for new functionality
   - `bugfix/` for defect repairs
   - `hotfix/` for urgent production fixes
   - `release/` for release stabilization
2. If a story/ticket reference was provided, include it after the prefix
   (e.g., `feature/ST-42-add-auth`)
3. Use kebab-case (lowercase with hyphens) for the description portion
4. Keep the total name under 60 characters
5. Match the repository's existing branch naming conventions observed in
   the remote branches
6. If cached conventions specify a pattern, follow it exactly

Output ONLY the branch name — no commentary, no explanation.
````

---

## Step 6 --- User Approval and Branch Creation

Present the proposed branch name to the user and ask for approval:

- **If approved**: determine the base branch:
  - Use the `--from` value if provided
  - Otherwise use the current branch
  - Execute `git checkout -b <branch-name>` (from the base branch if
    different from current: `git checkout -b <branch-name> <base>`)
- **If the user requests edits**: incorporate feedback and present the revised
  name for another round of approval
- **If rejected**: abort without creating the branch

After successful creation, confirm the new branch name and base branch to
the user.

---

## Bulk Mode (only when --bulk)

This section replaces Steps 5–6 when `--bulk` is active. Run after Steps
1–4 complete.

### Bulk Mode: Generate All Branch Names

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` and
send **all** items in a single dispatch with the following prompt:

````text
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
````

Capture the returned list. Map each line to `proposed[i]`.

### Bulk Mode: User Confirmation

Present the full proposed list for a **single approval**:

````text
Proposed branches:

  [1/TOTAL] feature/14-add-auth  (from: "add user auth")
  [2/TOTAL] bugfix/ST-22-fix-timeout  (from: "#22 fix timeout")
  ...

Create all? (yes / edit <i> <new-name> / abort)
````

- **yes** — proceed to creation loop
- **edit i new-name** — replace `proposed[i]` with the given name and
  re-display the full list for another confirmation round
- **abort** — stop without creating any branches

### Bulk Mode: Creation Loop

Create a task with subject `Create branches (TOTAL total)` — replace TOTAL
with the count — and mark it `in_progress` immediately using TaskCreate and
TaskUpdate.

For each `i` in `proposed` (1-indexed):

#### Step 1 — Check if the branch already exists

```bash
git branch --list "<proposed[i]>"
```

#### Step 2 — If the branch already exists

```text
[i/TOTAL] SKIPPED: <proposed[i]> already exists
```

Append to `skipped` list. Continue loop.

#### Step 3 — If the branch does not exist, create it

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

````markdown
## Bulk Branch Creation — Complete

- **Created:** [success count] / [TOTAL]
- **Skipped (already exist):** [skipped count]
- **Failed:** [failure count]

### Skipped

[List skipped branches, or "None."]

### Failures

[List failed branches with errors, or "None."]
````

---

## Self-Verification

Before reporting completion, confirm all of the following:

- [ ] Bootstrap ran and project slug was derived
- [ ] Branch conventions were read from `projects/<slug>.json` or detected
      from git branch analysis
- [ ] The branch name follows the detected convention style
- [ ] No GitHub API calls were made
- [ ] The user approved the branch name before creation
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

---

$ARGUMENTS
