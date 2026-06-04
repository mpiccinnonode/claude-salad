// test/triage-recall.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/triage/scripts/triage-recall.mjs", import.meta.url));
const run = (args) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};

function seed() {
  const dir = mkdtempSync(join(tmpdir(), "tri-"));
  writeFileSync(join(dir, "add-auth.yaml"),
    'task: "Add SSO login"\nstatus: in_progress\ncreated: 2026-06-01\nclassification: Logic Feature\n');
  writeFileSync(join(dir, "fix-bug.draft.yaml"),
    "task: Fix flaky test\nstatus: draft\ncreated: 2026-06-02\nclassification: Bug Fix\n");
  writeFileSync(join(dir, "done-thing.yaml"),
    "task: Old thing\nstatus: resolved\ncreated: 2026-05-01\nclassification: Refactor\n");
  return dir;
}

test("--active --json lists draft + in_progress, sorted by filename", () => {
  const dir = seed();
  const out = JSON.parse(run(["--dir", dir, "--active", "--json"]));
  assert.deepEqual(out.map((r) => r.slug), ["add-auth", "fix-bug"]);
  assert.equal(out[0].status, "in_progress");
  assert.equal(out[0].task, "Add SSO login");      // double-quotes stripped
  assert.equal(out[1].slug, "fix-bug");             // .draft suffix stripped
  assert.equal(out[1].status, "draft");
});

test("--find is case-insensitive substring on task", () => {
  const dir = seed();
  const out = JSON.parse(run(["--dir", dir, "--find", "SSO", "--json"]));
  assert.deepEqual(out.map((r) => r.slug), ["add-auth"]);
});

test("--show emits full YAML body with leading # path", () => {
  const dir = seed();
  const out = run(["--dir", dir, "--show", "add-auth"]);
  assert.match(out, new RegExp(`^# ${dir.replaceAll("\\\\", "\\\\\\\\")}.*add-auth\\.yaml\\n`));
  assert.match(out, /task: "Add SSO login"/);
});

test("--show falls back to .draft.yaml", () => {
  const dir = seed();
  const out = run(["--dir", dir, "--show", "fix-bug"]);
  assert.match(out, /status: draft/);
});

test("missing dir -> empty json array, exit 0", () => {
  const out = run(["--dir", "/no/such/dir/here", "--active", "--json"]);
  assert.equal(out, "[]\n");
});

test("no matches -> empty json array", () => {
  const dir = seed();
  const out = run(["--dir", dir, "--find", "zzz-nomatch", "--json"]);
  assert.equal(out, "[]\n");
});

test("no mode -> exit 2", () => {
  const dir = seed();
  const r = runFail(["--dir", dir]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /one of --active\|--find\|--show/);
});

test("relative --dir -> exit 2", () => {
  const r = runFail(["--dir", "rel", "--active"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /must be absolute/);
});
