#!/usr/bin/env node
// Serves: SessionStart hook — independent heartbeat for the triage record directory.
//
// Staleness in `.claude/triage/` is measured in days, but the only thing that ever
// evaluated it was /triage-cleanup, which the user has to remember to run. The repos
// that need it most are the ones where triage stopped being used: measured on a real
// project, 4 dead in_progress records and 65 stale candidates sat unnoticed while the
// newest record had gone 81 days untouched. Nothing event-driven can catch that, because
// the event never comes again. This hook supplies the missing clock.
//
// It DETECTS ONLY. It never deletes and never edits a record — /triage-cleanup owns the
// report → confirm → delete flow, and repairing a malformed record is the user's call.
// On a finding it returns additionalContext so Claude can tell the user.
//
// Never exit 2 here: on SessionStart that prints stderr straight to the user and bypasses
// Claude, which is the opposite of what this is for. Always exits 0 — a session must never
// break because a maintenance check had a bad day.
//
// Usage: triage-heartbeat.mjs [--frequency <hours>] [--min-flagged <n>]
//   --frequency    throttle window, default 24
//   --min-flagged  how many flag-only triage records alone are worth mentioning, default 5
//
// Reads the hook event JSON on stdin.
// State: ${CLAUDE_PLUGIN_DATA}/triage-heartbeat-state.json, keyed by triage dir.
// Unset or unwritable data dir degrades to "check every time", never to a crash.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESOLVE = join(HERE, "..", "skills", "triage", "scripts", "resolve-triage-path.mjs");
const SCAN = join(HERE, "..", "skills", "triage-cleanup", "scripts", "scan-stale.mjs");

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
  const file = join(dir, "triage-heartbeat-state.json");
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
  const minFlagged = arg("--min-flagged", 5);

  let event = {};
  try { event = JSON.parse(await stdin()); } catch { /* fall through to cwd */ }
  const root = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();
  const home = process.env.HOME || process.env.USERPROFILE || "";

  if (!home) quit();
  if (!existsSync(RESOLVE) || !existsSync(SCAN)) quit();   // plugin layout changed — stay quiet

  let triageDir = "";
  try {
    triageDir = execFileSync("node", [RESOLVE, "--root", root, "--home", home, "--path-only"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    quit();
  }

  // The resolver answers "where records WOULD live", which is a path even in a project
  // that has a .claude/ dir and has never triaged anything. Only an existing dir holding
  // at least one record means this project actually uses triage — without this gate the
  // hook would report orphaned specs in every repo that has a .claude/ folder.
  if (!triageDir || !existsSync(triageDir)) quit();
  try {
    if (!readdirSync(triageDir).some((f) => f.endsWith(".yaml"))) quit();
  } catch {
    quit();
  }

  const store = stateStore();
  const state = store.read();
  const now = Date.now();
  const last = state[triageDir];
  if (typeof last === "number" && now - last < frequencyHours * 3600_000) quit();

  let report;
  try {
    const today = new Date(now).toISOString().slice(0, 10);
    report = JSON.parse(execFileSync("node", [SCAN, "--root", root, "--now", today, "--triage-dir", triageDir], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }));
  } catch {
    quit();                                     // a broken scan is /triage-cleanup's problem, not ours
  }

  state[triageDir] = now;
  store.write(state);

  const candidates = report.candidates ?? [];
  const autoDeletable = report.summary?.autoDeletable ?? 0;
  const needsRepair = candidates.filter((c) => c.needsRepair).length + (report.active ?? []).filter((a) => a.needsRepair).length;
  // Repair cases are counted separately, not as "likely dead" — a mislabelled record is
  // often live work, and telling the user it looks dead would push them the wrong way.
  const flaggedRecords = candidates.filter((c) => c.kind === "triage" && c.flagOnly && !c.needsRepair).length;

  // Speak only when there is something to act on. A directory whose every candidate is
  // flag-only is *not* actionable — offering to clean it would be a recurring nag with no
  // safe move behind it — unless the dead records have piled up past minFlagged.
  if (autoDeletable === 0 && needsRepair === 0 && flaggedRecords < minFlagged) quit();

  const lines = [];
  if (autoDeletable > 0) lines.push(`  - ${autoDeletable} finished or abandoned artifact(s) safe to close out`);
  if (flaggedRecords > 0) lines.push(`  - ${flaggedRecords} record(s) flagged as likely dead — needs your judgment, never auto-deleted`);
  if (needsRepair > 0) lines.push(`  - ${needsRepair} record(s) with an off-schema status or date field: repair, don't delete — they may be live work written wrong`);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `\`${triageDir}\` has accumulated stale triage artifacts:\n${lines.join("\n")}\n\n` +
        `Tell the user this, in your first reply — they cannot see this note. ` +
        `Suggest \`/triage-cleanup\` for the full report and the confirmation gate. ` +
        `Do not delete or edit anything yourself: that skill owns the approval flow, ` +
        `and malformed records are fixed with the triage plugin's validate-record.mjs, not by deletion.`,
    },
  }));
  quit();
};

main().catch(quit);
