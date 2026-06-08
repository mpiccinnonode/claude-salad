#!/usr/bin/env node
// Serves: code-review SKILL.md — Phase 0 Lifecycle Pass (§1.2.1)
//
// Reads a review-checklist.yaml, applies four rules (prune / freeze / expire /
// glob-mismatch) against the provided today-date, and emits a JSON payload
// on stdout. Skill body reads the JSON, formats the user-facing presentation,
// and awaits approval — the model no longer traverses the YAML.
//
// Usage: lifecycle-pass.mjs <path-to-review-checklist.yaml> <today-iso-date>
//
// Example: lifecycle-pass.mjs /path/to/.claude/review-checklist.yaml 2026-04-22
//
// Exit 0 + stdout JSON on success. Exit non-zero + stderr diagnostic on
// malformed input, missing file, or bad arguments.
//
// Dependencies: node >= 18, vendored js-yaml (scripts/vendor/js-yaml.mjs) for YAML parsing.
//
// Output shape:
//   {
//     "prune":         [{ "id", "rule", "added_date" }, ...],
//     "freeze":        [{ "id", "rule", "miss_streak", "threshold" }, ...],
//     "expire":        [{ "id", "pattern", "last_relevant" }, ...],
//     "glob_warnings": [{ "id" }, ...]
//   }
//
// Note on shape vs spec §1.2.1: spec shows `freeze` entries without `rule`,
// but SKILL.md §Phase 0 step 5 presents "{id, rule, miss_streak, threshold}".
// Including `rule` here preserves presentation parity; removing it would force
// the skill body to re-parse the YAML, defeating the offload.

import { readFileSync, existsSync, statSync } from "node:fs";
import yaml from "../../../scripts/vendor/js-yaml.mjs";

const THRESHOLDS = {
  PRUNE_DAYS: 45,
  EXPIRE_DAYS: 90,
  FREEZE_MISS_STREAK: { critical: 25, major: 15, minor: 8 },
  GLOB_MIN_OTHERS: 5,
};

function die(msg, code = 1) {
  process.stderr.write(`lifecycle-pass: ${msg}\n`);
  process.exit(code);
}

function parseIsoDate(s, field, id) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    die(`invalid ${field} on check "${id}": ${JSON.stringify(s)} (expected YYYY-MM-DD)`);
  }
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    die(`unparseable ${field} on check "${id}": ${s}`);
  }
  return d;
}

function daysBetween(earlier, later) {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

function loadYaml(path) {
  if (!existsSync(path)) die(`file not found: ${path}`);
  if (!statSync(path).isFile()) die(`not a regular file: ${path}`);
  let doc;
  try {
    // JSON_SCHEMA keeps date-like strings as strings; plain data only, no custom type construction (decision #11).
    doc = yaml.load(readFileSync(path, "utf8"), { schema: yaml.JSON_SCHEMA });
  } catch (e) {
    const line = (e && e.message ? e.message : "unknown error").split("\n").pop();
    die(`could not parse YAML: ${line}`);
  }
  return doc;
}

function main() {
  const [yamlPath, todayStr] = process.argv.slice(2);
  if (!yamlPath || !todayStr) {
    die("usage: lifecycle-pass.mjs <checklist.yaml> <YYYY-MM-DD>", 2);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) {
    die(`invalid date argument: ${todayStr} (expected YYYY-MM-DD)`, 2);
  }
  const today = new Date(`${todayStr}T00:00:00Z`);

  const doc = loadYaml(yamlPath);
  if (!doc || typeof doc !== "object") die("YAML root is not a mapping");

  const checks = Array.isArray(doc.checks) ? doc.checks : [];
  const suppressions = Array.isArray(doc.suppressions) ? doc.suppressions : [];

  const prune = [];
  const freeze = [];
  const expire = [];
  const glob_warnings = [];

  const nonNullEvaluated = checks.filter((c) => c && c.last_evaluated != null).length;
  const globPrecondition = nonNullEvaluated >= THRESHOLDS.GLOB_MIN_OTHERS;

  for (const c of checks) {
    if (!c || typeof c.id !== "string") {
      die(`check entry missing id or malformed: ${JSON.stringify(c)}`);
    }
    const { id, status, severity, added_date, hit_count, miss_streak, last_evaluated, rule } = c;

    // Rule 1: Prune — staged + added_date > 45 days ago + hit_count == 0
    if (status === "staged" && hit_count === 0) {
      const added = parseIsoDate(added_date, "added_date", id);
      if (daysBetween(added, today) > THRESHOLDS.PRUNE_DAYS) {
        prune.push({ id, rule, added_date });
      }
    }

    // Rule 2: Freeze — active + miss_streak > severity threshold
    if (status === "active") {
      const threshold = THRESHOLDS.FREEZE_MISS_STREAK[severity];
      if (threshold === undefined) {
        die(`check "${id}" has unknown severity: ${JSON.stringify(severity)}`);
      }
      if (typeof miss_streak !== "number") {
        die(`check "${id}" has non-numeric miss_streak: ${JSON.stringify(miss_streak)}`);
      }
      if (miss_streak > threshold) {
        freeze.push({ id, rule, miss_streak, threshold });
      }

      // Rule 4: Glob mismatch — active + last_evaluated null + ≥5 other checks non-null
      if (globPrecondition && last_evaluated == null) {
        glob_warnings.push({ id });
      }
    }
  }

  // Rule 3: Expire — suppressions where last_relevant > 90 days ago
  for (const s of suppressions) {
    if (!s || typeof s.id !== "string") {
      die(`suppression entry missing id or malformed: ${JSON.stringify(s)}`);
    }
    if (s.status !== "active") continue;
    const lastRelevant = parseIsoDate(s.last_relevant, "last_relevant", s.id);
    if (daysBetween(lastRelevant, today) > THRESHOLDS.EXPIRE_DAYS) {
      expire.push({ id: s.id, pattern: s.pattern, last_relevant: s.last_relevant });
    }
  }

  process.stdout.write(JSON.stringify({ prune, freeze, expire, glob_warnings }) + "\n");
}

main();
