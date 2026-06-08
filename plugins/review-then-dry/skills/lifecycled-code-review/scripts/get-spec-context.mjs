#!/usr/bin/env node
// Serves: lifecycled-code-review SKILL.md — Spec context lookup.
// Inputs (argv): --repo <abs>
// Output: {"branch":"<name>","spec_path":"<abs>"|null}
// Branch slug = substring after the first '/' (full name if no '/').
// Spec = <repo>/specs/<slug>-spec.md; null if absent. Detached HEAD → {"branch":"","spec_path":null}.
// Exit 2 on missing/non-absolute --repo; exit 1 on non-git repo. Ported from get-spec-context.sh.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function die(msg, code) {
  process.stderr.write(`get-spec-context: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let repo = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--repo") {
      if (i + 1 >= argv.length) die("--repo requires a value", 2);
      repo = argv[++i];
    } else {
      die(`unknown arg: ${argv[i]}`, 2);
    }
  }
  return { repo };
}

function main() {
  const { repo } = parseArgs(process.argv.slice(2));
  if (!repo) die("--repo is required", 2);
  if (!repo.startsWith("/")) die(`--repo must be absolute: ${repo}`, 2);
  if (!existsSync(join(repo, ".git"))) die(`not a git repo: ${repo}`, 1);

  const res = spawnSync("git", ["-C", repo, "branch", "--show-current"], { encoding: "utf8" });
  const branch = res.status === 0 ? res.stdout.trim() : "";

  if (!branch) {
    process.stdout.write(JSON.stringify({ branch: "", spec_path: null }) + "\n");
    return;
  }

  const slash = branch.indexOf("/");
  const slug = slash === -1 ? branch : branch.slice(slash + 1);
  const specPath = join(repo, "specs", `${slug}-spec.md`);

  if (existsSync(specPath)) {
    process.stdout.write(JSON.stringify({ branch, spec_path: specPath }) + "\n");
  } else {
    process.stdout.write(JSON.stringify({ branch, spec_path: null }) + "\n");
  }
}

main();
