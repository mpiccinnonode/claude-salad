# GitHub API Patterns

GraphQL query templates for scrum-toolkit skills. Skills load individual
sections via offset/limit reads --- keep each section self-contained.

---

## Project Discovery

### Detect org vs user context

Org and user projects use different GraphQL query paths. Always detect first.

```bash
gh repo view --json owner --jq '.owner.login'
# Returns: the owner login string

gh api graphql -f query='
  query($login: String!) {
    user(login: $login) { id }
  }
' -f login="<OWNER>"
# If this errors, the owner is an org — use organization() instead.
```

### Find project by number (organization)

```bash
gh api graphql -f query='
  query($org: String!, $number: Int!) {
    organization(login: $org) {
      projectV2(number: $number) {
        id
        title
        url
      }
    }
  }
' -f org="<ORG>" -F number="<PROJECT_NUMBER>"
# Response shape:
# { "data": { "organization": { "projectV2": { "id": "...", "title": "...", "url": "..." } } } }
```

### Find project by number (user)

```bash
gh api graphql -f query='
  query($user: String!, $number: Int!) {
    user(login: $user) {
      projectV2(number: $number) {
        id
        title
        url
      }
    }
  }
' -f user="<USER>" -F number="<PROJECT_NUMBER>"
# Response shape:
# { "data": { "user": { "projectV2": { "id": "...", "title": "...", "url": "..." } } } }
```

### List all projects for an org

```bash
gh api graphql -f query='
  query($org: String!) {
    organization(login: $org) {
      projectsV2(first: 20) {
        nodes { id number title url closed }
      }
    }
  }
' -f org="<ORG>"
# Response shape:
# { "data": { "organization": { "projectsV2": { "nodes": [ { "id": "...", "number": 1, ... } ] } } } }
```

### List all projects for a user

```bash
gh api graphql -f query='
  query($user: String!) {
    user(login: $user) {
      projectsV2(first: 20) {
        nodes { id number title url closed }
      }
    }
  }
' -f user="<USER>"
# Response shape:
# { "data": { "user": { "projectsV2": { "nodes": [ { "id": "...", "number": 1, ... } ] } } } }
```

---

## Reading Project State

### Get all items in current iteration with field values

```bash
gh api graphql -f query='
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100) {
          nodes {
            id
            content {
              ... on Issue {
                number title state url
                labels(first: 10) { nodes { name } }
                assignees(first: 5) { nodes { login } }
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                ... on ProjectV2ItemFieldIterationValue { title startDate duration field { ... on ProjectV2IterationField { name } } }
              }
            }
          }
        }
      }
    }
  }
' -f projectId="<PROJECT_ID>"
# Response shape:
# { "data": { "node": { "items": { "nodes": [
#   { "id": "...", "content": { "number": 1, "title": "...", ... },
#     "fieldValues": { "nodes": [
#       { "name": "In Progress", "field": { "name": "Status" } },
#       { "number": 3, "field": { "name": "Story Points" } },
#       { "title": "Sprint 1", "startDate": "...", "field": { "name": "Sprint" } }
#     ] } }
# ] } } } }
```

### Get single item by issue number

Look up the issue node ID first, then find the matching project item.

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        id
        title
        state
        projectItems(first: 10) {
          nodes {
            id
            project { id title }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                ... on ProjectV2ItemFieldIterationValue { title field { ... on ProjectV2IterationField { name } } }
              }
            }
          }
        }
      }
    }
  }
' -f owner="<OWNER>" -f repo="<REPO>" -F number="<ISSUE_NUMBER>"
# Response shape:
# { "data": { "repository": { "issue": {
#   "id": "...", "title": "...", "state": "OPEN",
#   "projectItems": { "nodes": [
#     { "id": "...", "project": { "id": "...", "title": "..." },
#       "fieldValues": { "nodes": [ ... ] } }
#   ] }
# } } } }
```

### Get project custom field definitions

Retrieve field IDs for Status, Story Points, Priority, and Sprint.
Required before any field update mutation.

```bash
gh api graphql -f query='
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id name options { id name }
            }
            ... on ProjectV2IterationField {
              id name
              configuration {
                iterations { id title startDate duration }
                completedIterations { id title startDate duration }
              }
            }
            ... on ProjectV2Field {
              id name dataType
            }
          }
        }
      }
    }
  }
' -f projectId="<PROJECT_ID>"
# Response shape:
# { "data": { "node": { "fields": { "nodes": [
#   { "id": "FIELD_ID", "name": "Status", "options": [
#     { "id": "OPT_ID", "name": "Sprint Backlog" },
#     { "id": "OPT_ID", "name": "In Progress" },
#     { "id": "OPT_ID", "name": "In Review" },
#     { "id": "OPT_ID", "name": "Done" }
#   ] },
#   { "id": "FIELD_ID", "name": "Priority", "options": [
#     { "id": "OPT_ID", "name": "Must" },
#     { "id": "OPT_ID", "name": "Should" },
#     { "id": "OPT_ID", "name": "Could" },
#     { "id": "OPT_ID", "name": "Won't" }
#   ] },
#   { "id": "FIELD_ID", "name": "Sprint", "configuration": {
#     "iterations": [ { "id": "ITER_ID", "title": "Sprint 1", ... } ]
#   } },
#   { "id": "FIELD_ID", "name": "Story Points", "dataType": "NUMBER" }
# ] } } } }
```

---

## Writing Project State

### Update item status field

```bash
gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }
' -f projectId="<PROJECT_ID>" -f itemId="<ITEM_ID>" \
  -f fieldId="<STATUS_FIELD_ID>" -f optionId="<STATUS_OPTION_ID>"
# <STATUS_OPTION_ID> must match one of: Sprint Backlog, In Progress, In Review, Done
# Response shape:
# { "data": { "updateProjectV2ItemFieldValue": { "projectV2Item": { "id": "..." } } } }
```

### Update item story points field

```bash
gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $points: Float!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { number: $points }
    }) { projectV2Item { id } }
  }
' -f projectId="<PROJECT_ID>" -f itemId="<ITEM_ID>" \
  -f fieldId="<STORY_POINTS_FIELD_ID>" -F points="<POINTS>"
# Response shape:
# { "data": { "updateProjectV2ItemFieldValue": { "projectV2Item": { "id": "..." } } } }
```

### Update item priority field

```bash
gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }
' -f projectId="<PROJECT_ID>" -f itemId="<ITEM_ID>" \
  -f fieldId="<PRIORITY_FIELD_ID>" -f optionId="<PRIORITY_OPTION_ID>"
# <PRIORITY_OPTION_ID> must match one of: Must, Should, Could, Won't
# Response shape:
# { "data": { "updateProjectV2ItemFieldValue": { "projectV2Item": { "id": "..." } } } }
```

### Move item to iteration

```bash
gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $iterationId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { iterationId: $iterationId }
    }) { projectV2Item { id } }
  }
' -f projectId="<PROJECT_ID>" -f itemId="<ITEM_ID>" \
  -f fieldId="<SPRINT_FIELD_ID>" -f iterationId="<ITERATION_ID>"
# Response shape:
# { "data": { "updateProjectV2ItemFieldValue": { "projectV2Item": { "id": "..." } } } }
```

### Add existing issue to project

```bash
gh api graphql -f query='
  mutation($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: {
      projectId: $projectId, contentId: $contentId
    }) { item { id } }
  }
' -f projectId="<PROJECT_ID>" -f contentId="<ISSUE_NODE_ID>"
# <ISSUE_NODE_ID> is the global node ID of the issue (not the issue number).
# Resolve it with the query below.
# Response shape:
# { "data": { "addProjectV2ItemById": { "item": { "id": "..." } } } }
```

### Resolve issue node ID

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) { id }
    }
  }
' -f owner="<OWNER>" -f repo="<REPO>" -F number="<ISSUE_NUMBER>"
# Response shape:
# { "data": { "repository": { "issue": { "id": "I_..." } } } }
```

### Resolve project item ID for issue

An issue can be on multiple project boards. Given an issue number and a known
`projectId`, find the matching project item ID (needed before any
`updateProjectV2ItemFieldValue` mutation targets that issue).

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        id
        projectItems(first: 10) {
          nodes {
            id
            project { id }
          }
        }
      }
    }
  }
' -f owner="<OWNER>" -f repo="<REPO>" -F number="<ISSUE_NUMBER>"
# Response shape:
# { "data": { "repository": { "issue": {
#   "id": "I_...",
#   "projectItems": { "nodes": [
#     { "id": "PVTI_...", "project": { "id": "PVT_..." } }
#   ] }
# } } } }
```

Filter the `projectItems.nodes` array by `project.id === <PROJECT_ID>` to
find the item ID for the bootstrap project.

**Not on the board:** if no matching node exists, the issue is not on this
project board. Callers that need the issue on the board (e.g., re-estimation
in `/user-story-edit`) should either add it via
[Add existing issue to project](#add-existing-issue-to-project) first, or
skip the field update and report it in the summary.

---

## Issue Operations

### Create issue with labels and milestone

```bash
gh issue create --repo "<OWNER>/<REPO>" \
  --title "<ISSUE_TITLE>" \
  --body "<ISSUE_BODY>" \
  --label "story" --label "priority:must" \
  --milestone "<MILESTONE_TITLE>"
# Returns: the new issue URL
# To get the node ID for adding to a project board:
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) { id }
    }
  }
' -f owner="<OWNER>" -f repo="<REPO>" -F number="<ISSUE_NUMBER>"
```

### Update issue labels

```bash
# Add labels
gh issue edit <ISSUE_NUMBER> --repo "<OWNER>/<REPO>" \
  --add-label "blocked" --add-label "priority:should"

# Remove labels
gh issue edit <ISSUE_NUMBER> --repo "<OWNER>/<REPO>" \
  --remove-label "priority:must"
```

### Close or reopen issue

```bash
# Close
gh issue close <ISSUE_NUMBER> --repo "<OWNER>/<REPO>" \
  --reason "completed"
# --reason options: completed, not_planned

# Reopen
gh issue reopen <ISSUE_NUMBER> --repo "<OWNER>/<REPO>"
```

---

## Milestone Operations

### List milestones

```bash
gh api repos/<OWNER>/<REPO>/milestones --jq '.[] | {number, title, due_on, state}'
# Response shape (per item):
# { "number": 1, "title": "Sprint 1", "due_on": "2026-04-06T07:00:00Z", "state": "open" }
```

### Create milestone with due date

```bash
gh api repos/<OWNER>/<REPO>/milestones -X POST \
  -f title="<MILESTONE_TITLE>" \
  -f due_on="<YYYY-MM-DD>T00:00:00Z" \
  -f description="<DESCRIPTION>"
# Response shape:
# { "number": 2, "title": "...", "due_on": "...", "state": "open", ... }
```

---

## Field ID Resolution

### Look up custom field node IDs

Before any field update mutation, you must resolve the field IDs and option
IDs for the target project. Use the query from
[Get project custom field definitions](#get-project-custom-field-definitions)
above.

From the response, extract and store:

| Field | What to capture |
| --- | --- |
| Status | `field.id` + each `option.id` keyed by name |
| Priority | `field.id` + each `option.id` keyed by name |
| Story Points | `field.id` (no options --- it is a number field) |
| Sprint | `field.id` + each `iteration.id` keyed by title |

### Cache strategy

Resolve field IDs once per session, then pass them to subsequent queries:

1. **On first board operation**: run the field definitions query and parse
   the response into a lookup table.
2. **Store as shell variables or pass as arguments**: skills receive field
   IDs as parameters rather than re-querying.
3. **Invalidate on error**: if a mutation returns `FIELD_NOT_FOUND` or
   `OPTION_NOT_FOUND`, re-resolve field IDs and retry once.

Example lookup after resolution:

```text
STATUS_FIELD_ID=PVTSSF_...
STATUS_OPT_BACKLOG=...
STATUS_OPT_IN_PROGRESS=...
STATUS_OPT_IN_REVIEW=...
STATUS_OPT_DONE=...
PRIORITY_FIELD_ID=PVTSSF_...
PRIORITY_OPT_MUST=...
PRIORITY_OPT_SHOULD=...
PRIORITY_OPT_COULD=...
PRIORITY_OPT_WONT=...
POINTS_FIELD_ID=PVTF_...
SPRINT_FIELD_ID=PVTIF_...
SPRINT_ITER_CURRENT=...
```
