# SCRUM Knowledge Reference

Authoritative definitions for JIT loading by scrum-toolkit skills.

## Roles

**Product Owner (PO)** — single person accountable for maximizing product value.
Responsibilities: owns and orders the Product Backlog, writes/refines user stories,
sets acceptance criteria, makes scope trade-off decisions, accepts or rejects work.
Boundary: does NOT assign tasks or dictate implementation approach.

**Scrum Master (SM)** — servant-leader responsible for team effectiveness.
Responsibilities: facilitates ceremonies, removes impediments, coaches the team on
SCRUM practices, shields the team from external interruptions, tracks velocity trends.
Boundary: does NOT manage people or make product decisions.

**Development Team** — cross-functional, self-organizing group (3-9 members).
Responsibilities: estimates work, selects Sprint Backlog items, designs/builds/tests
the Increment, owns the "how." Every member shares accountability for delivery.
Boundary: no sub-teams or hierarchy within the team.

## Ceremonies

**Sprint Planning** — kicks off each Sprint.
Cadence: once per Sprint. Duration: up to 2 hours per Sprint week (e.g., 4 h for a 2-week Sprint).
Inputs: ordered Product Backlog, team velocity, Definition of Done.
Outputs: Sprint Goal, Sprint Backlog (selected items + plan).
Anti-patterns: PO absent, no Sprint Goal defined, overcommitting past velocity.

**Daily Standup (Daily Scrum)** — synchronize and surface blockers.
Cadence: every working day. Duration: 15 minutes max, same time/place.
Inputs: each member's status. Format: What I did / What I will do / Blockers.
Outputs: updated plan for the day, identified impediments.
Anti-patterns: status report to SM instead of peer sync, exceeding timebox,
problem-solving during standup instead of taking it offline.

**Sprint Review** — inspect the Increment and adapt the Backlog.
Cadence: end of Sprint. Duration: up to 1 hour per Sprint week.
Inputs: completed Increment, Sprint Goal.
Outputs: stakeholder feedback, updated Product Backlog.
Anti-patterns: slide-deck demo instead of working software, no stakeholders present,
treating it as a sign-off gate.

**Sprint Retrospective** — inspect the process and plan improvements.
Cadence: after Sprint Review, before next Sprint Planning. Duration: up to 45 min per Sprint week.
Inputs: observations from the Sprint (what went well, what didn't, ideas).
Outputs: 1-3 actionable improvement items added to the next Sprint.
Anti-patterns: blame-oriented discussion, no action items, same issues every retro
without follow-through.

## Artifacts

**Product Backlog** — ordered list of everything needed in the product.
Single source of truth for requirements. PO owns ordering; items near the top are
smaller, better-defined, and higher priority. Continuously refined (backlog grooming).

**Sprint Backlog** — set of Product Backlog items selected for the Sprint plus
the plan for delivering them. Owned by the Development Team. Updated daily.

**Increment** — the sum of all completed Product Backlog items at Sprint end.
Must meet the Definition of Done and be potentially releasable.

**User Story Format:**

```text
As a [role],
I want [capability],
So that [benefit].
```

Keep stories small enough to complete in one Sprint. Apply INVEST criteria:
Independent, Negotiable, Valuable, Estimable, Small, Testable.

**Acceptance Criteria (Given/When/Then):**

```text
Given [precondition],
When [action],
Then [expected result].
```

Each story should have 2-5 acceptance criteria. They define "done" for the story.

**Epic Structure** — large body of work decomposable into multiple user stories.
Fields: title, business objective, success metrics, child stories, target milestone.

**Definition of Done (template):**

- Code complete with unit tests passing
- Peer-reviewed (PR approved)
- Acceptance criteria verified
- No known defects
- Documentation updated
- Deployed to staging

**Estimation Scales:**

- Fibonacci story points: 1, 2, 3, 5, 8, 13, 21. Relative sizing, not hours.
  1 = trivial, 3 = straightforward, 8 = significant complexity, 13+ = consider splitting.
- T-shirt sizing: XS, S, M, L, XL. Use for high-level roadmap estimates or when
  teams are new to estimation. Map to points later if needed.

## Prioritization

**MoSCoW** — four buckets for scope negotiation:

- **Must** — non-negotiable for the release; failure without it.
- **Should** — important but not critical; workaround exists.
- **Could** — desirable; include if capacity allows.
- **Won't (this time)** — explicitly out of scope for now.

Best for: release planning, MVP scoping, stakeholder alignment.

**WSJF (Weighted Shortest Job First)** — prioritize by value delivery speed.
Formula: WSJF = Cost of Delay / Job Duration.
Cost of Delay = User-Business Value + Time Criticality + Risk Reduction.
Best for: continuous flow, choosing between competing features of different sizes.

**Value-vs-Effort Matrix** — 2x2 grid (high/low value, high/low effort).
Quadrants: Quick Wins (high value, low effort) -> do first;
Big Bets (high value, high effort) -> plan carefully;
Fill-Ins (low value, low effort) -> do if spare capacity;
Money Pit (low value, high effort) -> avoid.
Best for: rapid triage during backlog grooming when detailed estimates are unavailable.

## DevOps Conventions

**Conventional Commits** — structured commit messages for automation:

```text
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build
```

Breaking changes: add `!` after type/scope (e.g., `feat!: remove v1 API`).
Footer: `BREAKING CHANGE: <description>` for detailed explanation.

**Branch Naming Patterns:**

- `feature/<ticket-id>-short-description` — new functionality
- `bugfix/<ticket-id>-short-description` — defect repairs
- `release/<version>` — release stabilization
- `hotfix/<ticket-id>-short-description` — urgent production fixes

Always branch from `main` (or `develop` if using GitFlow).

**PR Template Structure:**

- Summary: what changed and why (1-3 sentences)
- Related issue/story link
- Test plan: how to verify
- Checklist: tests pass, lint clean, docs updated, screenshots (if UI)

**Semantic Versioning (SemVer):** `MAJOR.MINOR.PATCH`

- MAJOR: breaking/incompatible API changes
- MINOR: backward-compatible new functionality
- PATCH: backward-compatible bug fixes

Pre-release: append `-alpha.1`, `-beta.1`, `-rc.1`.

## GitHub Mapping

SCRUM artifacts map to GitHub primitives as follows:

| SCRUM Artifact | GitHub Primitive | Notes |
| --- | --- | --- |
| Epic | Milestone | Group related stories under one milestone |
| User Story | Issue | Use story template with As-a/I-want/So-that |
| Sprint Backlog | Project Board iteration | One iteration = one Sprint |
| Story Points | Labels (`sp:1`, `sp:2`, `sp:3`, `sp:5`, `sp:8`, `sp:13`) | Numeric labels for velocity tracking |
| Acceptance Criteria | Issue checklist (`- [ ]`) | Checkboxes in issue body |
| Sprint Goal | Iteration description | Set in Project Board iteration field |
| Definition of Done | PR checklist template | Enforced via branch protection + template |
| Bug | Issue with `bug` label | Separate from stories for metric clarity |
| Impediment | Issue with `blocker` label | Assign to Scrum Master for triage |

Workflow: PO creates Issues (stories) -> assigns to Milestone (epic) ->
team pulls into Project Board iteration (sprint) -> PRs link to Issues ->
merge closes Issues automatically via `Closes #N` in PR body.
