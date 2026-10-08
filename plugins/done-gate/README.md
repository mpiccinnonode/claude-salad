# done-gate

Keeps Claude from calling a coding turn done when it changed source files and never ran the project's tests or lint afterwards.

At the end of every turn it looks at two things: which source files Claude edited, and which commands it ran **after the last edit**. If code changed and no check ran since, it says so in one line under the answer:

```text
done-gate: edited 3 source files, no npm test|run lint ran after the last edit
```

Turns that only touch docs (Markdown, `docs/`, `.claude/`) stay silent, so planning and PM sessions never see it.

## Requirements

- **Claude Code ≥ 2.1.287.** This is a mod (a plugin of function hooks). Older builds silently ignore it: no error, no effect.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install done-gate@mpiccinnonode
```

## Mode

One option, `mode`, set in `/config` (a picker) or in `settings.json` under `pluginConfigs`, keyed by the plugin id as `/plugin` lists it:

```json
{ "pluginConfigs": { "done-gate@mpiccinnonode": { "options": { "mode": "block" } } } }
```

| Mode | What happens when checks were skipped |
| --- | --- |
| `off` | Nothing. |
| `warn` (default) | One line under the answer. |
| `block` | Claude is sent back once to run the checks (or explain why it can't). If it still finishes without them, you get the warn line. It never loops. |

## Which commands count as checks

With no config, done-gate looks for markers next to each edited file, walking up to the project root; the nearest directory with one wins, so nested apps (`frontend/package.json`, `backend/App.sln`) work without setup:

| Directory has | Counts as a check |
| --- | --- |
| `nx.json` | `nx affected` / `nx run-many` with a `test` or `lint` target |
| `*.sln`, `*.slnx`, `*.csproj` | `dotnet test`, `dotnet build` |
| `pubspec.yaml` | `flutter test`, `flutter analyze` |
| `package.json` | `npm test`, `npm run lint` |
| `pyproject.toml`, `setup.py`, `setup.cfg`, `tox.ini`, `pytest.ini`, `requirements*.txt` | `pytest`, `ruff check`, `mypy`, `pyright`, `flake8`, `tox`, `nox`, `python -m unittest` (also through `uv run`, `poetry run`, `python -m`) |

An edit with none of these anywhere above it is ignored: done-gate can't tell what "checked" would mean. When one turn edits two subprojects, a check from either one is enough.

To be explicit, commit `.claude/done-gate.json`:

```json
{
  "checks": ["npx nx affected -t test,lint"],
  "sources": ["src/**", "apps/**", "libs/**"]
}
```

- `checks`: each entry is a regular expression tested against the Bash command (plain text works as long as it has no regex symbols).
- `sources`: globs relative to the project root (`**`, `*`, `?`, `{a,b}`). Only edits matching them count. Without it, every file except docs counts.

Either field can be left out; done-gate falls back to detection for that one.

## What it hooks

Mods are not sandboxed, so this is what you install. From `claude plugin validate plugins/done-gate`:

```text
❯ ./register.ts hooks: turn.start, tool.call, classic.Stop, turn.complete
❯ ./register.ts calls: $.fs.list (via nearestChecks), $.fs.read (via config), $.session.root (via config)
```

It reads `.claude/done-gate.json` and lists the directories between each edited file and the project root. It writes nothing and never denies a tool call.
