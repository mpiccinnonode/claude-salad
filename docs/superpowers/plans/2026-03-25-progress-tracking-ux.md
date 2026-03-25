# Progress Tracking UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add phase-level Task panel tracking and inline `[N/TOTAL]` counters to the four scrum-toolkit skills that perform bulk GitHub operations.

**Architecture:** Each affected SKILL.md gets `TaskCreate`/`TaskUpdate` added to its `allowed-tools` frontmatter, plus Task lifecycle instructions inserted at each phase boundary. For skill-driven loops (`epic`), Tasks are created/completed around each step. For agent-driven loops (`gh-board`, `sprint-plan`), Tasks are created before the dispatch and completed after. Agent dispatch prompts for `gh-board` get a one-line `[N/TOTAL]` counter instruction added to execution loops.

**Tech Stack:** Pure markdown files — no build tools, no test runner. Verification is done by reading the modified file and running `npx markdownlint-cli2`.

---

## File Map

| File | Change type | What changes |
| --- | --- | --- |
| `plugins/scrum-toolkit/skills/epic/SKILL.md` | Modify | `allowed-tools`, Task lifecycle around Steps 4 and 5a-5c, self-verification checklist |
| `plugins/scrum-toolkit/skills/sprint-plan/SKILL.md` | Modify | `allowed-tools`, wrapping Task around `--full` Step 4, self-verification checklist |
| `plugins/scrum-toolkit/skills/gh-board/SKILL.md` | Modify | `allowed-tools`, Task lifecycle before/after sync and init dispatches, `[N/TOTAL]` counter instructions in sync Step 5 and init Step 4 loops, self-verification checklists |

Spec: `docs/superpowers/specs/2026-03-25-progress-tracking-ux-design.md`

---

## Task 1: `epic/SKILL.md` — allowed-tools

**Files:**

- Modify: `plugins/scrum-toolkit/skills/epic/SKILL.md:6`

- [ ] **Step 1: Add TaskCreate and TaskUpdate to allowed-tools**

  Open `plugins/scrum-toolkit/skills/epic/SKILL.md`. Find line 6:

  ```text
  allowed-tools: [Read, Write, Agent, Bash]
  ```

  Replace with:

  ```text
  allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
  ```

- [ ] **Step 2: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/epic/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 3: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/epic/SKILL.md
  git commit -m "chore(epic): add TaskCreate, TaskUpdate to allowed-tools"
  ```

---

## Task 2: `epic/SKILL.md` — Step 4 Task lifecycle

**Files:**

- Modify: `plugins/scrum-toolkit/skills/epic/SKILL.md` (Step 4 section)

- [ ] **Step 1: Add Task creation before Step 4 agent dispatch**

  Find the line that reads:

  ```text
  Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to dispatch the **scrum-architect** agent with the
  ```

  Insert this block immediately above it (before the agent dispatch instruction):

  ```text
  Create a task with subject `Generate epic content` and mark it `in_progress` immediately using TaskCreate and TaskUpdate.

  ```

- [ ] **Step 2: Add Task completion after Step 4 returns**

  Find the line:

  ```text
  Display the agent's output to the user.
  ```

  Insert this line immediately above it:

  ```text
  Mark the `Generate epic content` task as `completed`.

  ```

- [ ] **Step 3: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/epic/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 4: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/epic/SKILL.md
  git commit -m "feat(epic): track content generation phase with Task"
  ```

---

## Task 3: `epic/SKILL.md` — Step 5 Task lifecycle and inline counters

**Files:**

- Modify: `plugins/scrum-toolkit/skills/epic/SKILL.md` (Step 5 section)

- [ ] **Step 1: Add Task before Step 5a (Create the milestone)**

  Find the line:

  ```text
  #### 5a --- Create the milestone
  ```

  Insert immediately above it:

  ```text
  Create a task with subject `Create GitHub milestone` and mark it `in_progress` immediately using TaskCreate and TaskUpdate.

  ```

- [ ] **Step 2: Add Task completion after Step 5a**

  Find the line:

  ```text
  Capture the milestone number from the response.
  ```

  Add after it:

  ```text

  Mark the `Create GitHub milestone` task as `completed`.
  ```

- [ ] **Step 3: Add Task before Step 5b (Create issues) with inline counter instruction**

  Find the line:

  ```text
  #### 5b --- Create issues for each story stub
  ```

  Insert immediately above it:

  ```text
  Count the story stubs from the agent output (call this N). Create a task with subject `Create issues (N total)` — replace N with the actual count — and mark it `in_progress` immediately.

  ```

- [ ] **Step 4: Add inline counter instruction to the Step 5b loop**

  Find the paragraph that starts with:

  ```text
  For each story stub from the epic output, use `gh issue create` with:
  ```

  At the end of that paragraph (after the "Collect all failures" sentence), add:

  ```text

  Prefix each `gh issue create` attempt with `[M/N]` — e.g., `[1/7] Creating issue: As a user...`. For failures, emit `[M/N] FAILED: "story title" — <error>`. Continue the loop on failure and accumulate failures in a local list.
  ```

- [ ] **Step 5: Add Task completion after Step 5b loop**

  Find the line:

  ```text
  #### 5c --- Add issues to project board and set custom fields
  ```

  Insert immediately above it:

  ```text
  Mark the `Create issues (N total)` task as `completed`.

  ```

- [ ] **Step 6: Add Task before Step 5c with inline counter instruction**

  Find the line:

  ```text
  For each created issue:
  ```

  Insert immediately above it:

  ```text
  Create a task with subject `Set project board fields (N items)` — replace N with the issue count from Step 5b — and mark it `in_progress` immediately.

  Prefix each field-setting sequence (steps 1-3 per issue) with `[M/N]` — e.g., `[1/7] Setting fields for issue #42`. For failures, emit `[M/N] FAILED: issue #42 — <error>`. Continue on failure and accumulate in the local failures list.

  ```

- [ ] **Step 7: Add Task completion after Step 5c**

  Find the line:

  ```text
  Report the created milestone URL and a table of created issues with their
  ```

  Insert immediately above it:

  ```text
  Mark the `Set project board fields (N items)` task as `completed`.

  ```

- [ ] **Step 8: Add failure block to Step 6 Summary**

  Find the line:

  ```text
  ## Step 6 --- Summary
  ```

  In the summary bullet list (which starts with "Epic title and business objective"), add this item at the end:

  ```text
  - If any issue creation or field-setting failures were accumulated, append a **Failures** block listing each failure with its `[M/N]` counter and error message, and note which items require manual retry.
  ```

- [ ] **Step 9: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/epic/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 10: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/epic/SKILL.md
  git commit -m "feat(epic): add Task lifecycle and [N/TOTAL] counters for GitHub publishing steps"
  ```

---

## Task 4: `epic/SKILL.md` — Self-verification checklist

**Files:**

- Modify: `plugins/scrum-toolkit/skills/epic/SKILL.md` (Self-Verification section)

- [ ] **Step 1: Add skill-driven checklist items**

  Find the last checklist item in the Self-Verification section:

  ```text
  - [ ] All output follows markdown formatting conventions.
  ```

  Add these items after it:

  ```text
  - [ ] Phase Tasks were created before each step and completed after.
  - [ ] Skill emits `[N/TOTAL]` counters directly in the issue creation and field-setting loops.
  - [ ] Loop failures are accumulated and appended to the Step 6 summary.
  - [ ] All Tasks were marked completed before the final summary.
  ```

- [ ] **Step 2: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/epic/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 3: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/epic/SKILL.md
  git commit -m "chore(epic): add progress tracking items to self-verification checklist"
  ```

---

## Task 5: `sprint-plan/SKILL.md` — allowed-tools and wrapping Task

**Files:**

- Modify: `plugins/scrum-toolkit/skills/sprint-plan/SKILL.md:6` (allowed-tools)
- Modify: `plugins/scrum-toolkit/skills/sprint-plan/SKILL.md` (Step 4 Full Roadmap section)
- Modify: `plugins/scrum-toolkit/skills/sprint-plan/SKILL.md` (Self-Verification section)

- [ ] **Step 1: Add TaskCreate and TaskUpdate to allowed-tools**

  Find line 6:

  ```text
  allowed-tools: [Read, Write, Agent, Bash]
  ```

  Replace with:

  ```text
  allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
  ```

- [ ] **Step 2: Add wrapping Task before Full Roadmap dispatch**

  The Full Roadmap dispatch instruction begins with:

  ```text
  Use the Agent tool with `subagent_type: "scrum-toolkit:scrum-architect"` to launch the **scrum-architect** agent. Include the
  bootstrap project context, loaded reference material, and the mode-specific
  prompt from the appropriate section below.
  ```

  Insert immediately above the Agent tool invocation (keep the introductory sentence, insert before the actual dispatch):

  ```text
  If the mode is **Full Roadmap**, create a task with subject `Generate full SCRUM roadmap (5 phases)` and mark it `in_progress` immediately using TaskCreate and TaskUpdate.

  ```

- [ ] **Step 3: Add Task completion after Full Roadmap dispatch returns**

  The Full Roadmap dispatch prompt ends with `docs/project-roadmap.md` write and the "Run `/gh-board sync`" message. The skill resumes at Step 5 (Self-Verification). Insert immediately before Step 5:

  ```text
  If the mode was **Full Roadmap**, mark the `Generate full SCRUM roadmap (5 phases)` task as `completed` immediately after the agent dispatch returns.

  ```

- [ ] **Step 4: Add self-verification checklist items**

  Find the last item in the Self-Verification checklist:

  ```text
  - [ ] All output follows markdown formatting conventions.
  ```

  Add after it:

  ```text
  - [ ] For `--full` mode: wrapping Task was created before the agent dispatch.
  - [ ] For `--full` mode: wrapping Task was marked completed immediately after the agent returns.
  ```

- [ ] **Step 5: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/sprint-plan/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 6: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/sprint-plan/SKILL.md
  git commit -m "feat(sprint-plan): add wrapping Task for full roadmap generation"
  ```

---

## Task 6: `gh-board/SKILL.md` — allowed-tools

**Files:**

- Modify: `plugins/scrum-toolkit/skills/gh-board/SKILL.md:6`

- [ ] **Step 1: Add TaskCreate and TaskUpdate to allowed-tools**

  Find line 6:

  ```text
  allowed-tools: [Read, Write, Agent, Bash]
  ```

  Replace with:

  ```text
  allowed-tools: [Read, Write, Agent, Bash, TaskCreate, TaskUpdate]
  ```

- [ ] **Step 2: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/gh-board/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 3: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/gh-board/SKILL.md
  git commit -m "chore(gh-board): add TaskCreate, TaskUpdate to allowed-tools"
  ```

---

## Task 7: `gh-board/SKILL.md` — sync Task lifecycle

**Files:**

- Modify: `plugins/scrum-toolkit/skills/gh-board/SKILL.md` (Step 4 shared dispatch block and before Step 5)

The `gh-board` skill has a **single shared dispatch instruction** at lines 58-60 (Step 4), used for all three subcommands. There is no per-subcommand dispatch call. Task creation instructions go into the Step 4 prose (before the dispatch), conditioned on subcommand. Task completion instructions go before `## Step 5 --- Self-Verification` (line 318), conditioned on subcommand.

- [ ] **Step 1: Add Tasks before sync dispatch (in Step 4 prose)**

  Find the line:

  ```text
  subcommand-specific prompt from the appropriate section below.
  ```

  (This is line 60 — end of the shared dispatch instruction.) Add this block immediately after it:

  ```text

  If the subcommand is **sync**, create two tasks before dispatching:

  1. Subject: `Read artifacts & compute diff` — mark `in_progress` immediately.
  2. Subject: `Execute approved changes` — mark `in_progress` immediately.
  ```

- [ ] **Step 2: Add outcome-based Task completion after sync dispatch (before Step 5)**

  Find the line:

  ```text
  ## Step 5 --- Self-Verification
  ```

  Insert immediately above it (before the `---` separator before Step 5 as well):

  ```text
  If the subcommand was **sync**, inspect the agent output and apply the first matching case to complete the Tasks:

  - **No diff output (error before approval gate):** Mark `Read artifacts & compute diff` completed with subject `Read artifacts & compute diff — failed`. Mark `Execute approved changes` completed with subject `Execute approved changes — skipped (pre-flight error)`.
  - **User declined changes:** Mark `Read artifacts & compute diff` completed. Mark `Execute approved changes` completed with subject `Execute approved changes — skipped (user declined)`.
  - **`FAILED:` lines present in output:** Mark `Read artifacts & compute diff` completed. Count lines beginning with `FAILED:` (call this N). Mark `Execute approved changes` completed with subject `Execute approved changes — N item(s) failed`.
  - **Clean execution:** Mark both Tasks completed with their original subjects unchanged.

  ```

- [ ] **Step 3: Add [N/TOTAL] counter instruction to sync execute loop**

  Inside the sync dispatch prompt fenced block, find Step 5 which begins:

  ```text
  5. **Execute approved changes** --- use GraphQL mutations from the API
     patterns reference. Batch operations to stay within rate limits:
  ```

  Find the bullet `- Report each action as it completes` and replace it with:

  ```text
     - Prefix each executed change with `[N/TOTAL]` — e.g., `[1/5] Created issue #42: As a user...`. For failures: `[3/5] FAILED: "As a user..." — gh: 422 Unprocessable`. Continue the loop on failure; collect failures for the Step 6 summary.
  ```

- [ ] **Step 4: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/gh-board/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 5: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/gh-board/SKILL.md
  git commit -m "feat(gh-board): add Task lifecycle and [N/TOTAL] counters for sync subcommand"
  ```

---

## Task 8: `gh-board/SKILL.md` — init Task lifecycle

**Files:**

- Modify: `plugins/scrum-toolkit/skills/gh-board/SKILL.md` (Step 4 shared dispatch block and before Step 5)

Same structural note as Task 7: use the shared Step 4 insertion points, conditioned on the `init` subcommand.

- [ ] **Step 1: Add Tasks before init dispatch (in Step 4 prose)**

  Find the block added in Task 7, Step 1 (the `If the subcommand is **sync**` block). Add the following immediately after it:

  ```text

  If the subcommand is **init**, create three tasks before dispatching:

  1. Subject: `Create project board` — mark `in_progress` immediately.
  2. Subject: `Create custom fields` — mark `in_progress` immediately.
  3. Subject: `Create repo labels` — mark `in_progress` immediately.
  ```

- [ ] **Step 2: Add outcome-based Task completion after init dispatch (before Step 5)**

  Find the sync outcome block added in Task 7, Step 2. Add the following immediately after it:

  ```text
  If the subcommand was **init**, inspect the agent output and complete Tasks:

  - If `Create project board` or `Create custom fields` failed (error in output for those steps), mark the failed Task completed with subject `<original subject> — failed` and mark remaining uncompleted Tasks completed with subject `<original subject> — skipped`.
  - If the label creation loop contains lines beginning with `FAILED:`, count them (N) and mark `Create repo labels` completed with subject `Create repo labels — N item(s) failed`.
  - Otherwise mark all three Tasks completed with their original subjects unchanged.

  ```

- [ ] **Step 3: Add [N/TOTAL] counter instruction to init label creation loop**

  Inside the init dispatch prompt fenced block, find Step 4 which creates repo labels:

  ```text
  4. **Create repo labels** --- check existing labels first
  ```

  At the end of that step (after the `- Status label: \`blocked\`` line), add:

  ```text

     Prefix each label creation attempt with `[N/TOTAL]` — e.g., `[1/8] Creating label: priority:must`. For failures: `[3/8] FAILED: priority:must — gh: 422`. Continue on failure.
  ```

- [ ] **Step 4: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/gh-board/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 5: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/gh-board/SKILL.md
  git commit -m "feat(gh-board): add Task lifecycle and [N/TOTAL] counters for init subcommand"
  ```

---

## Task 9: `gh-board/SKILL.md` — Self-verification checklists

**Files:**

- Modify: `plugins/scrum-toolkit/skills/gh-board/SKILL.md` (Self-Verification section)

- [ ] **Step 1: Add agent-driven checklist items**

  Find the last item in the Self-Verification checklist:

  ```text
  - [ ] All output follows markdown formatting conventions.
  ```

  Add after it:

  ```text
  - [ ] All phase Tasks were created before the agent dispatch.
  - [ ] Dispatch prompt instructs agent to emit `[N/TOTAL]` counters in execution loops only.
  - [ ] Agent output was inspected and Tasks renamed per the outcome table.
  - [ ] All Tasks were marked completed after the agent dispatch returns.
  ```

- [ ] **Step 2: Lint**

  ```bash
  npx markdownlint-cli2 "plugins/scrum-toolkit/skills/gh-board/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 3: Final lint across all changed files**

  ```bash
  cd /Users/nodequattro/Projects/GitHub/claude-salad && npx markdownlint-cli2 \
    "plugins/scrum-toolkit/skills/epic/SKILL.md" \
    "plugins/scrum-toolkit/skills/sprint-plan/SKILL.md" \
    "plugins/scrum-toolkit/skills/gh-board/SKILL.md"
  ```

  Expected: `Summary: 0 error(s)`

- [ ] **Step 4: Commit**

  ```bash
  git add plugins/scrum-toolkit/skills/gh-board/SKILL.md
  git commit -m "chore(gh-board): add progress tracking items to self-verification checklist"
  ```
