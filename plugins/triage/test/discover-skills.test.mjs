// test/discover-skills.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/triage/scripts/discover-skills.mjs", import.meta.url));
const run = (root, home) => JSON.parse(execFileSync("node", [SCRIPT, root, home], { encoding: "utf8" }));

function mkSkill(dir, name, desc) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${desc}\n---\n# ${name}\n`);
}

test("still discovers skills with yq absent (inline parser)", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  mkSkill(join(root, ".claude", "skills", "foo"), "foo", "does foo things");
  const out = run(root, home);
  const foo = out.find((r) => r.name === "foo");
  assert.ok(foo, "foo skill discovered");
  assert.equal(foo.kind, "skill");
  assert.equal(foo.scope, "project-local");
});

test("discovers MCP servers from project .mcp.json (wrapped form)", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  writeFileSync(join(root, ".mcp.json"),
    JSON.stringify({ mcpServers: { serena: { command: "serena", description: "semantic code tools" } } }));
  const out = run(root, home);
  const m = out.find((r) => r.kind === "mcp-server" && r.name === "serena");
  assert.ok(m, "serena MCP discovered");
  assert.equal(m.scope, "project-local");
  assert.equal(m.description, "semantic code tools");
});

test("discovers MCP servers from ~/.claude.json per-project entry", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  writeFileSync(join(home, ".claude.json"),
    JSON.stringify({ mcpServers: {}, projects: { [root]: { mcpServers: { angular: { command: "ng-mcp" } } } } }));
  const out = run(root, home);
  const m = out.find((r) => r.kind === "mcp-server" && r.name === "angular");
  assert.ok(m, "angular MCP discovered from per-project entry");
  assert.equal(m.scope, "user-global");
  assert.equal(m.description, "");           // no description in config -> empty string
});

test("discovers MCP servers from plugin .mcp.json (bare map form)", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  const pdir = join(home, ".claude", "plugins", "cache", "acme", "code-review-graph", "1.0.0");
  mkdirSync(pdir, { recursive: true });
  writeFileSync(join(pdir, ".mcp.json"),
    JSON.stringify({ "code-review-graph": { command: "crg", description: "graph-based code review" } }));
  const out = run(root, home);
  const m = out.find((r) => r.kind === "mcp-server" && r.name === "code-review-graph");
  assert.ok(m, "plugin MCP server discovered (bare map)");
  assert.equal(m.scope, "plugin-installed");
});

test("zero MCP config -> no mcp-server records, no error", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  const out = run(root, home);
  assert.equal(out.filter((r) => r.kind === "mcp-server").length, 0);
});
