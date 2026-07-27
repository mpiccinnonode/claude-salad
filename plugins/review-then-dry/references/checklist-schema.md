# Review Checklist YAML Schema Reference

Source of truth for `.claude/review-checklist.yaml`: fields, lifecycle
thresholds, suppressions, and the safe-write protocol. Read it before reading
or writing the checklist.

File: `.claude/review-checklist.yaml`

This section is the single source of truth for the checklist format. All phases reference this section — do not re-describe the schema elsewhere.

## Checks

```yaml
checks:
  - id: kebab-case-id          # unique within checks
    severity: critical          # critical | major | minor
    rule: "one-line description of what to check"
    applies_to: "**/*.ts"      # glob — only evaluate on matching files
    tags: [optional, tags]
    added_by: seed              # seed | lifecycled-code-review | manual
    added_date: 2026-04-03     # ISO date
    status: active              # active | staged | frozen
    hit_count: 0                # reviews where this check found >= 1 violation
    miss_streak: 0              # consecutive reviews (on matching files) with 0 hits
    last_hit: null              # ISO date of last review with a violation
    last_evaluated: null        # ISO date of last review with matching files
```

## Suppressions

```yaml
suppressions:
  - id: kebab-case-id          # unique within suppressions
    pattern: "what the agent would flag"
    reason: "why this is not a real issue"
    applies_to: "**/*.ts"      # optional — scope the suppression
    added_by: lifecycled-code-review       # lifecycled-code-review | manual
    added_date: 2026-04-03
    last_relevant: 2026-04-03  # last review where this suppression prevented a false positive
    status: active              # active | expired
```

## Project Context

```yaml
project_context:
  - key: descriptive-key
    context: "free-text domain knowledge injected into every review"
```

## Lifecycle Thresholds

| Severity | miss_streak to freeze | Rationale |
|---|---|---|
| critical | 25 | Security/correctness — rare violations still important |
| major | 15 | Standard architectural checks |
| minor | 8 | Style/naming — team internalizes quickly |

- **Staged → Active:** when `hit_count >= 2` (violations in 2+ separate reviews)
- **Staged → Removed:** when `added_date > 45 days` ago AND `hit_count == 0`
- **Active → Frozen:** when `miss_streak` exceeds severity threshold
- **Frozen → Active:** manual reset OR agent finds matching violation via `.claude/rules/` fallback
- **Suppression → Expired:** when `last_relevant > 90 days` ago
- **Staged cap:** maximum 30 staged checks; when exceeded, evict oldest with `hit_count == 0` (FIFO)

## Safety Protocol

Every write to `review-checklist.yaml` is performed by `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/safe-write-yaml.mjs` (spec §1.2.4):

```bash
cat <<'YAML' | node "${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/scripts/safe-write-yaml.mjs" --path <abs-path>
# ...new YAML content on stdin...
YAML
```

Contract: backup existing → atomic rename write → delete `.bak` on success. Emits `{"path","bak_deleted","existed_before"}` on stdout. Non-zero + stderr on I/O failure leaves `.bak` in place.

**On next read**, if YAML fails to parse:

- If `.bak` exists — restore from `.bak`, warn user, retry.
- If no `.bak` — rename to `.corrupt`, warn user, proceed without checklist.
