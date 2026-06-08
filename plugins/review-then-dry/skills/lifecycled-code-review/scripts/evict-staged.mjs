#!/usr/bin/env node
// Serves: lifecycled-code-review SKILL.md — Staged cap enforcement (Phase 3 Step 4 + Seed Mode Step 5).
// Inputs (argv): --yaml <abs> --cap <int>
// Output: {"staged_count":N,"over_cap":bool,"eviction_candidates":[{id, added_date, hit_count}]}
// Candidates = staged checks with hit_count==0 (default 0), sorted by added_date ascending,
// sliced to overflow (staged_count - cap). Exit 2 on bad argv; exit 1 on missing file / parse failure.
// Ported from evict-staged.sh — yq+jq replaced by vendored js-yaml + native logic.

import { readFileSync, existsSync } from "node:fs";
import yaml from "../../../scripts/vendor/js-yaml.mjs";

function die(msg, code) {
  process.stderr.write(`evict-staged: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let yamlPath = "", cap = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--yaml") {
      if (i + 1 >= argv.length) die("--yaml requires a value", 2);
      yamlPath = argv[++i];
    } else if (argv[i] === "--cap") {
      if (i + 1 >= argv.length) die("--cap requires a value", 2);
      cap = argv[++i];
    } else {
      die(`unknown arg: ${argv[i]}`, 2);
    }
  }
  return { yamlPath, cap };
}

function main() {
  const { yamlPath, cap } = parseArgs(process.argv.slice(2));
  if (!yamlPath) die("--yaml is required", 2);
  if (!cap) die("--cap is required", 2);
  if (!yamlPath.startsWith("/")) die(`--yaml must be absolute: ${yamlPath}`, 2);
  if (!/^\d+$/.test(cap)) die(`--cap must be a non-negative integer: ${cap}`, 2);
  const capNum = Number(cap);
  if (!existsSync(yamlPath)) die(`yaml file not found: ${yamlPath}`, 1);

  let doc;
  try {
    // JSON_SCHEMA keeps date-like strings as strings (DEFAULT_SCHEMA coerces them to Date objects).
    // Plain data only, no custom type construction (decision #11).
    doc = yaml.load(readFileSync(yamlPath, "utf8"), { schema: yaml.JSON_SCHEMA });
  } catch (e) {
    die(`failed to parse yaml: ${yamlPath}`, 1);
  }
  if (doc == null) doc = {};
  if (typeof doc !== "object") die(`failed to parse yaml: ${yamlPath}`, 1);

  const checks = Array.isArray(doc.checks) ? doc.checks : [];
  const staged = checks.filter((c) => c && c.status === "staged");
  const count = staged.length;
  const overflow = count - capNum;

  let candidates = [];
  if (overflow > 0) {
    candidates = staged
      .filter((c) => (c.hit_count ?? 0) === 0)
      .sort((a, b) => String(a.added_date).localeCompare(String(b.added_date)))
      .slice(0, overflow)
      .map((c) => ({ id: c.id, added_date: c.added_date, hit_count: c.hit_count ?? 0 }));
  }

  process.stdout.write(JSON.stringify({
    staged_count: count,
    over_cap: overflow > 0,
    eviction_candidates: candidates,
  }) + "\n");
}

main();
