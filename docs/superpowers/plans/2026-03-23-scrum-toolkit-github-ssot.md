# scrum-toolkit GitHub SSoT Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure every scrum-toolkit skill around GitHub Projects v2 as the single source of truth, replacing local markdown state files with GraphQL-backed operations and a shared bootstrap sequence.

**Architecture:** All skills share a bootstrap sequence (documented in `references/bootstrap.md`) that resolves project context from `~/.scrum-toolkit/` local JSON and GitHub Projects v2. Skills JIT-load GraphQL templates from `references/github-api-patterns.md`. The `/scrum` wrapper skill serves as the unified entry point, routing to specialist skills or the scrum-architect agent.

**Tech Stack:** Markdown skill files executed by Claude Code, `gh` CLI for GitHub API, GraphQL via `gh api graphql`, local JSON config in `~/.scrum-toolkit/`.

**Spec:** `docs/scrum-toolkit-revised-architecture.md` — read this before starting any task.

---

## Phase 1: Foundation — Reference Files

These reference files are loaded by all skills. Build them first.

### Task 1: Create GitHub API Patterns Reference

**Files:**

- Create: `plugins/scrum-toolkit/references/github-api-patterns.md`

This file provides JIT-loadable GraphQL query templates. Skills read specific `##` sections by offset/limit — not the whole file. Structure must match the sections defined in spec Section 5.1.

- [ ] **Step 1: Create the reference file**

Write `plugins/scrum-toolkit/references/github-api-patterns.md` with these sections, each containing a working `gh api graphql` command template:

```markdown
# GitHub API Patterns

GraphQL query templates for scrum-toolkit skills. Skills load individual
sections via offset/limit reads — keep each section self-contained.

---

## Project Discovery

[find project by number, list all projects for org/repo]

## Reading Project State

[get all items in current iteration with field values,
 get single item by issue number,
 get project custom field definitions]

## Writing Project State

[update item status field, update story points field,
 update priority field, move item to iteration,
 add existing issue to project]

## Issue Operations

[create issue with labels and milestone,
 update issue labels, close/reopen issue]

## Milestone Operations

[list milestones, create milestone with due date]

## Field ID Resolution

[look up custom field node IDs — required before any field update,
 cache strategy: resolve once per session, pass IDs to subsequent queries]
```

Each query template must:

- Use `gh api graphql -f query='...'` syntax (not curl)
- Include placeholder variables with `<ANGLE_BRACKET>` naming
- Include the expected response shape as a comment
- Handle the org-vs-user project path difference (spec Section 4)

Refer to the existing GraphQL patterns already in `skills/gh-board/SKILL.md` lines 66-120 as a starting point — extract, generalize, and expand them.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/references/github-api-patterns.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/references/github-api-patterns.md
git commit -m "feat(scrum-toolkit): add GitHub API patterns reference file

GraphQL query templates for Projects v2 operations, organized by
section for JIT loading by skills."
```

---

### Task 2: Create Shared Bootstrap Reference

**Files:**

- Create: `plugins/scrum-toolkit/references/bootstrap.md`

This documents the shared bootstrap sequence from spec Section 6. Every skill that interacts with GitHub state or local config JIT-loads this reference and follows it before its main logic.

- [ ] **Step 1: Create the bootstrap reference**

Write `plugins/scrum-toolkit/references/bootstrap.md` containing:

1. **Bootstrap Sequence** — the 6-step sequence from spec Section 6.1, verbatim
2. **Bootstrap Output** — the project context object from spec Section 6.2
3. **Local JSON Schemas** — the `portfolio.json` and `projects/<slug>.json` schemas from spec Sections 3.1 and 3.2
4. **No-Repo Fallback** — the extended local schema from spec Section 10.1
5. **Graceful Degradation** — the error handling pattern from spec Section 5.2

Format as instruction text that a skill can paste into its agent dispatch prompt. Use the exact field names from the spec (`slug`, `projectNumber`, `storyPointsFieldId`, etc.).

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/references/bootstrap.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/references/bootstrap.md
git commit -m "feat(scrum-toolkit): add shared bootstrap reference

Documents the bootstrap sequence, local JSON schemas, and graceful
degradation pattern shared by all GitHub-interacting skills."
```

---

### Task 3: Update SCRUM Knowledge Reference — GitHub Mapping

**Files:**

- Modify: `plugins/scrum-toolkit/references/scrum-knowledge.md` (GitHub Mapping section only)

The GitHub Mapping section currently references `sp:N` labels for story points. Update to match spec Section 4.

- [ ] **Step 1: Read the current GitHub Mapping section**

Read `plugins/scrum-toolkit/references/scrum-knowledge.md` and locate the `## GitHub Mapping` section.

- [ ] **Step 2: Update the mapping table**

Replace the GitHub Mapping section content to reflect:

- Story Points → Custom number field `Story Points` on Project board (NOT `sp:N` labels)
- Priority → Custom single-select field `Priority` (Must/Should/Could/Won't) + supplementary `priority:*` labels
- Status → Custom single-select field `Status` (Sprint Backlog/In Progress/In Review/Done)
- Sprint → Custom iteration field `Sprint`
- Sprint Goal → Iteration title or description
- Epic → Milestone (unchanged)
- Assignee → Issue assignee (unchanged)
- Blockers → Label `blocked` + linked issue (unchanged)

Remove any references to `sp:N` labels. Add a note that custom fields are created during board initialization via `gh-board init`.

- [ ] **Step 3: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/references/scrum-knowledge.md"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add plugins/scrum-toolkit/references/scrum-knowledge.md
git commit -m "fix(scrum-toolkit): update GitHub Mapping to use custom fields

Replace sp:N labels with custom number field for story points.
Add Priority, Status, and Sprint custom fields per revised architecture."
```

---

## Phase 2: Agent Update

### Task 4: Rewrite scrum-architect Agent

**Files:**

- Modify: `plugins/scrum-toolkit/agents/scrum-architect.md`

The agent needs awareness of the new architecture but remains phase-agnostic. Skills still own dispatch context — the agent follows instructions.

- [ ] **Step 1: Read the current agent file**

Read `plugins/scrum-toolkit/agents/scrum-architect.md` for the current content.

- [ ] **Step 2: Update the agent**

Key changes to the agent body (keep frontmatter structure, update description examples):

1. **GitHub Projects v2 awareness** — add a section explaining the SSoT model: custom fields (Story Points, Priority, Status, Sprint) on the Project board are the primary data store. `sp:N` labels do not exist. `priority:*` labels are supplementary.

2. **Bootstrap context awareness** — add a note that the invoking skill provides a pre-resolved project context object (slug, field IDs, current iteration, etc.) and the agent should use these IDs directly rather than re-resolving them.

3. **Convention detection update** — update the auto-detection list to include custom field detection on Project boards (not just labels and columns).

4. **Remove `sp:N` references** — any mention of story point labels should be replaced with custom field references.

5. **Update description examples** — ensure examples reference the new architecture (e.g., no `--log` flag on commit).

Remember: the `description:` field must use inline `\n`-escaped quoted string format, not YAML block scalars.

- [ ] **Step 3: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/agents/scrum-architect.md"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add plugins/scrum-toolkit/agents/scrum-architect.md
git commit -m "refactor(scrum-toolkit): update scrum-architect for GitHub SSoT

Add Projects v2 awareness, bootstrap context consumption, and
custom field references. Remove sp:N label references."
```

---

## Phase 3: Core Infrastructure Skills

### Task 5: Rewrite gh-board Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/gh-board/SKILL.md`

This is the most heavily changed skill. Spec Sections 4 and 9 define the new behavior.

- [ ] **Step 1: Read current file and spec sections**

Read `plugins/scrum-toolkit/skills/gh-board/SKILL.md` (already known from exploration).
Re-read spec Sections 4, 9, and 6 for the exact requirements.

- [ ] **Step 2: Rewrite the skill**

Major changes:

**Frontmatter:** Keep name, update description to mention GitHub Projects v2 custom fields and sync workflow.

**Step 1 (Parse Arguments):** Same subcommands (init, sync, status). No changes needed.

**Step 2 (Bootstrap):** NEW — JIT-read `references/bootstrap.md` and execute the bootstrap sequence. This replaces the ad-hoc project detection the current skill does.

**Step 3 (JIT-Read Reference):** Load `references/github-api-patterns.md` sections relevant to the subcommand instead of just the GitHub Mapping from scrum-knowledge.md.

**Init subcommand changes:**

- Create custom fields: `Story Points` (number), `Priority` (single-select: Must/Should/Could/Won't), `Status` (single-select: Sprint Backlog/In Progress/In Review/Done), `Sprint` (iteration)
- Create repo labels: `priority:must`, `priority:should`, `priority:could`, `priority:wont`, `story`, `bug`, `spike`, `epic`, `blocked`
- **Remove** `sp:N` label creation entirely
- After init: update `projects/<slug>.json` with `projectNumber`

**Sync subcommand changes (spec Section 9.2):**

- Read `docs/project-roadmap.md` and `docs/sprint-*.md` (intermediate artifacts from `plan --full`)
- Query current GitHub state via GraphQL
- Compute diff: new issues to create, custom field values to set, milestone assignments, board item additions
- Present diff to user for approval
- Execute approved changes using GraphQL mutations
- Use custom fields (not labels) for story points and priority when creating/updating items

**Status subcommand changes:**

- Use bootstrap context for field IDs
- Query via GraphQL using iteration field to scope to current sprint
- Read story points from custom number field (not labels)
- Read priority from custom field
- Include velocity calculation from custom field values

**Self-Verification:** Update checklist to reference custom fields instead of `sp:N` labels.

- [ ] **Step 3: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/gh-board/SKILL.md"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add plugins/scrum-toolkit/skills/gh-board/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite gh-board for GitHub SSoT

Replace sp:N labels with custom fields, add bootstrap step,
redefine sync as artifact-to-GitHub bridge per spec Section 9."
```

---

### Task 6: Create /scrum Wrapper Skill

**Files:**

- Create: `plugins/scrum-toolkit/skills/scrum/SKILL.md`

New unified entry point defined in spec Section 8.

- [ ] **Step 1: Create the wrapper skill**

Write `plugins/scrum-toolkit/skills/scrum/SKILL.md` implementing spec Section 8 exactly:

**Frontmatter:**

```yaml
name: scrum
version: "1.0.0"
description: >-
  Unified entry point for PM and dev. Handles project selection, portfolio
  navigation, onboarding, dashboard overview, free-form project questions,
  and dispatches to specialist skills.
argument-hint: "[project] [free-form intent or question]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
```

**Body implements spec Section 8.3 flow:**

- Step 1: Bootstrap (JIT-read `references/bootstrap.md`, execute sequence)
- Step 2: Project Selection (parse args, multi-project prompt, auto-select single)
- Step 3: Intent Detection (overview/question/ceremony/authoring/devops/portfolio/onboarding)
- Step 4a: Fetch GitHub State (for overview/question/portfolio intents — the wrapper fetches, not the agent)
- Step 4b: Intent Execution (dispatch to appropriate skill or scrum-architect)
- Step 5: Post-execution (only update portfolio.json on new project)
- Step 6: Onboarding flow (4 questions, convention detection, board setup)

Key design points:

- For `overview`, `question`, `portfolio`: wrapper fetches GitHub state via bootstrap context and GraphQL, then passes data to scrum-architect agent. Agent does NOT fetch state itself.
- For `ceremony`, `authoring`, `devops`: dispatch to the matching specialist skill (not the agent).
- Onboarding: derive slug, detect conventions, find/create Project board, save to portfolio.json and projects/<slug>.json.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/scrum/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/scrum/SKILL.md
git commit -m "feat(scrum-toolkit): add /scrum wrapper skill

Unified entry point with intent routing, project selection,
onboarding, and GitHub state prefetching for overview/question intents."
```

---

## Phase 4: Ceremony Skills

All ceremony skills follow the same pattern: add bootstrap step, read from GitHub Projects v2 instead of raw git/gh CLI, use custom fields.

### Task 7: Rewrite plan Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/plan/SKILL.md`

- [ ] **Step 1: Read current file**

Read `plugins/scrum-toolkit/skills/plan/SKILL.md` (already known).

- [ ] **Step 2: Rewrite the skill**

Key changes:

1. **Add bootstrap step** after argument parsing — JIT-read `references/bootstrap.md`, execute bootstrap to get project context.

2. **`--full` mode changes:**
   - Output is an **intermediate artifact** (spec Section 9.1) written to `docs/project-roadmap.md`
   - After writing, inform user: "Run `/gh-board sync` to push this plan to GitHub"
   - Document structure remains the same (epics, stories, sprints, estimates)

3. **`--sprint` mode changes:**
   - If `hasRepo`: read current sprint items, velocity history, and backlog from GitHub via bootstrap context + GraphQL (load `references/github-api-patterns.md` "Reading Project State" section)
   - Use custom fields for story points and priority (not labels)
   - Capacity planning uses `teamSize` and `sprintDurationDays` from local JSON
   - Reference velocity history from `projects/<slug>.json`

4. **`--grooming` mode changes:**
   - If `hasRepo`: read backlog items from GitHub
   - When re-estimating, note that points will be updated on the board via `/gh-board sync` or direct API call

5. **JIT reference loading:** Also load `references/github-api-patterns.md` "Reading Project State" section for `--sprint` and `--grooming` modes.

6. **Self-verification:** Add check that `--full` output mentions `gh-board sync` as next step.

- [ ] **Step 3: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/plan/SKILL.md"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add plugins/scrum-toolkit/skills/plan/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite plan skill for GitHub SSoT

Add bootstrap step, read sprint data from GitHub Projects v2,
mark --full output as intermediate artifact for gh-board sync."
```

---

### Task 8: Rewrite standup Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/standup/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes:

1. **Add bootstrap step** after argument parsing.

2. **Data gathering (Step 3):** In addition to current git log/PR/issue gathering, add:
   - If `hasRepo`: query current sprint items + statuses from GitHub Projects v2 via GraphQL
   - Load `references/github-api-patterns.md` "Reading Project State" section
   - Read item statuses, assignees, and story points from custom fields
   - Read conventions from local JSON for formatting

3. **Agent dispatch update:** Include GitHub sprint items in the context passed to scrum-architect. The standup report should reference board status (In Progress, In Review) alongside git activity.

4. **Spec compliance:** standup is read-only against GitHub (spec Section 7.1). It reads conventions from local JSON (spec Section 7.2).

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/standup/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/standup/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite standup for GitHub SSoT

Add bootstrap, read sprint items from Projects v2 board,
enrich standup with board status alongside git activity."
```

---

### Task 9: Rewrite sprint-review Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/sprint-review/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes:

1. **Add bootstrap step** after argument parsing.

2. **Data gathering:** If `hasRepo`, read completed sprint items from GitHub Projects v2:
   - Items in Done status for the target sprint iteration
   - Story points from custom field (for velocity calculation)
   - Sprint goal from iteration metadata

3. **Velocity write (NEW):** After generating the review, append to `~/.scrum-toolkit/projects/<slug>.json` `velocityHistory` array:

   ```json
   {
     "sprint": "N",
     "goal": "sprint goal text",
     "committed": "total_points_in_sprint",
     "completed": "points_in_done_status",
     "goalMet": null
   }
   ```

   Note: `goalMet` is set to `null` here — the retro skill fills it in (spec Section 7.1).

4. **Agent dispatch:** Include GitHub sprint data in context. The agent produces the review from real board data, not just git log.

5. **Output options:** Keep the file/inline choice. File naming uses sprint number from iteration.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/sprint-review/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/sprint-review/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite sprint-review for GitHub SSoT

Read sprint data from Projects v2, calculate velocity from custom
fields, append to local velocityHistory on completion."
```

---

### Task 10: Rewrite retro Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/retro/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes:

1. **Add bootstrap step** after argument parsing.

2. **Data gathering:** If `hasRepo`, read sprint data from GitHub Projects v2:
   - All items in the target sprint iteration with statuses
   - Carried-over items (items not in Done)
   - Velocity data (committed vs completed points)

3. **goalMet write (NEW):** After the retro is generated, update the most recent entry in `~/.scrum-toolkit/projects/<slug>.json` `velocityHistory`:
   - Set `goalMet` to `true` or `false` based on the retro analysis
   - The agent determines this from the sprint goal assessment

4. **Agent dispatch:** Include GitHub sprint data and velocity context. The agent uses real board data to identify what went well vs. what didn't.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/retro/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/retro/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite retro for GitHub SSoT

Read sprint data from Projects v2, update goalMet in local
velocityHistory after retrospective analysis."
```

---

## Phase 5: Authoring Skills

### Task 11: Rewrite user-story Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/user-story/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes:

1. **Add bootstrap step** after argument parsing.

2. **Remove `--gh-issue` flag:** Under the new architecture, GitHub issue creation is the default when `hasRepo` is true. The flag becomes unnecessary — stories are always pushed to GitHub when a project board exists.

   Actually, re-reading the spec Section 7.1: user-story "Creates issue, add to project, set custom fields". So the skill should create issues by default when hasRepo. Keep `--gh-issue` as an explicit opt-in for backward compat, but note that `/scrum` routing will set this automatically.

3. **Custom fields instead of labels for story points:**
   - After creating the issue, add it to the Project board
   - Set `Story Points` custom field value (not `sp:N` label)
   - Set `Priority` custom field value (Must/Should/Could/Won't)
   - Set `Status` to "Sprint Backlog" (default for new items)
   - Optionally set `Sprint` iteration if the user specifies

4. **Labels:** Apply `priority:*` labels as supplementary (for outside-board filtering). Apply type label (`story`). Do NOT create `sp:N` labels.

5. **Epic linkage:** If `--epic` provided, assign to corresponding milestone.

6. **JIT reference update:** Load `references/github-api-patterns.md` "Writing Project State" and "Issue Operations" sections for the GitHub publishing step.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/user-story/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/user-story/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite user-story for GitHub SSoT

Create issues with custom fields (story points, priority, status)
instead of sp:N labels. Add to project board automatically."
```

---

### Task 12: Rewrite epic Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/epic/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes:

1. **Add bootstrap step** after argument parsing.

2. **GitHub publishing:** When `hasRepo` and `--gh-milestone`:
   - Create milestone
   - Create issues for story stubs
   - Add issues to Project board
   - Set custom fields (Story Points, Priority, Status) on each board item
   - Do NOT create `sp:N` labels

3. **JIT reference update:** Load `references/github-api-patterns.md` "Milestone Operations", "Issue Operations", and "Writing Project State" sections.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/epic/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/epic/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite epic for GitHub SSoT

Set custom fields on board items instead of sp:N labels.
Add bootstrap step and updated API patterns reference."
```

---

### Task 13: Rewrite milestone Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/milestone/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes:

1. **Add bootstrap step** after argument parsing.
2. **JIT reference update:** Load `references/github-api-patterns.md` "Milestone Operations" section.
3. **Sprint date calculation:** Use `sprintDurationDays` from local JSON + iteration metadata from GitHub to calculate due dates.
4. Minor — no `sp:N` references to remove (milestone skill doesn't set story points).

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/milestone/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/milestone/SKILL.md
git commit -m "refactor(scrum-toolkit): rewrite milestone for GitHub SSoT

Add bootstrap step, use local JSON config for sprint date
calculation, load API patterns reference."
```

---

## Phase 6: DevOps Skills

### Task 14: Rewrite commit Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/commit/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes per spec Section 7.1 ("commit skill only commits; no GitHub state updates"):

1. **Add bootstrap step** — only for reading conventions from local JSON (`projects/<slug>.json`). The commit skill does NOT interact with GitHub API.

2. **Remove `--log` flag entirely.** Delete Step 6 (Sprint Log) and all references to sprint log files, `.scrum-toolkit-config`, and `docs/sprint-log.md`. Sprint state lives in GitHub, not local files.

3. **Update argument parsing:** Remove `--log` from the argument table. Only story reference remains as optional.

4. **Update description in frontmatter:** Remove "optionally updating a sprint log" — now just "stage and commit changes with a SCRUM-aware conventional commit message".

5. **Convention usage:** Read commit conventions from `projects/<slug>.json` if available (cached from auto-detection), otherwise fall back to git log analysis.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/commit/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/commit/SKILL.md
git commit -m "refactor(scrum-toolkit): simplify commit skill to commit-only

Remove --log flag and sprint log functionality. Sprint state
now tracked in GitHub Projects v2, not local files."
```

---

### Task 15: Rewrite pr Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/pr/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes per spec Section 7.1 ("pr updates item status, removes blocked label"):

1. **Add bootstrap step** after argument parsing.

2. **Post-PR creation (NEW):** After the PR is created and the user approves:
   - If `hasRepo` and the PR references a story/issue: update the corresponding Project board item's `Status` field to "In Review"
   - If the issue has a `blocked` label: offer to remove it
   - Load `references/github-api-patterns.md` "Writing Project State" section for the status update

3. **Convention usage:** Read PR conventions from local JSON if available.

4. **Keep existing behavior:** Clean tree check, base branch detection, PR template detection, changelog support — all unchanged.

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/pr/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/pr/SKILL.md
git commit -m "refactor(scrum-toolkit): add board status update to pr skill

After PR creation, update linked item status to In Review on
the Projects v2 board. Add bootstrap step."
```

---

### Task 16: Rewrite branch Skill

**Files:**

- Modify: `plugins/scrum-toolkit/skills/branch/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Key changes:

1. **Add bootstrap step** — for reading cached branch conventions from `projects/<slug>.json`.

2. **Convention source:** Check local JSON conventions first (`conventions.branches` pattern). Fall back to `git branch -r` analysis only if conventions are not cached.

3. No GitHub API interaction (branch skill is read-only per spec Section 7.1).

- [ ] **Step 2: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/skills/branch/SKILL.md"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add plugins/scrum-toolkit/skills/branch/SKILL.md
git commit -m "refactor(scrum-toolkit): use cached conventions in branch skill

Read branch naming conventions from local JSON config.
Fall back to git branch analysis when not cached."
```

---

## Phase 7: Plugin Metadata and Documentation

### Task 17: Update Plugin CLAUDE.md

**Files:**

- Modify: `plugins/scrum-toolkit/CLAUDE.md`

- [ ] **Step 1: Read current file**

Read `plugins/scrum-toolkit/CLAUDE.md`.

- [ ] **Step 2: Update the file**

Changes:

1. **Add `skills/scrum/SKILL.md`** to the repository structure tree (unified entry point).
2. **Add `references/bootstrap.md`** and `references/github-api-patterns.md` to the structure tree.
3. **Add bootstrap convention:** "All skills that interact with GitHub or local config must JIT-read `references/bootstrap.md` and execute the bootstrap sequence before their main logic."
4. **Update convention detection note:** Clarify that conventions are cached in `~/.scrum-toolkit/projects/<slug>.json` during onboarding (detect-once-and-cache pattern).
5. **Add GitHub SSoT note:** "Story points, priority, status, and sprint assignment are stored as custom fields on the GitHub Projects v2 board. `sp:N` labels are not used."
6. **Remove any references to `--log` flag or sprint log files.**

- [ ] **Step 3: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/CLAUDE.md"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add plugins/scrum-toolkit/CLAUDE.md
git commit -m "docs(scrum-toolkit): update CLAUDE.md for GitHub SSoT architecture

Add bootstrap convention, new reference files, /scrum wrapper skill,
and GitHub Projects v2 custom fields documentation."
```

---

### Task 18: Bump Version and Update Marketplace

**Files:**

- Modify: `plugins/scrum-toolkit/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: All 12 skill frontmatter `version:` fields

- [ ] **Step 1: Read current versions**

Read `plugins/scrum-toolkit/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

- [ ] **Step 2: Bump to 2.0.0**

This is a breaking change (sp:N labels removed, --log flag removed, bootstrap required, new SSoT model). Bump from 1.0.0 to 2.0.0.

Update in all three places:

1. `plugins/scrum-toolkit/.claude-plugin/plugin.json` — set `"version": "2.0.0"`
2. `.claude-plugin/marketplace.json` — update the scrum-toolkit entry to `"version": "2.0.0"`
3. Every skill `SKILL.md` frontmatter — set `version: "2.0.0"` (12 skills total: plan, standup, retro, sprint-review, user-story, epic, milestone, commit, pr, branch, gh-board, scrum)

- [ ] **Step 3: Lint**

Run: `npx markdownlint-cli2 "plugins/scrum-toolkit/**/*.md"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add plugins/scrum-toolkit/.claude-plugin/plugin.json \
       .claude-plugin/marketplace.json \
       plugins/scrum-toolkit/skills/*/SKILL.md
git commit -m "chore(scrum-toolkit): bump version to 2.0.0

Breaking changes: GitHub Projects v2 as SSoT, sp:N labels removed,
--log flag removed from commit skill, bootstrap required for all skills."
```

---

## Execution Notes

**Dependency order:** Phase 1 (Tasks 1-3) must complete before any other phase. Phases 2-6 can run in parallel after Phase 1. Phase 7 runs last.

**Parallelization opportunities:**

- Tasks 1, 2, 3 are independent — can run in parallel
- Tasks 4-16 are independent of each other (only depend on Phase 1) — can run in parallel in batches
- Task 18 must run last (touches all skill files)

**Lint after every change.** This project has no test suite — `markdownlint-cli2` is the only automated validation.

**No-repo fallback:** Tasks 5-16 must handle the `hasRepo: false` path. When implementing each skill, include a conditional: "If `hasRepo` is false, skip GitHub API steps and operate against local JSON fallback schema (see `references/bootstrap.md` Section: No-Repo Fallback)."

**Agent frontmatter format:** The `description:` field in `agents/scrum-architect.md` must use inline `\n`-escaped quoted strings, not YAML block scalars. See memory file `feedback_agent_frontmatter.md`.
