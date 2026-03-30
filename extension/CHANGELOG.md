# Changelog

## [0.2.1] - 2026-03-30

### Added
- Full README documentation for the marketplace
- CHANGELOG for version tracking
- Extended keyword and category metadata

### Changed
- Improved description for marketplace listing

## [0.2.0] - 2026-03-30

### Removed
- Simulation mode — the extension now operates exclusively in live mode
- SimulationEngine, TaskQueue, and TaskDefinitions (no longer needed)

### Fixed
- Activity log now escapes HTML in tool input to prevent layout breaking
- Post events always emit to the log even if the agent is idle
- Stats correctly track errors, deploys, and searches separately

### Changed
- Mode indicator always shows "LIVE" instead of toggling between SIM/LIVE
- Removed the SIM/LIVE toggle button from the camera HUD

## [0.1.1] - 2026-03-30

### Changed
- Renamed extension display name to "Visual Code Agents"

## [0.1.0] - 2026-03-30

### Added
- Initial release
- Pixel-art office visualization with Phaser.js in a VS Code webview
- Claude Code integration via PreToolUse/PostToolUse hooks
- IDE activity watcher for Antigravity, Cursor, and other VS Code forks
- 5 agent characters with pathfinding between 6 office rooms
- Interactive camera: click to follow, double-click for first-person view
- Agent renaming with localStorage persistence
- Real-time activity log with timestamps and color-coded events
- Dashboard with aggregate stats (tasks, files, tests, deploys, success rate)
- Day/night ambient cycle
- Particle effects on task completion and errors
- Auto-configure command for Claude Code hooks (project or global)
- Compatible with VS Code, Antigravity, and any VS Code-based editor
