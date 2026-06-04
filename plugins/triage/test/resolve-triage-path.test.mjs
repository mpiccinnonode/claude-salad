// test/resolve-triage-path.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/triage/scripts/resolve-triage-path.mjs", import.meta.url));
const run = (args) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};

test("project triage dir present -> scope project", () => {
  const root = mkdtempSync(join(tmpdir(), "tr-"));
  mkdirSync(join(root, ".claude", "triage"), { recursive: true });
  const out = JSON.parse(run(["--root", root, "--home", "/home/x"]));
  assert.deepEqual(out, { path: join(root, ".claude", "triage"), scope: "project" });
});

test(".claude present but no triage dir -> scope project, path still triage", () => {
  const root = mkdtempSync(join(tmpdir(), "tr-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  const out = JSON.parse(run(["--root", root, "--home", "/home/x"]));
  assert.deepEqual(out, { path: join(root, ".claude", "triage"), scope: "project" });
});

test("no .claude, existing user-global triage -> scope user", () => {
  const root = mkdtempSync(join(tmpdir(), "tr-"));
  const home = mkdtempSync(join(tmpdir(), "home-"));
  const slug = root.replaceAll("/", "-");
  mkdirSync(join(home, ".claude", "projects", slug, "triage"), { recursive: true });
  const out = JSON.parse(run(["--root", root, "--home", home]));
  assert.deepEqual(out, { path: join(home, ".claude", "projects", slug, "triage"), scope: "user" });
});

test("nothing configured -> null/null", () => {
  const root = mkdtempSync(join(tmpdir(), "tr-"));
  const home = mkdtempSync(join(tmpdir(), "home-"));
  const out = JSON.parse(run(["--root", root, "--home", home]));
  assert.deepEqual(out, { path: null, scope: null });
});

test("--path-only emits bare path", () => {
  const root = mkdtempSync(join(tmpdir(), "tr-"));
  mkdirSync(join(root, ".claude", "triage"), { recursive: true });
  const out = run(["--root", root, "--home", "/home/x", "--path-only"]).trim();
  assert.equal(out, join(root, ".claude", "triage"));
});

test("--path-only on null emits empty line", () => {
  const root = mkdtempSync(join(tmpdir(), "tr-"));
  const home = mkdtempSync(join(tmpdir(), "home-"));
  const out = run(["--root", root, "--home", home, "--path-only"]);
  assert.equal(out, "\n");
});

test("relative --root exits 2", () => {
  const r = runFail(["--root", "rel/path", "--home", "/home/x"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /must be absolute/);
});

test("missing --home exits 2", () => {
  const r = runFail(["--root", "/abs"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--home is required/);
});
