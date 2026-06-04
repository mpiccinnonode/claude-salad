#!/usr/bin/env node
// Serves: triage SKILL.md — open-specs scan (Phase 1c).
// Inputs (argv): --root <abs>
// stdout: JSON array of { "slug": "<basename-minus-md>", "path": "<abs>" }, recursive under <root>/specs, sorted by path.
// Missing specs/ -> []. Exit 2 + stderr on missing/relative/non-dir --root.
import { statSync, readdirSync } from "node:fs";
import { isAbsolute, join, basename } from "node:path";

function die(msg) { process.stderr.write(`find-open-specs: ${msg}\n`); process.exit(2); }
function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

const argv = process.argv.slice(2);
let root = "";
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--root") { if (i + 1 >= argv.length) die("--root requires a value"); root = argv[++i]; }
  else die(`unknown arg: ${a}`);
}
if (!root) die("--root is required");
if (!isAbsolute(root)) die(`--root must be absolute: ${root}`);
if (!isDir(root)) die(`root is not a directory: ${root}`);

const specsDir = join(root, "specs");
if (!isDir(specsDir)) { process.stdout.write("[]\n"); process.exit(0); }

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile() && e.name.endsWith(".md")) files.push(full);
  }
})(specsDir);

files.sort();
const out = files.map((f) => ({ slug: basename(f).replace(/\.md$/, ""), path: f }));
process.stdout.write(`${JSON.stringify(out)}\n`);
