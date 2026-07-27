import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("../hooks/checklist-heartbeat.mjs", import.meta.url));

const run = (root, dataDir, args = []) =>
  execFileSync("node", [HOOK, ...args], {
    encoding: "utf8",
    input: JSON.stringify({ hook_event_name: "SessionStart", cwd: root }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_PLUGIN_DATA: dataDir ?? "" },
  });

const project = (yaml) => {
  const root = mkdtempSync(join(tmpdir(), "hb-"));
  if (yaml !== null) {
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude", "review-checklist.yaml"), yaml);
  }
  return root;
};

const dataDir = () => mkdtempSync(join(tmpdir(), "hbdata-"));

// A staged check added long ago with no hits is prunable; the same check added
// today is not. Dates are literal so the test does not drift.
const stale = `version: 1
checks:
  - id: never-fired
    severity: minor
    rule: "placeholder"
    applies_to: "**/*.ts"
    added_by: seed
    added_date: 2020-01-01
    status: staged
    hit_count: 0
    miss_streak: 0
`;

const fresh = (today) => `version: 1
checks:
  - id: brand-new
    severity: minor
    rule: "placeholder"
    applies_to: "**/*.ts"
    added_by: seed
    added_date: ${today}
    status: staged
    hit_count: 0
    miss_streak: 0
`;

test("silent when the project has no checklist", () => {
  assert.equal(run(project(null), dataDir()), "");
});

test("silent when nothing is due", () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(run(project(fresh(today)), dataDir()), "");
});

test("reports pending changes as additionalContext for Claude", () => {
  const out = run(project(stale), dataDir());
  const payload = JSON.parse(out);
  assert.equal(payload.hookSpecificOutput.hookEventName, "SessionStart");
  const ctx = payload.hookSpecificOutput.additionalContext;
  assert.match(ctx, /prune: 1/);
  assert.match(ctx, /Tell the user/);
  assert.match(ctx, /\/checklist-lifecycle/);
});

test("--frequency suppresses a second run inside the window", () => {
  const root = project(stale);
  const data = dataDir();
  assert.notEqual(run(root, data), "", "first run should report");
  assert.equal(run(root, data), "", "second run inside the window should stay silent");
});

test("--frequency 0 disables throttling", () => {
  const root = project(stale);
  const data = dataDir();
  assert.notEqual(run(root, data, ["--frequency", "0"]), "");
  assert.notEqual(run(root, data, ["--frequency", "0"]), "");
});

test("no CLAUDE_PLUGIN_DATA degrades to unthrottled, never to a crash", () => {
  const root = project(stale);
  assert.notEqual(run(root, null), "");
  assert.notEqual(run(root, null), "");
});

test("a corrupt checklist stays silent and exits 0", () => {
  const root = project("this: is: not: valid: yaml:\n  - [\n");
  assert.equal(run(root, dataDir()), "");
});

test("state file is written and keyed by checklist path", () => {
  const root = project(stale);
  const data = dataDir();
  run(root, data);
  const state = JSON.parse(readFileSync(join(data, "heartbeat-state.json"), "utf8"));
  const key = join(root, ".claude", "review-checklist.yaml");
  assert.ok(existsSync(join(data, "heartbeat-state.json")));
  assert.equal(typeof state[key], "number");
});
