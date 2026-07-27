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

Advisory classifier — reads the user's configured skills/agents, classifies the task into a workflow shape, then maps each phase of that shape to the best-matching invocation available in the current environment. Never dispatches agents. Never begins implementation.

## Core Concept

Triage is a **two-step translator**, not a hardcoded routing table:

1. **Classification → Abstract phase sequence** (a universal workflow shape: Exploration, Planning, Implementation, Debugging, Fix, Design Work, Review)
2. **Abstract phases → Concrete invocations** (dynamically matched from whatever skills and agents the user actually has)

This SKILL.md never names specific downstream skills. A skill whose description talks about exploring intent and requirements is a candidate for the Exploration phase. A skill whose description mentions writing an implementation plan, decomposing work, or authoring a spec is a candidate for Planning. The mapping is computed each invocation from whatever is currently discovered — not baked into this prompt. If no skill matches a phase, triage emits a **generic prompt fallback** — a copy-pasteable instruction the user can run directly.

The goal: the same triage skill produces sensible recommendations regardless of which skill packages, plugin namespaces, or bespoke team workflows the user has installed — or whether they have none at all.

**Persistence model:** each triage is recorded as a YAML file at `.claude/triage/<slug>.yaml` (or user-global fallback), making triage decisions **versioned project artifacts** — visible in PR review, survivable across machines, and retrievable by future sessions via a deterministic script.

---

## Phase 1 — Context & Config Discovery

If `$ARGUMENTS` is empty, ask "What are you trying to do?" before proceeding. Otherwise treat `$ARGUMENTS` as the task description.

### 1a. Check for active triages (short-circuit on match)

Before anything else, look for an existing triage on this same task so we don't duplicate planning across sessions:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/triage-recall.mjs" \
  --dir "$(node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/resolve-triage-path.mjs" --root "$(pwd)" --home "$HOME" --path-only)" \
  --find "<2-4 key words from the task description>" \
  --json
```

If `triage-recall.mjs` returns a record whose `task` is a strong semantic match for `$ARGUMENTS`:

- Show the existing record and its phase statuses to the user.
- Ask: "This looks like the triage we ran on `<date>`. Resume it, or start a new one?"
- If resume: skip to Phase 5, emit the existing record's Recommended Invocations, and jump to the first `pending` phase.
- If new: continue to Phase 1b.

If the resolve script returns `{"path":null}`, skip the active check silently — there's nowhere to persist, so there's nowhere to recall from either. Continue to Phase 1b.

### 1b. Candidate list (offloaded)

Invoke the discovery script to build the skills+agents candidate list across all three scopes:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/discover-skills.mjs" "$(pwd)" "$HOME"
```

`$(pwd)` is the current project root; `$HOME` is the user's home directory. Both must resolve to absolute paths. The script itself validates absoluteness and exits 2 on failure.

The script emits a JSON array of `{ scope, kind, name, description, path }` on stdout, where:

- `scope` ∈ `project-local` | `user-global` | `plugin-installed`
- `kind` ∈ `skill` | `agent` | `mcp-server`

This array is the input to Phase 4's mapping. Do not re-glob, re-read SKILL.md frontmatter, or re-parse YAML in the skill body — the script is the single source of truth.

**On non-zero exit:** surface the script's stderr diagnostic to the user and halt. Do not fall back to inline traversal — a failed script means the frontmatter is malformed or the environment is broken, and silent fallback would mask the regression the offload was meant to expose (see `${CLAUDE_PLUGIN_ROOT}/skills/triage/references/offload-scripts.md` §Exit codes).

### 1c. Context reads (inline)

These are not globs and stay in the skill body. Read in this order and stop at the first missing item for project-specific reads; always read the user-global entry:

1. `CLAUDE.md` at project root — project type, stack, conventions, mentioned skills.
2. Open specs — invoke the script and consume its JSON:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/triage/scripts/find-open-specs.mjs" --root "$(pwd)"
   ```

   Contract: stdout JSON array of `{"slug": "<basename-minus-md>", "path": "<abs-path>"}`; empty array if `specs/` is missing. Non-zero + stderr on missing/relative `--root`. Halt and surface the diagnostic on non-zero; do not fall back to inline globbing.

3. `git log --oneline -5` — active area of codebase.
4. `~/.claude/CLAUDE.md` — user-global instructions (always read).

Project-local items stop on first miss: if no `CLAUDE.md` exists, skip straight to the user-global read; the candidate list from 1b still provides project-local skills and agents if they exist.

---

## Phase 2 — Classify

Map the task description to exactly one type:

| Classification | Signals |
|---|---|
| **UI Feature** | New page, component, significant template change, layout/interaction work with no significant data layer change |
| **Logic Feature** | New service, store, data layer, API integration, background job — no significant UI |
| **Mixed Feature** | New data flow AND new/modified UI to display it |
| **Bug Fix** | Something broken, unexpected behavior, regression, error message, flaky test |
| **Refactor** | Restructuring existing code without behavior change |
| **Design** | UI/visual design work only — design tokens, component library authorship, mockups, Figma files. Requirements/intent exploration for a Feature is NOT Design — that's the Exploration phase of a Feature. |
| **Review** | Code or UX review of existing/completed work |
| **Other** | Doesn't fit above → ask one clarifying question, don't guess |

**Ambiguity signals to flag before classifying:**

- Description mixes UI terms and logic/service terms → consider Mixed or ask
- Bug touches components with mobile-framework prefixes (e.g., `ion-*`, `Native*`) → Bug Fix, note possible mobile-compat consideration
- Requested refactor or feature touches a file referenced in an open spec → flag the conflict

---

## Phase 3 — Derive the Abstract Flow

Every classification maps to a fixed sequence of **abstract phases**. Phases are conceptual — they describe the kind of thinking the work needs, not the command to run.

| Classification | Abstract Flow |
|---|---|
| UI / Logic / Mixed Feature | Exploration → Planning → Implementation → Review |
| Refactor | Exploration → Planning → Implementation → Review |
| Bug Fix | Debugging → Fix → Review |
| Design | Exploration → Design Work → Planning → Implementation → Review |
| Review | Review |
| Other | (determined after clarification) |

### Why Exploration is load-bearing for Features and Refactors

Any creative work — creating features, building components, adding functionality, modifying behavior, or restructuring existing code — depends on first aligning on intent, constraints, prior art, and preferred patterns. This phase is not a ceremony; its absence means implementing the wrong thing or picking an idiom the project already rejected. For a refactor specifically, Exploration is where "ask about preferred patterns and prior art before proposing" lives.

**Self-evident scope exception:** If the task is clearly trivial (copy change, single-token color swap, one-line bug-fix equivalent), still list Exploration but annotate it **`(optional — scope is self-evident)`** and explain that it's available as a sanity check if the user suspects hidden scope. Never silently drop it.

---

## Phase 4 — Map Abstract Phases to Concrete Invocations

For each phase in the derived flow, find the **best-matching skill or agent** from the candidate list built in Phase 1b. Match by the **intent** expressed in the skill's description — not by literal substring match on skill names.

**Intent signals per abstract phase:**

| Phase | Match on descriptions mentioning… |
|---|---|
| **Exploration** | brainstorm, intent, requirements, scope, options, pre-implementation, stress-test, poking holes, pressure-test, adversarial review of a spec |
| **Planning** | writing plan, spec author, decomposition, phased implementation plan, sprint plan, roadmap, user story with acceptance criteria |
| **Implementation** | executing a plan, test-driven workflow, feature build, implement-from-spec, parallel subagent execution, code generation |
| **Debugging** | systematic debugging, root cause, diagnose, bug investigation |
| **Fix** | code edit, applied fix, regression patch (often this is "use direct editing tools" — no dedicated skill needed) |
| **Design Work** | visual design, design tokens, component library authoring, mockups, UI produced from a design spec |
| **Review** | code review, PR review, standards check, verification before completion |

**Tie-breaking** when multiple skills match the same phase:

1. Prefer project-local skills (`.claude/skills/`) over user-global over plugin-installed
2. Prefer skills whose description names the workflow context more precisely (a description that says "authors a phased implementation plan" is a stronger Planning match than one that only mentions "planning" in passing)
3. If still ambiguous, record **both** — one as `skill`, the second as `alternative` — so the Phase 5 output can surface the tie-breaker visibly instead of silently dropping the loser

**Fallback when no skill matches a phase** — emit a generic prompt the user can paste directly. The prompt should describe the phase's goal in one or two sentences and ask Claude to execute that phase specifically. Example scaffold (fill in the phase-specific part):

> `No matching skill found for [Phase]. Paste this into Claude:`
> `"[one-sentence description of what this phase should accomplish for the user's task]"`

**Open specs:** If `specs/<slug>.md` matches the described task, add a note that Implementation can be invoked directly against the spec (in whatever way the mapped Implementation skill supports, or via a generic "implement specs/<slug>.md" prompt).

### Second pass — Tool-shaped supporting skills

Some candidates aren't phase-shaped: they're tools that augment whichever phase the
user is in (code-structure search, library-docs lookup, memory recall, MCP servers).
Run a second pass for these and surface matches in the **Supporting Skills** block.

Read `${CLAUDE_PLUGIN_ROOT}/skills/triage/references/tool-shaped-skills.md` for the
shape table, the MCP discovery rules, and how matches are written up. Skip it when
no candidate looks tool-shaped.

---

## Phase 5 — Recommend

For unambiguous tasks, output the recommendation immediately — no confirmation gate before display.
For ambiguous tasks, ask exactly one clarifying question, then recommend.
For low-confidence tasks, surface both plausible interpretations and ask the user to choose.

**Confidence calibration:**

- **High** — task maps cleanly to one type with no meaningful alternative reading
- **Medium** — classifiable but has meaningful alternative interpretations (e.g., Mixed Feature where it's unclear if the data layer already exists)
- **Low** — two interpretations are roughly equally plausible → surface both, ask user to choose

Mixed Features should almost always be Medium — the whole point of the classification is that it straddles concerns, and which layer to start from is a real choice.

**Output format:**

```text
## Task: [task description]
**Classification:** [type]
**Confidence:** High / Medium / Low

### Abstract Flow
[phase] → [phase] → [phase] → [phase]

### Recommended Invocations
1. **[Phase]** — [mapped skill/agent invocation, or generic prompt fallback]
   _Alternative: [secondary skill] — use if [one-sentence discriminator]_   ← only if tie-breaker produced one
2. **[Phase]** — ...
3. **[Phase]** — ...
4. **[Phase]** — ...

### Supporting Skills   ← omit entire section if no tool-shaped skills matched
- **[skill]** — [one-sentence trigger condition for this task — when it would fire and what it would speed up]
- **[skill]** — ...

### Why This Flow
[1-2 sentences: classification reasoning + what makes these phases load-bearing for this task. Mention any flags from Phase 2 signals here.]

### If I Misclassified
[alternative type] → [alternative flow summary with mapped invocations]
```

**Flagging open specs:** If a matching open spec was found, add:

```text
⚠️ Open spec: specs/<slug>.md — Implementation can be run against this directly.
```

**No skills configured:** If Phase 1b discovered zero skills and zero agents, output only the abstract flow with a generic prompt for each phase. Keep it actionable — the user should be able to copy-paste any step into Claude and make progress.

---

## Phase 6 — Persist the Triage Record

Triage produces a durable artifact: one YAML file per task at `.claude/triage/<slug>.yaml`.
That is how cross-session retrieval works — a future session finds it via Phase 1a.

Fires automatically after Phase 5 on **high** confidence; on medium/low, wait for the
user to pick an interpretation first. It is skipped silently when the project has no
configured storage path.

Before writing, read `${CLAUDE_PLUGIN_ROOT}/skills/triage/references/phase6-persistence.md`
for the confirmation gate, path resolution, and slug rules — and
`references/triage-schema.md` for the fields themselves.

---

## Constraints

- Never dispatches agents or modifies source code files
- Never hardcodes downstream skill names in this SKILL.md — concrete invocations are always derived from the user's current discovered config
- Works on projects with zero `.claude/` config (graceful degradation via generic prompt fallbacks; Phase 6 silently skips persistence)
- Never blocks on confirmation for unambiguous tasks (Phase 5 outputs immediately; Phase 6 writes a draft immediately)
- File writes are limited to `<triage-dir>/<slug>.yaml` and `<slug>.draft.yaml` only — no other paths
- **Never read `.claude/triage/` directly** (no inline `ls`, `Glob`, or `find`). The only read path is `scripts/triage-recall.mjs`, which enforces a stable contract so future sessions can rely on it
- Output must be immediately actionable — copy-pasteable commands or prompts, no assumed knowledge
- Exploration must never be silently dropped for Feature or Refactor classifications; for trivial scope, mark it optional but still surface it
