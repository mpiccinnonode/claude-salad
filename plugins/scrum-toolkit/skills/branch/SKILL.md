---
name: branch
version: "1.0.0"
description: Use when a user wants to create a feature branch following the repository's naming conventions, optionally linked to a story or epic.
argument-hint: "<description or story ref> [--from=<base>]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating SCRUM-aware branch creation. Parse the user's arguments,
load relevant reference material, detect repository branch naming conventions,
then dispatch the scrum-architect agent to generate the branch name.

---

## Step 1 — Parse Arguments

Read `$ARGUMENTS` and extract:

| Token | Meaning |
| --- | --- |
| Description or story reference | The purpose of the branch (e.g., `ST-42`, `add user auth`, `#42 login page`) |
| `--from=<base>` | Base branch to create from (e.g., `--from=develop`, `--from=main`) |
| *(no arguments)* | Ask the user what the branch is for before proceeding |

If no description or story reference is provided, ask the user before
proceeding. The `--from` flag is optional; the default base is the current
branch.

---

## Step 2 — JIT-Read Reference Material

Use the Read tool to load the **DevOps Conventions** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`.

This section covers branch naming patterns (`feature/`, `bugfix/`, `hotfix/`,
`release/`). Keep the loaded reference in context for the agent dispatch in
Step 4.

---

## Step 3 — Detect Repository Branch Naming Conventions

Run the following command to understand the repository's existing branch
naming style:

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

## Step 4 — Dispatch to scrum-architect

Use the Agent tool to launch the **scrum-architect** agent with the following
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
{branch naming patterns observed from git branch -r in Step 3}
</repository-conventions>

<reference>
{loaded DevOps Conventions section from Step 2}
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

Output ONLY the branch name — no commentary, no explanation.
````

---

## Step 5 — User Approval and Branch Creation

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

## User Arguments

$ARGUMENTS
