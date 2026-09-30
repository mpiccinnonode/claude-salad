# claude-salad

Claude Code plugins by mpiccinnonode -- task triage, code review, and more.

## Plugins

| Plugin | Version | Description |
| --- | --- | --- |
| [triage](plugins/triage/) | 1.1.1 | Advisory task classifier that routes tasks to the best available skill, agent, or MCP server |
| [review-then-dry](plugins/review-then-dry/) | 1.2.0 | Chained code-review + reuse audit producing one unified findings spec. Node-only, Windows-portable |

## Installation

### 1. Start Claude Code

```bash
claude
```

### 2. Add the marketplace

```bash
/plugin marketplace add mpiccinnonode/claude-salad
```

### 3. Install a plugin

```bash
/plugin install triage
```

```bash
/plugin install review-then-dry
```

### 4. Restart Claude Code

The plugin will be active immediately after restart.

## License

MIT
