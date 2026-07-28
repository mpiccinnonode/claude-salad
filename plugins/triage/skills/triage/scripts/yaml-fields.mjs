// Shared record-parsing helpers for the triage plugin's scripts.
// Every script that reads a triage YAML MUST read it through here: triage-recall,
// scan-stale, and validate-record diverged on field names once already (`created`
// vs `created_at`), which made malformed records invisible to cleanup.
//
// Deliberately not a YAML parser — records are flat enough that two regexes cover
// them, and a dependency-free plugin is a hard repo convention.

// Lifecycle values the schema allows. Anything else is drift, and callers should
// surface it rather than silently ignore the record.
export const TRIAGE_STATUSES = ["draft", "in_progress", "complete", "abandoned"];
export const PHASE_STATUSES = ["pending", "complete", "skipped"];

// Extract a single top-level scalar `^field: value`; strip a leading and a trailing
// quote independently (mirrors the original awk gsub behavior, which golden-output
// tests lock). Does NOT trim — callers that want trimming ask for it.
export function yamlField(content, field) {
  const esc = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = content.match(new RegExp(`^${esc}:[ \\t]*(.*)$`, "m"));
  if (!m) return "";
  return m[1].replace(/^["']/, "").replace(/["']$/, "");
}

// Statuses of list items under `phases:` — indented `status:` lines only
// (the top-level record status has no indent).
export function phaseStatuses(content) {
  return [...content.matchAll(/^[ \t]+status:[ \t]*(\S+)/gm)].map((m) => m[1].replace(/["']/g, ""));
}

// The record's creation date. Records in the wild use both spellings; `created` is
// the schema's, `created_at` is what some sessions wrote. Accept both on read so a
// misspelled record is still ageable — validate-record.mjs is what rejects it on write.
export function recordCreated(content) {
  return (yamlField(content, "created") || yamlField(content, "created_at")).trim();
}

// Synonyms real records use for the three phase states. Measured across 36 records:
// `completed` (30) and `done` (4) outnumbered nothing, but they meant exactly `complete`
// — and a strict reader graded those finished records as unfinished. Tolerate on read,
// reject on write, same contract as `created_at`.
export const PHASE_STATUS_ALIASES = {
  completed: "complete",
  done: "complete",
  finished: "complete",
  deferred: "skipped",
  rejected: "skipped",
  "n/a": "skipped",
};

export function normalizePhaseStatus(s) {
  const v = String(s).trim().toLowerCase();
  return PHASE_STATUS_ALIASES[v] ?? v;
}

// Is this phase closed out — either finished or intentionally bypassed?
// Anything unrecognised (`partial`, `code-complete`, `in_progress`) counts as NOT done, so
// an unfamiliar vocabulary can only ever keep a record out of the delete set, never push it in.
export function phaseIsDone(s) {
  const n = normalizePhaseStatus(s);
  return n === "complete" || n === "skipped";
}
