---
name: pr
version: "1.0.0"
description: Use when a user wants to create a pull request with SCRUM story references, optionally generating a changelog entry.
argument-hint: "[story ref] [--changelog] [--draft]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating SCRUM-aware pull request creation. Parse the user's
arguments, load relevant reference material, detect repository PR conventions,
then dispatch the scrum-architect agent to draft the PR.

---

## Step 1 — Parse Arguments

Read `$ARGUMENTS` and extract:

| Token | Meaning |
| --- | --- |
| Story reference (e.g., `ST-42`, `#42`) | Link the PR to a SCRUM story or epic |
| `--changelog` | After creating the PR, generate a changelog entry |
| `--draft` | Create the PR as a draft |
| *(no arguments)* | Create a standard PR without story reference or extras |

Multiple flags can be combined. Everything that is not a recognized flag is
treated as the story reference.

---

## Step 2 — JIT-Read Reference Material

Use the Read tool to load the **DevOps Conventions** section from
`plugins/scrum-toolkit/references/scrum-knowledge.md`.

This section covers PR template structure, conventional commits, and semantic
versioning. Keep the loaded reference in context for the agent dispatch in
Step 4.

---

## Step 3 — Detect Repository PR Conventions

Run the following commands to understand the repository's existing PR style:

```bash
cat .github/pull_request_template.md 2>/dev/null || echo "No PR template found"
```

```bash
gh pr list --limit 5 --json title,body --jq '.[] | "## " + .title + "\n" + .body'
```

Note the patterns: does the repo use a PR template? What sections are
expected? Are story references included? How are changes summarized?

Also gather the branch context:

```bash
git branch --show-current
git log main..HEAD --oneline
git diff main..HEAD --stat
```

If the branch has no commits ahead of `main`, inform the user and ask how to
proceed.

---

## Step 4 — Dispatch to scrum-architect

Use the Agent tool to launch the **scrum-architect** agent with the following
prompt:

````text
You are drafting a pull request title and body. The user provided this context:

<story-ref>
{story reference from $ARGUMENTS, or "none provided"}
</story-ref>

<pr-conventions>
{PR template content and patterns from recent PRs observed in Step 3}
</pr-conventions>

<branch-context>
Branch: {current branch name}
Commits:
{output of git log main..HEAD --oneline}

Changed files:
{output of git diff main..HEAD --stat}
</branch-context>

<reference>
{loaded DevOps Conventions section from Step 2}
</reference>

Draft a pull request title and body following these rules:

1. **Title**: concise, under 72 characters, conventional format if the repo
   uses it (e.g., `feat(auth): add OAuth2 login flow`)
2. **Body** must include:
   - Summary: what changed and why (1-3 sentences)
   - Related issue/story link using `Closes #N` syntax if a story ref was
     provided
   - Test plan: how to verify the changes
   - Checklist items if the repo's PR template includes them
3. Match the repository's existing PR conventions observed in recent PRs
4. If a PR template exists, follow its structure

Output the title on the first line, then a blank line, then the body.
No markdown fences around the output.
````

---

## Step 5 — User Approval and PR Creation

Present the drafted PR title and body to the user and ask for approval:

- **If approved**: execute `gh pr create` with the title and body
  - Add `--draft` flag if `--draft` was in `$ARGUMENTS`
  - Push the branch first if needed (`git push -u origin HEAD`)
- **If the user requests edits**: incorporate feedback and present the revised
  draft for another round of approval
- **If rejected**: abort without creating the PR

After successful creation, display the PR URL.

---

## Step 6 — Changelog Entry (conditional)

This step only runs if `--changelog` was present in `$ARGUMENTS`.

1. Look for an existing changelog file in the repo root (`CHANGELOG.md`,
   `CHANGES.md`, `changelog.md`)
2. If no changelog exists, ask the user if they want to create one and where
3. Generate a changelog entry from the PR content in Keep a Changelog format.
   Use the structure: `### [Type]` followed by a list item with the change
   description and PR link. Type is one of: Added, Changed, Deprecated,
   Removed, Fixed, Security.
4. Insert the entry under the `[Unreleased]` section (create it if missing)
5. Inform the user the changelog was updated and offer to commit the change

---

## User Arguments

$ARGUMENTS
