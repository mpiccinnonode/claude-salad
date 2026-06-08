import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/lifecycled-code-review/scripts/safe-write-yaml.mjs", import.meta.url));
const run = (args, input) => execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", input });
const runFail = (args, input) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};

test("creates new file, reports existed_before=false", () => {
  const dir = mkdtempSync(join(tmpdir(), "swy-"));
  const path = join(dir, "out.yaml");
  const out = JSON.parse(run(["--path", path], "a: 1\n"));
  assert.equal(readFileSync(path, "utf8"), "a: 1\n");
  assert.equal(out.existed_before, false);
  assert.equal(out.bak_deleted, false);
  assert.equal(out.path, path);
  assert.ok(!existsSync(path + ".bak"));
});

test("overwrites existing file, backs up then deletes .bak", () => {
  const dir = mkdtempSync(join(tmpdir(), "swy-"));
  const path = join(dir, "out.yaml");
  writeFileSync(path, "old: true\n");
  const out = JSON.parse(run(["--path", path], "new: true\n"));
  assert.equal(readFileSync(path, "utf8"), "new: true\n");
  assert.equal(out.existed_before, true);
  assert.equal(out.bak_deleted, true);
  assert.ok(!existsSync(path + ".bak"));
});

test("writing identical content twice is byte-stable", () => {
  const dir = mkdtempSync(join(tmpdir(), "swy-"));
  const path = join(dir, "out.yaml");
  run(["--path", path], "x: 1\n");
  run(["--path", path], "x: 1\n");
  assert.equal(readFileSync(path, "utf8"), "x: 1\n");
});

test("missing --path exits 2", () => {
  const r = runFail([], "x");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--path is required/);
});

test("relative --path exits 2", () => {
  const r = runFail(["--path", "rel.yaml"], "x");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /must be absolute/);
});

test("missing parent dir exits 1", () => {
  const r = runFail(["--path", "/nonexistent-xyz/out.yaml"], "x");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /parent dir does not exist/);
});
