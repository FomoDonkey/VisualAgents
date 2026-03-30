# Visual Code Agents

**Watch your AI coding agents work in real time inside a stunning pixel-art office.**

Visual Code Agents transforms your Claude Code sessions into a cinematic animated visualization. Agents walk between rooms, sit at desks, search archives, run terminals, and deploy code — all mapped from real tool calls happening in your editor. When they're idle, they play poker together at the break room table.

Works with **VS Code**, **Antigravity (Google)**, and any VS Code-based editor.

---

## Highlights

- **Cinematic office** — Neon-lit rooms, animated monitors with scrolling code, flickering server LEDs, swaying plants, holographic room signs, floor reflections, dynamic lighting
- **Expressive agents** — 3D-shaded characters with blinking eyes, colored irises, facial expressions (smile, frown, focus, surprise), arm/leg animations while walking, glowing trails
- **Smart camera** — Auto-follows the action: zooms into active agents, frames multiple agents working simultaneously, returns to the poker table when everyone's idle
- **Real-time activity log** — Every tool call logged with timestamps, icons, and color coding
- **Zero-config for Antigravity** — IDE watcher captures file changes from any AI agent automatically
- **Poker table** — Idle agents sit around a detailed poker table playing cards until real work arrives

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

Both sources run simultaneously.

### Interactive Controls
- **Click** an agent to follow them with the camera
- **Double-click** to enter first-person view with live action feed
- **Rename** agents by clicking the pencil icon
- **Zoom** with scroll wheel or +/- buttons
- **WASD** to pan the camera
- **Overview** button to see the entire office
- **Auto-camera** resumes after 5 seconds of no input

### Visual Effects
- Neon-pulsing room borders with accent colors
- Animated desk monitors with typing effects and blinking cursors
- Server rack LEDs that flicker independently
- Plants that sway gently
- Room glow that intensifies when agents are inside working
- Energy beams connecting working agents to their room
- Agent reflections on the floor with shimmer
- Dynamic light cones under each agent
- Per-room ambient particles (sparks in Server Room, dust in Archive, blue motes in Dev Floor)
- Scanlines on wall monitors
- Holographic room names that breathe
- Idle pulse glow over the poker table
- Floating task descriptions when work is assigned
- Day/night ambient cycle

### Dashboard
- **Left panel** — team roster with live status, current task, location, and progress bar
- **Right panel** — real-time activity log with icons per tool type
- **Top bar** — aggregate stats: tasks completed, files edited, tests run, deploys, success rate

---

## Getting Started

### 1. Install
Search for **"Visual Code Agents"** in the Extensions panel, or:
```
code --install-extension visualagents.visualagents
```
For Antigravity:
```
antigravity --install-extension visualagents.visualagents
```

### 2. Open the visualizer
`Ctrl+Shift+P` / `Cmd+Shift+P` then:
```
VisualAgents: Open Agent Visualizer
```

### 3. Connect Claude Code
`Ctrl+Shift+P` then:
```
VisualAgents: Connect Claude Code (Setup Hooks)
```
Choose **Auto-configure (project)** or **Auto-configure (global)**. Restart Claude Code. Your agents will appear as soon as Claude Code starts working.

### Using with Antigravity / Other Agents
No extra setup needed. The IDE activity watcher detects file changes, terminal activity, and diagnostics automatically. Just open the visualizer and start working.

---

## Commands

| Command | Description |
|---------|-------------|
| `VisualAgents: Open Agent Visualizer` | Opens the pixel-art office visualization panel |
| `VisualAgents: Connect Claude Code (Setup Hooks)` | Configures Claude Code hooks (project or global) |
| `VisualAgents: Set Events File Path` | Manually set the path to an `events.jsonl` file |

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `visualagents.eventsFile` | string | `""` | Path to `events.jsonl`. Leave empty to auto-detect from workspace root. |
| `visualagents.autoOpen` | boolean | `false` | Automatically open the visualizer when events are detected. |

---

## How It Works

### Claude Code Integration
A lightweight Node.js hook captures every `PreToolUse` and `PostToolUse` event, writing a JSON line to `events.jsonl`. The extension watches this file and streams events to the visualization in real time.

### IDE Activity Integration
For agents without hooks (Antigravity Gemini, Copilot, Cursor), the extension listens to VS Code native events: file saves, file creates/deletes, terminal activity, and diagnostics.

### Office Layout

| Room | Tools Mapped | Ambient Effect |
|------|-------------|----------------|
| Meeting Room | Agent, Plan, AskUserQuestion | Warm light, whiteboard scribbles |
| Research Corner | Grep, WebSearch, WebFetch | Floating green orbs |
| Archive Room | Read, Glob | Dust motes, bookshelves |
| Dev Floor | Write, Edit | Blue rising particles, 9 desks |
| Server Room | Bash | Falling sparks, flickering LEDs |
| Deploy Station | Skill | Purple rising sparks |

### Multi-Agent Support
Up to 5 agents visualized simultaneously. When Claude Code spawns sub-agents, each gets a unique character. Agents auto-rename when event data includes a name.

### Poker Table
When idle, all agents sit around a poker table in the break area playing cards. When a real task arrives, the assigned agent stands up, walks to the correct room, works, and returns to the table when done.

---

## Requirements

- VS Code 1.85+ / Antigravity / any VS Code fork
- For Claude Code: Claude Code CLI installed
- Node.js (for the hook script)

## FAQ

**Q: The agents aren't moving.**
Run "Connect Claude Code (Setup Hooks)" and restart Claude Code. Check that `events.jsonl` exists in your workspace.

**Q: Can I use this without Claude Code?**
Yes. The IDE watcher captures file changes from any source automatically.

**Q: Does this slow down my editor?**
No. The hook runs in <10ms. The visualization uses Phaser.js with hardware-accelerated canvas.

**Q: Can I customize agent names?**
Click the pencil icon next to any agent name. Names persist across sessions.

**Q: The camera moves on its own.**
That's the smart auto-camera. It follows active agents and returns to the poker table when idle. Use WASD or drag to take manual control — it resumes auto-tracking after 5 seconds.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT
