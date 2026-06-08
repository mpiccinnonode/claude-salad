# Offload Scripts — Contract

**Status:** Active
**Scope:** Scripts that offload deterministic work from skill bodies to colocated executables.

---

## Location

Scripts live inside the owning skill's folder or (for logic shared across skills in this plugin)
at the plugin root `scripts/` folder:

```text
"${CLAUDE_PLUGIN_ROOT}"/skills/<skill>/scripts/<operation>.mjs
"${CLAUDE_PLUGIN_ROOT}"/scripts/<operation>.mjs        # shared across skills in this plugin
```

A script is only ever called by its owning SKILL.md. Cross-skill calls are forbidden — if two
skills need the same logic, each gets its own copy. **Exception:** `scripts/get-review-targets.mjs`
is shared between `lifecycled-code-review` and `dry` (decision #7 in the design spec). This is the
sole permitted cross-skill call in this plugin; all other scripts are skill-local.

## Extension choice

This plugin is **Node-only** — no `.sh` files, no `jq`, no `yq`. YAML parsing is done via the
vendored `scripts/vendor/js-yaml.mjs` (decision #2 and #11 in the design spec). All scripts use
the `.mjs` extension.

Do not introduce other runtimes or external binaries.

## Header

Every script begins with a one-line comment naming the SKILL.md section it serves. This is the
only explicit link between script and skill body and makes the pair auditable at grep-speed.

```js
// Serves: lifecycled-code-review SKILL.md — Phase 0 Lifecycle Pass (§1.2.1)
```

## Inputs

- **argv only.** No environment-variable reads. Per-project configuration, if ever needed, must be
  passed via argv by the skill body.
- Inputs that are file paths must be absolute or resolved from argv before use. No implicit `cwd`
  assumptions.

## Output

- **stdout:** a JSON object for structured payloads; a single-line string for scalar results;
  **nothing else**. No progress logs, no banners, no trailing newlines beyond one.
- **stderr:** reserved for a one-line diagnostic when exiting non-zero. Silent on success.

## Exit codes

- `0` — success. stdout contains the payload.
- Any non-zero — failure. stderr contains one diagnostic line. The skill body **must halt and
  surface the diagnostic**; it must not silently fall back to the pre-offload path.

Empty/malformed input is a failure, not a zero-value success.

## Idempotency

Where the pre-offload skill body is idempotent, the script must be too. Re-running on
already-processed input is a no-op: no filesystem mutations, stable output.

## What scripts must not do

- Call other scripts in other skills' folders (except the documented `get-review-targets.mjs`
  exception above).
- Mutate state outside the skill folder or the explicit file paths passed via argv.
- Read from the environment.
- Write to stdout on failure, or to stderr on success.
- Invoke the LLM or any agent. Scripts are deterministic or they do not belong here.

## Allowlist

Skills that invoke scripts need `Bash` in their `allowed-tools`. Adding `Bash` is the
responsibility of the SKILL.md edit that introduces the script call, not a separate preparatory
step. Do not broaden `allowed-tools` beyond `Bash` for offloading.

## Non-scope

Library matching, adversarial reasoning, classification, finding interpretation, semantic grouping
— stays in the skill body. Scripts are for deterministic work only.
