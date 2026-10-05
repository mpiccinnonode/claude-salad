# context-diet

Trims what the model reads at session start. Two independent knobs, both off by default:

- **Hide skills from the listing** — skills you never want auto-triggered stop costing listing tokens. You can still type them as `/commands`.
- **Strip the superpowers gatekeeper** — removes the `<EXTREMELY_IMPORTANT>` using-superpowers block a SessionStart hook injects. The superpowers skills themselves stay installed and listed.

With no options set it does nothing.

## Requirements

- **Claude Code ≥ 2.1.287.** This is a mod (a plugin of function hooks). Older builds silently ignore it: no error, no effect.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install context-diet@mpiccinnonode
```

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `dropSkills` | string | `""` | Comma-separated skill names to leave out of the skill listing, exactly as the listing spells them (`ponytail:ponytail-gain,claude-mem:wowerpoint`). |
| `stripGatekeeper` | boolean | `false` | Removes the using-superpowers gatekeeper block from SessionStart hook context. |

Set them in `/config` (each option is a row there; a change reloads the mod), or in `settings.json` under `pluginConfigs`, keyed by the plugin id as `/plugin` lists it:

```json
{
  "pluginConfigs": {
    "context-diet@mpiccinnonode": {
      "options": {
        "dropSkills": "ponytail:ponytail-gain,claude-mem:wowerpoint",
        "stripGatekeeper": true
      }
    }
  }
}
```

## What it hooks

Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/context-diet`:

```text
❯ ./register.ts hooks: prompt.attachment{type=skill_listing}, prompt.attachment
❯ ./register.ts calls: nothing on $
```

It rewrites two kinds of context text and calls nothing: no files, network, or processes.
