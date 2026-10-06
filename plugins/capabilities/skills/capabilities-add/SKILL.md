---
name: capabilities-add
description: Use when a project has no CAPABILITIES.md yet and the user wants to add one, or wants the current repo to show up in /capabilities searches. Trigger on "aggiungi CAPABILITIES.md", "add capabilities to this project", "set up capabilities here", "rendi questo progetto cercabile", "/capabilities-add". Creates CAPABILITIES.md from a fixed template and adds the upkeep instruction to the project's CLAUDE.md. Not for searching projects — that is /capabilities.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
argument-hint: "[cliente / ambito, opzionale]"
---

# Capabilities — add

Adds `CAPABILITIES.md` and its CLAUDE.md instruction to the current repo. Follow the steps in order;
the templates are fixed, only the placeholders change.

Templates: `${CLAUDE_PLUGIN_ROOT}/skills/capabilities-add/templates/CAPABILITIES.md` and
`${CLAUDE_PLUGIN_ROOT}/skills/capabilities-add/templates/CLAUDE-snippet.md`.

## 1. Check what is already there

Run from the repo root (`git rev-parse --show-toplevel`):

```bash
test -f CAPABILITIES.md && echo "capabilities: present"
grep -q "<!-- capabilities:start -->" CLAUDE.md 2>/dev/null && echo "snippet: present"
```

- Both present → say so and stop. Never overwrite an existing `CAPABILITIES.md`.
- Only one present → do only the missing step.

## 2. Gather facts — read, don't guess

Read only these, if they exist: `README.md`, `CLAUDE.md`, the root manifests (`package.json`,
`*.csproj`/`*.sln`, `pyproject.toml`, `composer.json`, `pubspec.yaml`, `go.mod`, `Gemfile`, `pom.xml`,
`build.gradle*`), `.env.example`, and the top-level directory listing. Then:

```bash
git log -1 --format=%cs
```

Derive:

| Placeholder | Source |
| --- | --- |
| `project` | README title, else repo directory name |
| `client` | the argument, README or CLAUDE.md; else ask |
| `domain` | the argument or README, one or two words in Italian (e.g. "sanità", "logistica"); else ask |
| `stack` | framework names from the manifests, comma-separated, no versions (e.g. `Angular, .NET`) |
| `status` | last commit within 12 months → `active`, older → `dormant` |
| `updated` | today, `YYYY-MM-DD` |
| `summary` | one plain sentence: what the project is and for whom |
| Cosa sa fare | one bullet per thing a user or client can do — from README features, routes, screens |
| Servizi esterni | one bullet per third-party service — from SDK dependencies and `.env.example` keys (payments, email, maps, auth, signature…), with what it is used for |
| Da sapere | constraints a colleague must know before reusing it (license, client-owned code, hosted by the client…) |

Ask the user **one** message with every value you could not derive (typically `client`, `domain`).
An empty section gets a single `- Nessuno.` bullet — do not drop the heading.

## 3. Write `CAPABILITIES.md`

Copy the template to the repo root and fill every `{{…}}`, repeating the bullet lines as needed.
No `{{` may remain. Rules for the content:

- Italian, plain words, written for non-technical colleagues.
- Technologies by name only. No versions, file paths, code conventions, tech debt or security issues.
- Describe what it does, not how.

## 4. Add the CLAUDE.md instruction

Append the snippet template verbatim to `CLAUDE.md` at the repo root, preceded by a blank line.
Create `CLAUDE.md` containing only the snippet if it does not exist. Do not edit anything else in it.

## 5. Report

Show `git diff --stat` plus the new `CAPABILITIES.md`, and ask the user to check "Cosa sa fare" —
it is the part search depends on. Do not commit. Mention that `/capabilities --refresh` picks the
project up once it is merged to the default branch.
