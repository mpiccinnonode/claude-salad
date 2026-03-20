---
name: commit
version: "1.0.0"
description: Use when a user wants to stage and commit changes with a SCRUM-aware conventional commit message, optionally updating a sprint log.
argument-hint: "[story ref] [--log]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating a SCRUM-aware git commit. Parse the user's arguments,
load relevant reference material, detect repository conventions, then dispatch
the scrum-architect agent to draft a conventional commit message.

---

## Step 1 — Parse Arguments

Read `$ARGUMENTS` and extract:

| Token | Meaning |
| --- | --- |
| Story reference (e.g., `ST-42`, `#42`) | Link the commit to a SCRUM story or epic |
| `--log` | After committing, append an entry to the sprint log file |
| *(no arguments)* | Commit without story reference or log entry |

If both a story reference and `--log` are present, handle both. Everything
that is not a recognized flag is treated as the story reference.

---

## Step 2 — JIT-Read Reference Material

Use the Read tool to load the **DevOps Conventions** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`.

This section covers conventional commit format, branch naming, and PR
templates. Keep the loaded reference in context for the agent dispatch in
Step 4.

---

## Step 3 — Detect Repository Conventions

Run the following commands to understand the repository's existing commit
style:

```bash
git log --oneline -20
```

Note the patterns: do commits use conventional format (`feat:`, `fix:`)?
Are scopes used? Are ticket references included? This context will be passed
to the agent so the drafted message fits the repository.

Also run:

```bash
git status
git diff --staged
```

If nothing is staged, run `git diff` to see unstaged changes and inform
the user what is available to stage. Do not proceed with committing until
changes are staged.

---

## Step 4 — Dispatch to scrum-architect

Use the Agent tool to launch the **scrum-architect** agent with the following
prompt:

````text
You are drafting a conventional commit message. The user provided this context:

<story-ref>
{story reference from $ARGUMENTS, or "none provided"}
</story-ref>

<repository-conventions>
{summary of patterns observed from git log --oneline -20 in Step 3}
</repository-conventions>

<staged-changes>
{output of git status and git diff --staged from Step 3}
</staged-changes>

<reference>
{loaded DevOps Conventions section from Step 2}
</reference>

Based on the staged changes, draft a conventional commit message following
these rules:

1. Use the format: `<type>(<scope>): <subject>`
2. Choose the type from: feat, fix, docs, style, refactor, perf, test, chore,
   ci, build
3. If a story reference was provided, include it in the scope or subject
   (e.g., `feat(ST-42): add user authentication`)
4. Match the repository's existing conventions observed in the git log
5. Keep the subject line under 72 characters
6. Add a body paragraph if the change is complex enough to warrant explanation

Output ONLY the commit message — no commentary, no markdown fences. Use a
blank line to separate subject from body if a body is included.
````

---

## Step 5 — User Approval and Commit

Present the drafted commit message to the user and ask for approval:

- **If approved**: execute `git add` for any files the user wants staged (or
  confirm existing staging), then run `git commit -m "<message>"`
- **If the user requests edits**: incorporate feedback and present the revised
  message for another round of approval
- **If rejected**: abort without committing

---

## Step 6 — Sprint Log (conditional)

This step only runs if `--log` was present in `$ARGUMENTS`.

1. Check if a sprint log file location is already known (look for a
   `.scrum-toolkit-config` or similar marker in the repo root or `.claude/`
   directory)
2. If no location is known, ask the user: "Where should sprint log entries be
   written? (e.g., `docs/sprint-log.md`, `SPRINT.md`)"
3. Remember the location for subsequent calls by writing it to
   `.claude/.scrum-toolkit-config`
4. Append a log entry in this format:

```markdown
- **{date}** | `{commit hash short}` | {commit subject} | {story ref or "—"}
```

Inform the user that the log entry was added and where.

---

## User Arguments

$ARGUMENTS
