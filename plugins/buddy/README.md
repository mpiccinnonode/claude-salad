# buddy

The `/buddy` companion Claude Code shipped in April 2026 and removed in 2.1.97, brought back as a mod. Your buddy sits above the prompt, animated, and reacts to your work.

- **Random, and yours to keep.** Every buddy hatches from a random seed, the same odds for everyone: species (one of 18, equally likely), rarity (★ 60%, ★★ 25%, ★★★ 10%, ★★★★ 4%, ★★★★★ 1%), eyes, hat and five stats (DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK). A name or personality you don't give it, Haiku invents. Whatever hatches is kept: a buddy looks the same every session.
- **Keeps the buddy you had.** On its first run it reads `~/.claude.json` once and keeps the buddy you had (from the original `/buddy` or buddy 0.2.0): its name, personality and body, re-rolled from your account id with the original algorithm. It never reads the file again.
- **Animated part by part.** It blinks, looks around, hops, flaps, wags and twitches. Every species has its own body language when petted, poked or asleep: a cat flattens its ears, a turtle hides in its shell, a cactus blooms. While Claude works it waddles, and after about 30 seconds of quiet it dozes off.
- **Reacts to your work.** It has canned lines for failed commands, failing tests, commits and late-night commits, drawn from its species and its strongest stat. Every few turns Haiku writes it a fresh in-character quip.
- **Clickable.** Click the buddy (or press `1`) to pet it. `2` pokes it, `3` asks it to talk, `4` shows its stats card, `×` hides it.
- **More than one.** Keep extra buddies in a JSON file, each with its own species, personality and random rarity, hat and stats, and pick which one is out. Each new one costs an egg, earned by sessions together. Put it on the left or the right of the band.
- **Personalities with depth.** Write one as a sentence or field by field (tone, traits, quirks, backstory, speech, catchphrase, likes, dislikes). Leave it out and Haiku dreams one up when the buddy hatches, shaped by its species and stats, and writes it into the file for you to tweak.

## Requirements

- **Claude Code ≥ 2.1.295.** Older builds refuse the clickable sprite and the band stays empty.
- One Haiku call every few turns (`everyNTurns`, default 3), plus one each time you press `talk`, plus one when a buddy without a name or personality hatches.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install buddy@mpiccinnonode
```

## Use

| Action | What happens |
| --- | --- |
| `/buddy` | Shows or hides the buddy (remembered across sessions). When an egg is ready, it hatches a surprise instead: a new buddy, named by Haiku, comes straight out. |
| `/buddy list` | Lists your buddies; `▸` marks the active one, `🥚` one still in its egg. Shows the progress to the next egg. |
| `/buddy use <name>` | Brings out another buddy (remembered across sessions). If it is still an egg, this hatches it, when you have an egg to spend. A bare `/buddy use` goes back to the `active` option. |
| `/buddy add [name] [species] [personality]` | Spends an egg to hatch a new buddy and writes it into the buddies file, e.g. `/buddy add Nino duck grumpy old bird`. No species: a random one. No name: Haiku names it. |
| `/buddy rm <name>` | Removes a buddy from the buddies file. No egg back. |
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
| `species` | string | `auto` | Your original buddy's species: `auto` keeps the hatched one; pick any of the 18 to try another. |
| `buddiesFile` | string | `~/.claude/buddy/buddies.json` | Where your extra buddies live (see below). |
| `active` | string | `""` | Which buddy is out; empty means your original one. `/buddy use` overrides it. One still in its egg falls back to the original. |
| `sessionsPerHatch` | number | `20` | Sessions together for each egg. |
| `position` | string | `left` | `left` or `right`: on the right the buddy sits against the right edge, its bubble to its left. |
| `language` | string | `it` | `it` or `en`: canned lines, labels and Haiku quips all follow it. |

Set them in `/config`, or in `settings.json` under `pluginConfigs`, keyed `buddy@mpiccinnonode`.

No buddy in `~/.claude.json`? Your first one hatches random, and Haiku gives it a name and a personality (Buddy, with a plain personality, if that call fails).

## The buddies file

A JSON list. Only `name` is required; any other field you add is kept as is.

```json
[
  { "name": "Nino", "species": "duck", "personality": "Grumpy, but brings snacks." },
  {
    "name": "Pippo",
    "personality": {
      "tone": "anxious and over-prepared",
      "traits": ["loyal", "nosy", "secretly brave"],
      "quirks": ["counts semicolons when nervous"],
      "backstory": "Hatched in a CI runner. Still flinches at red badges.",
      "speech": "short sentences, lots of 'okay okay okay'",
      "catchphrase": "Did we run the tests?",
      "likes": ["green builds"],
      "dislikes": ["force pushes"]
    }
  },
  { "name": "Zed" }
]
```

Every buddy in the file starts as an egg: you earn one egg every `sessionsPerHatch` sessions (20 by default), and `/buddy use <name>` spends it. A toast, and the buddy itself, tell you when an egg is ready; a bare `/buddy` then hatches a brand-new one whose name is the surprise. Hatching rolls the rest at random. If the buddy has no personality, Haiku writes one into the file then. A file that is not valid JSON is reported by `/buddy list` and never written.

## What it hooks

Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/buddy`:

```text
❯ ./register.tsx hooks: session.start, session.end, command.run{command=buddy}, tool.call{tool=Bash}, turn.complete, ui.render{component=AbovePrompt}
❯ ./register.tsx calls: $.clock.every, $.command.register, $.env.get (via pathOf, readLegacy), $.fs.read (via readBook, readLegacy), $.fs.write, $.model.complete (via dreamUp, quipFromModel), $.state.get, $.state.set, $.store.get, $.store.set, $.ui.resolve, $.ui.toast
❯ ./register.tsx env reads: HOME
```

It reads `~/.claude.json` once, on its first run, and never writes it. It reads and writes only the buddies file besides. It watches Bash calls only for whether they failed, ran tests or committed, and never changes them. It sends the end of Claude's last answer to Haiku for quips.

## Credits

The roll algorithm, the original art and the reaction lines are adapted from [ramarivera/coding-buddy](https://github.com/ramarivera/coding-buddy), MIT licensed; see `THIRD_PARTY_LICENSE-coding-buddy`.
