#!/usr/bin/env node
// Serves: triage-cleanup SKILL.md — Phase 1/2 stale-candidate classification.
// Deterministic classifier: reads triage YAMLs + discovers spec/plan/doc artifacts,
// then labels each as a stale deletion candidate (with confidence) or active.
// Does NO deletion — that is delete-targets.mjs.
//
// It DOES ask git for one thing: each file's last-commit date. That is a deterministic
// fact and it is the only correct answer available — mtime is stamped at checkout, so on
// a fresh clone every artifact reports the same bogus age (measured: 61 specs spanning
// three weeks all reported "75d"). Merge-detection stays in the skill body, where the
// heuristic parts of git (branch naming, squash merges) belong.
//
// Inputs (argv):
//   --root <abs>            required — project root (for spec/plan/doc discovery + note refs).
//   --now <YYYY-MM-DD>      required — today's date, injected for deterministic age math.
//   --triage-dir <abs>      optional — resolved triage dir; omit/none if persistence is unconfigured.
//   --dir <abs>             optional, repeatable — extra artifact dir to scan (e.g. user-named plans path).
//   --draft-age <days>      optional — drafts older than this are stale (default 30).
//   --inprogress-age <days> optional — in_progress untouched longer than this is flagged (default 60).
//   --orphan-age <days>     optional — unreferenced spec/plan older than this is flagged (default 30).
// stdout: a single JSON object (see SHAPE below). Exit 0 on success; exit 2 + stderr on bad argv.
import { statSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isAbsolute, join, basename, relative, dirname, sep } from "node:path";
import { yamlField, phaseStatuses, recordCreated, phaseIsDone, TRIAGE_STATUSES } from "../../triage/scripts/yaml-fields.mjs";

function die(msg) { process.stderr.write(`scan-stale: ${msg}\n`); process.exit(2); }
function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

const argv = process.argv.slice(2);
let root = "", now = "", triageDir = "";
const extraDirs = [];
let draftAge = 30, inProgressAge = 60, orphanAge = 30;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => { if (i + 1 >= argv.length) die(`${a} requires a value`); return argv[++i]; };
  if (a === "--root") root = next();
  else if (a === "--now") now = next();
  else if (a === "--triage-dir") triageDir = next();
  else if (a === "--dir") extraDirs.push(next());
  else if (a === "--draft-age") draftAge = Number(next());
  else if (a === "--inprogress-age") inProgressAge = Number(next());
  else if (a === "--orphan-age") orphanAge = Number(next());
  else die(`unknown arg: ${a}`);
}
if (!root) die("--root is required");
if (!isAbsolute(root)) die(`--root must be absolute: ${root}`);
if (!now) die("--now is required");
const nowMs = Date.parse(`${now}T00:00:00Z`);
if (Number.isNaN(nowMs)) die(`--now must be YYYY-MM-DD: ${now}`);
if (triageDir && !isAbsolute(triageDir)) die(`--triage-dir must be absolute: ${triageDir}`);
for (const d of extraDirs) if (!isAbsolute(d)) die(`--dir must be absolute: ${d}`);
for (const [name, v] of [["--draft-age", draftAge], ["--inprogress-age", inProgressAge], ["--orphan-age", orphanAge]]) {
  if (!Number.isFinite(v) || v < 0) die(`${name} must be a non-negative number`);
}

// ---- helpers -------------------------------------------------------------

// Artifact paths referenced anywhere in the record (notes, etc.): specs|plans|docs/...md.
function referencedPaths(content) {
  return [...content.matchAll(/(?:specs|plans|docs)\/[^\s"'\]]+\.md/g)].map((m) => m[0]);
}

function ageDaysFrom(iso) {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return Math.floor((nowMs - ms) / 86_400_000);
}

// Clamp at 0: --now is midnight UTC but real timestamps fall later the same day, which
// would otherwise report a fresh file as "-1d". A negative age is never meaningful here.
const clamp = (d) => Math.max(0, d);

function ageDaysFromMtime(p) {
  return clamp(Math.floor((nowMs - statSync(p).mtimeMs) / 86_400_000));
}

// Last-commit date per file, one `git log` per directory group. Paths come back relative
// to the -C directory thanks to --relative, so they key straight back to our inputs.
// Any failure (not a repo, git missing, never-committed files) leaves the map empty and
// callers fall back to mtime — which is honest for untracked files, since nothing else knows.
function gitDates(dir, relPaths) {
  const out = new Map();
  if (!relPaths.length || !isDir(dir)) return out;
  try {
    const log = execFileSync(
      "git",
      ["-C", dir, "log", "--format=%H %cs", "--name-only", "--relative", "--", ...relPaths],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
    );
    let date = "";
    for (const line of log.split("\n")) {
      if (!line) continue;
      const m = line.match(/^[0-9a-f]{7,40} (\d{4}-\d{2}-\d{2})$/);
      if (m) { date = m[1]; continue; }
      if (!out.has(line)) out.set(line, date); // log is newest-first, so first hit wins
    }
  } catch { /* mtime fallback */ }
  return out;
}

// How long since this file was last changed, and where that answer came from.
function lastTouched(absPath, dir, gitMap) {
  const d = gitMap.get(relative(dir, absPath));
  if (d) {
    const age = ageDaysFrom(d);
    if (age !== null) return { ageDays: clamp(age), ageSource: "git" };
  }
  return { ageDays: ageDaysFromMtime(absPath), ageSource: "mtime" };
}

function baseSlug(file) {
  return basename(file).replace(/\.yaml$/, "").replace(/\.draft$/, "").replace(/\.md$/, "");
}

// Classify a file path into an artifact kind by its path segments.
// A `/plans/` segment wins (handles docs/**/plans/foo.md), then `/specs/`, else doc.
function kindOf(file) {
  const segs = relative(root, file).split(sep);
  if (segs.includes("plans")) return "plan";
  if (segs.includes("specs")) return "spec";
  return "doc";
}

function walkMd(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walkMd(full, out);
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
}

// ---- triage records ------------------------------------------------------

const candidates = [];
const active = [];
const doneRefs = new Set();   // artifact ref strings owned by complete/abandoned triages
const liveRefs = new Set();   // artifact ref strings owned by draft/in_progress triages

if (triageDir && isDir(triageDir)) {
  const files = readdirSync(triageDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".yaml"))
    .map((e) => join(triageDir, e.name))
    .sort();

  const triageGit = gitDates(triageDir, files.map((f) => relative(triageDir, f)));

  for (const file of files) {
    const c = readFileSync(file, "utf8");
    const status = yamlField(c, "status").trim();
    const created = recordCreated(c);
    const task = yamlField(c, "task").trim();
    const createdAge = created ? ageDaysFrom(created) : null;
    const touched = lastTouched(file, triageDir, triageGit);
    const phases = phaseStatuses(c);
    const allPhasesDone = phases.length > 0 && phases.every(phaseIsDone);
    const refs = referencedPaths(c);
    // A record whose date field is missing or unparseable can't be aged from its own
    // contents; flagged so the report can point the user at validate-record.mjs.
    const malformed = createdAge === null;
    // Two ages, deliberately separate: `ageDays` is how old the record is, `touchedDays`
    // is how long since anyone worked on it. The draft and in_progress rules need different ones.
    const rec = {
      kind: "triage", path: file, slug: baseSlug(file), status, created,
      ageDays: createdAge, touchedDays: touched.ageDays, ageSource: touched.ageSource, malformed,
    };

    let verdict = null; // {reason, confidence, flagOnly}
    if (status === "abandoned") {
      verdict = { reason: "abandoned — explicitly given up", confidence: "high", flagOnly: false };
    } else if (status === "complete") {
      verdict = allPhasesDone
        ? { reason: "complete — all phases finished", confidence: "high", flagOnly: false }
        : { reason: "marked complete but phases unfinished", confidence: "medium", flagOnly: false };
    } else if (status === "draft") {
      // Drafts are judged on creation age — the rule is "never confirmed since it was
      // written". Fall back to file age when the record didn't record its own date.
      const age = createdAge ?? touched.ageDays;
      if (age > draftAge) {
        verdict = { reason: `stale draft — ${age}d old, never confirmed`, confidence: "medium", flagOnly: false };
      }
    } else if (status === "in_progress") {
      // In-progress work is judged on *last touched*, per the documented rule. Creation
      // age would flag long-running-but-active work as dead.
      if (touched.ageDays > inProgressAge) {
        verdict = {
          reason: `stale in_progress — ${touched.ageDays}d untouched (${touched.ageSource}), likely dead`,
          confidence: "low", flagOnly: true,
        };
      }
    } else if (!status) {
      verdict = {
        reason: "no status field — cannot be resumed or closed, invisible to the lifecycle",
        confidence: "low", flagOnly: true,
      };
    } else {
      // Off-schema status: not resumable by recall (--active matches draft|in_progress)
      // and not closable by any rule above, so it would live forever unnoticed.
      verdict = {
        reason: `off-schema status "${status}" — expected ${TRIAGE_STATUSES.join("|")}`,
        confidence: "low", flagOnly: true,
      };
    }

    // A triage's referenced artifacts inherit its liveness for the file pass below.
    // "Done" is tied to status (complete/abandoned) — not to our delete verdict — because the
    // file-staleness rule is explicitly: a spec/plan is stale when its triage is complete/abandoned.
    // Anything else (including off-schema) counts as live, so its specs stay protected.
    const refTarget = status === "complete" || status === "abandoned" ? doneRefs : liveRefs;
    for (const r of refs) refTarget.add(r);

    // Schema breakage is not the same finding as finished work, and the right response is
    // the opposite one: a record whose status or date field is wrong may be perfectly live
    // work that was written badly, so it wants repairing, not deleting.
    // Deliberately keyed on the schema's own field name, not on `recordCreated`'s tolerant
    // read — a `created_at` record works here but still fails validate-record, and the two
    // must reach the same verdict or the repair prompt never mentions it.
    const needsRepair = malformed || !yamlField(c, "created").trim() || !status || !TRIAGE_STATUSES.includes(status);

    if (verdict) candidates.push({ ...rec, ...verdict, needsRepair, referencedBy: null, task });
    else active.push({ ...rec, task, needsRepair, reason: `active (${status})` });
  }
}

// ---- spec / plan / doc artifacts ----------------------------------------

const scanDirs = [join(root, "specs"), join(root, "plans"), join(root, "docs"), ...extraDirs];
const seen = new Set();
const mdFiles = [];
for (const d of scanDirs) {
  if (!isDir(d)) continue;
  const found = [];
  walkMd(d, found);
  for (const f of found) if (!seen.has(f)) { seen.add(f); mdFiles.push(f); }
}
mdFiles.sort();

// Group by the directory we can ask git about: files under root go through root, extra
// dirs are asked separately since they may live in another repo (or none).
const fileGit = new Map(); // absPath -> {ageDays, ageSource}
const groups = new Map();
for (const f of mdFiles) {
  const base = f.startsWith(root + sep) ? root : (extraDirs.find((d) => f.startsWith(d + sep)) ?? dirname(f));
  if (!groups.has(base)) groups.set(base, []);
  groups.get(base).push(f);
}
for (const [base, files] of groups) {
  const gm = gitDates(base, files.map((f) => relative(base, f)));
  for (const f of files) fileGit.set(f, lastTouched(f, base, gm));
}

// Reference match strength: an exact relative-path match is proof; a bare filename match
// is a guess that can collide across directories (specs/foo.md vs docs/archive/foo.md),
// so it must never reach the high-confidence set that Phase 5 offers by default.
function refMatch(file, refSet) {
  const rel = relative(root, file);
  const base = basename(file);
  let weak = false;
  for (const r of refSet) {
    if (r === rel) return "path";
    if (basename(r) === base) weak = true;
  }
  return weak ? "basename" : null;
}

for (const file of mdFiles) {
  const kind = kindOf(file);
  const slug = baseSlug(file);
  const rel = relative(root, file);
  const doneMatch = refMatch(file, doneRefs);
  const liveMatch = refMatch(file, liveRefs);
  const touched = fileGit.get(file) ?? { ageDays: ageDaysFromMtime(file), ageSource: "mtime" };
  // For a file artifact the two ages are the same thing — it has no recorded creation date.
  const rec = {
    kind, path: file, slug, status: null, created: null,
    ageDays: touched.ageDays, touchedDays: touched.ageDays, ageSource: touched.ageSource,
  };

  // Protection wins on either match strength — a false protect costs nothing, a false
  // delete is unrecoverable.
  if (liveMatch) {
    active.push({ ...rec, reason: "referenced by an active (draft/in_progress) triage" });
    continue;
  }
  if (doneMatch === "path") {
    candidates.push({ ...rec, reason: "referenced by a complete/abandoned triage — work is over", confidence: "high", flagOnly: false, referencedBy: rel });
    continue;
  }
  if (doneMatch === "basename") {
    candidates.push({ ...rec, reason: "filename matches a reference in a complete/abandoned triage, but not its path — verify before deleting", confidence: "medium", flagOnly: false, referencedBy: rel });
    continue;
  }
  // Unreferenced. Orphan-staleness applies only to work artifacts (specs/plans), never plain docs.
  if (kind === "doc") {
    active.push({ ...rec, reason: "doc with no triage reference — treated as permanent, not a candidate" });
    continue;
  }
  if (touched.ageDays > orphanAge) {
    candidates.push({ ...rec, reason: `orphaned ${kind} — no triage reference, ${touched.ageDays}d old (${touched.ageSource})`, confidence: "low", flagOnly: true, referencedBy: null });
  } else {
    active.push({ ...rec, reason: `unreferenced ${kind} but recent (${touched.ageDays}d) — left alone` });
  }
}

// ---- output --------------------------------------------------------------

const byKind = {};
const byConfidence = { high: 0, medium: 0, low: 0 };
for (const c of candidates) {
  byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  byConfidence[c.confidence] = (byConfidence[c.confidence] || 0) + 1;
}

const report = {
  now,
  root,
  triageDir: triageDir || null,
  thresholds: { draftAge, inProgressAge, orphanAge },
  summary: {
    candidates: candidates.length,
    autoDeletable: candidates.filter((c) => !c.flagOnly).length,
    flagOnly: candidates.filter((c) => c.flagOnly).length,
    needsRepair: candidates.filter((c) => c.needsRepair).length + active.filter((a) => a.needsRepair).length,
    byConfidence,
    byKind,
  },
  candidates,
  active,
};

process.stdout.write(`${JSON.stringify(report)}\n`);
