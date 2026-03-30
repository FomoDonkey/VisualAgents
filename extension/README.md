# Visual Code Agents

Watch your AI coding agents work in real time inside a pixel-art office.

Visual Code Agents turns your Claude Code sessions into an animated visualization: agents walk between rooms, sit at desks, search archives, run terminals, and deploy code — all mapped from real tool calls happening in your editor.

Works with **VS Code**, **Antigravity (Google)**, and any VS Code-based editor.

---

## Features

### Live Agent Visualization
Every tool call from your AI agent is mapped to a visual action in the office:
- **Read/Glob** — agent walks to the Archive Room
- **Write/Edit** — agent works at the Dev Floor
- **Bash** — agent runs commands in the Server Room
- **Grep/WebSearch** — agent researches in the Research Corner
- **Agent/Plan** — agent meets in the Meeting Room
- **Skill/Deploy** — agent ships from the Deploy Station

### Dual Event Sources
- **Claude Code hooks** — captures every tool use with full detail (tool name, file path, result)
- **IDE activity watcher** — detects file saves, creates, deletes, and terminal activity from any AI agent (Antigravity Gemini, Copilot, Cursor, etc.)

Both sources run simultaneously. If you use Claude Code, the hooks give you precise events. If you use another agent, the IDE watcher picks up its activity automatically.

### Interactive Controls
- **Click** an agent to follow them with the camera
- **Double-click** to enter first-person view with live action feed
- **Rename** agents by clicking the pencil icon
- **Zoom** with scroll wheel or +/- buttons
- **WASD** to pan the camera
- **Overview** button to see the entire office

### Dashboard
- **Left panel** — team roster with live status, current task, location, and progress bar per agent
- **Right panel** — real-time activity log with timestamps and color-coded events
- **Top bar** — aggregate stats: tasks completed, files edited, tests run, deploys, success rate
- **Day/night cycle** — ambient lighting changes over time
- **Particle effects** — sparkles on success, shake on errors, thought bubbles while thinking

---

## Getting Started

### 1. Install the extension
Search for **"Visual Code Agents"** in the Extensions panel, or install from the command line:
```
code --install-extension visualagents.visualagents
```
For Antigravity:
```
antigravity --install-extension visualagents.visualagents
```

### 2. Open the visualizer
Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
```
VisualAgents: Open Agent Visualizer
```

### 3. Connect your Claude Code
Open the Command Palette and run:
```
VisualAgents: Connect Claude Code (Setup Hooks)
```
Choose **Auto-configure (project)** or **Auto-configure (global)**. This writes the necessary hooks to your Claude Code settings so every tool call is captured.

Restart Claude Code after configuring. Your agents will appear in the visualization as soon as Claude Code starts working.

### Using with Antigravity / Other Agents
No extra setup needed. The IDE activity watcher detects file changes, terminal activity, and diagnostics automatically. Open the visualizer and start working with any AI agent — you'll see the activity reflected in the office.

---

## Commands

| Command | Description |
|---------|-------------|
| `VisualAgents: Open Agent Visualizer` | Opens the pixel-art office visualization panel |
| `VisualAgents: Connect Claude Code (Setup Hooks)` | Configures Claude Code hooks automatically (project or global) |
| `VisualAgents: Set Events File Path` | Manually set the path to an `events.jsonl` file |

---

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `visualagents.eventsFile` | string | `""` | Path to `events.jsonl`. Leave empty to auto-detect from workspace root. |
| `visualagents.autoOpen` | boolean | `false` | Automatically open the visualizer when events are detected. |

---

## How It Works

### Claude Code Integration
The extension installs a lightweight Node.js hook that Claude Code calls on every tool use (`PreToolUse` and `PostToolUse`). The hook writes a single JSON line to `events.jsonl` in your workspace. The extension watches this file and streams events to the visualization in real time.

Each event includes:
- Timestamp
- Tool name (Read, Write, Edit, Bash, Grep, Agent, etc.)
- Input summary (file path, command, search query)
- Result status
- Agent/session ID (for multi-agent support)

### IDE Activity Integration
For editors and agents that don't support hooks (Antigravity's Gemini, Copilot, etc.), the extension listens to VS Code's native events:
- `onDidSaveTextDocument` — detects file edits
- `FileSystemWatcher` — detects file creates and deletes
- `onDidOpenTerminal` / `onDidCloseTerminal` — detects terminal activity
- `onDidChangeDiagnostics` — detects errors

### Office Layout
The pixel-art office has 6 rooms, each mapped to a type of work:

| Room | Tools Mapped |
|------|-------------|
| Archive Room | Read, Glob |
| Dev Floor | Write, Edit |
| Server Room | Bash |
| Research Corner | Grep, WebSearch, WebFetch |
| Meeting Room | Agent, Plan, AskUserQuestion |
| Deploy Station | Skill |

### Multi-Agent Support
Up to 5 agents can be visualized simultaneously. When Claude Code spawns sub-agents, each gets assigned to a different visual character (Atlas, Nova, Sage, Iris, Ember). You can rename them to match your workflow.

---

## Requirements

- VS Code 1.85+ / Antigravity / any VS Code fork
- For Claude Code integration: Claude Code CLI installed
- Node.js (for the hook script)

---

## FAQ

**Q: The agents aren't moving. What's wrong?**
Make sure you ran "Connect Claude Code (Setup Hooks)" and restarted Claude Code. Check that `events.jsonl` exists in your workspace root.

**Q: Can I use this without Claude Code?**
Yes. The IDE activity watcher captures file changes from any source. Open the visualizer and use any AI agent — file saves and terminal activity will be reflected.

**Q: Does this slow down my editor or Claude Code?**
No. The hook script runs in <10ms per event. The visualization uses Phaser.js with hardware-accelerated canvas rendering.

**Q: Can I customize the agent names/colors?**
Click the pencil icon next to any agent name to rename it. Names are saved in localStorage and persist across sessions.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT
