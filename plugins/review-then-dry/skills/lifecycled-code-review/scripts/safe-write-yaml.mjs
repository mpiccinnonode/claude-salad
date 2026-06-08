#!/usr/bin/env node
// Serves: lifecycled-code-review SKILL.md — YAML safe-write protocol (Safety Protocol).
// Inputs (argv): --path <abs>   (new content read from stdin)
// Flow: cp existing → <path>.bak; write stdin via temp + rename; delete .bak on success.
// Output: {"path","bak_deleted","existed_before"}
// Exit 2 on missing/non-absolute --path; exit 1 on missing parent dir or I/O failure
// (the .bak is left in place for recovery). Does NOT parse YAML — moves bytes.
// Ported from safe-write-yaml.sh.

import { readFileSync, writeFileSync, copyFileSync, renameSync, rmSync, existsSync, statSync } from "node:fs";
import { dirname } from "node:path";

function die(msg, code) {
  process.stderr.write(`safe-write-yaml: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let path = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--path") {
      if (i + 1 >= argv.length) die("--path requires a value", 2);
      path = argv[++i];
    } else {
      die(`unknown arg: ${argv[i]}`, 2);
    }
  }
  return { path };
}

function main() {
  const { path } = parseArgs(process.argv.slice(2));
  if (!path) die("--path is required", 2);
  if (!path.startsWith("/")) die(`--path must be absolute: ${path}`, 2);

  const dir = dirname(path);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    die(`parent dir does not exist: ${dir}`, 1);
  }

  const content = readFileSync(0); // stdin as Buffer (byte-faithful)

  let existed = false;
  if (existsSync(path)) {
    existed = true;
    try { copyFileSync(path, `${path}.bak`); }
    catch { die(`failed to create backup: ${path}.bak`, 1); }
  }

  const tmp = `${path}.tmp.${process.pid}`;
  try { writeFileSync(tmp, content); }
  catch { try { rmSync(tmp, { force: true }); } catch {} die(`failed to write temp file: ${tmp}`, 1); }
  try { renameSync(tmp, path); }
  catch { try { rmSync(tmp, { force: true }); } catch {} die(`failed to rename temp to target: ${path}`, 1); }

  let bakDeleted = false;
  if (existed && existsSync(`${path}.bak`)) {
    rmSync(`${path}.bak`, { force: true });
    bakDeleted = true;
  }

  process.stdout.write(JSON.stringify({ path, bak_deleted: bakDeleted, existed_before: existed }) + "\n");
}

main();
