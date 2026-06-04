# Offload Scripts — Contract

**Status:** Active
**Established:** 2026-04-22
**Scope:** Scripts that offload deterministic work from skill bodies to colocated executables. Governs the files introduced by the Script Offloading plan (`~/.claude/plans/2026-04-21-script-offloading-plan.md`).

---

## Location

Scripts live **inside the owning skill's folder**:

```text
~/.claude/skills/<skill>/scripts/<operation>.sh
~/.claude/skills/<skill>/scripts/<operation>.mjs
```

A script is only ever called by its owning SKILL.md. Cross-skill calls are forbidden — if two skills need the same logic, each gets its own copy. This keeps the skill folder the unit of audit, revert, and removal.

## Extension choice

- `.sh` — pure glob / grep / `wc` / shell arithmetic / `jq` one-liners.
- `.mjs` — YAML parsing, structured text manipulation, JSON emission more complex than a single `jq` expression. Node is assumed available (see spec §1.5).

Borderline cases get decided at authoring time. Do not introduce other runtimes.

## Header

Every script begins with a one-line comment naming the SKILL.md section it serves. This is the only explicit link between script and skill body and makes the pair auditable at grep-speed.

```sh
# Serves: code-review SKILL.md — Phase 0 Lifecycle Pass (§1.2.1)
```

```js
// Serves: distill SKILL.md — Consolidate Mode, Prune Candidates (§1.2.10)
```

## Inputs

- **argv only.** No environment-variable reads. Per-project configuration, if ever needed, must be passed via argv by the skill body.
- Inputs that are file paths must be absolute or resolved from argv before use. No implicit `cwd` assumptions.

## Output

- **stdout:** a JSON object for structured payloads; a single-line string for scalar results; **nothing else**. No progress logs, no banners, no trailing newlines beyond one.
- **stderr:** reserved for a one-line diagnostic when exiting non-zero. Silent on success.

## Exit codes

- `0` — success. stdout contains the payload.
- Any non-zero — failure. stderr contains one diagnostic line. The skill body **must halt and surface the diagnostic**; it must not silently fall back to the pre-offload path (see plan Cross-cutting → Failure handling).

Empty/malformed input is a failure, not a zero-value success. Example: a recurrence-count script receiving empty input exits non-zero; it does not emit `{count: 0}`.

## Idempotency

Where the pre-offload skill body is idempotent, the script must be too. Re-running on already-processed input is a no-op: no filesystem mutations, stable output. Idempotency is verified as part of each slice's stop gate where applicable (see plan Slice 4).

## What scripts must not do

- Call other scripts in other skills' folders.
- Mutate state outside the skill folder or the explicit file paths passed via argv.
- Read from the environment.
- Write to stdout on failure, or to stderr on success.
- Invoke the LLM or any agent. Scripts are deterministic or they do not belong here.

## Allowlist

Skills that invoke scripts need `Bash` in their `allowed-tools`. Adding `Bash` is the responsibility of the SKILL.md edit that introduces the script call, not a separate preparatory step. Do not broaden `allowed-tools` beyond `Bash` for offloading.

## Non-scope

The non-offloadable surface defined in spec §1.4 — library matching, adversarial reasoning, classification, finding interpretation, semantic grouping — stays in the skill body. Scripts are for deterministic work only.
