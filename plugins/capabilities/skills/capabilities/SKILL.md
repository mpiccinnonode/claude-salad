---
name: capabilities
description: Use when someone asks whether the team has already built something — a feature, an integration, a kind of project, a client domain — in any of the organization's projects. Trigger on "abbiamo già fatto...", "c'è un progetto che...", "chi ha già lavorato con...", "have we built X before", "which project does Y", "do we have something for Z", or when a new client request arrives and the user wants to know what can be reused. Works for non-technical colleagues too. Not for searching inside the current repo's code.
allowed-tools:
  - Bash
  - Read
argument-hint: "[cosa ti serve, in parole tue]"
---

# Capabilities

Answers "have we already built something like this?" across every project in the GitHub org. Each
project describes itself in a `CAPABILITIES.md` at its root; this skill gathers them all and matches
the request by meaning, not by exact words.

## 1. Load the index

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/capabilities/scripts/fetch-index.mjs"
```

- Line 1 of the output is the index path. Read that file in full — it holds every project's `CAPABILITIES.md`, each after a `<!-- ==== repo: <name> | <blob-url> ==== -->` header.
- Add `--refresh` when the user says a file was just added or changed. The cache otherwise lasts 24h.
- Add `--org <login>` only if the user names a different GitHub organization.
- If the script exits 1, tell the user in plain words what is missing: GitHub CLI not installed (`gh`), not logged in (`gh auth login`), or no access to the org. Do not guess an answer without the index.
- If the index is empty, say no project has a `CAPABILITIES.md` yet, and stop.

## 2. Match the request

- If the request is too vague to match (one generic word), ask one short question about what it is for, then continue.
- Match by meaning: "firma dei documenti" matches "FEA", "OTP", "firma digitale"; "app per i soci" matches a mobile app for members. Consider "Cosa sa fare", "Servizi esterni", "Da sapere", domain and client.
- Apply frontmatter filters the user states: stack, client, domain, `status` (e.g. "solo progetti attivi").
- Grade every hit:
  - **Stessa cosa** — the capability does what was asked.
  - **Simile** — a close relative that could be adapted.
  - **Stesso ambito** — same domain or client, no matching capability; useful for context or people to ask.
- Never invent a capability that is not in the index. Absent means absent.

## 3. Answer

The reader may not be technical. Write in the user's language, plain words first, technical detail last.

1. One opening sentence: yes / partially / no, and where.
2. One block per project, best match first, at most 5:

   ```markdown
   ### <Project name> — <client> · <Stessa cosa | Simile | Stesso ambito>
   <One or two sentences on what it does there, without jargon.>
   - Dove guardare: [<path>](<blob-url>/<path>)
   - Da sapere: <relevant item from "Da sapere", if any>
   ```

3. Mention a `dormant` status ("progetto fermo da oltre un anno") — the code may be outdated.
4. If nothing matches, say so plainly and name the closest domain, if any, so the user knows whom to ask.

Skip the stack and the paths' internals unless the user is clearly technical or asks for them.
