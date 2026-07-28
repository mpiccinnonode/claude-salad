// test/scan-stale.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/triage-cleanup/scripts/scan-stale.mjs", import.meta.url));
const NOW = "2026-06-24";
const run = (args) => JSON.parse(execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" }));
const runFail = (args) => {
  try { execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); return null; }
  catch (e) { return { status: e.status, stderr: e.stderr }; }
};

// Set a file's mtime to `daysAgo` before NOW so age math is deterministic.
function age(path, daysAgo) {
  const t = (Date.parse(`${NOW}T00:00:00Z`) - daysAgo * 86_400_000) / 1000;
  utimesSync(path, t, t);
}

function project() {
  const root = mkdtempSync(join(tmpdir(), "tc-root-"));
  const triageDir = join(root, ".claude", "triage");
  mkdirSync(triageDir, { recursive: true });
  return { root, triageDir };
}

const yaml = (fields, phases = []) => {
  let s = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n") + "\n";
  if (phases.length) s += "phases:\n" + phases.map((p) => `  - phase: X\n    status: ${p}\n`).join("");
  return s;
};

function byPath(report) {
  const m = {};
  for (const c of report.candidates) m[c.path] = c;
  return m;
}

test("abandoned + complete(all done) are high-confidence candidates; active in_progress is not", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "gave-up.yaml"), yaml({ task: "X", status: "abandoned", created: "2026-06-01" }));
  writeFileSync(join(triageDir, "done.yaml"), yaml({ task: "Y", status: "complete", created: "2026-06-01" }, ["complete", "skipped"]));
  writeFileSync(join(triageDir, "working.yaml"), yaml({ task: "Z", status: "in_progress", created: "2026-06-20" }, ["pending"]));

  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  const c = byPath(r);
  assert.equal(c[join(triageDir, "gave-up.yaml")].confidence, "high");
  assert.equal(c[join(triageDir, "done.yaml")].confidence, "high");
  assert.equal(c[join(triageDir, "working.yaml")], undefined); // active, not a candidate
  assert.equal(r.summary.autoDeletable, 2);
});

test("phase-status synonyms still count as finished", () => {
  const { root, triageDir } = project();
  // `completed`/`done` are what real records actually contain; a strict reader graded
  // these finished records as unfinished and downgraded them to medium.
  writeFileSync(join(triageDir, "syn.yaml"),
    yaml({ task: "X", status: "complete", created: "2026-06-01" }, ["completed", "done", "deferred"]));
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(r.candidates[0].confidence, "high");
  assert.match(r.candidates[0].reason, /all phases finished/);
});

test("an unrecognised phase status keeps a record out of the high-confidence set", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "odd-phase.yaml"),
    yaml({ task: "X", status: "complete", created: "2026-06-01" }, ["complete", "code-complete"]));
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(r.candidates[0].confidence, "medium");
});

test("complete but phases unfinished is medium, not high", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "half.yaml"), yaml({ task: "X", status: "complete", created: "2026-06-01" }, ["complete", "pending"]));
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(byPath(r).candidates?.length ?? r.candidates.length, 1);
  assert.equal(r.candidates[0].confidence, "medium");
});

test("stale draft (older than draft-age) is a candidate; fresh draft is not", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "old.draft.yaml"), yaml({ task: "X", status: "draft", created: "2026-05-01" })); // 54d
  writeFileSync(join(triageDir, "new.draft.yaml"), yaml({ task: "Y", status: "draft", created: "2026-06-20" })); // 4d
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  const slugs = r.candidates.map((c) => c.slug);
  assert.deepEqual(slugs, ["old"]);
  assert.equal(r.candidates[0].confidence, "medium");
});

test("stale in_progress is flag-only/low; never counted as autoDeletable", () => {
  const { root, triageDir } = project();
  const f = join(triageDir, "stuck.yaml");
  writeFileSync(f, yaml({ task: "X", status: "in_progress", created: "2026-03-01" }, ["pending"]));
  age(f, 115); // untouched for 115d — staleness is measured from last touch, not creation
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].confidence, "low");
  assert.equal(r.candidates[0].flagOnly, true);
  assert.equal(r.summary.autoDeletable, 0);
});

test("long-running but recently touched in_progress is NOT stale", () => {
  const { root, triageDir } = project();
  const f = join(triageDir, "active-epic.yaml");
  writeFileSync(f, yaml({ task: "Long epic", status: "in_progress", created: "2026-01-01" }, ["pending"])); // 174d old
  age(f, 2); // but worked on two days ago
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(r.candidates.length, 0);
  assert.ok(r.active.some((a) => a.slug === "active-epic"));
});

test("created_at (wrong field name) is still ageable, not silently immortal", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "misspelled.draft.yaml"),
    yaml({ task: "X", status: "draft", created_at: "2026-05-01" })); // 54d
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].ageDays, 54);
  assert.equal(r.candidates[0].confidence, "medium");
});

test("needsRepair agrees with validate-record: created_at counts, tolerant read notwithstanding", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "misspelled.yaml"),
    yaml({ task: "X", status: "in_progress", created_at: "2026-06-20" }, ["pending"]));
  writeFileSync(join(triageDir, "clean.yaml"),
    yaml({ task: "Y", status: "in_progress", created: "2026-06-20" }, ["pending"]));
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  const all = [...r.candidates, ...r.active];
  assert.equal(all.find((x) => x.slug === "misspelled").needsRepair, true);
  assert.equal(all.find((x) => x.slug === "clean").needsRepair, false);
  assert.equal(r.summary.needsRepair, 1);
});

test("off-schema status is flagged rather than treated as active forever", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "odd.yaml"),
    yaml({ task: "X", status: "implementation_complete", created: "2026-06-01" }, ["complete"]));
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].flagOnly, true);
  assert.match(r.candidates[0].reason, /off-schema status/);
  assert.equal(r.summary.autoDeletable, 0);
});

test("record with no status field is flagged, not counted as active", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "headless.yaml"), yaml({ task: "X", created: "2026-06-01" }));
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].flagOnly, true);
  assert.match(r.candidates[0].reason, /no status field/);
});

test("a spec of an off-schema-status record stays protected", () => {
  const { root, triageDir } = project();
  mkdirSync(join(root, "specs"));
  const spec = join(root, "specs", "guarded.md");
  writeFileSync(spec, "# guarded\n");
  age(spec, 300);
  writeFileSync(join(triageDir, "odd.yaml"),
    yaml({ task: "X", status: "implementation_complete", created: "2026-06-01" }) + 'notes:\n  - "specs/guarded.md"\n');
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(byPath(r)[spec], undefined); // not a delete candidate
  assert.ok(r.active.some((a) => a.path === spec));
});

test("basename-only reference match is medium, never high", () => {
  const { root, triageDir } = project();
  mkdirSync(join(root, "docs", "archive"), { recursive: true });
  const twin = join(root, "docs", "archive", "sso.md"); // same filename, different path
  writeFileSync(twin, "# unrelated archive copy\n");
  age(twin, 100);
  writeFileSync(join(triageDir, "sso.yaml"),
    yaml({ task: "SSO", status: "complete", created: "2026-06-01" }, ["complete"]) + 'notes:\n  - "specs/sso.md"\n');
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  const c = byPath(r)[twin];
  assert.equal(c.confidence, "medium");
  assert.match(c.reason, /not its path/);
});

test("git commit date beats mtime for artifact age", () => {
  const { root } = project();
  const git = (...args) => execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: "2026-05-01T12:00:00Z", GIT_COMMITTER_DATE: "2026-05-01T12:00:00Z",
      GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@e", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@e",
    },
  });
  git("init", "-q");
  mkdirSync(join(root, "specs"));
  const spec = join(root, "specs", "committed.md");
  writeFileSync(spec, "# committed\n");
  git("add", "specs/committed.md");
  git("commit", "-qm", "add spec");
  age(spec, 0); // checkout-style fresh mtime, which would hide a 54-day-old artifact

  const r = run(["--root", root, "--now", NOW]);
  const c = byPath(r)[spec];
  assert.ok(c, "committed spec should be an orphan candidate on its real age");
  assert.equal(c.ageSource, "git");
  assert.equal(c.ageDays, 54); // 2026-05-01 -> 2026-06-24
});

test("spec referenced by a complete triage is a high-confidence candidate", () => {
  const { root, triageDir } = project();
  mkdirSync(join(root, "specs"));
  const spec = join(root, "specs", "sso.md");
  writeFileSync(spec, "# SSO\n");
  age(spec, 5);
  writeFileSync(join(triageDir, "sso.yaml"),
    yaml({ task: "SSO", status: "complete", created: "2026-06-01" }, ["complete"]) + 'notes:\n  - "specs/sso.md"\n');
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  const c = byPath(r)[spec];
  assert.equal(c.kind, "spec");
  assert.equal(c.confidence, "high");
  assert.match(c.reason, /complete\/abandoned triage/);
});

test("spec referenced by an active triage is protected (not a candidate)", () => {
  const { root, triageDir } = project();
  mkdirSync(join(root, "specs"));
  const spec = join(root, "specs", "live.md");
  writeFileSync(spec, "# live\n");
  age(spec, 200);
  writeFileSync(join(triageDir, "live.yaml"),
    yaml({ task: "Live", status: "in_progress", created: "2026-06-20" }, ["pending"]) + 'notes:\n  - "specs/live.md"\n');
  const r = run(["--root", root, "--now", NOW, "--triage-dir", triageDir]);
  assert.equal(byPath(r)[spec], undefined);
  assert.ok(r.active.some((a) => a.path === spec));
});

test("orphaned old spec is low/flag-only; recent orphan is left alone", () => {
  const { root } = project();
  mkdirSync(join(root, "specs"));
  const old = join(root, "specs", "ancient.md");
  const fresh = join(root, "specs", "recent.md");
  writeFileSync(old, "# old\n"); age(old, 90);
  writeFileSync(fresh, "# new\n"); age(fresh, 3);
  const r = run(["--root", root, "--now", NOW]);
  const c = byPath(r);
  assert.equal(c[old].confidence, "low");
  assert.equal(c[old].flagOnly, true);
  assert.equal(c[fresh], undefined);
});

test("plain docs/ file with no triage link is never a candidate", () => {
  const { root } = project();
  mkdirSync(join(root, "docs"));
  const readme = join(root, "docs", "guide.md");
  writeFileSync(readme, "# guide\n"); age(readme, 365);
  const r = run(["--root", root, "--now", NOW]);
  assert.equal(byPath(r)[readme], undefined);
  assert.ok(r.active.some((a) => a.path === readme && /permanent/.test(a.reason)));
});

test("docs/**/plans/ file is treated as a plan (orphan-eligible)", () => {
  const { root } = project();
  mkdirSync(join(root, "docs", "superpowers", "plans"), { recursive: true });
  const plan = join(root, "docs", "superpowers", "plans", "rollout.md");
  writeFileSync(plan, "# plan\n"); age(plan, 90);
  const r = run(["--root", root, "--now", NOW]);
  const c = byPath(r)[plan];
  assert.equal(c.kind, "plan");
  assert.equal(c.flagOnly, true);
});

test("--dir adds a user-named artifact directory", () => {
  const { root } = project();
  const extra = mkdtempSync(join(tmpdir(), "tc-extra-"));
  const f = join(extra, "design.md");
  writeFileSync(f, "# design\n"); age(f, 90);
  // extra dir isn't specs/plans, so it classifies as doc -> not orphan-eligible; still discovered as active.
  const r = run(["--root", root, "--now", NOW, "--dir", extra]);
  assert.ok([...r.candidates, ...r.active].some((x) => x.path === f));
});

test("no triage dir -> empty triage candidates, still scans specs", () => {
  const { root } = project();
  mkdirSync(join(root, "specs"));
  const spec = join(root, "specs", "x.md");
  writeFileSync(spec, "# x\n"); age(spec, 90);
  const r = run(["--root", root, "--now", NOW]); // no --triage-dir
  assert.equal(r.triageDir, null);
  assert.ok(byPath(r)[spec]);
});

test("custom --draft-age threshold is honored", () => {
  const { root, triageDir } = project();
  writeFileSync(join(triageDir, "d.draft.yaml"), yaml({ task: "X", status: "draft", created: "2026-06-10" })); // 14d
  assert.equal(run(["--root", root, "--now", NOW, "--triage-dir", triageDir]).candidates.length, 0); // default 30
  assert.equal(run(["--root", root, "--now", NOW, "--triage-dir", triageDir, "--draft-age", "7"]).candidates.length, 1);
});

test("empty --triage-dir is treated as 'no triage dir' (SKILL.md passes it unconditionally)", () => {
  const { root } = project();
  mkdirSync(join(root, "specs"));
  const spec = join(root, "specs", "x.md");
  writeFileSync(spec, "# x\n"); age(spec, 90);
  const r = run(["--root", root, "--now", NOW, "--triage-dir", ""]);
  assert.equal(r.triageDir, null);   // empty string -> null, no crash
  assert.ok(byPath(r)[spec]);        // spec scan still runs
});

test("bad argv exits 2", () => {
  assert.equal(runFail(["--now", NOW]).status, 2);                       // missing --root
  assert.equal(runFail(["--root", "rel", "--now", NOW]).status, 2);      // relative root
  assert.equal(runFail(["--root", "/abs"]).status, 2);                   // missing --now
  assert.equal(runFail(["--root", "/abs", "--now", "nope"]).status, 2);  // bad date
});
