#!/usr/bin/env node
// DEV-ONLY, run ONCE. Seeds plugins/review-then-dry/skills/*/SKILL.md from the personal
// ~/.claude skills and applies the seven de-personalization patch rules (design spec
// "De-personalization patch set"). Fails loudly if any anchor count is wrong so a stale
// personal SKILL.md aborts rather than silently producing a broken path.
//
// Usage: node scripts/migrate-review-then-dry.mjs [--home <dir>] [--dry-run]
//
// Does NOT author the ported .sh→.mjs scripts (hand-written, Tasks 3–7) or the cold-start
// gate (Task 11). It copies SKILL.md files and rewrites paths/names/invocations only.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const homeIdx = argv.indexOf("--home");
const HOME = homeIdx !== -1 ? argv[homeIdx + 1] : homedir();

const SRC = {
  cr: join(HOME, ".claude/skills/code-review/SKILL.md"),
  dry: join(HOME, ".claude/skills/dry/SKILL.md"),
  rtd: join(HOME, ".claude/skills/review-then-dry/SKILL.md"),
};
const DST = {
  cr: join(REPO, "plugins/review-then-dry/skills/lifecycled-code-review/SKILL.md"),
  dry: join(REPO, "plugins/review-then-dry/skills/dry/SKILL.md"),
  rtd: join(REPO, "plugins/review-then-dry/skills/review-then-dry/SKILL.md"),
};

function fail(msg) {
  process.stderr.write(`migrate: ${msg}\n`);
  process.exit(1);
}

// Literal find→replace asserting an exact match count (path-rewrite anchors — stable text).
function patch(name, text, find, replace, expected) {
  const count = text.split(find).length - 1;
  if (count !== expected) {
    fail(`patch "${name}" expected ${expected} match(es), found ${count} — personal SKILL.md has drifted; reconcile the anchor or the count (do NOT loosen to a bare word).`);
  }
  return text.split(find).join(replace);
}

// Rule 6: rename every code-review token → lifecycled-code-review across the whole file.
// Negative lookahead (?!er) skips the `code-reviewer` agent name; negative lookbehind
// (?<!lifecycled-) avoids double-prefixing tokens already rewritten by the path patches
// (e.g. inside `${CLAUDE_PLUGIN_ROOT}/skills/lifecycled-code-review/...`).
function renameSkill(tag, text) {
  const re = /(?<!lifecycled-)code-review(?!er)/g;
  const before = (text.match(re) || []).length;
  if (before < 1) fail(`${tag}: rename matched 0 code-review tokens — source drifted (expected at least the frontmatter/Skill reference).`);
  const out = text.replace(re, "lifecycled-code-review");
  const residual = (out.match(re) || []).length;
  if (residual !== 0) fail(`${tag}: rename left ${residual} un-renamed code-review token(s).`);
  process.stdout.write(`${tag}: renamed ${before} code-review token(s) → lifecycled-code-review\n`);
  return out;
}

// In-plugin path roots. ROOT holds the LITERAL string ${CLAUDE_PLUGIN_ROOT} (double quotes do
// not interpolate in JS — only backticks do), so `${ROOT}/...` template strings embed it verbatim.
const ROOT = "${CLAUDE_PLUGIN_ROOT}";
const SKILLDIR = `${ROOT}/skills/lifecycled-code-review/scripts`;
const SHAREDDIR = `${ROOT}/scripts`;

// ---- lifecycled-code-review (was code-review) ----
function migrateCodeReview() {
  let t = readFileSync(SRC.cr, "utf8");

  // Rules 1–3 PATH rewrites run BEFORE the rename. For each script the personal SKILL.md has
  // an absolute command form (`~/.claude/.../x.sh`, gets a `node ` prefix + quotes) AND a
  // relative prose form (`scripts/x.sh`, no prefix). The absolute string CONTAINS the relative
  // substring, so every absolute MUST be replaced before its relative — hence two passes.

  // Rule 3: offload-scripts convention doc (distinct path; no code-review segment).
  t = patch("cr:offload-ref", t,
    "~/.claude/skills/_conventions/offload-scripts.md",
    `${ROOT}/references/offload-scripts.md`, 1);

  // Rule 2: shared get-review-targets — absolute (command) then relative (prose).
  t = patch("cr:get-review-targets-abs", t,
    "~/.claude/scripts/get-review-targets.sh",
    `node "${SHAREDDIR}/get-review-targets.mjs"`, 1);
  t = patch("cr:get-review-targets-rel", t,
    "scripts/get-review-targets.sh",
    `${SHAREDDIR}/get-review-targets.mjs`, 1);

  // Rule 1: lifecycle-pass.mjs — node form first, then the bare prose reference.
  t = patch("cr:lifecycle-pass-node", t,
    "node ~/.claude/skills/code-review/scripts/lifecycle-pass.mjs",
    `node "${SKILLDIR}/lifecycle-pass.mjs"`, 1);
  t = patch("cr:lifecycle-pass-bare", t,
    "~/.claude/skills/code-review/scripts/lifecycle-pass.mjs",
    `${SKILLDIR}/lifecycle-pass.mjs`, 1);

  // Rule 1: the three .sh-ported skill-local scripts. Absolute count, then relative count.
  // evict-staged appears twice (Phase 3 Step 4 + Seed Mode Step 5) in both forms.
  const skillScripts = [
    { name: "safe-write-yaml", abs: 1, rel: 1 },
    { name: "get-spec-context", abs: 1, rel: 1 },
    { name: "evict-staged", abs: 2, rel: 2 },
  ];
  for (const s of skillScripts) {
    t = patch(`cr:${s.name}-abs`, t,
      `~/.claude/skills/code-review/scripts/${s.name}.sh`,
      `node "${SKILLDIR}/${s.name}.mjs"`, s.abs);
  }
  for (const s of skillScripts) {
    t = patch(`cr:${s.name}-rel`, t,
      `scripts/${s.name}.sh`,
      `${SKILLDIR}/${s.name}.mjs`, s.rel);
  }

  // Rule 4 (Task 11) anchor must still be present PRE-rename so Task 11 can find it post-rename.
  if (!t.includes("code-review-findings.md")) {
    fail("cr: expected hardcoded findings-spec path (…-code-review-findings.md) not found — Task 11 anchor missing.");
  }

  // Rule 6: rename code-review → lifecycled-code-review (frontmatter name, slug, all prose).
  t = renameSkill("cr", t);
  return t;
}

// ---- dry ----
function migrateDry() {
  let t = readFileSync(SRC.dry, "utf8");
  // Rule 2: shared get-review-targets (absolute command only — dry has no relative prose ref).
  t = patch("dry:get-review-targets-abs", t,
    "~/.claude/scripts/get-review-targets.sh",
    `node "${SHAREDDIR}/get-review-targets.mjs"`, 1);
  // Rule 6: rename all code-review references in dry's prose.
  t = renameSkill("dry", t);
  return t;
}

// ---- review-then-dry (orchestrator; no scripts of its own) ----
function migrateOrchestrator() {
  let t = readFileSync(SRC.rtd, "utf8");
  // Rule 6 FIRST: rename turns Skill(skill="code-review") into Skill(skill="lifecycled-code-review").
  t = renameSkill("rtd", t);
  // Rule 7: namespace the Skill() targets (after the rename).
  t = patch("rtd:ns-code-review", t,
    'Skill(skill="lifecycled-code-review", args=',
    'Skill(skill="review-then-dry:lifecycled-code-review", args=', 1);
  t = patch("rtd:ns-dry", t,
    'Skill(skill="dry", args=',
    'Skill(skill="review-then-dry:dry", args=', 1);
  return t;
}

function writeOut(dst, content) {
  if (dryRun) { process.stdout.write(`[dry-run] would write ${dst} (${content.length} bytes)\n`); return; }
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, content);
  process.stdout.write(`wrote ${dst}\n`);
}

function main() {
  for (const [k, p] of Object.entries(SRC)) {
    if (!existsSync(p)) fail(`source not found: ${p} (key ${k})`);
  }
  writeOut(DST.cr, migrateCodeReview());
  writeOut(DST.dry, migrateDry());
  writeOut(DST.rtd, migrateOrchestrator());
  process.stdout.write("migrate: done. Next: author the cold-start gate (Task 11) and the spec-path prompt (Rule 4) by hand.\n");
}

main();
