# Agent Configuration Best Practices

Reference for writing Claude Code agent `.md` files. Derived from Anthropic's official engineering guidance (March 2026).

**Sources:**
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Claude 4 Prompting Best Practices](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Writing Tools for Agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)

---

## 1. Prompt Tone & Calibration

### 1.1 Use natural language, not commands

Claude 4.5/4.6 is highly responsive to system prompts. Aggressive phrasing (`CRITICAL`, `YOU MUST`, `NEVER EVER`) causes overtriggering. Write instructions the way you would brief a competent colleague.

> **Instead of:** "You MUST ALWAYS check the file exists before reading it"
> **Write:** "Check that the file exists before reading it."

### 1.2 Tell the agent what TO do, not what NOT to do

Positive framing produces more reliable behavior than prohibitions.

> **Instead of:** "Do NOT use grep to search files"
> **Write:** "Use the Grep tool for content search."

### 1.3 Add rationale behind instructions

Claude generalizes better from explained rules than bare commands. When a rule has a non-obvious reason, state it.

> **Instead of:** "Always read CLAUDE.md first."
> **Write:** "Read CLAUDE.md first — it contains project conventions that override defaults."

---

## 2. Identity & Persona

### 2.1 Assign a specific role in one sentence

A single sentence focusing the agent's expertise is more effective than a paragraph of superlatives.

> **Good:** "You are a precision memory auditor for Claude Code configurations."
> **Avoid:** "You are an elite, world-class, battle-tested expert in all aspects of..."

### 2.2 The persona should guide ambiguous decisions

The role isn't decorative — it should tell the agent what to prioritize when instructions are silent. A "security auditor" defaults to caution; a "rapid prototyper" defaults to speed.

---

## 3. Structure & Organization

### 3.1 Right altitude — not too brittle, not too vague

Avoid two extremes:
- **Too prescriptive:** Hardcoded logic that breaks when context shifts
- **Too vague:** "Be helpful and thorough" — provides no actionable signal

Target the middle: specific enough to verify compliance, flexible enough for the model to apply strong heuristics.

### 3.2 Use XML tags for complex inputs

When a prompt includes mixed content types (context, instructions, examples), use descriptive XML tags to help the model parse them. For agent configs, markdown headers serve this purpose well.

### 3.3 Long documents at top, instructions at bottom

For prompts over 20k tokens, place reference material at the top and instructions/queries at the bottom. Queries at the end improve response quality by up to 30%.

### 3.4 Prefer general instructions over prescriptive steps

"Think thoroughly about the architecture" often produces better reasoning than a hand-written step-by-step plan. Claude's reasoning frequently exceeds what you would prescribe. Reserve step-by-step structure for processes that must be followed in order (rubrics, checklists).

---

## 4. Scope & Boundaries

### 4.1 One job, done excellently

An agent that does one thing well beats one that does many things adequately. Define scope boundaries explicitly — what the agent handles and what it defers to others.

### 4.2 Explicit out-of-scope handling

State what happens when the agent receives a request outside its scope. Options: decline and redirect, defer to a named peer agent, or ask the user.

### 4.3 Minimize overlap between agents

If two agents could plausibly handle the same request, the triggering system (description + examples) cannot work reliably. Ensure clear domain boundaries.

---

## 5. Description & Triggering

### 5.1 Description is a routing signal

The `description` field exists to help the parent agent decide whether to dispatch to this subagent. It must answer: "Given this user request, should I invoke this agent?"

### 5.2 Include 2-3 example blocks

Examples are among the most reliable ways to steer routing. Each should show a realistic user message, the assistant's routing decision, and a brief commentary. Two to three examples cover the core use cases without bloating the description.

### 5.3 Examples should be diverse

Cover different entry points: direct request, indirect mention, orchestration dispatch. Avoid examples that are near-duplicates of each other.

---

## 6. Context Engineering

### 6.1 Treat context as a finite resource

Every token in the system prompt depletes the agent's attention budget for the actual task. Find the smallest set of high-signal tokens that maximize the desired outcome.

### 6.2 Use just-in-time retrieval

Rather than embedding all reference material in the prompt, maintain pointers (file paths, tool names) and load data dynamically at runtime. This keeps the prompt lean and the context fresh.

### 6.3 Progressive disclosure

Structure information in layers: the system prompt provides the framework, reference files provide detail, and tool calls provide current state. The agent assembles understanding layer by layer.

---

## 7. Output Format

### 7.1 Define the expected output structure

Every agent should specify what its output looks like — a markdown template, a table format, a structured report. Without this, output varies unpredictably between invocations.

### 7.2 Include one concrete output example

A single worked example of the expected output is more effective than pages of description. Show the structure filled with realistic data.

---

## 8. Verification & Self-Correction

### 8.1 Include a self-check step

"Before you finish, verify your output against [criteria]" catches errors reliably. This is the single highest-leverage addition to any agent prompt.

### 8.2 Give agents verification mechanisms

Tests, expected outputs, rubric scores — anything the agent can use to check its own work without human feedback. Without verification, you are the only feedback loop.

### 8.3 Verification criteria must be concrete

"Make sure it's good" is not a verification step. "Every story traces back to a stated requirement" is.

---

## 9. Tool Usage

### 9.1 Document available tools explicitly

If the agent uses specific tools, list them with their purpose. This prevents tool confusion and hallucinated tool names.

### 9.2 Minimize tool surface

Only expose tools the agent actually needs. Each unnecessary tool is a distraction and a token cost.

### 9.3 Tool descriptions deserve prompt engineering effort

Anthropic reports spending more time on tool documentation than overall prompts for SWE-bench. Describe tools from the model's perspective — when to use them, what they return, and edge cases.

---

## 10. Anti-Patterns to Avoid

| Anti-Pattern | Why It's Harmful |
|---|---|
| Generic persona ("You are a helpful assistant") | Provides no decision-making guidance for ambiguous situations |
| Superlative stacking ("elite world-class expert") | Burns tokens, adds no behavioral signal beyond a simple role statement |
| Unbounded scope | Agent attempts tasks it can't do well, producing mediocre output across the board |
| Missing output format | Output varies unpredictably; users can't rely on structure |
| Contradicting instructions | Model must resolve conflicts at runtime, producing inconsistent behavior |
| Hardcoded project context in user-scoped agents | Dead weight in every invocation outside that project |
| Duplicate verification steps | Rubric and checklist checking the same things wastes tokens |
| Aggressive phrasing for Claude 4+ | Causes overtriggering, rigidity, and reduced natural reasoning |
| Embedding large reference material | Bloats every invocation; use just-in-time file reads instead |
| Description that summarizes the workflow | Makes the parent agent think it already knows the answer, reducing dispatch quality |
