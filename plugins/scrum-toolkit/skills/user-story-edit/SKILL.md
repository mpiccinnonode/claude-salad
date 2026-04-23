---
name: user-story-edit
version: "2.1.0"
description: Use when a user needs to apply a scoped, targeted change to one or more existing GitHub issues (user stories) — adding an acceptance criterion, amending a section, or re-estimating — without rewriting the whole body. Trigger for "update story X", "edit story", "amend the story", "add an AC to issue #N", "add a caching AC to these stories", or any request to modify existing stories in place rather than authoring new ones. NOT for creating new stories (use /user-story) or whole-backlog grooming (use /sprint-plan --grooming).
argument-hint: "<issue-refs> -- <change-description> [--yes] [--bulk]"
allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
---

You are orchestrating targeted edits to existing user story issues. Bootstrap
the project context, parse the user's arguments, fetch each issue's current
body, then dispatch the scrum-architect agent to produce a **diff proposal**
(not a full rewrite). Present the diff, confirm with the user, then apply via
`gh issue edit`.

---

## Step 1 --- Bootstrap

JIT-read `plugins/scrum-toolkit/references/bootstrap.md` and execute the
full bootstrap sequence. If bootstrap triggers onboarding, complete onboarding
before proceeding. Produce the **project context object** for subsequent steps.

### Hard requirement: hasRepo

This skill edits remote GitHub issues. If `hasRepo` is **false**, abort with:

> **`/user-story-edit` requires a GitHub-linked project.** This project has
> no repo configured. Use `/user-story` to author new local stories, or link
> a repo via `/scrum onboard`.

---

## Step 2 --- Parse Arguments

Split `$ARGUMENTS` on the first standalone `--` token. Everything before is
the `<issue-refs>` segment; everything after is the `<change-description>`.

If `--` is absent, try to infer: take the leading token(s) that look like
issue refs (`#NNN`, `NNN`, or `org/repo#NNN`) until a non-ref token appears;
the rest is the change. If the split is ambiguous, ask the user to use
explicit `--`.

Extract:

- **issueRefs** (required) --- list of issue references. Split on commas
  and/or whitespace (both `#40,#41`, `#40, #41`, and `#40 #41` are accepted).
  Each ref matches `#?\d+` or `<owner>/<repo>#\d+` or a full issue URL.
  Normalize each to a canonical `{ owner, repo, number }` tuple using the
  bootstrap `repo` when the ref has no `owner/repo` prefix.
- **changeDescription** (required) --- plain-text scoped change (e.g.,
  "add a caching AC with TTL 1 week").
- **--yes** (optional flag) --- skip the confirmation prompt before applying.
- **--bulk** (optional flag) --- bulk mode: the `issueRefs`/`changeDescription`
  split does not apply. Instead, the entire `$ARGUMENTS` body (minus flags)
  is parsed as either a JSON array of `{ "issue": "<ref>", "change": "<text>" }`
  objects, or newline-separated `<ref> :: <change>` pairs. **Flag handling:**
  strip `--bulk` and `--yes` from the argument string *before* parsing the
  body, regardless of where they appear (start, end, or between). Do not
  rely on flag order. Continue to **Step 2b** after parsing.

If `issueRefs` is empty or `changeDescription` is missing (and `--bulk` was
not set), ask the user before proceeding.

---

## Step 2b --- Parse Bulk Input (only when --bulk)

If `--bulk` was **not** detected in Step 2, skip to Step 3.

Determine the input format from the `$ARGUMENTS` value (excluding flags):

- **JSON array** — if the input starts with `[`, parse it as a JSON array of
  `{ "issue": "<ref>", "change": "<text>" }` objects.
- **Newline-separated plain text** — otherwise, split on `\n`. Trim blank
  lines. Each non-empty line must match `<ref> :: <change>` — split on the
  first ` :: ` occurrence. Lines that do not match are recorded as parse
  failures (not agent failures) and listed in the summary.

If the resulting list is empty, ask the user:

> **Bulk mode requires at least one `<ref> :: <change>` entry.** Provide
> entries either as a newline-separated list or a JSON array of
> `{ issue, change }` objects.

Record:

- **items** — ordered list of `{ ref, change }` pairs.
- **total** — count of items.

After Step 3 completes, jump to the **Bulk Mode** section instead of Steps 4–7.

---

## Step 3 --- JIT-Read Reference Material

Read the following sections from `plugins/scrum-toolkit/references/scrum-knowledge.md`:

- **Artifacts** section --- for user story format, acceptance criteria format,
  INVEST criteria, and estimation scales.
- **GitHub Mapping** section --- for issue label taxonomy and project board
  field conventions (needed when a change triggers re-estimation).

Also JIT-read the **"Writing Project State"** and **"Issue Operations"**
sections from `plugins/scrum-toolkit/references/github-api-patterns.md` for
`gh issue edit` and `updateProjectV2ItemFieldValue` templates. The
"Writing Project State" section includes the **"Resolve project item ID for
issue"** sub-section needed for Step 7b re-estimation updates — do not skip
it.

---

## Step 4 --- Fetch Current Issue Bodies

For each entry in `issueRefs` (or each `items[i].ref` in bulk mode), run:

```bash
gh issue view <number> --repo <owner/repo> --json number,title,body,labels,url,milestone
```

Capture the result as `issueState[i]`. If an issue cannot be fetched (404,
wrong repo, permission), record the failure:

- Single-item mode: abort with the error.
- Bulk mode: append to `failures` with reason `fetch failed: <error>` and
  continue with the remaining items.

---

## Step 5 --- Dispatch to scrum-architect (per item)

For each fetched issue, use the Agent tool with
`subagent_type: "scrum-toolkit:scrum-architect"` to dispatch the
**scrum-architect** agent with the following prompt:

````text
## Phase: User Story Editing

### Inputs

- **Issue:** #[number] — [title] ([url])
- **Current body:**

[paste the full current body verbatim]

- **Scoped change request:** [changeDescription]
- **Bootstrap context:** [full project context object]
- **Project language:** [bootstrap.language — e.g., "Italian", "English"]

### Reference Knowledge

[Paste the Artifacts section]

[Paste the GitHub Mapping section]

### Instructions

Produce a **targeted amendment** to the issue body, not a full rewrite.

1. Identify which sections of the current body the scoped change implicates.
   Leave every other section byte-identical.
2. When the change adds acceptance criteria: **append** new ACs after the
   existing ones, preserving existing AC numbering. Never renumber or reorder.
3. When the change amends existing content: modify only the minimum span
   required. Preserve surrounding prose.
4. Preserve the project `language` — if the current body is in Italian,
   generated additions stay in Italian.
5. If the change implies re-estimation (new scope, new ACs that grow the
   story meaningfully), propose a new Fibonacci story-point value and/or
   MoSCoW priority, with a one-line rationale. If no re-estimation is
   warranted, omit this block.
6. Apply INVEST and Given/When/Then conventions to any new AC content.

### Output Format

Return a single markdown block with these sections:

```markdown
## Proposed Amendment — Issue #[number]

### Summary

[One sentence: what is changing and why, in the project language.]

### Diff

[A unified-diff-style block showing the old lines and the new lines.
Use `-` for removed lines, `+` for added lines, and ` ` (space) for
context. Only include hunks that change.]

### New Body

```
[The full proposed new issue body, ready to pass to `gh issue edit --body-file`.]
```

### Re-estimation (optional)

- **Story Points:** [old] → [new] — [rationale]
- **Priority:** [old] → [new] — [rationale]

[Omit the Re-estimation block entirely when no changes are proposed.]
```

### Safety Rules

- Do not silently rewrite sections outside the scoped change.
- Do not switch languages.
- Do not invent requirements or ACs not implied by the change description.
- If the change description is ambiguous, return a proposal marked
  `## Ambiguous — Clarification Needed` instead of a diff, listing the
  specific interpretation questions.
````

Capture the agent's output as `proposal[i]`.

---

## Step 6 --- Preview and Confirm

Display each proposal to the user exactly as returned by the agent.

If **any** proposal came back as `## Ambiguous — Clarification Needed`, stop
the flow, show the questions, and wait for the user's answer. Do not proceed
to Step 7.

If `--yes` was **not** provided, ask:

> Apply these changes? (y/N)

Wait for the user's confirmation. On anything other than a clear yes, abort
and report "No changes applied."

---

## Step 7 --- Apply Changes

For each confirmed proposal:

### 7a --- Update issue body

Write the proposal's **New Body** to a temp file and run:

```bash
gh issue edit <number> --repo <owner/repo> --body-file <tmp>
```

Capture success/failure.

### 7b --- Update project board fields (only if re-estimation block present)

If the proposal includes a **Re-estimation** block AND `hasRepo` is true AND
the issue is on the project board, resolve the project item ID and update
the relevant custom fields:

1. Resolve the project item ID for this issue (see
   `github-api-patterns.md` "Resolve project item ID for issue").
2. If **Story Points** changed: `updateProjectV2ItemFieldValue` with
   `storyPointsFieldId` and the new numeric value.
3. If **Priority** changed: `updateProjectV2ItemFieldValue` with
   `priorityFieldId` and the option ID matching the new MoSCoW priority.

If the issue is not on the board, skip board updates and note it in the
summary.

---

## Step 8 --- Summary

Present a brief summary:

- Issues updated (number, title, URL).
- For each: whether body was amended, and which board fields were updated.
- Suggested next steps (e.g., "Review updated stories with the team" or
  "Re-run `/sprint-plan --grooming` if re-estimation affects sprint scope").

---

---

## Bulk Mode (only when --bulk)

This section replaces Steps 4–8 when `--bulk` is active. Run after Steps
1–3 complete.

### Bulk Mode: Edit Loop

Create a task with subject `Edit stories (TOTAL total)` — replace TOTAL with
the count from Step 2b — and mark it `in_progress` immediately using
TaskCreate and TaskUpdate.

For each item `i` in `items` (1-indexed), execute the following loop body:

#### Loop body for item i of TOTAL

Emit a progress line before starting:

```text
[i/TOTAL] Editing issue <ref>: <first 60 chars of change description>
```

##### a) Fetch current body

Run `gh issue view` as in Step 4. On failure, append to `failures` and
continue.

##### b) Dispatch scrum-architect

Use the Step 5 prompt with this item's body and change description.

Capture the proposal. If the agent returns
`## Ambiguous — Clarification Needed`, mark the item as **needs-clarification**
(do not treat as a failure) and continue.

##### c) Apply (if not ambiguous)

If `--yes` was set, apply immediately (Step 7a + 7b). Otherwise, collect
all non-ambiguous proposals and present them together before applying, with
a single confirmation prompt gating the whole batch.

Emit per item:

```text
[i/TOTAL] Updated issue #<number> — <title>
```

##### On failure (any sub-step a, b, or c)

Emit:

```text
[i/TOTAL] FAILED: "<ref>" — <error message>
```

Append to `failures`. **Continue the loop** — do not abort the batch.

---

After the loop completes, mark the `Edit stories (TOTAL total)` task as
`completed`.

### Bulk Mode: Summary

Present a summary in place of Step 8:

````markdown
## Bulk Story Editing — Complete

- **Stories updated:** [success count] / [TOTAL]
- **Needs clarification:** [ambiguous count]
- **Failures:** [failure count]

### Results

| # | Issue | Title | Status | Body amended | Points | Priority |
|---|-------|-------|--------|--------------|--------|----------|
| [i/TOTAL] | #N | ... | ✓ updated / ambiguous / failed | ✓ / — | old→new / — | old→new / — |

### Needs Clarification

[If any, list issue + the agent's questions. Otherwise: "None."]

### Failures

[If any, list with error. Otherwise: "None."]

**Next steps:** Resolve clarifications by re-running
`/user-story-edit <refs> -- <clearer description>`.
````

---

## Self-Verification

After the agent completes, verify before presenting:

- [ ] Bootstrap executed; `hasRepo` is true (or flow aborted cleanly).
- [ ] Each issue's current body was fetched before dispatch.
- [ ] The agent returned a diff/New Body — not a full rewrite of unchanged
  sections.
- [ ] Existing AC numbering preserved; new ACs appended only.
- [ ] Project `language` preserved (Italian stays Italian, etc.).
- [ ] Re-estimation block is present **only** when the change warrants it.
- [ ] If not `--yes`: user was shown the diff and confirmed before any
  `gh issue edit` ran.
- [ ] `gh issue edit --body-file` was used (not `--body` with inline text —
  bodies can be multi-line).
- [ ] Board custom field updates happened only when re-estimation was
  proposed AND the issue is on the board.
- [ ] No `sp:N` labels were created or modified.
- [ ] If `--bulk`: Steps 1–3 ran once before the loop; failures were
  accumulated; the loop did not abort on first failure.
- [ ] If `--bulk`: a wrapping Task was created before the loop and marked
  completed after.

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
