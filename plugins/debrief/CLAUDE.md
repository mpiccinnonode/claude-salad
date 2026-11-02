# debrief plugin — dev notes

One skill, `/debrief`: at the end of a branch it explains what was built (technologies, patterns, domain, decisions, one stretch topic) and quizzes the developer on it.

- Skill body: `skills/debrief/SKILL.md`. Markdown only, no scripts: the diff comes from plain `git`.
- Two modes: chat (default) and an interactive HTML page, opt-in because it costs more tokens. The page is the only persisted output and never lands in the repo.
- Triage suggests it as the optional `Debrief` phase after `Review` (`plugins/triage/skills/triage/SKILL.md`, Phase 3 table). Keep the description's "after review, before merge" wording in sync with that row.
