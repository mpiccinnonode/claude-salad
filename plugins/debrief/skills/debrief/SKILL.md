---
name: debrief
description: Use at the end of work on a branch — after review, before merge — to turn what the coding agent built into learning for the developer, so they keep their grip on the technologies, patterns and domain the branch touched and pick up something new along the way. Explains the branch, then quizzes the developer one question at a time. Trigger on "debrief", "fammi capire cosa abbiamo fatto", "spiegami il branch", "voglio capire questo lavoro", "quiz me on this branch", "what did we just build", "/debrief". Not a code review — it never judges or changes the code.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
  - WebFetch
argument-hint: "[base branch, optional — default: the repo's default branch]"
---

# Debrief

Turns a finished branch into a learning session: what changed, which concepts carry it, why it is
built that way — then questions that make the developer retrieve it, not just reread it.
Speak the user's language. Never edit the project's code.

## 1. Collect the branch

Base = the argument, else `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`),
else `main`. Diff against `origin/<base>` when that ref exists: a stale local base widens the diff.

```bash
git log --oneline <base>..HEAD
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

Empty diff → say there is nothing to debrief and stop. A huge diff → read the stat first and open
only the files that carry the logic (skip lockfiles, generated code, snapshots). Group the stat by
layer (backend, frontend, infra, tests…) and read logic files from **every** layer the branch
touches — a full-stack branch debriefed from the backend alone teaches half of it. If this session
built the branch, the conversation is a source too: it holds the *why* the diff does not.

## 2. Choose the mode

Ask once, with the cost made plain:

- **Chat** (default) — debrief and quiz here in the conversation. Cheaper.
- **Interactive page** — the same content as one HTML page with an in-page quiz, which also stays
  as the branch's report. Costs noticeably more tokens; only when asked for.

## 3. Build the learning map

Pick items per layer (backend, frontend, infra…): at least one for every layer with real logic in
the diff, at most 7 per layer — a hard cap, not a target: if more qualify, keep the ones the quiz
will test. A layer left out entirely is named, with the reason, in the opening line of the
debrief. For each: a name, a 2–4 sentence explanation, a `file:line` anchor in this diff, a code
snippet, and the kind:

- **Technology** — a library, API, framework feature or tool the branch uses, especially one new to
  the repo (new dependency, first use of an API).
- **Pattern** — a design or code pattern applied here, and the problem it solves in *this* code.
- **Domain** — a business rule or domain concept the code now encodes.
- **Decision** — a trade-off taken, with the rejected alternative and why.
- **Stretch** — one adjacent thing worth learning next: a deeper feature of a tool used here, or the
  pattern this code would grow into.

The snippet is the few lines (≤ 10) from the diff that show the item, in a fenced block with the
language tag and a `file:line` caption, trimmed with `// ...` — the reader checks the claim at a
glance without opening the file.

Prefer the non-obvious over the trivial: skip what any developer on this stack already knows.
Before writing step 4, check every claim about a library's behavior against its current docs —
context7 if available, else WebFetch of the official docs. A claim you could not check carries
*(unverified)* right where it is made, not only in the wrap-up. A wrong lesson is worse than none.

Every Technology and Stretch item gets a link to the official docs page that covers it (the
vendor's own docs, not blogs) — a URL you fetched or got from the docs tool this session, never
one recalled from memory. Link the published docs site, not its source repo: if the docs tool
returns a source path (e.g. a GitHub `.md`), derive the published URL and confirm it with
WebFetch; if that fails, keep the source link.

## 4. Debrief

Present the map grouped by layer, then by kind within each layer: per item a short paragraph, its snippet, and for Technology
items the docs link. Close with a 3-line "the branch in one breath": problem, approach, and the
single thing that would break first.

## 5. Quiz

5 questions by default (fewer if the branch is small), spread across the layers, mixing these
types:

- **Why** — "why is X done here instead of Y?"
- **Predict** — "what happens if this input / this call fails?"
- **Break** — "what breaks if we remove this line / reorder these steps?"
- **Locate** — "where does the code enforce rule Z?"
- **Transfer** — "how would you apply this pattern to <another case in this repo>?"

Each question:

- asks **one** thing, answerable in 1–2 sentences — no "and why", no "then: …";
- is about the code as it is, not an invented variant of it;
- rests on facts checked in the code: a comment or commit message may be stale, so confirm it
  before building a question on it;
- for Transfer, names a real case found in the repo (grep for it), never a guessed one.

Chat mode: before the first question, say once that "skip" and "stop" work. One question at a
time, then wait. Never put the answer in the same message. On the
reply: say what is right, correct what is wrong with a pointer to the code, then the next
question. "skip" moves on, "stop" ends the quiz.

## 6. Wrap-up

- **Solid** — items the answers showed are owned.
- **To revisit** — items missed or shaky, each with the file to reread.
- **Learn next** — the Stretch item plus at most two more topics, each with its official docs link
  (same rule as step 3: fetched this session, never from memory).
- **Code notes** — optional, only if the debrief surfaced something off in the code (a stale
  comment, a missing test): one line each. Not a review; never placed under Learn next.

## Interactive page mode

One self-contained HTML page holding steps 4–6: the map as sections, then the quiz with each
question's answer hidden behind a reveal, open answers with a "show model answer" button, and
multiple-choice questions graded in the page. Title: `Debrief — <branch>`.

If the Artifact tool is available, publish it there (load its design skill first); otherwise write
`debrief-<branch>.html` to the scratchpad or temp dir, never into the repo, and give the path.
