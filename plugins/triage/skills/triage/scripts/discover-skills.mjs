#!/usr/bin/env node
// Serves: triage SKILL.md — Phase 1 Context & Config Discovery (§1.2.12)
//
// Walk six globs across three scopes (project-local, user-global,
// plugin-installed), extract `name` + `description` from each file's YAML
// frontmatter, and emit a JSON array on stdout. Skill body consumes the
// JSON to build Phase 4's candidate list — the model no longer globs or
// parses frontmatter itself.
//
// Usage: discover-skills.mjs <project-root> <home-dir>
//
// Both arguments must be absolute paths. `home-dir` is passed explicitly
// (rather than read from $HOME) to honour the contract's no-env rule
// (~/.claude/skills/_conventions/offload-scripts.md §Inputs).
//
// Exit 0 + JSON on stdout on success. Exit non-zero + one-line stderr
// diagnostic on: bad argv, unreadable file, missing or malformed
// frontmatter, or frontmatter missing required `name` / `description`.
//
// Missing directories (e.g. project has no .claude/) are NOT failures — the
// corresponding scope contributes zero records. Empty `_conventions/` and
// other workspace dirs lacking a SKILL.md are silently skipped.
//
// Dependencies: node >= 18. No external tools.
//
// Output shape (array; may be empty):
//   [
//     { "scope": "project-local" | "user-global" | "plugin-installed",
//       "kind":  "skill" | "agent" | "mcp-server",
//       "name":  "...",
//       "description": "...",
//       "path":  "..." }
//   ]
//
// Note on shape vs spec §1.2.12: spec example omits `kind`. Triage Phase 1
// builds a unified candidate list mixing skills and agents, and Phase 4
// maps both — emitting `kind` here prevents the skill body from re-deriving
// it from the path, which would defeat the offload.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

function die(msg, code = 1) {
  process.stderr.write(`discover-skills: ${msg}\n`);
  process.exit(code);
}

function requireAbsolute(p, label) {
  if (!isAbsolute(p)) die(`${label} must be an absolute path: ${p}`, 2);
}

function listSubdirs(parent) {
  if (!existsSync(parent)) return [];
  try {
    if (!statSync(parent).isDirectory()) return [];
    return readdirSync(parent, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(parent, e.name))
      .sort();
  } catch {
    return [];
  }
}

function listMdFiles(parent) {
  if (!existsSync(parent)) return [];
  try {
    if (!statSync(parent).isDirectory()) return [];
    return readdirSync(parent, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => join(parent, e.name))
      .sort();
  } catch {
    return [];
  }
}

function skillFilesIn(skillsDir) {
  return listSubdirs(skillsDir)
    .map((d) => join(d, "SKILL.md"))
    .filter((p) => existsSync(p) && statSync(p).isFile());
}

// Walk a plugin root tolerantly: any dir at depth 1-4 containing a `skills/`
// or `agents/` subdir is treated as a plugin version root. Handles both
// Claude Code's canonical `<cache>/<org>/<pkg>/<ver>/skills/` layout and
// flatter alternates (`<plugins>/<pkg>/skills/`, `<plugins>/<pkg>/<ver>/skills/`).
// Bounded depth prevents pathological traversal of unrelated trees.
function walkPluginRoots(root, maxDepth = 4) {
  const skillsDirs = [];
  const agentsDirs = [];
  function recurse(dir, depth) {
    if (depth > maxDepth) return;
    const skillsSub = join(dir, "skills");
    const agentsSub = join(dir, "agents");
    if (existsSync(skillsSub) && statSync(skillsSub).isDirectory()) skillsDirs.push(skillsSub);
    if (existsSync(agentsSub) && statSync(agentsSub).isDirectory()) agentsDirs.push(agentsSub);
    for (const sub of listSubdirs(dir)) {
      const base = sub.split("/").pop();
      if (base === "skills" || base === "agents") continue; // already handled above
      recurse(sub, depth + 1);
    }
  }
  recurse(root, 0);
  return { skillsDirs, agentsDirs };
}

function pluginSkillFiles(pluginsDir) {
  const { skillsDirs } = walkPluginRoots(pluginsDir);
  const out = [];
  for (const d of skillsDirs) out.push(...skillFilesIn(d));
  return out;
}

function pluginAgentFiles(pluginsDir) {
  const { agentsDirs } = walkPluginRoots(pluginsDir);
  const out = [];
  for (const d of agentsDirs) out.push(...listMdFiles(d));
  return out;
}

function extractFrontmatter(path) {
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch (e) {
    die(`cannot read ${path}: ${e.message}`);
  }
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) die(`no YAML frontmatter in ${path}`);
  return m[1];
}

// Minimal top-level scalar parser — extracts `name` and `description` only.
// Triage doesn't need nested frontmatter (allowed-tools arrays, etc.), and
// these two fields are always string scalars on any well-formed SKILL.md.
// Handles: plain, 'single-quoted', "double-quoted", and folded/block scalars
// that continue onto indented lines until the next top-level key or EOF.
function parseYamlFallback(block) {
  const lines = block.split(/\r?\n/);
  const result = {};
  let currentKey = null;
  let blockBuf = [];
  let blockMode = null; // '|' literal, '>' folded, or null (plain continuation)

  const flushBlock = () => {
    if (currentKey && blockBuf.length > 0) {
      const joined = blockMode === ">"
        ? blockBuf.join(" ").replace(/\s+/g, " ").trim()
        : blockBuf.join("\n").trimEnd();
      result[currentKey] = (result[currentKey] || "") + joined;
    }
    currentKey = null;
    blockBuf = [];
    blockMode = null;
  };

  const unquote = (s) => {
    s = s.trim();
    if (s.length >= 2) {
      const q = s[0];
      if ((q === '"' || q === "'") && s.endsWith(q)) {
        return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
      }
    }
    return s;
  };

  for (const raw of lines) {
    // Top-level key line: `key: value` or `key:` or `key: |` / `key: >`
    const m = raw.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (m && !raw.startsWith(" ") && !raw.startsWith("\t")) {
      flushBlock();
      const [, key, rest] = m;
      if (rest === "|" || rest === ">") {
        currentKey = key;
        blockMode = rest;
      } else if (rest === "") {
        // Either a mapping/list follows (ignored) or a continuation block.
        currentKey = key;
        blockMode = null;
      } else {
        result[key] = unquote(rest);
      }
    } else if (currentKey && /^\s+/.test(raw)) {
      blockBuf.push(raw.replace(/^\s+/, ""));
    } else if (raw.trim() === "") {
      if (blockMode === ">") blockBuf.push("");
    } else {
      flushBlock();
    }
  }
  flushBlock();
  return result;
}

// yq removed for cross-platform portability: triage only needs the top-level
// `name` and `description` scalars, which parseYamlFallback handles for plain,
// quoted, and block-scalar forms. No external YAML tool is required.
function parseYaml(block /*, path */) {
  return parseYamlFallback(block);
}

function recordFrom(path, scope, kind) {
  const fm = parseYaml(extractFrontmatter(path), path);
  if (!fm || typeof fm !== "object" || Array.isArray(fm)) {
    die(`frontmatter is not a mapping in ${path}`);
  }
  const { name, description } = fm;
  if (typeof name !== "string" || name.length === 0) {
    die(`missing or non-string \`name\` in frontmatter: ${path}`);
  }
  if (typeof description !== "string" || description.length === 0) {
    die(`missing or non-string \`description\` in frontmatter: ${path}`);
  }
  return { scope, kind, name, description, path };
}

function readJsonSafe(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
}

// Accepts either the wrapped form ({ mcpServers: { name: cfg } }) used by
// project .mcp.json and ~/.claude.json, or the bare map ({ name: cfg }) used
// by plugin .mcp.json files. Returns the name->config object, or {}.
function serverMapOf(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  if (parsed.mcpServers && typeof parsed.mcpServers === "object" && !Array.isArray(parsed.mcpServers)) {
    return parsed.mcpServers;
  }
  return parsed;
}

function mcpRecordsFrom(parsed, scope, path) {
  const out = [];
  for (const [name, cfg] of Object.entries(serverMapOf(parsed))) {
    if (!cfg || typeof cfg !== "object") continue;
    const description = typeof cfg.description === "string" ? cfg.description : "";
    out.push({ scope, kind: "mcp-server", name, description, path });
  }
  return out;
}

// Find plugin-shipped .mcp.json files within the plugins dir (bounded depth).
function findPluginMcpFiles(root, maxDepth = 6) {
  const found = [];
  if (!existsSync(root)) return found;
  (function recurse(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isFile() && e.name === ".mcp.json") found.push(full);
      else if (e.isDirectory()) recurse(full, depth + 1);
    }
  })(root, 0);
  return found;
}

function discoverMcp(projectRoot, homeDir) {
  const out = [];
  // 1. Project-level .mcp.json (wrapped form).
  const projMcp = join(projectRoot, ".mcp.json");
  if (existsSync(projMcp)) out.push(...mcpRecordsFrom(readJsonSafe(projMcp), "project-local", projMcp));
  // 2. User-level ~/.claude.json: global + this project's per-project entry.
  const userCfg = join(homeDir, ".claude.json");
  if (existsSync(userCfg)) {
    const j = readJsonSafe(userCfg);
    if (j) {
      if (j.mcpServers) out.push(...mcpRecordsFrom({ mcpServers: j.mcpServers }, "user-global", userCfg));
      const proj = j.projects && j.projects[projectRoot];
      if (proj && proj.mcpServers) out.push(...mcpRecordsFrom({ mcpServers: proj.mcpServers }, "user-global", userCfg));
    }
  }
  // 3. Plugin-shipped .mcp.json (bare map form).
  for (const f of findPluginMcpFiles(join(homeDir, ".claude", "plugins"))) {
    out.push(...mcpRecordsFrom(readJsonSafe(f), "plugin-installed", f));
  }
  // Dedupe by scope+name (a server can legitimately appear in more than one source).
  const seen = new Set();
  return out.filter((r) => {
    const k = `${r.scope}::${r.name}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

function main() {
  const [projectRoot, homeDir] = process.argv.slice(2);
  if (!projectRoot || !homeDir) {
    die("usage: discover-skills.mjs <project-root> <home-dir>", 2);
  }
  requireAbsolute(projectRoot, "project-root");
  requireAbsolute(homeDir, "home-dir");

  const out = [];

  for (const p of skillFilesIn(join(projectRoot, ".claude", "skills"))) {
    out.push(recordFrom(p, "project-local", "skill"));
  }
  for (const p of listMdFiles(join(projectRoot, ".claude", "agents"))) {
    out.push(recordFrom(p, "project-local", "agent"));
  }

  for (const p of skillFilesIn(join(homeDir, ".claude", "skills"))) {
    out.push(recordFrom(p, "user-global", "skill"));
  }
  for (const p of listMdFiles(join(homeDir, ".claude", "agents"))) {
    out.push(recordFrom(p, "user-global", "agent"));
  }

  // Plugin root is `<home>/.claude/plugins/`, not just `/cache/`. The
  // tolerant walker finds any `skills/` or `agents/` subdir within depth 4,
  // covering the canonical `cache/<org>/<pkg>/<ver>/` layout plus any
  // flatter alternates (e.g. `installed/<pkg>/`, user-symlinked plugins).
  const pluginsDir = join(homeDir, ".claude", "plugins");
  const seen = new Set();
  const uniq = (p) => (seen.has(p) ? false : (seen.add(p), true));
  for (const p of pluginSkillFiles(pluginsDir)) {
    if (uniq(p)) out.push(recordFrom(p, "plugin-installed", "skill"));
  }
  for (const p of pluginAgentFiles(pluginsDir)) {
    if (uniq(p)) out.push(recordFrom(p, "plugin-installed", "agent"));
  }

  out.push(...discoverMcp(projectRoot, homeDir));

  process.stdout.write(JSON.stringify(out) + "\n");
}

main();
