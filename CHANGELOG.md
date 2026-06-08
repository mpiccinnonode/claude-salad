# Changelog

## review-then-dry 1.0.0 (new plugin)

- feat(review-then-dry): scaffold Node-only, Windows-portable plugin (no shell/jq/yq/python)
- feat(review-then-dry): add /review-then-dry orchestrator chaining lifecycled-code-review + dry into one unified findings spec
- feat(review-then-dry): add lifecycled-code-review skill (renamed from built-in code-review to avoid collision) and dry reuse-audit skill
- feat(review-then-dry): port five helper scripts from POSIX shell to Node — get-review-targets, safe-write-yaml, get-spec-context, evict-staged, lifecycle-pass
- feat(review-then-dry): vendor js-yaml v4 ESM build (decided over npm dep) with a parity test; js-yaml kept as devDependency for CVE hygiene only
- feat(review-then-dry): add cold-start checklist gate and spec-path prompts
- test(review-then-dry): node:test suite covering all scripts plus vendor parity (zero external deps)
- docs(review-then-dry): vendor offload-scripts convention doc; add to README and sync plugin versions
- chore(review-then-dry): register plugin in marketplace; add package-lock.json for reproducible installs

## scrum-toolkit 2.1.0 → 2.2.0

- feat(user-story-edit): add /user-story-edit skill for targeted, diff-based amendments to existing GitHub user story issues
- feat(scrum): route user-story editing intent through the unified /scrum entry point
- feat(scrum-architect): support the user-story editing phase
- docs(scrum-toolkit): add GitHub API pattern for resolving project item IDs; update CLAUDE.md conventions

## triage 1.0.0 (new plugin)

- feat(triage): add /triage advisory task classifier — classifies a natural-language task into a workflow shape and maps each phase to the best installed skill, agent, or MCP server
- feat(triage): MCP-server discovery across project `.mcp.json`, `~/.claude.json` per-project entry, and plugin `.mcp.json` (wrapped and bare-map forms)
- feat(triage): cross-platform node-only helper scripts (`.mjs`) — no shell/jq/awk/sed/yq/python dependency
- test(triage): node:test parity + MCP fixture suite (24 tests, zero deps); first claude-salad plugin to ship runtime scripts + tests
- chore: lift the marketplace's pure-markdown-only rule to allow minimal runtime scripts and self-contained tests

## config-doctor 1.3.0 → 1.4.0

- feat(bootstrap): add --granularity flag for selective import control (config, code, or all)
- docs(config-doctor): update README and CLAUDE.md with granularity flag documentation

## config-doctor 1.2.0 → 1.3.0

- feat(bootstrap): add /bootstrap skill for day-0 Claude Code project setup
- feat(bootstrap): detect stack and generate tailored .claude/ configuration
- feat(bootstrap): support .claude-bootstrap.yaml template contracts (locked files, inject rules)
- feat(bootstrap): add pre-write confirmation gate and dry-run mode
- chore(config-doctor): add bootstrap schema reference and update plugin docs

## scrum-toolkit 2.0.0 → 2.1.0

- feat(user-story): add --bulk flag for batch story creation with [N/TOTAL] counters
- feat(branch): add --bulk flag for batch branch creation with skip-on-exist guard
- feat(sprint-plan): add --bulk-import mode for structured backlog publishing to GitHub
- fix(user-story): condition no-description guard to exclude --bulk path
- fix(branch): scope no-description guard to single-item mode; clarify creation loop step numbering
- fix(sprint-plan): add missing self-verification check for parse failure stop
- fix(sprint-plan): add b2 board-add failure path; clarify --bulk-import routing guard

## scrum-toolkit 1.0.0 → 2.0.0

- feat: add /scrum wrapper skill for unified entry point with intent routing
- feat: add gh-board skill for GitHub Projects v2 board management
- feat: add ceremony skills (standup, sprint-review, sprint-retro)
- feat: add DevOps skills (commit, pr, branch)
- feat: add PM/PO authoring skills (user-story, epic, milestone)
- feat: add sprint-plan skill with grooming, sprint, and full roadmap modes
- feat: add GitHub API patterns reference for JIT loading
- feat: add shared bootstrap reference for all skills
- feat: add SCRUM knowledge reference file for JIT loading
- feat(epic): add Task lifecycle and progress counters for GitHub publishing
- feat(gh-board): add Task lifecycle and progress counters for init and sync
- feat(sprint-plan): add wrapping Task for full roadmap generation
- feat(pr): check for clean tree before PR creation; enhanced PR workflow
- feat(skills): rename sprint-plan and sprint-retro skills
- refactor: rewrite scrum-architect as phase-agnostic SCRUM generalist
- refactor: rewrite all skills for GitHub Projects v2 SSoT (gh-board, plan, standup, sprint-review, retro, user-story, epic, milestone, commit, pr, branch)
- refactor: update scrum-architect for GitHub Projects v2 SSoT
- refactor: use cached conventions in branch skill
- fix: update GitHub Mapping to use custom fields model
- fix: md lint in scrum-architect
- chore: add TaskCreate, TaskUpdate to allowed-tools for epic and gh-board
- chore: skill trigger description optimization
- chore: update scrum-toolkit metadata and conventions for 1.0.0

## config-doctor 1.1.0 → 1.2.0

- fix: move references out of agents/ to prevent false agent registration
- chore: audit all agents and skill for quality improvements

## Shared

- chore: agents format (config-doctor, scrum-toolkit)

## General fixes

- doc: lint fixing
- docs: add progress tracking UX spec and implementation plan
