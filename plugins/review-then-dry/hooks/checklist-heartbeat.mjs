#!/usr/bin/env node
// Serves: SessionStart hook — independent heartbeat for the review checklist.
//
// The lifecycle thresholds in review-checklist.yaml are measured in days, but the
// only thing that ever evaluated them was Phase 0 of /lifecycled-code-review — an
// event-driven trigger. A repo nobody reviews for three months accumulates stale
// checks silently. This hook supplies the missing clock.
//
// It DETECTS ONLY. It never edits the checklist; /checklist-lifecycle does that,
// with user approval. On a finding it returns additionalContext so Claude learns
// about it and can tell the user. Never exit 2 here: on SessionStart that prints
// stderr straight to the user and bypasses Claude, which is the opposite chain.
//
// Usage: checklist-heartbeat.mjs [--frequency <hours>]   (default 24)
//
// Reads the hook event JSON on stdin. Always exits 0 — a session must never
// break because a maintenance check had a bad day.
//
// State: ${CLAUDE_PLUGIN_DATA}/heartbeat-state.json, keyed by checklist path.
// Unset or unwritable data dir degrades to "check every time", never to a crash.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIFECYCLE = join(HERE, "..", "skills", "lifecycled-code-review", "scripts", "lifecycle-pass.mjs");

const quit = () => process.exit(0);

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function stdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

// Throttle state. Every failure path returns a no-op pair so a broken or absent
// data dir means "check anyway" rather than "explode".
function stateStore() {
  const dir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dir) return { read: () => ({}), write: () => {} };
  const file = join(dir, "heartbeat-state.json");
  return {
    read: () => {
      try { return JSON.parse(readFileSync(file, "utf8")); } catch { return {}; }
    },
    write: (obj) => {
      try { mkdirSync(dir, { recursive: true }); writeFileSync(file, JSON.stringify(obj)); } catch { /* best effort */ }
    },
  };
}

const main = async () => {
  const frequencyHours = arg("--frequency", 24);

  let event = {};
  try { event = JSON.parse(await stdin()); } catch { /* fall through to cwd */ }
  const root = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();

  const checklist = join(root, ".claude", "review-checklist.yaml");
  if (!existsSync(checklist)) quit();          // project doesn't use the checklist
  if (!existsSync(LIFECYCLE)) quit();          // plugin layout changed — stay quiet

  const store = stateStore();
  const state = store.read();
  const now = Date.now();
  const last = state[checklist];
  if (typeof last === "number" && now - last < frequencyHours * 3600_000) quit();

  let report;
  try {
    const today = new Date(now).toISOString().slice(0, 10);
    report = JSON.parse(execFileSync("node", [LIFECYCLE, checklist, today], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }));
  } catch {
    quit();                                     // malformed checklist is Phase 0's problem, not ours
  }

  state[checklist] = now;
  store.write(state);

  const counts = [
    ["prune", report.prune?.length || 0, "staged checks past 45 days with no hits"],
    ["freeze", report.freeze?.length || 0, "active checks past their miss_streak threshold"],
    ["expire", report.expire?.length || 0, "suppressions not relevant in 90+ days"],
    ["glob_warnings", report.glob_warnings?.length || 0, "checks whose glob may not match anything"],
  ].filter(([, n]) => n > 0);

  if (!counts.length) quit();                   // healthy — say nothing

  const total = counts.reduce((s, [, n]) => s + n, 0);
  const lines = counts.map(([k, n, why]) => `  - ${k}: ${n} (${why})`).join("\n");

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `\`.claude/review-checklist.yaml\` has ${total} pending lifecycle change(s):\n${lines}\n\n` +
        `Tell the user this, in your first reply — they cannot see this note. ` +
        `Suggest \`/checklist-lifecycle\` to review and apply the changes. ` +
        `Do not edit the checklist yourself: that skill owns the approval flow and the safe write.`,
    },
  }));
  quit();
};

main().catch(quit);
