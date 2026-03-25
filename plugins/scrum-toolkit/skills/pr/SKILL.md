---
name: pr
version: "1.0.0"
description: Use when a user wants to create a pull request with SCRUM story references, optionally generating a changelog entry. Trigger for "open a PR", "create a pull request", "submit this for review", "make a PR", "push and create PR", "open a draft PR", or any request to propose changes for review.
argument-hint: "[story ref] [--changelog] [--draft]"
allowed-tools: [Read, Write, Agent, Bash]
---

You are orchestrating SCRUM-aware pull request creation. Bootstrap the
project context, parse the user's arguments, detect repository PR
conventions, then dispatch the scrum-architect agent to draft the PR.
After creation, update the linked item on the Projects v2 board.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
bootstrap sequence. The pr skill needs both local conventions and GitHub
board access (when `hasRepo` is true). The key outputs you need are:

- **slug** — derived project identifier
- **conventions** — from `~/.scrum-toolkit/projects/<slug>.json`
- **hasRepo** — whether this project is GitHub-connected
- **repo** — `org/repo-name` (when `hasRepo` is true)
- **projectId** — GitHub Projects v2 node ID (when `hasRepo` is true)
- **statusFieldId** — Status field node ID (when `hasRepo` is true)

---

## Step 2 --- Parse Arguments

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

## Step 3 --- Check Working Tree

Before gathering PR context, verify the working tree is clean:

```bash
git status --porcelain
```

If there is any output, the working tree has uncommitted or unstaged changes.
Warn the user and list the dirty files. Ask whether they want to commit, stash,
or abort before proceeding. **Do not continue to Step 4 until the working tree
is clean.**

---

## Step 4 --- Detect Repository PR Conventions

First check the `conventions` field from the project file
(`~/.scrum-toolkit/projects/<slug>.json`) loaded during bootstrap. If
conventions are available, use them as the baseline for PR style.

Then run the following commands to gather additional repository context:

```bash
cat .github/pull_request_template.md 2>/dev/null || echo "No PR template found"
```

```bash
gh pr list --limit 5 --json title,body --jq '.[] | "## " + .title + "\n" + .body'
```

Note the patterns: does the repo use a PR template? What sections are
expected? Are story references included? How are changes summarized?

Also gather the branch context. First, detect the correct base branch — do
**not** hardcode `main`. Run these git commands individually (no shell scripts):

```bash
git branch --show-current
```

```bash
git merge-base main HEAD
```

```bash
git merge-base develop HEAD 2>/dev/null
```

Compare the two merge-base results. The base branch whose merge-base is
**closer** to HEAD (more recent common ancestor) is the correct base. If
`git merge-base develop HEAD 2>/dev/null` fails or returns nothing, `develop`
does not exist — use `main`. Store the chosen base as `$BASE`.

Then run:

```bash
git log $BASE..HEAD --oneline
```

```bash
git diff $BASE..HEAD --stat
```

If the branch has no commits ahead of the base branch, inform the user and ask
how to proceed.

---

## Step 5 --- Dispatch to scrum-architect

Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent with the following
prompt:

````text
You are drafting a pull request title and body. The user provided this context:

<story-ref>
{story reference from $ARGUMENTS, or "none provided"}
</story-ref>

<pr-conventions>
{PR template content and patterns from recent PRs observed in Step 4}
</pr-conventions>

<local-conventions>
{conventions from the project file loaded during bootstrap, or "none available"}
</local-conventions>

<branch-context>
Branch: {current branch name}
Base: {detected base branch}
Commits:
{output of git log <base>..HEAD --oneline}

Changed files:
{output of git diff <base>..HEAD --stat}
</branch-context>

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

## Step 6 --- User Approval and PR Creation

Present the drafted PR title and body to the user and ask for approval:

- **If approved**: execute `gh pr create` with the title and body
  - Add `--draft` flag if `--draft` was in `$ARGUMENTS`
  - Push the branch first if needed (`git push -u origin HEAD`)
- **If the user requests edits**: incorporate feedback and present the revised
  draft for another round of approval
- **If rejected**: abort without creating the PR

After successful creation, display the PR URL.

---

## Step 7 --- Update Project Board Status (conditional)

This step only runs when **all** of the following are true:

- `hasRepo` is true (the project is GitHub-connected)
- The PR references a story or issue (a story reference was provided in
  `$ARGUMENTS` or the PR body contains a `Closes #N` / `Fixes #N` link)

If `hasRepo` is false, skip this step entirely — PR creation via
`gh pr create` still works even without a scrum-toolkit portfolio entry.

### Resolve the linked issue

Extract the issue number from the story reference or `Closes #N` syntax in
the PR body. Then look up the issue's project item:

JIT-read `plugins/scrum-toolkit/references/github-api-patterns.md`, the
"Writing Project State" section. Use the "Get single item by issue number"
query from the "Reading Project State" section to find the project item ID
for the linked issue.

### Update status to In Review

Using the `statusFieldId` and `projectId` from bootstrap, and the item ID
from the query above, find the option ID for "In Review" from the Status
field options (resolved during bootstrap). Then run the "Update item status
field" mutation to set the status to "In Review".

### Offer to remove blocked label

Check whether the linked issue has a `blocked` label:

```bash
gh issue view <ISSUE_NUMBER> --repo "<OWNER>/<REPO>" --json labels --jq '.labels[].name'
```

If a `blocked` label is present, ask the user whether to remove it. If they
confirm:

```bash
gh issue edit <ISSUE_NUMBER> --repo "<OWNER>/<REPO>" --remove-label "blocked"
```

---

## Step 8 --- Changelog Entry (conditional)

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

## Self-Verification

Before reporting completion, confirm all of the following:

- [ ] Bootstrap ran and project context was loaded
- [ ] PR conventions were read from `projects/<slug>.json` or detected from
      the repository
- [ ] Working tree was clean before PR creation
- [ ] PR was created successfully and URL was displayed
- [ ] If `hasRepo` and a story/issue was linked: board item status was
      updated to "In Review"
- [ ] If the linked issue had a `blocked` label: user was offered removal
- [ ] If `--changelog` was passed: changelog entry was generated

---

$ARGUMENTS
