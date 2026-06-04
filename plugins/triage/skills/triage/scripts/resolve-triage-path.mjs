#!/usr/bin/env node
// Serves: triage SKILL.md — storage path detection (Phase 6, Phase 1a active check).
// Inputs (argv): --root <abs> --home <abs> [--path-only]
// stdout (default): {"path":"<abs>","scope":"project"|"user"} | {"path":null,"scope":null}
// stdout (--path-only): the resolved path, or an empty line if null (replaces the old python3 pluck).
// Precedence: <root>/.claude/triage/  >  <root>/.claude/ exists  >  <home>/.claude/projects/<slug>/triage/  >  null.
// slug = <root> with '/' -> '-'. Exit 0 on success; exit 2 + stderr on bad argv.
import { statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

function die(msg) { process.stderr.write(`resolve-triage-path: ${msg}\n`); process.exit(2); }
function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

const argv = process.argv.slice(2);
let root = "", home = "", pathOnly = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--root") { if (i + 1 >= argv.length) die("--root requires a value"); root = argv[++i]; }
  else if (a === "--home") { if (i + 1 >= argv.length) die("--home requires a value"); home = argv[++i]; }
  else if (a === "--path-only") { pathOnly = true; }
  else die(`unknown arg: ${a}`);
}
if (!root) die("--root is required");
if (!home) die("--home is required");
if (!isAbsolute(root)) die(`--root must be absolute: ${root}`);
if (!isAbsolute(home)) die(`--home must be absolute: ${home}`);

const projectTriage = join(root, ".claude", "triage");
let result;
if (isDir(projectTriage)) result = { path: projectTriage, scope: "project" };
else if (isDir(join(root, ".claude"))) result = { path: projectTriage, scope: "project" };
else {
  const slug = root.replaceAll("/", "-");
  const userTriage = join(home, ".claude", "projects", slug, "triage");
  result = isDir(userTriage) ? { path: userTriage, scope: "user" } : { path: null, scope: null };
}

process.stdout.write(pathOnly ? `${result.path ?? ""}\n` : `${JSON.stringify(result)}\n`);
