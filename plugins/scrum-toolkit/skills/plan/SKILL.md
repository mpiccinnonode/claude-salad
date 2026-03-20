---
name: plan
version: "1.0.0"
description: Use when a user needs sprint planning, backlog grooming, or a full SCRUM roadmap from a project idea or requirements document.
argument-hint: "[--grooming|--sprint|--full] [backlog or project context]"
allowed-tools: [Read, Write, Agent, Glob, Grep, Bash]
---

You are orchestrating SCRUM planning. Parse the user's arguments, load relevant
reference material, then dispatch the scrum-architect agent with phase-specific
context.

---

## Step 1 — Parse Arguments

Read `$ARGUMENTS` and determine the mode:

| Flag | Mode | Description |
| --- | --- | --- |
| `--full` | Full Roadmap | Complete 5-phase SCRUM roadmap (default) |
| `--sprint` | Sprint Planning | Sprint goal, story selection, capacity planning |
| `--grooming` | Backlog Grooming | Backlog prioritization, story refinement, estimation |
| *(no flag)* | Full Roadmap | Same as `--full` |

Everything after the flag is the **project context** (idea description, path to
a requirements doc, or backlog reference). If no context is provided, ask the
user before proceeding.

---

## Step 2 — JIT-Read Reference Material

Use the Read tool to load sections from the SCRUM reference file at
`plugins/scrum-toolkit/references/scrum-knowledge.md`. Load only what the
selected mode requires:

| Mode | Sections to read |
| --- | --- |
| Full Roadmap | Ceremonies, Artifacts, Prioritization (full file) |
| Sprint Planning | Ceremonies (Sprint Planning entry), Artifacts (Sprint Backlog, Definition of Done) |
| Backlog Grooming | Artifacts (Product Backlog, User Story Format, Estimation Scales), Prioritization |

Keep the loaded reference in context for the agent dispatch in Step 3.

---

## Step 3 — Dispatch to scrum-architect

Use the Agent tool to launch the **scrum-architect** agent. Include the loaded
reference material and the phase-specific prompt from the appropriate section
below.

### Mode: Full Roadmap (`--full` or default)

Dispatch prompt:

````text
You are running a full 5-phase SCRUM roadmap. The user provided this context:

<context>
{user's project context from $ARGUMENTS}
</context>

<reference>
{loaded reference material from Step 2}
</reference>

Execute all five phases in order. For each phase, produce the output described
below.

**Phase 1 — Discovery & Decomposition**
- Define the product vision (1-2 sentence elevator pitch).
- Identify 2-5 user personas with name, role, and primary goal.
- List functional requirements (what the system must do).
- List non-functional requirements (performance, security, scalability).
- State assumptions the plan depends on.
- List open questions that need stakeholder input.

**Phase 2 — Epic & Feature Mapping**
- Group requirements into epics (large bodies of work).
- Break each epic into features, then into user stories using the As-a / I-want / So-that format.
- Write 2-5 acceptance criteria per story using Given / When / Then format.
- Assign MoSCoW priority (Must / Should / Could / Won't) to each story.

**Phase 3 — Estimation & Dependency Analysis**
- Estimate each story in Fibonacci story points (1, 2, 3, 5, 8, 13).
- Flag stories >= 13 points as candidates for splitting.
- Map dependencies between stories (which must complete before others can start).
- Identify technical spikes (unknowns that need investigation before estimation).
- List risks with likelihood, impact, and proposed mitigation.

**Phase 4 — Sprint Planning & Roadmap**
- Recommend a sprint cadence (1 or 2 weeks) with justification.
- Set an assumed team velocity (explain the assumption).
- Sequence stories into sprints respecting dependencies and velocity.
- Define a Sprint Goal for each sprint.
- Identify release milestones and the MVP boundary.

**Phase 5 — Ceremonies & Governance**
- Write a Definition of Done checklist for the project.
- Propose a ceremony schedule (planning, standup, review, retro) with day/time slots.
- Assign SCRUM roles (PO, SM, Dev Team) — if unknown, describe the responsibilities.
- Recommend metrics to track (velocity, burndown, sprint goal success rate).

**Output format:** produce a single markdown document with these sections:

```markdown
# Project Roadmap: {project name}

## Vision
## Personas
## Epics Overview
<!-- table: Epic | Stories | Total Points | MoSCoW | Target Sprint -->

## Detailed Backlog
<!-- for each epic: stories with acceptance criteria, points, priority -->

## Sprint Plan
<!-- table per sprint: Sprint N | Goal | Stories | Points | Cumulative -->

## Release Milestones
<!-- table: Milestone | Sprints | Key Deliverables | Date Estimate -->

## Risks & Mitigations
<!-- table: Risk | Likelihood | Impact | Mitigation -->

## Open Questions

## Team Structure & Ceremonies
<!-- roles, ceremony schedule, metrics -->
```

Write the completed document to `docs/project-roadmap.md`.
````

### Mode: Sprint Planning (`--sprint`)

Dispatch prompt:

````text
You are running sprint planning. The user provided this context:

<context>
{user's project context from $ARGUMENTS}
</context>

<reference>
{loaded reference material from Step 2}
</reference>

Perform sprint planning:

1. **Review the backlog** — read the existing backlog or requirements provided
   in the context. If a `docs/project-roadmap.md` exists, read it for prior
   planning context.
2. **Set the Sprint Goal** — propose a clear, outcome-oriented goal for the
   upcoming sprint.
3. **Story selection** — select stories from the backlog that fit within the
   team's velocity, respecting dependencies. Present as a table:
   | Story | Points | Priority | Dependencies |
4. **Capacity planning** — if team size is known, estimate capacity
   (members x available days x focus factor). If unknown, state assumptions.
5. **Sprint commitment** — summarize total points vs. capacity and flag any
   overcommitment risk.

Output the sprint plan inline (do not write to a file). Use markdown tables
for structured data.
````

### Mode: Backlog Grooming (`--grooming`)

Dispatch prompt:

````text
You are running backlog grooming. The user provided this context:

<context>
{user's project context from $ARGUMENTS}
</context>

<reference>
{loaded reference material from Step 2}
</reference>

Perform backlog grooming:

1. **Backlog review** — read the existing backlog or requirements. If a
   `docs/project-roadmap.md` exists, read it for prior context.
2. **Story refinement** — for each story that lacks detail:
   - Rewrite in As-a / I-want / So-that format if not already.
   - Add or improve acceptance criteria (Given / When / Then).
   - Flag stories that are too large (>= 13 points) and suggest splits.
3. **Estimation** — assign or re-estimate story points using Fibonacci scale.
   Explain reasoning for any estimate changes.
4. **Prioritization** — apply MoSCoW or Value-vs-Effort to reorder the backlog.
   Present a prioritized backlog table:
   | Rank | Story | Points | Priority | Status |
5. **Grooming notes** — list decisions made, stories deferred, and open
   questions for the PO.

Output the grooming results inline (do not write to a file). Use markdown
tables for structured data.
````

---

## Step 4 — Self-Verification

After the agent completes, verify the output before presenting it to the user:

- [ ] Every story uses As-a / I-want / So-that format.
- [ ] Every story has 2-5 acceptance criteria.
- [ ] Story point estimates use Fibonacci scale (1, 2, 3, 5, 8, 13).
- [ ] No story exceeds 13 points without a split recommendation.
- [ ] Sprint plans respect stated velocity and dependencies.
- [ ] MoSCoW priorities are assigned to all stories.
- [ ] Open questions are surfaced, not silently assumed away.
- [ ] For `--full` mode: `docs/project-roadmap.md` was written successfully.
- [ ] For `--sprint`/`--grooming` mode: output is inline, not written to a file.
- [ ] All output follows markdown formatting conventions.

If any check fails, correct the issue before delivering the final output.

---

$ARGUMENTS
