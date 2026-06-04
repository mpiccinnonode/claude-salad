// test/find-open-specs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/triage/scripts/find-open-specs.mjs", import.meta.url));
const run = (args) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};

test("no specs dir -> empty array", () => {
  const root = mkdtempSync(join(tmpdir(), "fos-"));
  assert.deepEqual(JSON.parse(run(["--root", root])), []);
});

test("finds .md recursively, sorted by path, slug is basename minus .md", () => {
  const root = mkdtempSync(join(tmpdir(), "fos-"));
  mkdirSync(join(root, "specs", "sub"), { recursive: true });
  writeFileSync(join(root, "specs", "b-feature.md"), "x");
  writeFileSync(join(root, "specs", "a-feature.md"), "x");
  writeFileSync(join(root, "specs", "sub", "c-feature.md"), "x");
  writeFileSync(join(root, "specs", "ignore.txt"), "x");
  const out = JSON.parse(run(["--root", root]));
  assert.deepEqual(out, [
    { slug: "a-feature", path: join(root, "specs", "a-feature.md") },
    { slug: "b-feature", path: join(root, "specs", "b-feature.md") },
    { slug: "c-feature", path: join(root, "specs", "sub", "c-feature.md") },
  ]);
});

test("relative root exits 2", () => {
  const r = runFail(["--root", "rel"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /must be absolute/);
});
