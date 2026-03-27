---
name: commit
version: "2.1.0"
description: Use when a user wants to stage and commit changes with a SCRUM-aware conventional commit message. Trigger for "commit my changes", "create a commit", "write a commit message", "commit this", "git commit", or any request to save and record work in version control.
argument-hint: "[story ref]"
allowed-tools: [Read, Agent, Bash]
---

You are orchestrating a SCRUM-aware git commit. Bootstrap the project
context, parse the user's arguments, detect repository conventions, then
dispatch the scrum-architect agent to draft a conventional commit message.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
bootstrap sequence. The commit skill only needs local conventions — it does
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
| Story reference (e.g., `ST-42`, `#42`) | Link the commit to a SCRUM story or epic |
| *(no arguments)* | Commit without story reference |

Everything that is not a recognized flag is treated as the story reference.

---

## Step 3 --- Detect Repository Conventions

Check the `conventions.commits` field from the project file
(`~/.scrum-toolkit/projects/<slug>.json`) loaded during bootstrap.

- If `conventions.commits` **exists and is not empty**, use it as the
  canonical commit style (e.g., `"conventional"`).
- If `conventions.commits` is **missing or the project file was not
  found**, fall back to git log analysis:

```bash
git log --oneline -20
```

Note the patterns: do commits use conventional format (`feat:`, `fix:`)?
Are scopes used? Are ticket references included? This context will be
passed to the agent so the drafted message fits the repository.

Also run:

```bash
git status
git diff --staged
```

If nothing is staged, run `git diff` to see unstaged changes and inform
the user what is available to stage. Do not proceed with committing until
changes are staged.

---

## Step 4 --- Dispatch to scrum-architect

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the
following prompt:

````text
You are drafting a conventional commit message. The user provided this context:

<story-ref>
{story reference from $ARGUMENTS, or "none provided"}
</story-ref>

<repository-conventions>
{conventions.commits value from the project file, or summary of patterns
observed from git log --oneline -20 in Step 3}
</repository-conventions>

<staged-changes>
{output of git status and git diff --staged from Step 3}
</staged-changes>

Based on the staged changes, draft a conventional commit message following
these rules:

1. Use the format: `<type>(<scope>): <subject>`
2. Choose the type from: feat, fix, docs, style, refactor, perf, test, chore,
   ci, build
3. If a story reference was provided, include it in the scope or subject
   (e.g., `feat(ST-42): add user authentication`)
4. Match the repository's existing conventions
5. Keep the subject line under 72 characters
6. Add a body paragraph if the change is complex enough to warrant explanation

Output ONLY the commit message — no commentary, no markdown fences. Use a
blank line to separate subject from body if a body is included.
````

---

## Step 5 --- User Approval and Commit

Present the drafted commit message to the user and ask for approval:

- **If approved**: execute `git add` for any files the user wants staged
  (or confirm existing staging), then run `git commit -m "<message>"`
- **If the user requests edits**: incorporate feedback and present the
  revised message for another round of approval
- **If rejected**: abort without committing

---

## Self-Verification

Before reporting completion, confirm all of the following:

- [ ] Bootstrap ran and project slug was derived
- [ ] Commit conventions were read from `projects/<slug>.json` or detected
      from git log
- [ ] `git status` shows a clean working tree after the commit
- [ ] The commit message follows the detected convention style
- [ ] No sprint log or GitHub API calls were made

---

$ARGUMENTS
