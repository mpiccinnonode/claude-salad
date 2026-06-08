# claude-salad

Claude Code plugins by mpiccinnonode -- config auditing, SCRUM planning, and more.

## Plugins

| Plugin | Version | Description |
| --- | --- | --- |
| [config-doctor](plugins/config-doctor/) | 1.4.0 | Deep-scan and audit a project's Claude configuration |
| [scrum-toolkit](plugins/scrum-toolkit/) | 2.2.0 | Transform project ideas into SCRUM roadmaps with epics, stories, and sprint plans |
| [triage](plugins/triage/) | 1.0.0 | Advisory task classifier that routes tasks to the best available skill, agent, or MCP server |
| [review-then-dry](plugins/review-then-dry/) | 1.0.0 | Chained code-review + reuse audit producing one unified findings spec. Node-only, Windows-portable |

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
/plugin install config-doctor
```

```bash
/plugin install scrum-toolkit
```

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
