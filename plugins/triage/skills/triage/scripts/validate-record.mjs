#!/usr/bin/env node
// Serves: triage SKILL.md — Phase 6 post-write check on a triage record.
// The deterministic guard on the schema: a record that passes here stays readable by
// triage-recall (--active) and classifiable by scan-stale (cleanup). Without it the
// lifecycle drifts — off-schema statuses and misspelled date fields make a record
// permanently invisible to both, so it can never be resumed and never be cleaned up.
//
// Inputs (argv):
//   --file <abs>   required — the record just written.
//   --json         machine-readable output (default: human-readable lines).
// stdout: findings (empty when valid). Exit 0 when valid, 1 when the record has
// violations, 2 + stderr on bad argv or unreadable file.
import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { yamlField, phaseStatuses, PHASE_STATUS_ALIASES, TRIAGE_STATUSES, PHASE_STATUSES } from "./yaml-fields.mjs";

function die(msg) { process.stderr.write(`validate-record: ${msg}\n`); process.exit(2); }

const argv = process.argv.slice(2);
let file = "", json = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--file") { if (i + 1 >= argv.length) die("--file requires a value"); file = argv[++i]; }
  else if (a === "--json") json = true;
  else die(`unknown arg: ${a}`);
}
if (!file) die("--file is required");
if (!isAbsolute(file)) die(`--file must be absolute: ${file}`);
try { if (!statSync(file).isFile()) die(`not a file: ${file}`); } catch { die(`cannot read: ${file}`); }

const content = readFileSync(file, "utf8");
const violations = [];

// --- top-level status ------------------------------------------------------
const status = yamlField(content, "status").trim();
if (!status) {
  violations.push({ field: "status", value: "", message: "missing — record cannot be classified as active or stale" });
} else if (!TRIAGE_STATUSES.includes(status)) {
  violations.push({
    field: "status",
    value: status,
    message: `off-schema — must be one of ${TRIAGE_STATUSES.join("|")}`,
  });
}

// --- creation date ---------------------------------------------------------
// `created_at` reads fine (yaml-fields accepts both) but writes must use the schema
// spelling, or the next script added to the plugin inherits the same blind spot.
const created = yamlField(content, "created").trim();
const createdAt = yamlField(content, "created_at").trim();
if (!created && createdAt) {
  violations.push({ field: "created_at", value: createdAt, message: "wrong field name — the schema field is `created`" });
} else if (!created) {
  violations.push({ field: "created", value: "", message: "missing — age-based cleanup cannot see this record" });
} else if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) {
  violations.push({ field: "created", value: created, message: "must be YYYY-MM-DD" });
}

// --- task ------------------------------------------------------------------
// Recall matches on this field; an empty one is unfindable in a later session.
if (!yamlField(content, "task").trim()) {
  violations.push({ field: "task", value: "", message: "missing — the record cannot be found by --find in a later session" });
}

// --- phase statuses --------------------------------------------------------
// Readers tolerate the known synonyms so old records still grade correctly, but a write
// that introduces one is how the vocabulary drifted to ten values for three states.
for (const s of phaseStatuses(content)) {
  if (PHASE_STATUSES.includes(s)) continue;
  const canonical = PHASE_STATUS_ALIASES[s.toLowerCase()];
  violations.push({
    field: "phases[].status",
    value: s,
    message: canonical
      ? `off-schema synonym — write "${canonical}" instead`
      : `off-schema — must be one of ${PHASE_STATUSES.join("|")}`,
  });
}

if (json) {
  process.stdout.write(`${JSON.stringify({ file, valid: violations.length === 0, violations })}\n`);
} else if (violations.length) {
  process.stdout.write(`${file}\n`);
  for (const v of violations) {
    process.stdout.write(`  ${v.field}${v.value ? ` (${v.value})` : ""}: ${v.message}\n`);
  }
}
process.exit(violations.length ? 1 : 0);
