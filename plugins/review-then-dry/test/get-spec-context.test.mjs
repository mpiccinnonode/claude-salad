import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/lifecycled-code-review/scripts/get-spec-context.mjs", import.meta.url));
const run = (args) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};
const gitRepo = (branch) => {
  const root = mkdtempSync(join(tmpdir(), "gsc-"));
  execFileSync("git", ["-C", root, "init", "-q"]);
  execFileSync("git", ["-C", root, "config", "user.email", "t@t.t"]);
  execFileSync("git", ["-C", root, "config", "user.name", "t"]);
  writeFileSync(join(root, "f"), "x");
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "commit", "-qm", "init"]);
  if (branch) execFileSync("git", ["-C", root, "checkout", "-q", "-b", branch]);
  return root;
};

test("branch with slash → slug after first slash; spec found", () => {
  const root = gitRepo("feature/3-login");
  mkdirSync(join(root, "specs"), { recursive: true });
  writeFileSync(join(root, "specs", "3-login-spec.md"), "x");
  const out = JSON.parse(run(["--repo", root]));
  assert.equal(out.branch, "feature/3-login");
  assert.equal(out.spec_path, join(root, "specs", "3-login-spec.md"));
});

test("spec missing → spec_path null", () => {
  const root = gitRepo("feature/no-spec");
  const out = JSON.parse(run(["--repo", root]));
  assert.equal(out.branch, "feature/no-spec");
  assert.equal(out.spec_path, null);
});

test("branch without slash → full name used as slug", () => {
  const root = gitRepo("mainline");
  mkdirSync(join(root, "specs"), { recursive: true });
  writeFileSync(join(root, "specs", "mainline-spec.md"), "x");
  const out = JSON.parse(run(["--repo", root]));
  assert.equal(out.spec_path, join(root, "specs", "mainline-spec.md"));
});

test("missing --repo exits 2", () => {
  const r = runFail([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--repo is required/);
});

test("non-git repo exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "gsc-nogit-"));
  const r = runFail(["--repo", dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not a git repo/);
});
