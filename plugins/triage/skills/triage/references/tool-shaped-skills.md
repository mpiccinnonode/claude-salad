# Tool-shaped supporting skills

Second pass of Phase 3. Read this when the candidate list contains skills that
are not phase-shaped — tools that augment whichever phase the user is in.

Some skills aren't phase-shaped. They're tools that augment whichever phase the user is in: a code-structure search skill speeds up Exploration, Debugging, and Implementation alike; a library-docs lookup fires whenever the task touches a named framework. After the per-phase mapping above, run a second pass against the same candidate list using these intent signals:

| Tool shape | Match on descriptions mentioning… |
|---|---|
| **Code understanding** | code structure search, AST traversal, symbol lookup, "instead of reading full files", structural code exploration, tree-sitter |
| **Library docs** | library/framework/SDK documentation, API syntax lookup, version migration, library-specific debugging, "use when user asks about <lib>" |
| **Memory recall** | persistent cross-session memory, prior-session lookup, "did we solve this before", cross-session search |
| **MCP server** | any discovered `kind: "mcp-server"` record — match the server **name** (and `description` when present) to the shape it serves: docs servers (e.g. context7) → Library docs; memory servers (e.g. claude-mem) → Memory recall; code-graph/review servers (e.g. code-review-graph) → Code understanding / Review |

**MCP servers are discovered, not assumed.** `discover-skills.mjs` emits `kind: "mcp-server"` records from the project `.mcp.json`, the user's `~/.claude.json` (this project's entry), and any installed plugin's `.mcp.json`. A server shipped by a plugin — e.g. a `code-review-graph` plugin — is therefore surfaced automatically with no plugin-specific knowledge baked into this skill. **Limitation:** discovery is server-level. The candidate record carries the server's name and (when the config provides one) its description — not its individual tool schemas, which are only available at runtime. Surface the server in the **Supporting Skills** block by name; do not claim specific tools it may expose.

Surface every match in the recommendation's **Supporting Skills** block. Tool-shaped skills are not part of the phase sequence — they don't get tie-broken against phase matches and they don't get the generic-prompt fallback (if no tool-shaped skill matches a given shape, simply omit that shape from the block).

For each match, write a one-sentence trigger condition tailored to *this task* (e.g., "fires when locating the existing auth middleware before editing it" — not the skill's generic description).
