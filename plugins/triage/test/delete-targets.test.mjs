// test/delete-targets.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/triage-cleanup/scripts/delete-targets.mjs", import.meta.url));
const run = (args) => JSON.parse(execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" }));
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};

function seed() {
  const root = mkdtempSync(join(tmpdir(), "dt-"));
  const a = join(root, "a.yaml");
  const b = join(root, "b.yaml");
  writeFileSync(a, "x");
  writeFileSync(b, "y");
  return { root, a, b };
}

test("deletes targets inside the jail", () => {
  const { root, a, b } = seed();
  const out = run(["--allow-root", root, "--target", a, "--target", b]);
  assert.deepEqual(out.deleted.sort(), [a, b].sort());
  assert.equal(existsSync(a), false);
  assert.equal(existsSync(b), false);
});

test("--dry-run touches nothing", () => {
  const { root, a } = seed();
  const out = run(["--allow-root", root, "--target", a, "--dry-run"]);
  assert.deepEqual(out.wouldDelete, [a]);
  assert.deepEqual(out.deleted, []);
  assert.equal(existsSync(a), true);
});

test("a target outside the jail aborts the whole batch — nothing deleted", () => {
  const { root, a } = seed();
  const outside = mkdtempSync(join(tmpdir(), "dt-out-"));
  const evil = join(outside, "victim.yaml");
  writeFileSync(evil, "z");
  const r = runFail(["--allow-root", root, "--target", a, "--target", evil]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /escapes all --allow-root/);
  assert.equal(existsSync(a), true);   // batch aborted: the in-jail file survives too
  assert.equal(existsSync(evil), true);
});

test("path traversal that escapes the jail is rejected", () => {
  const { root } = seed();
  const escape = join(root, "..", "etc-passwd-ish");
  const r = runFail(["--allow-root", root, "--target", escape]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /escapes all/);
});

test("a directory target aborts the batch", () => {
  const { root } = seed();
  const sub = join(root, "sub");
  mkdirSync(sub);
  const r = runFail(["--allow-root", root, "--target", sub]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /directory/);
});

test("missing file is skipped, not fatal", () => {
  const { root, a } = seed();
  const ghost = join(root, "ghost.yaml");
  const out = run(["--allow-root", root, "--target", a, "--target", ghost]);
  assert.deepEqual(out.deleted, [a]);
  assert.equal(out.skipped[0].path, ghost);
  assert.match(out.skipped[0].reason, /not found/);
});

test("manifest file form works (array and {targets})", () => {
  const { root, a, b } = seed();
  const m1 = join(root, "m1.json");
  writeFileSync(m1, JSON.stringify([a]));
  assert.deepEqual(run(["--allow-root", root, "--manifest", m1]).deleted, [a]);

  const m2 = join(root, "m2.json");
  writeFileSync(m2, JSON.stringify({ targets: [b] }));
  assert.deepEqual(run(["--allow-root", root, "--manifest", m2]).deleted, [b]);
});

test("multiple allow-roots: a target in the second jail is accepted", () => {
  const { root, a } = seed();
  const root2 = mkdtempSync(join(tmpdir(), "dt2-"));
  const c = join(root2, "c.yaml");
  writeFileSync(c, "c");
  const out = run(["--allow-root", root, "--allow-root", root2, "--target", a, "--target", c]);
  assert.deepEqual(out.deleted.sort(), [a, c].sort());
});

test("bad argv exits 2", () => {
  assert.equal(runFail(["--target", "/x/y.yaml"]).status, 2);            // no allow-root
  assert.equal(runFail(["--allow-root", "rel", "--target", "/x"]).status, 2); // relative allow-root
  assert.equal(runFail(["--allow-root", "/abs"]).status, 2);             // no targets
  assert.equal(runFail(["--allow-root", "/abs", "--target", "rel"]).status, 2); // relative target
});
