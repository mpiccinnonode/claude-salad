import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/lifecycled-code-review/scripts/evict-staged.mjs", import.meta.url));
const run = (args) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};
const yamlFile = (body) => {
  const p = join(mkdtempSync(join(tmpdir(), "evs-")), "checklist.yaml");
  writeFileSync(p, body);
  return p;
};

test("under cap → over_cap false, no candidates", () => {
  const p = yamlFile([
    "checks:",
    "  - id: a", "    status: staged", "    added_date: 2026-01-01", "    hit_count: 0",
    "  - id: b", "    status: active", "    added_date: 2026-01-02", "    hit_count: 0",
    "",
  ].join("\n"));
  const out = JSON.parse(run(["--yaml", p, "--cap", "30"]));
  assert.equal(out.staged_count, 1);
  assert.equal(out.over_cap, false);
  assert.deepEqual(out.eviction_candidates, []);
});

test("over cap → evicts oldest staged with hit_count 0, sorted by added_date asc, sliced to overflow", () => {
  const p = yamlFile([
    "checks:",
    "  - id: old", "    status: staged", "    added_date: 2026-01-01", "    hit_count: 0",
    "  - id: mid", "    status: staged", "    added_date: 2026-02-01", "    hit_count: 0",
    "  - id: hit", "    status: staged", "    added_date: 2026-01-15", "    hit_count: 3",
    "",
  ].join("\n"));
  // cap 1, staged_count 3, overflow 2; only hit_count==0 eligible (old, mid) → both evicted, old first
  const out = JSON.parse(run(["--yaml", p, "--cap", "1"]));
  assert.equal(out.staged_count, 3);
  assert.equal(out.over_cap, true);
  assert.deepEqual(out.eviction_candidates, [
    { id: "old", added_date: "2026-01-01", hit_count: 0 },
    { id: "mid", added_date: "2026-02-01", hit_count: 0 },
  ]);
});

test("missing hit_count defaults to 0", () => {
  const p = yamlFile([
    "checks:",
    "  - id: a", "    status: staged", "    added_date: 2026-01-01",
    "",
  ].join("\n"));
  const out = JSON.parse(run(["--yaml", p, "--cap", "0"]));
  assert.deepEqual(out.eviction_candidates, [{ id: "a", added_date: "2026-01-01", hit_count: 0 }]);
});

test("no checks key → staged_count 0", () => {
  const p = yamlFile("suppressions: []\n");
  const out = JSON.parse(run(["--yaml", p, "--cap", "30"]));
  assert.equal(out.staged_count, 0);
  assert.equal(out.over_cap, false);
});

test("missing --yaml exits 2", () => {
  const r = runFail(["--cap", "30"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--yaml is required/);
});

test("non-integer --cap exits 2", () => {
  const r = runFail(["--yaml", "/abs.yaml", "--cap", "x"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--cap must be a (positive|non-negative) integer/);
});

test("missing file exits 1", () => {
  const r = runFail(["--yaml", "/nonexistent-xyz.yaml", "--cap", "30"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /yaml file not found/);
});

test("malformed yaml exits 1", () => {
  const p = yamlFile("checks: [unclosed\n");
  const r = runFail(["--yaml", p, "--cap", "30"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /failed to parse yaml/);
});
