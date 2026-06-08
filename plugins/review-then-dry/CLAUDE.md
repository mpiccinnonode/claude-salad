# review-then-dry plugin — dev notes

Three-skill suite backported from personal `~/.claude` skills: `lifecycled-code-review`,
`dry`, and the `review-then-dry` orchestrator. See the design spec at
`docs/superpowers/specs/2026-06-08-review-then-dry-plugin-design.md` for the 11 locked decisions.

- Skill bodies: `skills/*/SKILL.md`. In-plugin paths use quoted `"${CLAUDE_PLUGIN_ROOT}"`.
- Helper scripts: Node only, no shell/jq/python/yq. Each has a fixed argv signature + stdout
  contract in its header, ported 1:1 from a POSIX `.sh` original.
- YAML parsing uses the vendored `scripts/vendor/js-yaml.mjs` (decision #11). `js-yaml` is a
  devDependency for CVE hygiene only; it is NOT installed at plugin-install time.
- `lifecycled-code-review` is renamed from the built-in `code-review` to avoid collision; the
  orchestrator's `Skill()` calls use the namespaced `review-then-dry:<skill>` form.
- Run tests: `npm test` (uses node:test). Run `npm install` first to pull the js-yaml
  devDependency for the parity test.
