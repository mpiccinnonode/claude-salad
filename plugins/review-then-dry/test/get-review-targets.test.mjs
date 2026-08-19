import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/get-review-targets.mjs", import.meta.url));
const run = (args, opts = {}) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", ...opts });
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};
const gitRepo = () => {
  const root = mkdtempSync(join(tmpdir(), "grt-"));
  execFileSync("git", ["-C", root, "init", "-q"]);
  execFileSync("git", ["-C", root, "config", "user.email", "t@t.t"]);
  execFileSync("git", ["-C", root, "config", "user.name", "t"]);
  return root;
};

test("--args: splits on whitespace, dedupes, sorts, no extension filter", () => {
  const root = gitRepo();
  const out = JSON.parse(run(["--repo", root, "--args", "b.txt a.ts a.ts notes.md"]));
  assert.deepEqual(out, ["a.ts", "b.txt", "notes.md"]);
});

test("missing --repo exits 2", () => {
  const r = runFail([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--repo is required/);
});

test("relative --repo exits 2", () => {
  const r = runFail(["--repo", "rel/path"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /must be absolute/);
});

test("non-git repo exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "grt-nogit-"));
  const r = runFail(["--repo", dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not a git repo/);
});

test("unknown arg exits 2", () => {
  const r = runFail(["--repo", "/abs", "--bogus"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown arg/);
});

test("no diff, no commits → empty array", () => {
  const root = gitRepo();
  // empty repo with no commits and no diff target → [] (git failures swallowed → empty)
  const out = JSON.parse(run(["--repo", root]));
  assert.deepEqual(out, []);
});

test("diff strategy excludes docs/lockfiles/binaries, keeps everything else, dedupes", () => {
  const root = gitRepo();
  writeFileSync(join(root, "keep.ts"), "1");
  writeFileSync(join(root, "skip.md"), "1");
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "commit", "-qm", "init"]);
  // create develop as the default main branch the script falls back to, diverge HEAD
  execFileSync("git", ["-C", root, "branch", "develop"]);
  writeFileSync(join(root, "feature.ts"), "2");
  writeFileSync(join(root, "doc.md"), "2");
  // languages a fixed allowlist would have missed — must NOT be filtered out
  writeFileSync(join(root, "server.php"), "2");
  writeFileSync(join(root, "lib.cpp"), "2");
  writeFileSync(join(root, "migration.sql"), "2");
  writeFileSync(join(root, "deploy.tf"), "2");
  // obvious non-source noise — must still be filtered out
  writeFileSync(join(root, "yarn.lock"), "2");
  writeFileSync(join(root, "logo.png"), "2");
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "commit", "-qm", "feat"]);
  const out = JSON.parse(run(["--repo", root]));
  assert.deepEqual(out, ["deploy.tf", "feature.ts", "lib.cpp", "migration.sql", "server.php"]);
});
