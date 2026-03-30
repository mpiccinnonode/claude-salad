# Bootstrap Skill Design

**Plugin:** config-doctor
**Issue:** #2
**Branch:** `feature/2-bootstrap-skill`
**Date:** 2026-03-30

## Purpose

"Day 0" tool for Claude Code projects. Creates a complete initial `.claude/`
environment tailored to the detected project stack. Complements the existing
`/audit` skill ("day N" tool) which evaluates and improves existing config.

## Two Modes

| | Mode A — Existing project | Mode B — New/empty project |
|---|---|---|
| **Trigger** | Project files exist but no `.claude/` or CLAUDE.md | Directory is empty or git-init only |
| **Detection** | Automated stack scanning | Interactive (2-3 targeted questions) |
| **Output** | Tailored `.claude/` scaffold | Project guidance + `.claude/` scaffold |

## Architecture

```text
User invokes /bootstrap [--dry-run] [/path]
        |
  Phase 0: Pre-flight
  - Check for existing config
  - If found: ask user intent (overwrite / merge / audit)
  - If audit: redirect to /audit, stop
  - Parse arguments
        |
  Phase 1: Detection (haiku explorer agent)
  - JIT-read bootstrap-schema.yaml for detection targets
  - Scan project for manifests, frameworks, config fragments
  - Determine Mode A vs Mode B
  - Return structured detection report
        |
  [Mode B only: interactive fallback — ask user 2-3 questions]
        |
  Phase 2: Generation (agent-architect, opus)
  - JIT-read bootstrap-schema.yaml for generation contract
  - Receive detection report as input
  - Generate all config files in one pass
  - Return structured output with file markers
        |
  Phase 3: Review & Apply
  - Present Bootstrap Report
  - --dry-run stops here
  - Otherwise: ask user to approve before writing
  - Write approved files
```

## Phase 0 — Pre-flight

1. Resolve project root from `$ARGUMENTS` path or cwd.
2. Check for existing Claude config:
   - Glob for `.claude/` directory and `CLAUDE.md`
   - If **both exist with content**, ask the user:
     > "This project already has Claude config. What would you like to do?"
     > - **Overwrite** — replace existing config with fresh bootstrap output
     > - **Merge** — keep existing config, fill gaps only
     > - **Audit** — redirect to `/audit` to evaluate what's already there
   - If user chooses audit, invoke `/audit` and stop.
   - If overwrite or merge, proceed — pass the intent to Phase 2 so
     agent-architect knows whether to generate from scratch or fill gaps.
3. Parse `$ARGUMENTS`:
   - `--dry-run` — run detection and generation but don't write files
   - Path argument — override project root

## Phase 1 — Detection (haiku explorer agent)

Dispatch a **haiku** agent to scan the project. The agent JIT-reads
`references/bootstrap-schema.yaml` to know what to look for.

### Detection agent responsibilities

1. Scan for manifest files listed in the schema's `detection.manifests`
2. For each found manifest, read it to extract:
   - Language and version
   - Framework (match against `framework_signals` in schema)
   - Dependencies that inform config (testing libs, linters, ORMs, etc.)
3. Scan for config fragments listed in `detection.config_fragments`
4. Assess project complexity:
   - File count and directory depth
   - Monorepo indicators (workspaces, lerna, nx)
   - CI/CD presence
5. Determine mode: A (manifests found) or B (nothing found)

### Detection report output format

```yaml
mode: A  # or B
stack:
  language: typescript
  version: "5.4"
  framework: next
  framework_version: "14.1"
  runtime: node
build_tools: [npm, next]
testing: [jest, playwright]
linting: [eslint, prettier]
config_fragments:
  - file: .eslintrc.json
    summary: "extends next/core-web-vitals, custom rules for imports"
  - file: tsconfig.json
    summary: "strict mode, path aliases @/*"
  - file: .prettierrc
    summary: "single quotes, trailing commas, 80 col"
complexity:
  files: 142
  depth: 5
  monorepo: false
  ci: github-actions
```

### Mode B fallback

If mode is B, the skill (not the agent) asks the user:

1. "What language/framework are you using (or planning to use)?"
2. "What's the project's primary purpose?" (CLI tool, web app, API, library, etc.)
3. "Any specific conventions you want enforced?"

Answers are folded into the detection report as user-provided values.

## Phase 2 — Generation (agent-architect, opus)

Dispatch **agent-architect** with:

- The detection report from Phase 1
- The `generation` section from `bootstrap-schema.yaml`
- The user's intent (fresh / overwrite / merge) from Phase 0

### Generation contract

Agent-architect produces config files following the schema's `generation`
section. For each file, it reasons about what conventions to include based on
the specific detection results — not generic templates.

**Always generated:**

| File | Content |
|---|---|
| `CLAUDE.md` | Project conventions derived from detected config, build/test/lint commands, repo structure overview |
| `.claude/rules/guardrails.md` | Stack-specific do's and don'ts (security boundaries, common footguns, framework-specific traps) |

**Conditionally generated:**

| File | Condition |
|---|---|
| `.claude/rules/standards/*.md` | Config fragments detected — derive style rules from linter/formatter config; otherwise generate sensible defaults for the stack |
| `.claude/agents/*.md` | Complexity warrants it (monorepo, large project, multiple distinct subsystems). Skip for simple projects. |
| `.gitignore` additions | Ensure `.claude/` local/secret files are excluded |

**Merge mode behavior:** When the user chose "merge" in Phase 0, agent-architect
reads the existing config files and generates only what's missing or
under-specified. It does not overwrite existing content.

### Output format

Agent-architect returns output with clear file path markers:

```text
--- FILE: CLAUDE.md ---
[content]

--- FILE: .claude/rules/guardrails.md ---
[content]

--- FILE: .claude/rules/standards/typescript.md ---
[content]
```

The skill parses these markers to build the file list for Phase 3.

## Phase 3 — Review & Apply

### Bootstrap Report

Present to the user:

```markdown
## Bootstrap Report

### Detected Stack
- Language: [X]
- Framework: [X]
- Build tool: [X]
- Existing config: [list of detected config files]

### Generated Files
| File | Purpose | Lines |
|------|---------|-------|
| CLAUDE.md | Project conventions | X |
| .claude/rules/guardrails.md | Critical boundaries | X |
| ... | ... | ... |

### What's NOT included (and why)
[Explain deliberate omissions — e.g., "No agents generated: single-purpose
CLI tool doesn't benefit from specialized agents"]

### Next Steps
1. Review generated files and adjust to your preferences
2. Run `/audit` after a few sessions to identify refinement opportunities
```

### Apply gate

- If `--dry-run`: stop here, report complete.
- Otherwise: "Apply these files? (Y/n)"
- On approval: write all files.
- On rejection: stop, no files written.

## Reference File: bootstrap-schema.yaml

Located at `plugins/config-doctor/references/bootstrap-schema.yaml`.

Serves as a **routing map** for both the detection agent and agent-architect.
Defines what to look for and what to produce — but leaves all reasoning about
specific content to the agents.

### Schema structure

```yaml
# What to scan for during detection
detection:
  manifests:
    - file: package.json
      stack: node
      framework_signals:
        - name: react
          indicators: [react, react-dom]
        - name: next
          indicators: [next]
        - name: angular
          indicators: ["@angular/core"]
        - name: vue
          indicators: [vue]
        - name: svelte
          indicators: [svelte]
        - name: express
          indicators: [express]
        - name: fastify
          indicators: [fastify]
    - file: pyproject.toml
      stack: python
      framework_signals:
        - name: django
          indicators: [django]
        - name: fastapi
          indicators: [fastapi]
        - name: flask
          indicators: [flask]
    - file: go.mod
      stack: go
      framework_signals:
        - name: gin
          indicators: [gin-gonic/gin]
        - name: echo
          indicators: [labstack/echo]
    - file: Cargo.toml
      stack: rust
      framework_signals:
        - name: actix
          indicators: [actix-web]
        - name: axum
          indicators: [axum]
    - file: pom.xml
      stack: java
      framework_signals:
        - name: spring
          indicators: [spring-boot]
    - file: build.gradle
      stack: kotlin
      framework_signals:
        - name: spring
          indicators: [spring-boot]
        - name: ktor
          indicators: [ktor]
    - file: "*.csproj"
      stack: dotnet
      framework_signals:
        - name: aspnet
          indicators: [Microsoft.AspNetCore]
        - name: blazor
          indicators: [Microsoft.AspNetCore.Components]

  # Config fragments that inform convention generation
  config_fragments:
    - pattern: ".eslintrc*"
      informs: code-style
    - pattern: ".prettierrc*"
      informs: formatting
    - pattern: "tsconfig.json"
      informs: type-checking
    - pattern: ".editorconfig"
      informs: editor-settings
    - pattern: "biome.json"
      informs: code-style, formatting
    - pattern: "ruff.toml"
      informs: code-style
    - pattern: "pyproject.toml[tool.ruff]"
      informs: code-style
    - pattern: "rustfmt.toml"
      informs: formatting
    - pattern: ".golangci.yml"
      informs: code-style
    - pattern: ".github/workflows/*"
      informs: ci
    - pattern: ".gitlab-ci.yml"
      informs: ci
    - pattern: "Dockerfile*"
      informs: deployment
    - pattern: "docker-compose*"
      informs: deployment

  # Complexity signals
  complexity_signals:
    monorepo: [lerna.json, nx.json, pnpm-workspace.yaml, "package.json[workspaces]"]
    ci: [".github/workflows/*", ".gitlab-ci.yml", "Jenkinsfile", ".circleci/*"]

# What to generate — routing map, not templates
generation:
  # Always produced
  required:
    - target: CLAUDE.md
      purpose: Project conventions, build/test/lint commands, repo structure
      derives_from: [manifests, config_fragments, directory_structure]

    - target: .claude/rules/guardrails.md
      purpose: Critical do's and don'ts for the detected stack
      derives_from: [stack, framework]

  # Produced when conditions are met
  conditional:
    - target: ".claude/rules/standards/{stack}.md"
      purpose: Code style rules from detected linter/formatter config
      condition: config_fragments detected with informs=code-style or informs=formatting
      derives_from: [config_fragments]

    - target: ".claude/agents/*.md"
      purpose: Specialized agents for distinct subsystems
      condition: complexity warrants it (monorepo, large codebase, multiple domains)
      derives_from: [complexity, directory_structure]
      note: Skip for simple projects. When generated, must pass agent-architect rubric >= 35/50.

  # Always checked
  gitignore:
    ensure_excluded: [".claude/settings.local.json"]
```

## Files to Create

| File | Purpose |
|------|---------|
| `plugins/config-doctor/skills/bootstrap/SKILL.md` | Skill orchestration |
| `plugins/config-doctor/references/bootstrap-schema.yaml` | Detection + generation routing map |

## Files to Update

| File | Change |
|------|--------|
| `plugins/config-doctor/CLAUDE.md` | Add bootstrap skill to repo structure |

## Files NOT Touched

| File | Reason |
|------|--------|
| `plugin.json` | User handles version bumps separately |
| `marketplace.json` | Same — version sync is a release concern |

## Acceptance Criteria (from issue #2)

- Detects project stack from common manifest files
- Asks user intent if `.claude/` and `CLAUDE.md` already exist (overwrite/merge/audit)
- Generates CLAUDE.md with project-specific conventions (not generic templates)
- Generated rules reference actual patterns found in the project
- Does NOT generate agents for simple projects
- Falls back to interactive mode when no project indicators found
- Presents all generated files for review before writing
- Generated agent files pass agent-architect quality rubric (>= 35/50)
- Skill frontmatter includes `name`, `description`, `version`, `allowed-tools`
- `argument-hint` supports path argument and `--dry-run`
- No build artifacts or scripts — pure markdown skill
