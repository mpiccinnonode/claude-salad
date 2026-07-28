#!/usr/bin/env node
// Serves: triage SKILL.md — cross-session retrieval of triage records.
// The single read path for <dir>/*.yaml (SKILL.md forbids inline globbing).
// Inputs (argv):
//   --dir <abs>       required — triage dir (from resolve-triage-path).
//   --active          list records with status in {draft, in_progress}.
//   --find <query>    case-insensitive substring match on the task field.
//   --show <slug>     emit one record (slug = filename minus .yaml / .draft.yaml).
//   --json            machine-readable JSON (default: human-readable).
// Exactly one of --active|--find|--show. Exit 0 even when empty; exit 2 + stderr on bad argv.
import { statSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, basename } from "node:path";
import { yamlField, recordCreated } from "./yaml-fields.mjs";

function die(msg) { process.stderr.write(`triage-recall: ${msg}\n`); process.exit(2); }
function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }
function isFile(p) { try { return statSync(p).isFile(); } catch { return false; } }

const argv = process.argv.slice(2);
let dir = "", mode = "", query = "", slug = "", json = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dir") { if (i + 1 >= argv.length) die("--dir requires value"); dir = argv[++i]; }
  else if (a === "--active") { mode = "active"; }
  else if (a === "--find") { mode = "find"; if (i + 1 >= argv.length) die("--find requires query"); query = argv[++i]; }
  else if (a === "--show") { mode = "show"; if (i + 1 >= argv.length) die("--show requires slug"); slug = argv[++i]; }
  else if (a === "--json") { json = true; }
  else die(`unknown arg: ${a}`);
}
if (!dir) die("--dir is required");
if (!mode) die("one of --active|--find|--show is required");
if (!isAbsolute(dir)) die(`--dir must be absolute: ${dir}`);

if (!isDir(dir)) { process.stdout.write(json ? "[]\n" : "(no triage records)\n"); process.exit(0); }

function baseSlug(file) {
  return basename(file).replace(/\.yaml$/, "").replace(/\.draft$/, "");
}

function listYaml() {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".yaml"))
    .map((e) => join(dir, e.name))
    .sort();
}

function record(file) {
  const c = readFileSync(file, "utf8");
  return {
    slug: baseSlug(file),
    status: yamlField(c, "status"),
    task: yamlField(c, "task"),
    created: recordCreated(c),
    classification: yamlField(c, "classification"),
    path: file,
  };
}

let matches = [];
if (mode === "active") {
  matches = listYaml().filter((f) => {
    const s = yamlField(readFileSync(f, "utf8"), "status");
    return s === "draft" || s === "in_progress";
  });
} else if (mode === "find") {
  const needle = query.toLowerCase();
  matches = listYaml().filter((f) => yamlField(readFileSync(f, "utf8"), "task").toLowerCase().includes(needle));
} else if (mode === "show") {
  for (const cand of [join(dir, `${slug}.yaml`), join(dir, `${slug}.draft.yaml`)]) {
    if (isFile(cand)) matches.push(cand);
  }
}

if (matches.length === 0) {
  process.stdout.write(json ? "[]\n" : "(no matching triage records)\n");
  process.exit(0);
}

if (json) {
  process.stdout.write(`${JSON.stringify(matches.map(record))}\n`);
} else if (mode === "show") {
  const f = matches[0];
  process.stdout.write(`# ${f}\n${readFileSync(f, "utf8")}`);
} else {
  let out = "";
  for (const f of matches) {
    const r = record(f);
    out += `${r.slug}  [${r.status}]  ${r.task}\n`;
    if (r.created) out += `  created: ${r.created}\n`;
    if (r.classification) out += `  classification: ${r.classification}\n`;
    out += `  path: ${f}\n\n`;
  }
  process.stdout.write(out);
}
