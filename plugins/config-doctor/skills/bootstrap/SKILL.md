---
name: bootstrap
version: "1.2.0"
description: Use when a user wants to bootstrap, initialize, or set up Claude Code configuration for a project from scratch. Trigger for "bootstrap this project", "set up Claude config", "initialize .claude", "create CLAUDE.md for this repo", "day 0 setup", "scaffold Claude config", "configure Claude for this codebase", or any request to create an initial Claude Code environment tailored to a project's detected stack. Also trigger when a user opens a new project and asks "how should I configure Claude for this?" or "get Claude ready for this project". Do NOT trigger for auditing existing config (use /audit instead).
argument-hint: "[--dry-run] [/path/to/project]"
allowed-tools: [Read, Glob, Grep, Write, Edit, Agent, AskUserQuestion]
---

You are orchestrating a Claude Code bootstrap workflow that detects a project's
stack and generates a tailored `.claude/` configuration. Work through the phases
below in order.

---

## Phase 0 --- Pre-flight

### Resolve project root

Determine the project root:

- If `$ARGUMENTS` contains a path argument (not a flag), use it as the project root.
- Otherwise, use the current working directory.

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

### Check for existing config

Glob for `.claude/` directory and `CLAUDE.md` at the project root.

- **If both exist with content:** ask the user using AskUserQuestion:

  > This project already has Claude config. What would you like to do?
  >
  > - **Overwrite** --- replace existing config with fresh bootstrap output
  > - **Merge** --- keep existing config, fill gaps only
  > - **Audit** --- redirect to /audit to evaluate what's already there

  - If the user chooses **audit**: invoke the `/audit` skill and stop.
  - If **overwrite** or **merge**: record the intent and proceed. Pass it to
    Phase 2 so agent-architect knows the mode.

- **If no existing config** (or only empty stubs): proceed normally.

### Parse arguments

- `--dry-run` --- run detection and generation but stop before writing files
  (Phase 3 presents the report but does not apply).
- Path argument --- already handled above.

Record parsed flags for use in later phases.

---

## Phase 1 --- Detection

Dispatch a **haiku** agent via the Agent tool to scan the project. The agent
determines the project's stack, framework, tooling, and complexity.

Use `model: "haiku"` on the Agent tool call.

### Agent prompt

````text
You are a project stack detector. Your job is to scan a project directory and
produce a structured detection report.

**Step 1: Read the routing map**

Read the file at `{references_path}/bootstrap-schema.yaml`. This tells you
exactly what manifest files to look for, what framework signals to match, what
config fragments to scan for, and what complexity signals to check.

**Step 2: Scan for manifests**

For each manifest listed in `detection.manifests`, check if it exists at the
project root ({project_root}). For each found manifest:
- Read it
- Identify the language, version, and runtime
- Match dependencies against the `framework_signals` for that manifest type
- Note testing libraries, linters, ORMs, and other relevant dependencies

**Step 3: Scan for config fragments**

For each pattern in `detection.config_fragments`, glob for matching files.
For each found file, read it briefly and summarize what it configures.

**Step 4: Assess complexity**

- Count files (approximate via glob) and directory depth
- Check for monorepo indicators from `complexity_signals.monorepo`
- Check for CI/CD presence from `complexity_signals.ci`

**Step 5: Determine mode**

- If manifests were found: **Mode A** (existing project)
- If nothing was found: **Mode B** (new/empty project)

**Step 6: Output the detection report**

Output ONLY a YAML code block in this exact format:

```yaml
mode: A  # or B
stack:
  language: <detected language>
  version: "<version>"
  framework: <framework or "none">
  framework_version: "<version or empty>"
  runtime: <runtime>
build_tools: [<list>]
testing: [<list>]
linting: [<list>]
config_fragments:
  - file: <path>
    summary: "<brief description>"
complexity:
  files: <approximate count>
  depth: <max directory depth>
  monorepo: <true/false>
  ci: <ci system or "none">
```

If mode is B, output the same structure with empty/unknown values.
Do NOT generate any config files. Only detect and report.
````

Replace `{references_path}` with the actual path to
`plugins/config-doctor/references` and `{project_root}` with the resolved
project root before dispatching.

### Mode B fallback

If the detection report returns `mode: B`, ask the user three questions using
AskUserQuestion (ask them together, not one at a time):

1. What language/framework are you using (or planning to use)?
2. What is the project's primary purpose? (CLI tool, web app, API, library, etc.)
3. Any specific conventions you want enforced?

Fold the answers into the detection report as user-provided values before
proceeding to Phase 2.

---

## Phase 2 --- Generation

Dispatch the **agent-architect** agent (opus) via the Agent tool with
`subagent_type: "config-doctor:agent-architect"`.

### Agent prompt

````text
You are generating Claude Code configuration files for a project based on its
detected stack. Read the generation contract from the routing map, then produce
tailored config files.

**Routing map:** Read `{references_path}/bootstrap-schema.yaml` — focus on the
`generation` section.

**Detection report:**

```yaml
{detection_report}
```

**User intent:** {intent}
(fresh = no existing config; overwrite = replace existing; merge = fill gaps only)

{merge_context}

**Your task:**

Generate configuration files following the `generation` section of the schema.

For **required** targets (CLAUDE.md, .claude/rules/guardrails.md):
- Always generate these
- CLAUDE.md must include: project conventions derived from the detected config,
  build/test/lint commands discovered from manifests, and a repo structure
  overview
- guardrails.md must include stack-specific critical boundaries, common
  footguns, and framework-specific traps — derived from the actual detected
  stack, not generic advice

For **conditional** targets:
- Standards rules: generate ONLY if config fragments with `informs=code-style`
  or `informs=formatting` were detected. Derive rules from the actual config
  content, not generic style guides.
- Agent files: generate ONLY if complexity warrants it (monorepo, large
  codebase with multiple distinct subsystems). Skip for simple projects. If
  generated, each agent must include proper frontmatter with `name:`,
  `description:` (with `<example>` blocks), and `model:` fields.
- .gitignore additions: ensure `.claude/settings.local.json` is excluded.

For **merge** intent: read the existing config files at the project root and
generate ONLY what is missing or under-specified. Do not overwrite existing
content.

**Output format:**

Output each file with this exact marker format:

--- FILE: <relative-path> ---
<file content>

For example:
--- FILE: CLAUDE.md ---
# CLAUDE.md
...

--- FILE: .claude/rules/guardrails.md ---
# Guardrails
...

Generate ONLY the file contents. No explanations outside the file markers.
````

Replace `{references_path}`, `{detection_report}`, `{intent}`, and
`{merge_context}` before dispatching. For `{merge_context}`:

- If intent is **merge**: read existing CLAUDE.md and `.claude/rules/` files,
  then include their content as "Existing config files:" in the prompt.
- Otherwise: set to empty string.

### Parse the output

Split the agent-architect output on `--- FILE:` markers. For each file:

- Extract the relative path
- Extract the content (everything until the next marker or end of output)
- Store as a list of `{path, content, line_count}` tuples for Phase 3

---

## Phase 3 --- Review and Apply

### Bootstrap Report

Present the following report to the user:

````markdown
## Bootstrap Report

### Detected Stack

- Language: {language}
- Framework: {framework}
- Build tools: {build_tools}
- Testing: {testing}
- Linting: {linting}
- Existing config: {list of detected config fragments, or "none"}
- Complexity: {file count} files, {depth} depth, monorepo={monorepo}, CI={ci}

### Generated Files

| File | Purpose | Lines |
|------|---------|-------|
| {path} | {purpose} | {line_count} |
| ... | ... | ... |

### What's NOT Included (and why)

{Explain deliberate omissions --- e.g., "No agents generated: single-purpose
CLI tool doesn't benefit from specialized agents" or "No standards rules:
no linter/formatter config was detected"}

### Next Steps

1. Review generated files and adjust to your preferences
2. Run `/audit` after a few sessions to identify refinement opportunities
````

### Apply gate

- If `--dry-run` was specified: stop here. The report is the final output.
- Otherwise: ask the user "Apply these files? (Y/n)" using AskUserQuestion.
- **On approval**: write all files using the Write tool. Create directories as
  needed.
- **On rejection**: stop. No files written. Tell the user they can re-run
  without `--dry-run` when ready.

---

## User Arguments

If arguments were passed when invoking this skill (`$ARGUMENTS`), interpret
them as follows:

- `--dry-run` --- run detection and generation but present report only, do not
  write files
- A path argument (e.g., `/path/to/project`) --- use that path as the project
  root instead of cwd

$ARGUMENTS
