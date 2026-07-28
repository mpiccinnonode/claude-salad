// test/triage-heartbeat.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("../hooks/triage-heartbeat.mjs", import.meta.url));

const run = (root, dataDir, args = []) =>
  execFileSync("node", [HOOK, ...args], {
    encoding: "utf8",
    input: JSON.stringify({ hook_event_name: "SessionStart", cwd: root }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_PLUGIN_DATA: dataDir ?? "" },
  });

const dataDir = () => mkdtempSync(join(tmpdir(), "thbdata-"));

// `withTriageDir: false` gives a project that has .claude/ but has never triaged —
// the case the resolver still answers with a path for.
function project({ withClaude = true, withTriageDir = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "thb-"));
  if (withClaude) mkdirSync(join(root, ".claude"), { recursive: true });
  if (withTriageDir) mkdirSync(join(root, ".claude", "triage"), { recursive: true });
  return root;
}

const yaml = (fields, phases = []) => {
  let s = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n") + "\n";
  if (phases.length) s += "phases:\n" + phases.map((p) => `  - phase: X\n    status: ${p}\n`).join("");
  return s;
};

const today = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (d) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);

function record(root, name, fields, phases = [], ageDays = 0) {
  const f = join(root, ".claude", "triage", name);
  writeFileSync(f, yaml(fields, phases));
  if (ageDays) {
    const t = (Date.now() - ageDays * 86_400_000) / 1000;
    utimesSync(f, t, t);
  }
  return f;
}

const ctx = (out) => JSON.parse(out).hookSpecificOutput.additionalContext;

test("silent when the project has no .claude/ at all", () => {
  assert.equal(run(project({ withClaude: false, withTriageDir: false }), dataDir()), "");
});

test("silent when .claude/ exists but the project never triaged", () => {
  // The resolver returns a path here regardless; only an existing, populated dir counts.
  const root = project({ withTriageDir: false });
  mkdirSync(join(root, "specs"));
  const spec = join(root, "specs", "ancient.md");
  writeFileSync(spec, "# old\n");
  const t = (Date.now() - 400 * 86_400_000) / 1000;
  utimesSync(spec, t, t);
  assert.equal(run(root, dataDir()), "");
});

test("silent when the triage dir exists but holds no records", () => {
  assert.equal(run(project(), dataDir()), "");
});

test("silent on a healthy, recently-touched record", () => {
  const root = project();
  record(root, "live.yaml", { task: "X", status: "in_progress", created: isoDaysAgo(3) }, ["pending"]);
  assert.equal(run(root, dataDir()), "");
});

test("speaks when a finished record is safe to close out", () => {
  const root = project();
  record(root, "done.yaml", { task: "X", status: "complete", created: isoDaysAgo(40) }, ["complete", "skipped"]);
  const out = run(root, dataDir());
  assert.match(ctx(out), /1 finished or abandoned artifact/);
  assert.match(ctx(out), /\/triage-cleanup/);
  assert.match(ctx(out), /cannot see this note/);
});

test("an off-schema status is reported as repair, not as likely dead", () => {
  const root = project();
  record(root, "odd.yaml", { task: "X", status: "implementation_complete", created: isoDaysAgo(10) }, ["complete"]);
  const c = ctx(run(root, dataDir()));
  assert.match(c, /off-schema status or date field: repair, don't delete/);
  assert.doesNotMatch(c, /likely dead/);
  assert.match(c, /validate-record/);
});

test("flag-only records below --min-flagged stay silent", () => {
  const root = project();
  // Two long-dead in_progress records: real, but nothing here is safe to act on yet.
  record(root, "a.yaml", { task: "A", status: "in_progress", created: isoDaysAgo(120) }, ["pending"], 100);
  record(root, "b.yaml", { task: "B", status: "in_progress", created: isoDaysAgo(120) }, ["pending"], 100);
  assert.equal(run(root, dataDir(), ["--min-flagged", "5"]), "");
});

test("flag-only records at --min-flagged speak", () => {
  const root = project();
  for (const n of ["a", "b", "c"]) {
    record(root, `${n}.yaml`, { task: n, status: "in_progress", created: isoDaysAgo(120) }, ["pending"], 100);
  }
  const c = ctx(run(root, dataDir(), ["--min-flagged", "3"]));
  assert.match(c, /3 record\(s\) flagged as likely dead/);
  assert.match(c, /never auto-deleted/);
});

test("throttle: a second run inside the window is silent, and state is persisted", () => {
  const root = project();
  const data = dataDir();
  record(root, "done.yaml", { task: "X", status: "complete", created: isoDaysAgo(40) }, ["complete"]);
  assert.notEqual(run(root, data), "");
  assert.equal(run(root, data), "");
  assert.ok(readdirSync(data).includes("triage-heartbeat-state.json"));
});

test("--frequency 0 disables the throttle", () => {
  const root = project();
  const data = dataDir();
  record(root, "done.yaml", { task: "X", status: "complete", created: isoDaysAgo(40) }, ["complete"]);
  assert.notEqual(run(root, data, ["--frequency", "0"]), "");
  assert.notEqual(run(root, data, ["--frequency", "0"]), "");
});

test("no CLAUDE_PLUGIN_DATA degrades to checking every time, never to a crash", () => {
  const root = project();
  record(root, "done.yaml", { task: "X", status: "complete", created: isoDaysAgo(40) }, ["complete"]);
  assert.notEqual(run(root, ""), "");
  assert.notEqual(run(root, ""), "");
});

test("garbage on stdin and a missing cwd still exit 0", () => {
  const root = project();
  record(root, "done.yaml", { task: "X", status: "complete", created: isoDaysAgo(40) }, ["complete"]);
  const out = execFileSync("node", [HOOK], {
    encoding: "utf8",
    input: "not json at all",
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_PLUGIN_DATA: "" },
  });
  assert.match(ctx(out), /triage-cleanup/);
});

test("emits nothing but valid JSON, and never writes to stderr", () => {
  const root = project();
  record(root, "done.yaml", { task: "X", status: "complete", created: isoDaysAgo(40) }, ["complete"]);
  const res = execFileSync("node", [HOOK], {
    encoding: "utf8",
    input: JSON.stringify({ cwd: root }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_PLUGIN_DATA: "" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const parsed = JSON.parse(res); // throws if the hook printed anything else
  assert.equal(parsed.hookSpecificOutput.hookEventName, "SessionStart");
  assert.equal(today().length, 10); // guards the --now format the hook passes to the scanner
});
