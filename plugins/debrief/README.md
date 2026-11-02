# debrief

Coding with an agent goes fast, and it is easy to lose the grip on the technologies, patterns and domain rules a branch ends up using. `/debrief` turns the end of a branch into a short learning session.

1. Reads the branch diff against the base branch (and the session's conversation, when it built the branch).
2. Builds a learning map: **technologies**, **patterns**, **domain** rules, **decisions** with their trade-offs, and one **stretch** topic to learn next — each anchored to the code with a short snippet, and technologies linked to their official docs.
3. Quizzes you one question at a time (why / predict / break / locate / transfer) and corrects your answers.
4. Wraps up with what is solid, what to revisit, and what to learn next, with official docs links.

## Modes

- **Chat** (default) — everything happens in the conversation.
- **Interactive page** — the same debrief and quiz as an HTML page, which also stays as the branch's report. Uses noticeably more tokens, so it is opt-in.

## Install

```text
/plugin marketplace add mpiccinnonode/claude-salad
/plugin install debrief@mpiccinnonode
```

## Use

```text
/debrief            # against the repo's default branch
/debrief develop    # against a specific base
```

With the `triage` plugin installed, feature flows suggest `/debrief` as an optional last phase after review.
