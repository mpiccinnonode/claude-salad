# buddy

The `/buddy` companion Claude Code shipped in April 2026 and removed in 2.1.97, brought back as a mod. Your buddy sits above the prompt, animated, and reacts to your work.

- **Random, and yours to keep.** Every buddy hatches from a random seed, the same odds for everyone: species (one of 21, equally likely), rarity (★ 60%, ★★ 25%, ★★★ 10%, ★★★★ 4%, ★★★★★ 1%), eyes, hat and five stats (DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK). A name or personality you don't give it, Haiku invents. Whatever hatches is kept: a buddy looks the same every session.
- **Keeps the buddy you had.** On its first run it reads `~/.claude.json` once and keeps the buddy you had (from the original `/buddy` or buddy 0.2.0): its name, personality and body, re-rolled from your account id with the original algorithm. It never reads the file again, and writes that buddy at the top of the buddies file like any other.
- **Animated part by part.** It blinks, looks around, hops, flaps, wags and twitches. Every species has its own body language when petted, poked or asleep: a cat flattens its ears, a turtle hides in its shell, a cactus blooms. While Claude works it waddles, and after about 30 seconds of quiet it dozes off.
- **Reacts to your work.** It has canned lines for failed commands, failing tests, commits and late-night commits, drawn from its species and its strongest stat. Every few turns Haiku writes it a fresh in-character quip.
- **Clickable.** Click the buddy (or press `1`) to pet it. `2` pokes it, `3` asks it to talk, `4` shows its stats card, `×` hides it.
- **More than one.** Keep every buddy in one JSON file, your first one included, each with its own species, personality and random rarity, hat and stats, and pick which one is out. Each new one costs an egg, earned by turns together. Put it on the left or the right of the band.
- **Evolves.** Enough turns together and a buddy can evolve when you say so: a rarity up, better stats, a stranger personality and an epithet after its name.
- **Personalities with depth.** Write one as a sentence or field by field (tone, traits, quirks, backstory, speech, catchphrase, likes, dislikes). Leave it out and Haiku dreams one up when the buddy hatches, shaped by its species and stats, and writes it into the file for you to tweak.

## Requirements

- **Claude Code ≥ 2.1.299.** Older builds refuse the clickable sprite and the band stays empty.
- One Haiku call every few turns (`everyNTurns`, default 3); with more than one buddy out, sometimes one more when the next answers back (`banterChance`, default 0.3). Plus one each time you press `talk`, plus one when a buddy without a name or personality hatches.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install buddy@mpiccinnonode
```

## Use

| Action | What happens |
| --- | --- |
| `/buddy` | Shows or hides the buddy (remembered across sessions). When an egg is ready, it hatches a surprise instead: a new buddy, named by Haiku, comes straight out. |
| `/buddy list` | Opens the Buddy pane: every buddy as a card with its sprite, filtered by crew, bench, eggs, ready to evolve, rarity, species or name. Pick one to see its stats and turns left to evolve, and to edit its name, species and personality (each field saved with Enter, written into the buddies file). Keys while the pane has focus: `n`/`p` next and previous, `s` into the crew or onto the bench (a full crew asks who makes way), `u` lead, `e` evolve, `h` hatch an egg, `t` personality as one sentence or as fields, `a` add, `x` remove (asks first), `0` clear the filters; `−`/`+` beside the header set the crew's room (from 1 to every buddy in the file, kept across sessions, over the `crewSize` option); Tab walks the fields, Esc closes. Rarity, sprite and stats are rolled and stay as they are. Where no pane can be drawn it prints the list as before: `▸` the lead, `●` the rest of the crew, `🥚` one still in its egg. |
| `/buddy use <name>` | Makes another buddy the lead of the crew (remembered across sessions). If it is still an egg, this hatches it, when you have an egg to spend. A bare `/buddy use` goes back to the default crew (the `active` option, or everyone hatched). |
| `/buddy join <name>` | Brings one more buddy out, up to `crewSize`; hatches it like `use` if it is still an egg. |
| `/buddy leave <name>` | Sends a buddy back to the bench; the last one out stays. |
| `/buddy add [name] [species] [personality]` | Spends an egg to hatch a new buddy and writes it into the buddies file, e.g. `/buddy add Nino duck grumpy old bird`. No species: a random one. No name: Haiku names it. It joins the crew while there is room. |
| `/buddy rm <name>` | Removes a buddy from the buddies file. No egg back. |
| `/buddy evolve [name]` | Evolves a buddy in the crew once it is ready (see below); without a name, the first one that is. |
| click it, or `1` | Pet: happy eyes, a floating heart, a happy line. |
| `2` | Poke: a startled hop, then a cross look and a grumpy line. |
| `3` | Talk: an in-character line about what Claude last said (one Haiku call). |
| `4` | Stats: rarity and the five stats on one line. Any other action closes it. |
| `5` | List: opens the Buddy pane, like `/buddy list`. Where the band is tight the button wraps onto a second row. |

The number keys work while the band has focus (`ctrl+x tab`, or click it). Clicks always work.

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `everyNTurns` | number | `3` | Finished turns between Haiku quips. With a crew, each quip comes from the next buddy in turn. |
| `banterChance` | number | `0.3` | With more than one buddy out, the chance that after a quip the next buddy answers it, once (one more Haiku call). `0` turns it off. |
| `buddiesFile` | string | `~/.claude/buddy/buddies.json` | Where your buddies live (see below). |
| `crewSize` | number | `3` | How many buddies can be out at once, until `−`/`+` in the Buddy pane set it. The band shows as many as the terminal has room for (beside the bubble, then above it), always including the one talking; the rest are named in its bubble. |
| `active` | string | `""` | Which buddies are out, comma separated, up to `crewSize` (e.g. `Pip,Mox`); empty means every buddy already hatched, in file order. `/buddy use`, `join` and `leave` override it. Unknown names and buddies still in their egg are skipped. |
| `turnsPerHatch` | number | `1400` | Finished turns together, across every session, for each egg. Three subagent turns count as one. |
| `turnsPerEvolve` | number | `1000` | Finished turns with a buddy out before a common one can evolve; each rarity up multiplies it (see below). |
| `position` | string | `left` | `left` or `right`: on the right the buddy sits against the right edge, its bubble to its left. |
| `language` | string | `it` | `it` or `en`: canned lines, labels, Haiku quips and personalities all follow it, and so does the epithet an evolved buddy shows. |

Set them in `/config`, or in `settings.json` under `pluginConfigs`, keyed `buddy@mpiccinnonode`.

No buddy in `~/.claude.json`? Your first one hatches free and random, and Haiku gives it a name and a personality (Buddy, with a plain personality, if that call fails); it is written into the buddies file.

Upgrading from 0.8: your original buddy moves from the plugin's store to the top of the buddies file once, with its body, epithet, sessions (each counts as 20 turns) and place in the crew. Whatever you had set in the `name`, `personality` and `species` options goes into its entry, where you edit it from now on; those options stay in `/config` only for this move and do nothing afterwards. If its name is already taken in the file it becomes `Name 2`. While the file is not valid JSON the move waits, and a plain stand-in shows.

## The buddies file

The one place every buddy lives, a JSON list. Only `name` is required; any other field you add is kept as is.

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
  { "name": "Zed", "relations": [{ "Nino": "his grumpy mentor" }, { "Pippo": "a rival he secretly admires" }] }
]
```

`relations` lists what a buddy is to the others, by their name: when it speaks with them out in the crew (a quip, or answering one), Haiku reads it, so Zed above treats Nino as his mentor. Each side has its own view: Nino's entry says what Zed is to him. Renaming a buddy from the Buddy pane renames it in every `relations` entry too, and removing one drops it from them; a name changed by hand in the file is not followed. The Buddy pane shows them under each buddy and edits them there, one `Name: relation` per line. Relations also shift on their own, without waiting for an evolution: every fifth of `turnsPerEvolve` turns (200 by default) a buddy spends out with others, Haiku takes its view of each of them one small step further, knowing what it is to them in return. Once every `turnsPerEvolve` of its turns (one step in five) the step can be a real turn: a rival may soften, a fondness become love, a love sour. A love never starts in a small step, except to answer one already offered, and never ends in one, so couples stay rare and, once formed, last. Only one buddy shifts per turn. An evolution rewrites them too, along with the personality, and restarts that count.

Two buddies who call each other their love (`lover`, `my love`, `the love of his life`, `soulmate`, `other half`, `a crush on`, `fiancée`, `engaged`, `life partner`, `amante`, `anima gemella`, `il suo amore`, `dolce metà`, `compagna di vita`, `innamorato`, `fidanzata`, `moglie`, `cotta`…; a bare `partner`, `compagno` or `crush` is not enough; not a love that ended, `ex`, `former`, `old flame`, `non più`, `vecchia fiamma`, nor one that names family, nor a fan's or a mate's, `lover of chaos`, `amante del caos`, `partner in crime`, `compagno di squadra`) and are out in the crew together lay an egg of their own every half `turnsPerHatch` turns they spend together, besides the usual eggs. A `♥` line in the box beside the bubble says so, and a bare `/buddy` hatches it before any other egg: the child takes the species of one parent, the rest is rolled as usual, Haiku writes its name and a personality with a trace of each parent, and `your parent`/`your child` relations are written on both sides. Love that is not returned lays nothing. A buddy can love more than one, and each couple counts on its own; sending one of them to the bench only pauses that couple, which goes on from where it was once both are out again. Only removing a buddy from the file clears its relations and couples.

Relations written in another shape (`"relation"`, one object, `{ "name": "Ada", "relation": "rival" }`, text like `"Ada: rival; Pip - friend"`) are moved into the list above at every session start; anything that cannot be read as a name and a relation is kept under `relationNotes` (and when nothing could be read, Haiku writes the buddy's relations as if it had none). After upgrading to 0.13, buddies with no `relations` field get theirs from Haiku once, from who everyone is (at the next session start; buddies whose call failed are asked again at the one after); `"relations": []` keeps a buddy out of it.

Every buddy you add to the file starts as an egg: you earn one egg every `turnsPerHatch` finished turns (1400 by default; long sessions count for more, and sessions running side by side all add up), and `/buddy use <name>` spends it. A box beside the buddy's bubble tells you when an egg is ready; a bare `/buddy` then hatches a brand-new one whose name is the surprise; it leads the crew, or waits on the bench when the crew is full. Hatching rolls the rest at random. If the buddy has no personality, Haiku writes one into the file then. A file that is not valid JSON is reported by `/buddy list` and never written.

## Crew

The band follows the disk: another session's turns, `/buddy` run elsewhere or an edit of the buddies file show up within a few seconds, no reload. The box of what is ready sits beside the bubble when the terminal has room for it (about 31 more columns), and is left out before a buddy is.

Up to `crewSize` buddies (3 by default) can be out at once. Until you pick with `/buddy use`, `join` or `leave` (or set `active`), the crew forms on its own: every buddy already hatched, in file order; the one picked with `/buddy use` in 0.4 leads it. A newborn joins while there is room. They sit side by side and take turns: each quip, canned line or button press comes from the one with the floor, marked by `▲`/`▼` under its sprite, and clicking a buddy gives it the floor. Now and then the next one answers back (`banterChance`). Each counts its own turns towards evolving.

As the terminal narrows the band gives way in steps: the sprites move above the bubble, then fewer of them, always with the one talking (the others are listed after its name), and below about 42 columns it is a single line, `Name: quip`. A short band skips the stacked steps.

## Evolution

Like a Pokémon, the rarer a buddy, the longer it takes: from its last evolution (or its hatching), a common buddy needs `turnsPerEvolve` turns out (1000 by default), each rarity up adds half that: an uncommon one 1.5×, a rare one 2×, an epic one 2.5×, a legendary one 3×. Then it is ready to evolve: the same box says so, one line per buddy, until you spend it. Nothing happens until you type `/buddy evolve`. Then its rarity goes up one step (legendary stays legendary), it gets a hat if it had none, every stat goes up (its strongest one most), and Haiku rewrites its personality: the same buddy, only stranger, pushed along its stats. It also earns an epithet after its name, in the language you set, e.g. "Urchin, the Winged Sarcasm" or "Urchin, Sarcasmo Alato"; each evolution replaces it with a grander one. The new personality is written into the buddies file. If Haiku fails, nothing changes and you can try again.

## What it hooks

Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/buddy`:

```text
❯ ./register.tsx hooks: session.start, session.end, command.run{command=buddy}, tool.call{tool=Bash}, turn.complete, ui.render{component=AbovePrompt}
❯ ./register.tsx calls: $.clock.after, $.clock.every, $.command.register, $.env.get (via openBook, readLegacy), $.fs.read (via openBook, readLegacy), $.fs.write (via writeBook), $.model.complete (via askJson, quipFromModel), $.state.get, $.state.set, $.store.get, $.store.keys, $.store.set, $.ui.resolve (via drawBand)
❯ ./register.tsx env reads: HOME
```

It reads `~/.claude.json` once, on its first run, and never writes it. It reads and writes only the buddies file besides. It watches Bash calls only for whether they failed, ran tests or committed, and never changes them. It sends the end of Claude's last answer to Haiku for quips.

## Credits

The roll algorithm, the original art and the reaction lines are adapted from [ramarivera/coding-buddy](https://github.com/ramarivera/coding-buddy), MIT licensed; see `THIRD_PARTY_LICENSE-coding-buddy`.
