// test/validate-record.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/triage/scripts/validate-record.mjs", import.meta.url));

// Exit 1 (violations) is expected output, not a crash — capture both shapes.
function run(args) {
  try {
    const stdout = execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

function record(body) {
  const dir = mkdtempSync(join(tmpdir(), "vr-"));
  const file = join(dir, "rec.yaml");
  writeFileSync(file, body);
  return file;
}

const VALID = 'task: "Add SSO login"\nstatus: in_progress\ncreated: 2026-06-01\nphases:\n  - phase: X\n    status: pending\n';

test("a schema-conformant record validates", () => {
  const r = run(["--file", record(VALID)]);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("off-schema top-level status is a violation", () => {
  const r = run(["--file", record('task: "X"\nstatus: implementation_complete\ncreated: 2026-06-01\n'), "--json"]);
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stdout);
  assert.equal(out.valid, false);
  assert.ok(out.violations.some((v) => v.field === "status" && /off-schema/.test(v.message)));
});

test("created_at is reported as the wrong field name", () => {
  const r = run(["--file", record('task: "X"\nstatus: in_progress\ncreated_at: 2026-05-22\n'), "--json"]);
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stdout);
  assert.ok(out.violations.some((v) => v.field === "created_at" && /`created`/.test(v.message)));
});

test("missing created and missing task are both reported", () => {
  const r = run(["--file", record("status: in_progress\n"), "--json"]);
  assert.equal(r.status, 1);
  const fields = JSON.parse(r.stdout).violations.map((v) => v.field);
  assert.ok(fields.includes("created"));
  assert.ok(fields.includes("task"));
});

test("malformed created date is a violation", () => {
  const r = run(["--file", record('task: "X"\nstatus: draft\ncreated: last tuesday\n'), "--json"]);
  assert.equal(r.status, 1);
  assert.ok(JSON.parse(r.stdout).violations.some((v) => v.field === "created" && /YYYY-MM-DD/.test(v.message)));
});

test("off-schema phase status is a violation", () => {
  const body = 'task: "X"\nstatus: in_progress\ncreated: 2026-06-01\nphases:\n  - phase: A\n    status: in_review\n';
  const r = run(["--file", record(body), "--json"]);
  assert.equal(r.status, 1);
  assert.ok(JSON.parse(r.stdout).violations.some((v) => v.field === "phases[].status" && v.value === "in_review"));
});

test("a known phase-status synonym names its canonical form", () => {
  const body = 'task: "X"\nstatus: complete\ncreated: 2026-06-01\nphases:\n  - phase: A\n    status: completed\n';
  const r = run(["--file", record(body), "--json"]);
  assert.equal(r.status, 1);
  const v = JSON.parse(r.stdout).violations.find((x) => x.value === "completed");
  assert.match(v.message, /write "complete" instead/);
});

test("quoted values are accepted", () => {
  const body = 'task: "X"\nstatus: "complete"\ncreated: "2026-06-01"\nphases:\n  - phase: A\n    status: "complete"\n';
  assert.equal(run(["--file", record(body)]).status, 0);
});

test("human-readable output names the file and each violation", () => {
  const file = record('task: "X"\nstatus: nope\ncreated: 2026-06-01\n');
  const r = run(["--file", file]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /rec\.yaml/);
  assert.match(r.stdout, /status \(nope\)/);
});

test("bad argv exits 2", () => {
  assert.equal(run([]).status, 2);                                  // missing --file
  assert.equal(run(["--file", "rel.yaml"]).status, 2);              // relative path
  assert.equal(run(["--file", "/nope/missing.yaml"]).status, 2);    // unreadable
  assert.equal(run(["--file", record(VALID), "--bogus"]).status, 2); // unknown arg
});
