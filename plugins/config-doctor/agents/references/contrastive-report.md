# Contrastive Report: Best Practices vs. Existing Agents

Comparison of Anthropic's agent-writing best practices against the config-doctor plugin agents and the user-scoped scrum-architect.

**Legend:** P1 = high impact, fix first | P2 = medium impact | P3 = low impact, polish

---

## agent-architect.md (plugin)

| # | Best Practice | Current State | Gap | Priority |
|---|---|---|---|---|
| 1 | **1.1** Use natural language, not commands | "You are an **elite** LLM Agent Architect — a **world-class** expert in..." | Superlative stacking. "Elite" and "world-class" burn tokens with zero behavioral signal. A simple "You are an Agent Architect specialized in..." gives the same result. | P2 |
| 2 | **3.4** General instructions over prescriptive steps | Creation Mode is a rigid 5-step sequence | This is a borderline case — the steps define a process that should be followed in order, which justifies the structure. However, Step 2 (Persona Design) and Step 3 (Instruction Architecture) could be combined since they're deeply interrelated. **No change needed**, but consider merging. | P3 |
| 3 | **6.2** Just-in-time retrieval | No reference files; all knowledge is embedded in the prompt | The agent lacks a worked example of a good agent config. Rather than embedding one (bloating the prompt), point to `references/agent-best-practices.md` and load it during Creation Mode. | P1 |
| 4 | **7.2** Include one concrete output example | Evaluation output template exists (lines 69-71). **No Creation Mode output example.** | The agent defines how to evaluate but never shows what a well-created agent looks like. Add a reference file with an annotated example agent config. | P1 |
| 5 | **8.1** Self-check step | Self-Verification Checklist exists (lines 193-207) | Checklist overlaps significantly with the Evaluation Rubric. Both check: persona quality, output format, behavioral boundaries. The checklist should be scoped explicitly to Creation Mode output only, and deduplicated from rubric items. | P2 |
| 6 | **4.3** Minimize overlap between agents | Scope boundary stated at line 29 ("Skills are evaluated by skill-evaluator") | Good. Clear boundary. No issue. | — |
| 7 | **10 Anti-patterns** "Duplicate verification steps" | Rubric dimensions (lines 39-67) and Self-Verification (lines 193-207) check overlapping concerns | See #5 above. Consolidate. | P2 |

**Summary:** 2 × P1, 3 × P2, 1 × P3. Core structure is solid; main gaps are the missing creation example and superlative language.

---

## memory-optimizer.md (plugin)

| # | Best Practice | Current State | Gap | Priority |
|---|---|---|---|---|
| 1 | **2.1** Specific role in one sentence | "You are a precision memory auditor for Claude Code configurations." | Excellent. Clear, specific, no fluff. Model best practice. | — |
| 2 | **1.3** Add rationale behind instructions | Guardrails section (lines 117-121) states rules without rationale | "Never recommend removing a rule unless duplicated" — **why?** Because false deletions destroy tribal knowledge that can't be recovered from code. Adding one-line "why" statements would improve generalization. | P2 |
| 3 | **7.2** Include one concrete output example | Output template exists (lines 74-111) with structure and placeholder values | Template is good but uses `X` placeholders. A 5-line worked example with realistic numbers (e.g., "CLAUDE.md | 47 | ~380 | lean") would anchor expectations more reliably. | P3 |
| 4 | **3.1** Right altitude | Step 2 "Codebase Cross-Reference" is vague — "scan the project structure to identify" doesn't specify how | Should clarify: "Use Glob to list project files, then Grep to verify paths/commands referenced in rules still exist." | P2 |
| 5 | **6.1** Context as finite resource | Serena MCP instructions (lines 18) add ~40 tokens on every invocation even when Serena isn't available | Minor. The conditional framing ("if available") is fine, but the detailed tool suggestions could move to a reference. | P3 |

**Summary:** 0 × P1, 2 × P2, 2 × P3. This is the cleanest agent. Persona, output format, and guardrails are all well-done.

---

## code-quality-scouter.md (plugin)

| # | Best Practice | Current State | Gap | Priority |
|---|---|---|---|---|
| 1 | **2.1** Specific role in one sentence | "You are an elite code quality tools scout and developer tooling strategist with deep expertise in..." followed by a 6-item bullet list | Superlative + expertise dump. The bullet list (lines 24-29) is good reference material but belongs after the role statement, not inside it. The role sentence should be: "You are a code quality tools scout. You evaluate a project's existing toolchain and recommend improvements." The expertise list becomes a "Domain Knowledge" section. | P2 |
| 2 | **6.1** Context as finite resource | At 130 lines, this is one of the longer agents. Steps 1-7 are detailed and prescriptive. | Steps 4 (Evaluate Fit) and 6 (Be Specific to This Project) overlap heavily — both say "tie recommendations to this codebase." Merge into one step. | P2 |
| 3 | **1.2** Tell what TO do, not what NOT to do | "Never recommend tools that are already configured" (line 41), "Never recommend abandoned or unmaintained projects" (line 86) | Reframe: "Only recommend tools not already in the project's toolchain" and "Prefer tools with active maintenance; flag any you cannot verify." | P3 |
| 4 | **8.3** Concrete verification criteria | Self-Verification Checklist (lines 119-129) is concrete and actionable | Good. Well-crafted. No issue. | — |
| 5 | **3.1** Right altitude | The hooks evaluation section (lines 51-68) is very prescriptive — specific event types, specific matchers, specific commands | This is appropriate because hooks have a rigid API. The prescriptiveness matches the domain's rigidity. **No change needed.** | — |

**Summary:** 0 × P1, 2 × P2, 1 × P3. Solid agent, minor deduplication and tone adjustments.

---

## skill-evaluator.md (plugin)

| # | Best Practice | Current State | Gap | Priority |
|---|---|---|---|---|
| 1 | **2.1** Specific role in one sentence | "You are a Skill Quality Analyst — an expert in evaluating Claude Code skill files for structural correctness, prompt quality, and operational efficiency." | Good. Specific, no superlatives. The dash-separated elaboration is clean. | — |
| 2 | **4.1** One job, done excellently | Dual-mode: Evaluation + Creation | Same pattern as agent-architect. Acceptable because both modes share domain knowledge (skill frontmatter, argument handling). Scope boundary with agent-architect is explicit (line 29). | — |
| 3 | **1.3** Add rationale | Cross-Cutting Principles (lines 151-160) include rationale for each principle | Good. "Description is a search index, not documentation" with "because LLMs follow the description as a shortcut" is exactly the right pattern. | — |
| 4 | **6.1** Context efficiency | Token Efficiency dimension (lines 74-80) includes soft benchmarks with word counts | Good practice to quantify. But the benchmarks themselves (<150, <200, <500 words) are asserted without source. Either cite testing data or frame as "guidelines based on observed performance." | P3 |
| 5 | **10 Anti-patterns** Contradicting instructions | Line 43: "no angle brackets in description field" then "(does NOT apply to... agent descriptions, which use `<example>` tags)" | The parenthetical clarification is necessary but creates a complex conditional. Consider restructuring: state the skill-specific restriction cleanly, then separately note agent conventions. | P3 |

**Summary:** 0 × P1, 0 × P2, 2 × P3. Strongest agent in the set. Well-scoped, well-rationalized, concrete verification.

---

## scrum-architect.md (user-scoped)

| # | Best Practice | Current State | Gap | Priority |
|---|---|---|---|---|
| 1 | **3.4** General instructions over prescriptive steps | 5-phase sequential process with detailed substeps | This is the right call for SCRUM methodology — the phases must happen in order and produce specific artifacts. **No change needed.** | — |
| 2 | **7.2** Concrete output example | Full markdown template (lines 73-125) with realistic structure | Good. This is the model other agents should follow. | — |
| 3 | **8.1** Self-check with concrete criteria | Self-Verification (lines 139-145) with 6 concrete, falsifiable checks | Excellent. "No story exceeds 8 SP" and "MVP achievable in 4 sprints or fewer" are exactly the right kind of verification. | — |
| 4 | **1.1** Natural language | Clean, direct tone throughout. No superlatives. | Good. | — |
| 5 | **4.2** Explicit out-of-scope | No out-of-scope section | Missing. The agent doesn't state what happens if asked for non-SCRUM planning (e.g., Kanban, OKRs). Should redirect to appropriate methodology or decline. | P2 |
| 6 | **5.1** Description as routing signal | 4 examples in description | One too many — examples 1 and 4 are close (idea → roadmap vs. notes → roadmap). Drop one. Three is the sweet spot. | P3 |

**Summary:** 0 × P1, 1 × P2, 1 × P3. Cleanest user-scoped agent. Good model for output format and self-verification.

---

## Cross-Cutting Findings

### Patterns that ALL agents should adopt (from best-performing examples):

| Practice | Best Example | Agents Missing It |
|---|---|---|
| Concrete self-verification criteria | scrum-architect (falsifiable checks) | All agents have this — good |
| Output format template | memory-optimizer, scrum-architect | agent-architect (Creation Mode only) |
| Explicit scope boundary | agent-architect, skill-evaluator | scrum-architect |
| Rationale behind rules | skill-evaluator (Cross-Cutting Principles) | memory-optimizer guardrails |
| Natural, non-aggressive tone | scrum-architect, memory-optimizer | agent-architect, code-quality-scouter |

### Systemic issues across the agent set:

1. **Superlative inflation** (agent-architect, code-quality-scouter): "elite," "world-class." Per Anthropic's Claude 4 guidance, dial this back to natural language. The model doesn't need to be told it's elite to perform well.

2. **Missing just-in-time references**: No agent uses `references/` files for supplementary material. All knowledge is embedded in the prompt. This works at current sizes (58-208 lines) but won't scale. The best-practices file created alongside this report is the first step.

3. **Serena MCP boilerplate**: Every agent repeats the same ~40-token Serena conditional. This could be extracted into a shared convention documented once in CLAUDE.md rather than duplicated in each agent.

---

## Priority Action List

| # | Action | Agents Affected | Impact |
|---|---|---|---|
| 1 | Add a reference example of a well-written agent config for Creation Mode | agent-architect | P1 |
| 2 | Wire `references/agent-best-practices.md` into agent-architect via just-in-time read | agent-architect | P1 |
| 3 | Replace "elite/world-class" with direct role statements | agent-architect, code-quality-scouter | P2 |
| 4 | Deduplicate self-verification checklist from evaluation rubric | agent-architect | P2 |
| 5 | Add rationale ("why") to memory-optimizer guardrails | memory-optimizer | P2 |
| 6 | Merge overlapping steps in code-quality-scouter (steps 4+6) | code-quality-scouter | P2 |
| 7 | Add out-of-scope handling to scrum-architect | scrum-architect | P2 |
| 8 | Extract Serena boilerplate to CLAUDE.md shared convention | all plugin agents | P3 |
| 9 | Add one worked example with real numbers to memory-optimizer template | memory-optimizer | P3 |
| 10 | Trim scrum-architect description from 4 to 3 examples | scrum-architect | P3 |
