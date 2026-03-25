---
name: branch
version: "2.0.0"
description: Use when a user wants to create a feature branch following the repository's naming conventions, optionally linked to a story or epic. Trigger for "create a branch", "make a feature branch", "branch for this story", "new branch for X", "start work on this feature", or any request to create a new git branch.
argument-hint: "<description or story ref> [--from=<base>]"
allowed-tools: [Read, Agent, Bash]
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
| *(no arguments)* | Ask the user what the branch is for before proceeding |

If no description or story reference is provided, ask the user before
proceeding. The `--from` flag is optional; the default base is the current
branch.

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

## Self-Verification

Before reporting completion, confirm all of the following:

- [ ] Bootstrap ran and project slug was derived
- [ ] Branch conventions were read from `projects/<slug>.json` or detected
      from git branch analysis
- [ ] The branch name follows the detected convention style
- [ ] No GitHub API calls were made
- [ ] The user approved the branch name before creation

---

$ARGUMENTS
