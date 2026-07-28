#!/usr/bin/env node
// Serves: triage-cleanup SKILL.md — Phase 6 confirmed deletion.
// Safely deletes a confirmed list of stale artifacts. The skill body decides WHAT to delete
// (after the user confirms); this script enforces that nothing outside the allowed roots is touched.
//
// Safety model — fail closed:
//   * Every target must resolve inside one of the --allow-root jails, or the whole batch aborts
//     (exit 2) having deleted nothing. One bad path never gets a partial delete.
//   * --dry-run reports what would happen and touches nothing.
//   * Only regular files are removed; a target that is a directory aborts the batch.
//
// Inputs (argv):
//   --allow-root <abs>   required, repeatable — a directory targets must live under (triage dir, specs/, ...).
//   --target <abs>       repeatable — a file to delete.
//   --manifest <abs>     optional — JSON file: ["<abs>", ...] or {"targets":["<abs>", ...]}.
//   --dry-run            report only; delete nothing.
// stdout: a single JSON object {deleted, wouldDelete, skipped}. Exit 0 on success;
//         exit 2 + stderr on bad argv or a jail/type violation (nothing deleted).
import { statSync, readFileSync, rmSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

function die(msg) { process.stderr.write(`delete-targets: ${msg}\n`); process.exit(2); }

const argv = process.argv.slice(2);
const allowRoots = [];
const targets = [];
let manifest = "", dryRun = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => { if (i + 1 >= argv.length) die(`${a} requires a value`); return argv[++i]; };
  if (a === "--allow-root") allowRoots.push(next());
  else if (a === "--target") targets.push(next());
  else if (a === "--manifest") manifest = next();
  else if (a === "--dry-run") dryRun = true;
  else die(`unknown arg: ${a}`);
}
if (allowRoots.length === 0) die("at least one --allow-root is required");
for (const r of allowRoots) if (!isAbsolute(r)) die(`--allow-root must be absolute: ${r}`);

if (manifest) {
  if (!isAbsolute(manifest)) die(`--manifest must be absolute: ${manifest}`);
  let parsed;
  try { parsed = JSON.parse(readFileSync(manifest, "utf8")); }
  catch (e) { die(`cannot read/parse manifest: ${e.message}`); }
  const list = Array.isArray(parsed) ? parsed : parsed?.targets;
  if (!Array.isArray(list)) die("manifest must be a JSON array or {\"targets\":[...]}");
  targets.push(...list);
}
if (targets.length === 0) die("no targets given (use --target or --manifest)");

const roots = allowRoots.map((r) => resolve(r));
function inJail(p) {
  return roots.some((r) => p === r || p.startsWith(r + sep));
}

// Validation pass — fail closed before any deletion.
const resolved = [];
for (const t of targets) {
  if (!isAbsolute(t)) die(`target must be absolute: ${t}`);
  const r = resolve(t);
  if (!inJail(r)) die(`target escapes all --allow-root jails: ${t}`);
  let st = null;
  try { st = statSync(r); } catch { st = null; }
  if (st && st.isDirectory()) die(`target is a directory, refusing: ${t}`);
  resolved.push({ path: r, exists: !!st });
}

// Action pass.
const deleted = [], wouldDelete = [], skipped = [];
for (const { path, exists } of resolved) {
  if (!exists) { skipped.push({ path, reason: "not found" }); continue; }
  if (dryRun) { wouldDelete.push(path); continue; }
  try { rmSync(path); deleted.push(path); }
  catch (e) { skipped.push({ path, reason: e.message }); }
}

process.stdout.write(`${JSON.stringify({ dryRun, deleted, wouldDelete, skipped })}\n`);
