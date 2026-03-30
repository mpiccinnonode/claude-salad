# Bootstrap Template Contract

**Plugin:** config-doctor
**Extends:** bootstrap skill (issue #2, branch `feature/2-bootstrap-skill`)
**Date:** 2026-03-30

## Purpose

Allow project authors to ship a `.claude-bootstrap.yaml` contract file that
the bootstrap skill discovers and respects. This gives authors explicit control
over what Claude Code configuration gets generated for their project ---
locking specific files to author-maintained content, injecting rules into
agent-generated files, and providing project-wide instructions that shape all
generation.

## Contract File

Located at the project root: `.claude-bootstrap.yaml`

### Schema

```yaml
version: "1"

# Project-wide guidance passed to agent-architect.
# Shapes how all files are generated --- not tied to a specific target.
# Accepts a single string or an array of strings.
instructions:
  - "This is a microservices monorepo -- each service under services/ is independently deployable"
  - "We follow domain-driven design; bounded contexts map to top-level directories"
  - "All inter-service communication uses gRPC, never REST"

# Files written exactly as the author maintains them.
# Agents do not generate or modify these targets.
locked:
  - target: .claude/rules/guardrails.md
    source: .claude-templates/guardrails.md

  - target: .claude/rules/standards/api-conventions.md
    source: .claude-templates/api-conventions.md

# Rules injected as additional context into agent-generated files.
# Agent-architect weaves these into its output for each target.
inject:
  - target: CLAUDE.md
    rules:
      - "We use trunk-based development -- no long-lived feature branches"
      - "Run `make lint` before committing"
      - "All PRs require at least one approval"

  - target: .claude/rules/guardrails.md
    rules:
      - "Never expose internal IDs in API responses"
      - "All database queries must go through the repository layer"
```

### Field definitions

| Field              | Type               | Required | Description                                                               |
| ------------------ | ------------------ | -------- | ------------------------------------------------------------------------- |
| `version`          | string             | yes      | Schema version. Currently `"1"`.                                          |
| `instructions`     | string or string[] | no       | Project-wide guidance for agent-architect. Shapes all generation.         |
| `locked`           | list               | no       | Files copied from author-maintained sources.                              |
| `locked[].target`  | string             | yes      | Relative path where the file will be written.                             |
| `locked[].source`  | string             | yes      | Relative path (from project root) to the author-maintained file.          |
| `inject`           | list               | no       | Rules to weave into agent-generated files.                                |
| `inject[].target`  | string             | yes      | Relative path of the file to augment.                                     |
| `inject[].rules`   | string[]           | yes      | Rules the agent incorporates into that file.                              |

### Precedence

- If a target appears in both `locked` and `inject`, **locked wins**. The inject
  rules for that target are ignored and the skill warns the author.
- In merge mode (existing config + template), **template takes precedence** over
  stale existing config. The template author's intent is authoritative.

## Integration: Approach C (Template-First with Generation Bypass)

The template is resolved before any agent runs. Locked files bypass generation
entirely. Inject rules and instructions are passed as context to agent-architect.

### Phase 0 --- Pre-flight (modified)

After resolving the project root and before the existing config check:

1. Glob for `.claude-bootstrap.yaml` at the project root.
2. If found:
   a. Read and parse the YAML.
   b. **Validate:**
      - Check that all `source` files in `locked` entries exist.
      - Check for targets appearing in both `locked` and `inject`.
      - Validate `version` is `"1"`.
   c. **Resolve:** Read each locked source file's content into memory.
   d. Store the parsed template (locked files with resolved content, inject
      rules, instructions) for use in later phases.
3. If YAML is malformed or partially valid (missing source files, conflicting
   targets, unrecognized fields), the skill presents its best interpretation
   to the user and lets them edit before proceeding. It never silently drops
   entries or falls back to "no template" without user consent.
4. If no `.claude-bootstrap.yaml` found, proceed normally (no template).

### Pre-write confirmation (applies to all phases)

Before writing any file, the skill always presents a **bootstrap/import plan**
showing the complete picture:

- Which files come from the template (locked)
- Which files will be generated by agents
- Which inject rules will be applied to which targets
- Which template entries were skipped or modified (if validation found issues)

The user reviews and can edit this plan before the skill proceeds to
generation or file writes. This applies regardless of whether a template
exists --- the plan is the single gate between "what we intend to do" and
"doing it."

### Phase 1 --- Detection (unchanged)

The haiku detection agent runs exactly as before. It does not know about the
template. Its job remains pure observation: scan manifests, config fragments,
and complexity signals.

### Phase 2 --- Generation (modified prompt)

The agent-architect dispatch prompt is modified in three ways:

1. **Instructions block:** If the template has `instructions`, they are
   included at the top of the prompt:

   ```text
   **Project-wide instructions from the project author:**
   - {instruction 1}
   - {instruction 2}
   These instructions should shape your reasoning about all generated files.
   ```

2. **Locked file exclusion:** The prompt lists locked targets:

   ```text
   **Do NOT generate these files --- they are provided by the project template:**
   - .claude/rules/guardrails.md
   - .claude/rules/standards/api-conventions.md
   ```

3. **Inject rules:** For each inject target, the prompt includes:

   ```text
   **When generating {target}, incorporate these project-specific rules:**
   - {rule 1}
   - {rule 2}
   ```

If an inject target references a file that agent-architect would not otherwise
have generated (e.g., no code-style config fragments detected, but inject rules
exist for `.claude/rules/standards/python.md`), the prompt instructs
agent-architect to generate that file using the inject rules as its starting
content.

### Phase 3 --- Review & Apply (modified)

The file list merges two sources:

- **Locked files** from the template (marked as "template" in the report)
- **Agent-generated files** from Phase 2 (marked as "generated" in the report)

The Bootstrap Report table gains a **Source** column:

```markdown
| File | Source | Purpose | Lines |
|------|--------|---------|-------|
| .claude/rules/guardrails.md | template | Critical boundaries | 24 |
| CLAUDE.md | generated | Project conventions | 45 |
| .claude/rules/standards/typescript.md | generated | Code style rules | 18 |
| .claude/rules/standards/api-conventions.md | template | API conventions | 31 |
```

Phase 3 presents the full bootstrap/import plan (per the pre-write
confirmation gate defined in Phase 0) before any files are written:

- `--dry-run` shows the plan without writing.
- Otherwise, user reviews and can edit the plan before approving.
- Apply writes both locked and generated files only after approval.

## Edge Cases

### Template + existing config

If Phase 0 finds existing config AND a template, the user is still asked
overwrite/merge/audit. In merge mode, locked files from the template overwrite
their targets (template author's intent takes precedence). Inject rules are
still woven into generated files.

### Template + Mode B (empty project)

The template's locked files are written, inject rules and instructions are
passed to agent-architect, and the Mode B interactive fallback questions still
fire for anything the template doesn't cover. The template supplements
detection, it does not replace it.

### Locked file for a target agents would skip

Example: a locked `.claude/agents/reviewer.md` in a simple project where
agent-architect would not have generated agents. The locked file is written
regardless --- it represents the author's explicit intent.

### Inject rules for a file agents would skip

Example: inject rules for `.claude/rules/standards/python.md` but no code-style
config fragments detected. The skill instructs agent-architect to generate
that file using the inject rules as starting content. The inject rules force
generation.

### Missing source file

A locked entry references a source file that does not exist. The skill includes
this in its interpretation summary, marks the entry as skipped, and lets the
user edit the plan (e.g., point to a different file, remove the entry, or abort).

### Malformed YAML

The skill parses what it can, presents its best interpretation to the user with
any issues highlighted, and lets them edit before proceeding. No silent fallback
to "no template."

### Conflicting locked + inject for same target

Locked wins. The skill warns: "Target `{path}` is locked --- inject rules for
it will be ignored."

## Files Changed

| File                                                  | Change                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `plugins/config-doctor/skills/bootstrap/SKILL.md`     | Add template discovery to Phase 0, modify Phase 2 prompt, Phase 3 report  |

## Files NOT Changed

| File                                                       | Reason                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| `plugins/config-doctor/references/bootstrap-schema.yaml`   | Detection/generation routing map, not a template concern   |
| `plugin.json` / `marketplace.json`                         | User handles version bumps separately                      |
