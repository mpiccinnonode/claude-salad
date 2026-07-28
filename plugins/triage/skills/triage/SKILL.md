---
name: triage
description: Use when the user describes a task in natural language without specifying which skill to invoke, is unsure which skill to use, or is onboarding to a project with a defined skill vocabulary. Trigger on phrases like "I need to...", "how do I...", "where do I start with...", "what skill should I use for...", or any task description that implies ambiguity about the right workflow. Trigger when the user's request lacks a specific skill invocation AND the task type is not obvious from context.
allowed-tools:
  - Read
  - Bash
  - Grep
  - Write
argument-hint: "[task description in natural language]"
---

# Triage Skill

Advisory classifier — reads the user's *actually installed* skills, agents, and MCP servers, works out what shape of work the task is, and maps each phase of that shape to the best available invocation. Never dispatches agents. Never begins implementation.

## Core concept

Triage is a two-step translator, not a routing table:

1. Task description → an abstract phase sequence (the kind of thinking the work needs).
2. Abstract phases → concrete invocations, matched from whatever is installed right now.

**This file never names a downstream skill.** The candidate list is discovered on every invocation, so the same triage works with any plugin set, any bespoke team workflow, or none at all. When nothing matches a phase, emit a copy-pasteable generic prompt instead.

Each triage is recorded as a YAML file under `.claude/triage/`, which makes the decision a versioned project artifact — reviewable in a PR and retrievable by a future session.

---

## Phase 1 — Discovery

If `$ARGUMENTS` is empty, ask "What are you trying to do?" first. Otherwise treat it as the task description.

### 1a. Resume an existing triage?

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/triage-recall.mjs" \
  --dir "$(node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/resolve-triage-path.mjs" --root "$(pwd)" --home "$HOME" --path-only)" \
  --find "<2-4 key words from the task>" --json
```

If a returned record's `task` is a strong semantic match, show it with its phase statuses and ask: resume, or start fresh? On resume, skip to the Phase 4 output and jump to the first `pending` phase. If the resolver returns `{"path":null}` there is nowhere to persist and nothing to recall — continue silently.

### 1b. Candidate list

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/discover-skills.mjs" "$(pwd)" "$HOME"
```

Emits a JSON array of `{ scope, kind, name, description, path }` — `scope` ∈ `project-local` | `user-global` | `plugin-installed`, `kind` ∈ `skill` | `agent` | `mcp-server`. This is the sole source of truth for what's available; don't re-glob or re-parse frontmatter.

**On non-zero exit:** surface the stderr diagnostic and halt. Never fall back to inline traversal — a failed script means malformed frontmatter or a broken environment, and a silent fallback hides exactly the regression the script exists to expose (see `references/offload-scripts.md` §Exit codes).

### 1c. Open specs

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/find-open-specs.mjs" --root "$(pwd)"
```

Returns `[{"slug", "path"}]`, empty when there is no `specs/`. Halt on non-zero. If a spec matches the described task, note that Implementation can run directly against it.

---

## Phase 2 — Classify and derive the flow

Classify the task, then derive the phase sequence from the work itself, scaled to its actual scope: creative and restructuring work needs intent and constraints settled before code; a bug needs the cause found before the patch; design work needs the visual direction settled before anything is built; a review request is just Review.

`classification` is a schema enum — write one of `UI Feature`, `Logic Feature`, `Mixed Feature`, `Bug Fix`, `Refactor`, `Design`, `Review`, `Other` (see `references/triage-schema.md`). Two boundaries are genuinely counterintuitive and worth stating: exploring requirements for a feature is **not** `Design` — that value is for visual and design-system work only; and `Other` means stop and ask one clarifying question rather than force a fit.

Two signals worth flagging explicitly, because they change the work and are easy to miss:

- A bug in components with mobile-framework prefixes (`ion-*`, `Native*`) may be a platform-compat issue, not app logic.
- A task touching files covered by an unrelated open spec is a conflict the user should decide on.

---

## Phase 3 — Map phases to invocations

For each phase, pick the best-matching candidate by the **intent** in its description, not by name substring:

| Phase | Descriptions mentioning… |
|---|---|
| **Exploration** | brainstorm, intent, requirements, scope, options, pre-implementation, stress-test, pressure-test, adversarial spec review |
| **Planning** | writing a plan, spec authoring, decomposition, phased plan, sprint plan, roadmap, acceptance criteria |
| **Implementation** | executing a plan, test-driven workflow, implement-from-spec, parallel subagent execution |
| **Debugging** | systematic debugging, root cause, diagnose, investigation |
| **Fix** | code edit, applied fix, regression patch — often just "use the editing tools directly" |
| **Design Work** | visual design, design tokens, component library authoring, mockups, UI from a design spec |
| **Review** | code review, PR review, standards check, verification before completion |

Ties break on: project-local over user-global over plugin-installed; then the description that names the workflow more precisely. If still tied, record **both** — one as `skill`, one as `alternative` — so the output shows the choice instead of hiding it.

No match for a phase → emit a generic prompt the user can paste, describing that phase's goal for *this* task in one or two sentences.

### Second pass — tool-shaped supporting skills

Some candidates aren't phase-shaped: they're tools that augment whichever phase the
user is in (code-structure search, library-docs lookup, memory recall, MCP servers).
Run a second pass for these and surface matches in the **Supporting Skills** block.

Read `${CLAUDE_PLUGIN_ROOT}/skills/triage/references/tool-shaped-skills.md` for the
shape table, the MCP discovery rules, and how matches are written up. Skip it when
no candidate looks tool-shaped.

---

## Phase 4 — Recommend

Output immediately for unambiguous tasks. Ask exactly one clarifying question for ambiguous ones. When two readings are equally plausible, surface both and let the user choose.

Confidence: **High** = one clean reading; **Medium** = real alternative interpretations; **Low** = two equally plausible readings. Mixed Features are almost always Medium — which layer to start from is a genuine choice.

```text
## Task: [description]
**Classification:** [type]   **Confidence:** High / Medium / Low

### Flow
[phase] → [phase] → [phase]

### Recommended Invocations
1. **[Phase]** — [invocation, or generic prompt fallback]
   _Alternative: [skill] — use if [discriminator]_    ← only when a tie was recorded
2. ...

### Supporting Skills        ← omit when nothing matched
- **[skill]** — [when it fires for this task]

### Why This Flow
[classification reasoning + any flagged signals, 1-2 sentences]

### If I Misclassified
[alternative type] → [alternative flow]
```

Add `⚠️ Open spec: specs/<slug>.md — Implementation can run against this directly.` when Phase 1c found a match.

If discovery found zero skills and zero agents, output the flow with a generic prompt per phase — the user should still be able to paste any step and make progress.

---

## Phase 5 — Persist the record

Triage produces a durable artifact: one YAML file per task at `.claude/triage/<slug>.yaml`.
That is how cross-session retrieval works — a future session finds it via Phase 1a.

Fires automatically after the Phase 4 output on **high** confidence; on medium/low, wait
for the user to pick an interpretation first. It is skipped silently when the project has
no configured storage path.

Before writing, read `${CLAUDE_PLUGIN_ROOT}/skills/triage/references/phase5-persistence.md`
for the confirmation gate, path resolution, slug rules, and the mandatory post-write
validation — and `references/triage-schema.md` for the fields themselves.

---

## Constraints

- Never dispatch agents; never modify source files.
- Never hardcode a downstream skill name here — invocations always come from the current discovered config.
- Works with zero `.claude/` config: generic prompts for every phase, persistence skipped silently.
- Never block on confirmation for an unambiguous task — recommend first, draft immediately.
- File writes are limited to `<triage-dir>/<slug>.yaml` and `<slug>.draft.yaml`.
- Never read `.claude/triage/` with inline `ls`/`Glob`/`find` — `triage-recall.mjs` is the only read path, so future sessions can rely on a stable contract.
- Never leave a record that fails `validate-record.mjs`.
- Output must be copy-pasteable, with no assumed knowledge.
