# Bootstrap Template Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.claude-bootstrap.yaml` template contract support to the bootstrap skill so project authors can lock files, inject rules, and provide instructions that shape Claude Code config generation.

**Architecture:** Single-file change to `plugins/config-doctor/skills/bootstrap/SKILL.md`. Phase 0 discovers and validates the template. Phase 2's agent-architect prompt gains template context (instructions, locked exclusions, inject rules). Phase 3's report distinguishes template vs generated files. A pre-write confirmation gate always shows the full plan before writing.

**Tech Stack:** Markdown skill (no build/test -- this is pure prompt engineering). Validation via `npx markdownlint-cli2`.

---

## Task 1: Add Template Discovery to Phase 0

**Files:**

- Modify: `plugins/config-doctor/skills/bootstrap/SKILL.md:15-48` (Phase 0 section)

- [ ] **Step 1: Add template discovery section after "Resolve project root" and before "Check for existing config"**

Insert a new `### Discover template contract` subsection between the project root resolution and the existing config check. This section instructs the skill to glob for `.claude-bootstrap.yaml`, read and parse it, validate it, and resolve locked file references.

Add the following after line 22 (`- Otherwise, use the current working directory.`) and before `### Check for existing config`:

````markdown
### Discover template contract

Glob for `.claude-bootstrap.yaml` at the project root.

**If found:**

1. Read and parse the YAML file.
2. **Validate:**
   - Confirm `version` is `"1"`. Flag unrecognized versions.
   - For each `locked` entry, check that the `source` file exists at the
     resolved path relative to the project root.
   - Check for targets appearing in both `locked` and `inject`. If a target
     appears in both, locked takes precedence --- mark the inject entry as
     ignored and include it in the interpretation summary.
   - Flag any unrecognized top-level fields.
3. **Resolve:** For each valid locked entry, read the source file content
   into memory. Store as `{target, content, line_count}`.
4. Normalize `instructions`: if it is a single string, wrap it in a list.
5. Store the parsed template for use in later phases:
   - `template.instructions` --- list of strings
   - `template.locked` --- list of `{target, content, line_count}`
   - `template.inject` --- list of `{target, rules[]}`
   - `template.warnings` --- list of validation warnings

**If YAML is malformed or partially valid** (missing source files, conflicting
targets, unrecognized fields):

Present your best interpretation to the user using AskUserQuestion:

> I found `.claude-bootstrap.yaml` but encountered some issues:
>
> {list each warning}
>
> Here is my interpretation of the template:
>
> - **Instructions:** {count} project-wide rules
> - **Locked files:** {list valid targets, mark missing sources as "skipped"}
> - **Inject rules:** {list targets with rule counts, mark conflicts as "ignored"}
>
> Does this look right, or would you like to adjust anything?

The user can confirm, ask to modify entries, or choose to proceed without the
template entirely.

**If not found:** proceed normally (no template). Set `template` to null.
````

- [ ] **Step 2: Verify the full Phase 0 reads correctly**

Read the complete Phase 0 section to confirm the new subsection flows naturally between project root resolution and existing config check. The order should be:

1. Resolve project root
2. Discover template contract (new)
3. Check for existing config
4. Parse arguments

- [ ] **Step 3: Run markdown lint**

Run: `npx markdownlint-cli2 "plugins/config-doctor/skills/bootstrap/SKILL.md"`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add plugins/config-doctor/skills/bootstrap/SKILL.md
git commit -m "feat(bootstrap): add template contract discovery to Phase 0

Discovers .claude-bootstrap.yaml at project root, validates locked/inject
entries, resolves source file references, and presents interpretation to
user if any issues are found."
```

---

## Task 2: Add Pre-Write Confirmation Gate

**Files:**

- Modify: `plugins/config-doctor/skills/bootstrap/SKILL.md` (new section between Phase 1 and Phase 2)

- [ ] **Step 1: Add the bootstrap/import plan gate section**

Insert a new top-level section `## Bootstrap/Import Plan Gate` between Phase 1 (Detection) and Phase 2 (Generation). This section fires after detection completes and before generation begins, presenting the user with the full picture of what will happen.

````markdown
## Bootstrap/Import Plan Gate

After detection completes (Phase 1) and before generation begins (Phase 2),
present the user with the full bootstrap/import plan. This is the single gate
between "what we intend to do" and "doing it."

### Build the plan

Combine detection results with template data (if present) to build the plan:

**If a template was discovered:**

Present using AskUserQuestion:

> ## Bootstrap/Import Plan
>
> ### From Template (locked --- written as-is)
> | File | Source | Lines |
> |------|--------|-------|
> | {target} | {source path} | {line_count} |
>
> ### Will Be Generated (by agent-architect)
> | File | Purpose |
> |------|---------|
> | {target} | {derived from generation.required/conditional in schema} |
>
> {For each target, note if it has inject rules: "+ N inject rules from template"}
>
> ### Inject Rules
> | Target | Rules |
> |--------|-------|
> | {target} | {rule 1}, {rule 2}, ... |
>
> ### Project-Wide Instructions
> {list each instruction, or "None"}
>
> ### Skipped / Warnings
> {any validation warnings from Phase 0, or "None"}
>
> Does this plan look right? You can ask me to adjust before I proceed.

**If no template:**

Present a simpler version:

> ## Bootstrap Plan
>
> ### Will Be Generated
> | File | Purpose |
> |------|---------|
> | CLAUDE.md | Project conventions, build/test/lint commands |
> | .claude/rules/guardrails.md | Stack-specific boundaries |
> | {conditional files if applicable} | {purpose} |
>
> Does this plan look right?

The user can approve, request changes, or abort. Only proceed to Phase 2 after
approval.
````

- [ ] **Step 2: Run markdown lint**

Run: `npx markdownlint-cli2 "plugins/config-doctor/skills/bootstrap/SKILL.md"`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add plugins/config-doctor/skills/bootstrap/SKILL.md
git commit -m "feat(bootstrap): add pre-write confirmation gate between detection and generation

Shows the full bootstrap/import plan (locked files, generated files, inject
rules, instructions, warnings) and requires user approval before proceeding."
```

---

## Task 3: Modify Phase 2 Agent-Architect Prompt for Template Context

**Files:**

- Modify: `plugins/config-doctor/skills/bootstrap/SKILL.md:143-229` (Phase 2 section)

- [ ] **Step 1: Add template context blocks to the agent prompt**

In the Phase 2 agent prompt (the text block between the ```` ````text ```` markers), add three new sections before the `**Your task:**` line. These are conditional --- they only appear when a template is present.

Add the following instruction block after the `{merge_context}` placeholder and before `**Your task:**`:

````markdown
Add the following conditional blocks to the agent-architect prompt. Include
each block only when the corresponding template data exists.

**If `template.instructions` is non-empty**, add before `**Your task:**`:

```text
**Project-wide instructions from the project author:**
{for each instruction, render as a bullet point}
These instructions should shape your reasoning about all generated files.
```

**If `template.locked` is non-empty**, add before `**Your task:**`:

```text
**Do NOT generate these files --- they are provided by the project template:**
{for each locked entry, render as: "- {target}"}
```

**If `template.inject` is non-empty**, add after the conditional targets
section inside `**Your task:**`:

```text
**Project-specific rules to incorporate:**
{for each inject entry:}
When generating `{target}`, incorporate these rules:
{for each rule, render as a bullet point}
```

Additionally, if an inject target does not match any file that would otherwise
be generated (not in `generation.required` or triggered by
`generation.conditional`), add:

```text
Generate `{target}` using the following project-specific rules as its content:
{rules as bullet points}
```
````

- [ ] **Step 2: Update the `{merge_context}` replacement instructions**

After the agent prompt block, update the replacement instructions to include
template context. Find the section starting with "Replace `{references_path}`"
and add:

````markdown
For template context blocks:
- If `template` is null (no `.claude-bootstrap.yaml` found), omit all three
  template blocks entirely.
- If `template` exists, include each block only when its data is non-empty.
````

- [ ] **Step 3: Run markdown lint**

Run: `npx markdownlint-cli2 "plugins/config-doctor/skills/bootstrap/SKILL.md"`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add plugins/config-doctor/skills/bootstrap/SKILL.md
git commit -m "feat(bootstrap): pass template instructions, locked exclusions, and inject rules to agent-architect

Agent-architect prompt now receives project-wide instructions, skips locked
targets, and weaves inject rules into generated files."
```

---

## Task 4: Modify Phase 3 Report to Show Template Sources

**Files:**

- Modify: `plugins/config-doctor/skills/bootstrap/SKILL.md:232-278` (Phase 3 section)

- [ ] **Step 1: Update the Bootstrap Report template**

Replace the existing `### Generated Files` table in the Bootstrap Report with
a version that includes the Source column and merges both locked and generated
files:

````markdown
### Bootstrap Report

Update the report template to merge locked and generated files:

Replace the existing `### Generated Files` table:

```markdown
### Generated Files

| File | Purpose | Lines |
|------|---------|-------|
| {path} | {purpose} | {line_count} |
```

With:

```markdown
### Files

| File | Source | Purpose | Lines |
|------|--------|---------|-------|
| {path} | {template or generated} | {purpose} | {line_count} |
```

- For locked files: Source = "template", purpose derived from the target path
- For agent-generated files: Source = "generated", purpose from agent output

If inject rules were applied to any generated file, note it in the purpose:
e.g., "Project conventions + 3 template rules"
````

- [ ] **Step 2: Update the apply gate to reference the plan**

Replace the existing apply gate text:

```markdown
- Otherwise: ask the user "Apply these files? (Y/n)" using AskUserQuestion.
```

With:

```markdown
- Otherwise: the bootstrap/import plan was already approved in the Plan Gate.
  Ask the user "Apply these {N} files? (Y/n)" using AskUserQuestion as a
  final confirmation before writing.
```

- [ ] **Step 3: Run markdown lint**

Run: `npx markdownlint-cli2 "plugins/config-doctor/skills/bootstrap/SKILL.md"`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add plugins/config-doctor/skills/bootstrap/SKILL.md
git commit -m "feat(bootstrap): show template vs generated source in Phase 3 report

Bootstrap Report table now includes Source column distinguishing locked
template files from agent-generated files."
```

---

## Task 5: Final Verification and Lint

**Files:**

- Read: `plugins/config-doctor/skills/bootstrap/SKILL.md` (full file)
- Read: `docs/superpowers/specs/2026-03-30-bootstrap-template-contract.md` (spec)

- [ ] **Step 1: Read the complete SKILL.md and verify spec coverage**

Read the full SKILL.md. Check each spec requirement:

1. Phase 0 discovers `.claude-bootstrap.yaml` --- present?
2. Validates version, locked sources, locked/inject conflicts --- present?
3. Presents interpretation for malformed/partial YAML --- present?
4. Pre-write confirmation gate shows full plan --- present?
5. Phase 1 unchanged --- confirmed?
6. Phase 2 prompt includes instructions, locked exclusions, inject rules --- present?
7. Inject rules for non-generated files force generation --- present?
8. Phase 3 report has Source column --- present?
9. Locked files marked "template", generated marked "generated" --- present?
10. `--dry-run` shows plan without writing --- present?

- [ ] **Step 2: Run final markdown lint on all changed files**

Run: `npx markdownlint-cli2 "plugins/config-doctor/skills/bootstrap/SKILL.md" "plugins/config-doctor/CLAUDE.md" "docs/superpowers/specs/2026-03-30-bootstrap-template-contract.md"`
Expected: 0 errors

- [ ] **Step 3: Verify no unintended changes to other files**

Run: `git status`
Expected: Only `plugins/config-doctor/skills/bootstrap/SKILL.md` shows as modified (plus the already-committed spec and CLAUDE.md changes).
