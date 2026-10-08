# context-diet plugin — dev notes

A mod: function hooks only, no skills or agents. Needs Claude Code ≥ 2.1.287.

- `hooks/hooks.json` names one module, `hooks/register.ts`; the pure text logic lives in `hooks/diet.ts` so tests exercise it through the real `prompt.attachment` chain.
- `dropSkills` defaults off (`""`); `stripGatekeeper` defaults on (`true`, also the fallback in `register.ts` when the option is unset).
- `dropSkills` entries run from a `- name:` line to the next one, so multi-line skill descriptions go with them.
- The gatekeeper strip only touches `hook_additional_context` from a `SessionStart` hook origin; other hook text passes through.
- Check before pushing: `claude plugin validate plugins/context-diet` and `claude plugin test plugins/context-diet`. Neither needs auth. CI (`.github/workflows/mods.yml`) runs them on every plugin whose `hooks/hooks.json` has `modules`, failing on any warning except the one `--strict` raises for this `CLAUDE.md` (dev notes, deliberately not loaded).
- Type-check with a scratch `tsconfig.json` outside the plugin whose `include` names the engine's `claude-code.d.ts` and `hooks/`; the engine lays `.claude-plugin/types/` (git-ignored by the engine) only when it loads the mod from a `--plugin-dir`.
