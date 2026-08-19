#!/usr/bin/env node
// Serves: lifecycled-code-review + dry SKILL.md — Target file discovery.
// Inputs (argv): --repo <abs> [--args "<space-separated user args>"]
// Output: JSON array of file paths (unique, sorted). Strategy ranking:
//   1. --args (user paths/globs) — whitespace split, no extension filter
//   2. Active-branch diff vs main — `git diff <main> --name-only --diff-filter=d`
//   3. Last 3 commits — `git log -3 --name-only --pretty=format: --diff-filter=d`
// Excludes non-source noise (docs, lockfiles, binaries/assets) rather than allowlisting
// source extensions — an allowlist silently drops any language it forgot to name.
// Exit 2 on bad argv / non-absolute repo; exit 1 on non-git repo. Ported from
// get-review-targets.sh — jq replaced by native JSON.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const NON_SOURCE_RE =
  /\.(md|mdx|txt|rst|adoc|lock|min\.js|min\.css|map|png|jpe?g|gif|svg|ico|webp|avif|bmp|mp4|mov|avi|pdf|zip|tar|gz|7z|woff2?|ttf|eot|otf)$/i;

function die(msg, code) {
  process.stderr.write(`get-review-targets: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let repo = "", userArgs = "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") {
      if (i + 1 >= argv.length) die("--repo requires a value", 2);
      repo = argv[++i];
    } else if (a === "--args") {
      if (i + 1 >= argv.length) die("--args requires a value", 2);
      userArgs = argv[++i];
    } else {
      die(`unknown arg: ${a}`, 2);
    }
  }
  return { repo, userArgs };
}

// Match the .sh emit_json: split, drop empties, unique. `unique` in jq sorts ascending.
function emitJson(lines) {
  const cleaned = lines.filter((l) => l.length > 0);
  const unique = [...new Set(cleaned)].sort();
  process.stdout.write(JSON.stringify(unique) + "\n");
}

function git(repo, args) {
  const res = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  if (res.status !== 0) return null; // mirrors the .sh `2>/dev/null || true`
  return res.stdout;
}

function main() {
  const { repo, userArgs } = parseArgs(process.argv.slice(2));
  if (!repo) die("--repo is required", 2);
  if (!repo.startsWith("/")) die(`--repo must be absolute: ${repo}`, 2);
  if (!existsSync(join(repo, ".git"))) die(`not a git repo: ${repo}`, 1);

  // Strategy 1: user args — split on whitespace, pass through (no extension filter).
  if (userArgs) {
    emitJson(userArgs.split(/\s+/));
    return;
  }

  // Detect main branch from origin/HEAD; fall back to "develop".
  let mainBranch = "develop";
  const head = git(repo, ["symbolic-ref", "refs/remotes/origin/HEAD"]);
  if (head) {
    const stripped = head.trim().replace(/^refs\/remotes\/origin\//, "");
    if (stripped) mainBranch = stripped;
  }

  // Strategy 2: active branch diff vs main.
  const diff = git(repo, ["diff", mainBranch, "--name-only", "--diff-filter=d"]);
  if (diff) {
    const files = diff.split("\n").filter((l) => l && !NON_SOURCE_RE.test(l));
    if (files.length) { emitJson(files); return; }
  }

  // Strategy 3: last 3 commits.
  const log = git(repo, ["log", "-3", "--name-only", "--pretty=format:", "--diff-filter=d"]);
  if (log) {
    const files = log.split("\n").filter((l) => l && !NON_SOURCE_RE.test(l));
    if (files.length) { emitJson(files); return; }
  }

  // No targets — empty array is a valid zero-files state.
  process.stdout.write("[]\n");
}

main();
