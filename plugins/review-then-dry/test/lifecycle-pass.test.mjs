import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/lifecycled-code-review/scripts/lifecycle-pass.mjs", import.meta.url));
const run = (args) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};
const yamlFile = (body) => {
  const p = join(mkdtempSync(join(tmpdir(), "lcp-")), "checklist.yaml");
  writeFileSync(p, body);
  return p;
};

test("prune: staged + hit_count 0 + added_date > 45 days ago", () => {
  const p = yamlFile([
    "checks:",
    "  - id: stale", "    status: staged", "    severity: minor", "    rule: x",
    "    added_date: 2026-01-01", "    hit_count: 0",
    "",
  ].join("\n"));
  const out = JSON.parse(run([p, "2026-06-08"]));
  assert.deepEqual(out.prune, [{ id: "stale", rule: "x", added_date: "2026-01-01" }]);
});

test("freeze: active + miss_streak over severity threshold (minor=8)", () => {
  const p = yamlFile([
    "checks:",
    "  - id: noisy", "    status: active", "    severity: minor", "    rule: y",
    "    miss_streak: 9", "    last_evaluated: 2026-06-01",
    "",
  ].join("\n"));
  const out = JSON.parse(run([p, "2026-06-08"]));
  assert.deepEqual(out.freeze, [{ id: "noisy", rule: "y", miss_streak: 9, threshold: 8 }]);
});

test("expire: active suppression last_relevant > 90 days ago", () => {
  const p = yamlFile([
    "suppressions:",
    "  - id: sup", "    status: active", "    pattern: p", "    last_relevant: 2026-01-01",
    "",
  ].join("\n"));
  const out = JSON.parse(run([p, "2026-06-08"]));
  assert.deepEqual(out.expire, [{ id: "sup", pattern: "p", last_relevant: "2026-01-01" }]);
});

test("all-empty checklist → four empty arrays", () => {
  const p = yamlFile("checks: []\nsuppressions: []\n");
  const out = JSON.parse(run([p, "2026-06-08"]));
  assert.deepEqual(out, { prune: [], freeze: [], expire: [], glob_warnings: [] });
});

test("usage error (missing date) exits 2", () => {
  const p = yamlFile("checks: []\n");
  const r = runFail([p]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage:/);
});

test("missing file exits 1", () => {
  const r = runFail(["/nonexistent-xyz.yaml", "2026-06-08"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /file not found/);
});

test("malformed yaml exits 1 (no yq dependency)", () => {
  const p = yamlFile("checks: [unclosed\n");
  const r = runFail([p, "2026-06-08"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /could not parse YAML/);
});
