# buddy

The `/buddy` companion Claude Code shipped in April 2026 and removed in 2.1.97, brought back as a mod. Your buddy sits above the prompt, animated, and reacts to your work.

- **Your original buddy.** It reads the name and personality your buddy hatched with from `~/.claude.json`, and re-rolls its body from your account id with the original algorithm: species (one of 18), rarity ★ to ★★★★★, eyes, hat and five stats (DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK).
- **Animated part by part.** It blinks, looks around, hops, flaps, wags and twitches. Every species has its own body language when petted, poked or asleep: a cat flattens its ears, a turtle hides in its shell, a cactus blooms. While Claude works it waddles, and after about 30 seconds of quiet it dozes off.
- **Reacts to your work.** It has canned lines for failed commands, failing tests, commits and late-night commits, drawn from its species and its strongest stat. Every few turns Haiku writes it a fresh in-character quip.
- **Clickable.** Click the buddy (or press `1`) to pet it. `2` pokes it, `3` asks it to talk, `4` shows its stats card, `×` hides it.

## Requirements

- **Claude Code ≥ 2.1.295.** Older builds refuse the clickable sprite and the band stays empty.
- One Haiku call every few turns (`everyNTurns`, default 3), plus one each time you press `talk`.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install buddy@mpiccinnonode
```

## Use

| Action | What happens |
| --- | --- |
| `/buddy` | Shows or hides the buddy (remembered across sessions). |
| click it, or `1` | Pet: happy eyes, a floating heart, a happy line. |
| `2` | Poke: a startled hop, then a cross look and a grumpy line. |
| `3` | Talk: an in-character line about what Claude last said (one Haiku call). |
| `4` | Stats: rarity and the five stats on one line. Any other action closes it. |

The number keys work while the band has focus (`ctrl+x tab`, or click it). Clicks always work.

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `name` | string | `""` | Overrides the name from `~/.claude.json`. |
| `personality` | string | `""` | Overrides the personality the quips are written in. |
| `everyNTurns` | number | `3` | Finished turns between Haiku quips. |
| `species` | string | `auto` | `auto` keeps your rolled species; pick any of the 18 to try another. |

Set them in `/config`, or in `settings.json` under `pluginConfigs`, keyed `buddy@mpiccinnonode`.

No hatched buddy in `~/.claude.json`? You get one named Buddy, still rolled from your account id.

## What it hooks

Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/buddy`:

```text
❯ ./register.tsx hooks: session.start, command.run{command=buddy}, tool.call{tool=Bash}, turn.complete, ui.render{component=AbovePrompt}
❯ ./register.tsx calls: $.clock.every, $.command.register, $.env.get, $.fs.read, $.model.complete, $.state.get, $.state.set, $.store.get, $.store.set, $.ui.resolve
❯ ./register.tsx env reads: HOME
```

It reads `~/.claude.json` once per session and never writes it. It watches Bash calls only for whether they failed, ran tests or committed, and never changes them. It sends the end of Claude's last answer to Haiku for quips.

## Credits

The roll algorithm, the original art and the reaction lines are adapted from [ramarivera/coding-buddy](https://github.com/ramarivera/coding-buddy), MIT licensed; see `THIRD_PARTY_LICENSE-coding-buddy`.
