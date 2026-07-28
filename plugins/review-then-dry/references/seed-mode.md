# Seed Mode

Alternative entry point (`--seed`): bootstraps the review checklist from the
project's existing `.claude/rules/` files.

Alternative entry point: `/lifecycled-code-review --seed`

Seeds the review checklist from existing `.claude/rules/` files. All generated checks start as `staged` — they must prove value through the lifecycle before promoting to `active`.

## Step 1 — Read Rules

Read all files matching `.claude/rules/**/*.md`. For each file, identify individual rules — look for:

- Bullet points or numbered lists describing conventions
- Headings followed by prescriptive statements
- Bold "MUST", "should", "never" statements

## Step 2 — Generate Check Candidates

For each identified rule, generate a check entry:

- **id:** kebab-case from the rule's key phrase, max 50 characters
- **severity:** infer from language:
  - `MUST`, `never`, `always` + safety/correctness context → `critical`
  - `MUST`, `should` + architecture/pattern context → `major`
  - Convention, preference, naming, style → `minor`
- **rule:** condense to one clear line
- **applies_to:** infer a glob from file type context in the rule (e.g., "components" → `**/*.component.ts`, "services" → `**/*.service.ts`). Default to `**/*.ts` if unclear.
- **tags:** infer from the rule file location (e.g., `angular.md` → `[angular]`, `style.md` → `[style]`)

## Step 3 — Filter

Remove candidates that:

- Are shorter than 10 words (too vague to evaluate)
- Contain only subjective language ("prefer", "consider", "when possible") without a concrete action verb ("use", "return", "extend", "implement")
- Describe organizational rules rather than code patterns (e.g., "files should be in src/app/")

## Step 4 — Deduplicate

Compare each candidate against existing checks in `.claude/review-checklist.yaml` (if the file exists). Skip candidates where 3+ significant words (nouns, verbs — not articles/prepositions) match an existing check's `rule`, regardless of the existing check's `status`.

Also deduplicate within the generated candidates — if two rules from different files describe the same check, keep the more specific one.

## Step 5 — Enforce Staged Cap

Offloaded to `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs` (spec §1.2.3). Same contract as Phase 3 Step 4.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/evict-staged.mjs" --yaml <scratch-yaml-abs> --cap 30
```

If `over_cap` is true, warn the user and present only the top 30 candidates by severity (critical first, then major, then minor, sorted by specificity within severity). The returned `eviction_candidates` list identifies seed-generated entries that would be evicted under FIFO+hit_count=0 rules; use it to drop seed candidates before writing.

## Step 6 — Present to User

> "**Seed from rules:** generated {N} staged check candidates from `.claude/rules/`:
>
> **Critical ({n}):**
> {for each: id — rule — applies_to — source file}
>
> **Major ({n}):**
> {for each: id — rule — applies_to — source file}
>
> **Minor ({n}):**
> {for each: id — rule — applies_to — source file}
>
> **Filtered out:** {M} rules (too vague, subjective, or organizational)
> **Deduplicated:** {D} rules (already covered by existing checks)
>
> Options:
>
> - **Approve all** — write all candidates to the checklist
> - **Edit** — select which candidates to include
> - **Cancel** — discard all candidates"

## Step 7 — Write

On approval: set `added_by: seed`, `added_date: today`, `status: staged`, all lifecycle counters to 0/null. Write following the Safety Protocol.

If the checklist file doesn't exist yet, create it with `version: 1`, the approved checks, empty `suppressions`, and the default `project_context` entries from the template.
