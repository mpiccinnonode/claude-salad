# scrum-toolkit

A Claude Code plugin that transforms project ideas, vision statements, product briefs, or feature lists into complete SCRUM-based project roadmaps with epics, user stories, sprint plans, and release milestones.

## Bundled agents

| Agent | Purpose |
| ------- | --------- |
| `scrum-architect` | Transforms raw project input into a structured SCRUM roadmap |

## What scrum-architect does

Given a project idea, PRD, feature list, or stakeholder notes, scrum-architect:

1. **Discovery** -- identifies vision, personas, requirements, and open questions
2. **Epic & Feature Mapping** -- groups requirements into epics, features, and user stories with acceptance criteria
3. **Estimation** -- assigns story points, maps dependencies, flags risks
4. **Sprint Planning** -- sequences stories into sprints respecting dependencies and velocity
5. **Governance** -- recommends Definition of Done, ceremonies, and tracking metrics

Output is saved as `docs/project-roadmap.md` in the target project.

## Usage

The scrum-architect agent is dispatched automatically when you ask Claude to create a project roadmap, break down requirements into sprints, or plan a SCRUM project.

## Installation

See the [claude-salad marketplace README](../../README.md) for installation instructions.
