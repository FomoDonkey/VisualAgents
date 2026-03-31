# Contributing to Visual Agents

First off, thank you for considering contributing to Visual Agents! Every contribution helps make this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

---

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior via [GitHub Issues](https://github.com/FomoDonkey/VisualAgents/issues).

---

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check if the issue already exists. When creating a bug report, include:

- **Clear title** describing the problem
- **Steps to reproduce** the behavior
- **Expected behavior** vs. what actually happened
- **Screenshots or GIFs** if applicable
- **Environment info**: OS, VS Code version, Node.js version

### Suggesting Features

Feature requests are welcome! Please open an issue with:

- A clear description of the feature
- The motivation — what problem does it solve?
- Examples of how it would work

### Code Contributions

1. Look for issues tagged `good first issue` or `help wanted`
2. Comment on the issue to let others know you're working on it
3. Fork the repo and create your branch from `master`
4. Make your changes following the [Style Guide](#style-guide)
5. Submit a pull request

---

## Development Setup

### Prerequisites

- Node.js v18+
- npm
- VS Code (for extension development)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/VisualAgents.git
cd VisualAgents

# Install dependencies
npm install

# Start dev server with hot reload
npm run dev
```

The dev server runs at `http://localhost:5173` with the `/api/events` endpoint for testing.

### Building the Extension

```bash
# Build webview + extension
npm run build:extension

# Package VSIX
npm run package:vsix
```

### Testing Events

You can inject test events via the API:

```bash
curl -X POST http://localhost:5173/api/event \
  -H "Content-Type: application/json" \
  -d '{"tool":"Write","input":"src/test.ts","phase":"pre"}'
```

---

## Project Structure

```
src/
├── agents/         # Agent logic, state machine, rendering
├── effects/        # Visual effects (particles, neon, day/night)
├── scenes/         # Phaser scenes (Boot, World, HUD)
├── realtime/       # Event polling and tool-to-room mapping
├── sprites/        # Procedural sprite/texture generation
├── ui/             # Camera controller, HTML panels
├── world/          # Office layout, pathfinding grid
├── types/          # TypeScript type definitions
├── config.ts       # Global configuration constants
└── main.ts         # Entry point

extension/
├── src/            # VS Code extension source
└── package.json    # Extension manifest
```

---

## Pull Request Process

1. **Create a feature branch** from `master`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** with clear, focused commits

3. **Test your changes**:
   - Run `npm run build` to ensure TypeScript compiles
   - Test the visualization in the browser
   - If touching the extension, build and test the VSIX

4. **Update documentation** if you changed any public API or behavior

5. **Submit the PR** with:
   - A clear title and description
   - Reference to any related issues
   - Screenshots/GIFs for visual changes

6. **Address review feedback** promptly

### PR Review Criteria

- Code follows the existing style and conventions
- TypeScript compiles without errors
- No unnecessary dependencies added
- Changes are focused and minimal
- Documentation updated if needed

---

## Style Guide

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`; avoid `var`
- Use descriptive variable and function names
- Keep functions focused — one responsibility per function
- Use interfaces for object shapes, enums for fixed sets

### Code Organization

- One class per file
- Group related functionality in directories
- Keep the `config.ts` as the single source of truth for constants
- Use the `EventBus` for cross-system communication

### Commits

- Use clear, concise commit messages
- Start with a verb: "Add", "Fix", "Update", "Remove"
- Reference issues when applicable: `Fix #123`

### Visual Changes

When contributing visual effects or UI changes:

- Ensure 60 FPS performance is maintained
- Cap expensive operations (particles, glow effects)
- Test at different zoom levels
- Consider the day/night cycle impact

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE) with copyright held by **0xArlee**.

---

Thank you for helping make Visual Agents better!
