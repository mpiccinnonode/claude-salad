// test/discover-skills.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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

test("plugin file without frontmatter is skipped with a warning, exit 0", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  const pdir = join(home, ".claude", "plugins", "cache", "acme", "pkg", "1.0.0");
  mkSkill(join(pdir, "skills", "good"), "good", "a valid plugin skill");
  mkdirSync(join(pdir, "agents"), { recursive: true });
  writeFileSync(join(pdir, "agents", "bare.md"), "# no frontmatter here\n");
  const r = spawnSync("node", [SCRIPT, root, home], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /warning: skipping no YAML frontmatter in .*bare\.md/);
  const out = JSON.parse(r.stdout);
  assert.ok(out.find((x) => x.name === "good"), "valid sibling still discovered");
  assert.ok(!out.some((x) => x.path.endsWith("bare.md")));
});

test("project-local file without frontmatter still fails hard", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  mkdirSync(join(root, ".claude", "agents"), { recursive: true });
  writeFileSync(join(root, ".claude", "agents", "bare.md"), "# no frontmatter here\n");
  const r = spawnSync("node", [SCRIPT, root, home], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /^discover-skills: no YAML frontmatter in .*bare\.md/);
});

test("installed_plugins.json limits plugin scope to installed versions", () => {
  const root = mkdtempSync(join(tmpdir(), "ds-root-"));
  const home = mkdtempSync(join(tmpdir(), "ds-home-"));
  const plugins = join(home, ".claude", "plugins");
  const current = join(plugins, "cache", "acme", "pkg", "2.0.0");
  mkSkill(join(current, "skills", "fresh"), "fresh", "installed version");
  mkSkill(join(plugins, "cache", "acme", "pkg", "1.0.0", "skills", "stale"), "stale", "old cache version");
  mkSkill(join(plugins, "marketplaces", "acme", "pkg", "skills", "clone"), "clone", "marketplace clone");
  writeFileSync(join(plugins, "installed_plugins.json"),
    JSON.stringify({ version: 2, plugins: { "pkg@acme": [{ scope: "user", installPath: current }] } }));
  const names = run(root, home).filter((r) => r.scope === "plugin-installed").map((r) => r.name);
  assert.deepEqual(names, ["fresh"]);
});
