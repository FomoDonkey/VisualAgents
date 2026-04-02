# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2026-04-02

### Changed
- Updated all documentation to reflect current version (v0.5.2)
- README badge version updated from 0.4.0 to 0.5.2
- Extension README "New in" section updated with v0.5.x features
- Added missing changelog entries for v0.4.1, v0.5.0, and v0.5.1

## [0.5.1] - 2026-04-02

### Performance — ~60% fewer draw calls when idle
- **ParticleManager**: Skip GPU clear/redraw when no particles or trails
- **AmbientAnimations**: Split into fast/slow timers (monitors 200ms, LEDs 300ms, plants/glows 500ms)
- **NeonOverlay**: Throttle from 100ms to 300ms (slow pulse doesn't need high frequency)
- **CinematicEffects**: Skip reflections/beams when all agents idle, slow effects at 300ms
- **HtmlUI**: Cache stat DOM elements (avoid 9× getElementById per update)
- Net result: ~4800 → ~1900 draw calls/sec when idle

## [0.5.0] - 2026-04-02

### Added
- **Event batching system**: Groups rapid tool calls into single visual tasks — agents walk, work, and return naturally instead of flickering in place
- **Auto-open**: Panel opens automatically when agent activity is detected (global hooks + fs.watch)
- Room name shown in activity log entries
- WebFetch counted in search stats
- Square 256×256 icon for marketplace visibility
- Published to Open VSX Registry

### Fixed
- **Critical hook bug**: Read `tool_response` (not `tool_result`) from Claude Code, enabling error detection, fail stats, and agent error state
- Tool routing typos (`askuserquestion`, `notebookedit`)
- Speech bubble background resize on batch text updates

## [0.4.1] - 2026-04-01

### Changed
- Refactored extension panel and event watcher
- Updated index.html layout and config

### Removed
- Unused modules: SpeechBubble, StatusIndicator, HudScene, CharacterGenerator, TextureGenerator

## [0.4.0] - 2026-04-01

### Performance — Major optimization pass
- **Agent rendering**: Body only redraws when visual state changes (was 30+ graphics ops/frame/agent, now ~95% fewer redraws)
- **Particle system**: Swap-and-pop removal instead of O(n) splice/shift — eliminates array copying
- **Pathfinding**: EasyStar.calculate() now skips frames with no pending paths
- **DOM updates**: Cached all badge/FP element references — zero querySelector calls per frame
- **Stats emission**: Only emits WORLD_STATS_UPDATED when data changes (was every frame)
- **Effect throttling**: Cosmetic effects throttled to 100ms (was 66ms), UI sync to 250ms (was 150ms)
- **Agent manager**: Cached agents array — eliminated Array.from() allocation every frame (10+ calls/frame)
- **Palette lookups**: Pre-cached agent color map — eliminated .find() + parseInt per agent per frame in CinematicEffects
- **Single agent loop**: Merged 3 separate particle timer loops into one pass over agents

### Fixed
- **Camera look-ahead inverted**: First-person camera now correctly looks ahead of walking agent (was looking behind)
- **escapeHtml leak**: Reuses single DOM element instead of creating one per call
- **TypeScript type error**: Room particle color variable properly typed

### Removed — Dead code cleanup
- Deleted unused `TilesetGenerator.ts` (empty stub with `TILE = {} as any`)
- Deleted unused `WorldBuilder.ts` (never instantiated, referenced undefined tile constants)
- Deleted unused `Billboard.ts` (never instantiated)
- Removed dead data stream code from `NeonOverlay.ts` (empty array iterated every frame)
- Removed unused `terminalData` map from `ideWatcher.ts`

## [0.3.2] - 2026-03-31

### Changed
- Updated marketplace documentation — improved description, keywords, and feature highlights
- Added performance section and links to extension README
- Expanded supported editors list (Cursor, Windsurf)

## [0.3.1] - 2026-03-31

### Added
- Smart camera system — auto-follows active agents, frames multiple workers, returns to poker table when idle
- Poker table with detailed wood grain, felt, dealer button, cards, and chip stacks
- Clean console logs — removed debug noise

### Fixed
- Camera flash on scene transitions
- Delta capped at 50ms to prevent lag spikes after tab switch

## [0.3.0] - 2026-03-30

### Added — Cinematic Visual Overhaul
- Agent reflections on the floor with shimmer effect
- Dynamic light cones under each agent that pulse when working
- Energy beams connecting working agents to their room center
- Holographic room signs — large translucent names that breathe and float
- Per-room ambient particles: sparks in Server Room, dust in Archive, blue motes in Dev Floor, green orbs in Research, purple sparks in Deploy
- Scanlines on wall monitors
- Idle pulse — blue glow over poker table when all agents are idle
- Floating task labels — descriptions rise and fade when tasks are assigned
- Neon room borders with pulsing accent colors and corner dots
- Corridor floor LED strips along edges
- Animated desk monitors with typing effects, scrolling code, blinking cursors
- Flickering server LEDs with glow halos
- Swaying plants with wind animation
- Room glow that intensifies when agents work inside
- Agent 3D shading — head highlights, specular, body gradient
- Bigger expressive eyes with colored irises and specular highlights
- Facial expressions — smile (done), frown (error), focus (working), O-mouth (thinking)
- Agent body glow and dynamic shadow sizing
- Agent name labels in agent color with bold font
- Glowing trails behind walking agents
- Detailed office decorations — ceiling lights, rugs, wall art, clock, vending machine, exit signs, coat rack, fire extinguisher, trash bins, filing cabinet, cable channels, standing lamp
- Improved room rendering — thick walls with panel texture, glass window sections, ceiling vents, floor edge shadows, LED accent strips, door frames with light spill, room number plates
- Improved corridor — checkerboard tiles, dashed center lines, wall shadows, ceiling lights
- Improved furniture — monitor stands, keyboards, coffee mugs, desk reflections, server rack slots, whiteboard diagrams with markers, better bookshelves

### Changed
- Default zoom increased to 1.3 for better detail visibility
- Camera starts centered on poker table
- Success/error particles optimized (no more lag)
- Activity log uses real timestamps (HH:MM:SS), tool icons, short file names
- Bash commands show actual command instead of raw path

### Fixed
- Eliminated particle explosion lag (removed expensive ring/glow draws)
- Camera flash removed (caused frame drops)

## [0.2.1] - 2026-03-30

### Added
- Full README documentation
- CHANGELOG

## [0.2.0] - 2026-03-30

### Removed
- Simulation mode — live only

### Fixed
- Activity log HTML escaping
- Stats tracking for errors, deploys, searches

## [0.1.1] - 2026-03-30

### Changed
- Display name to "Visual Code Agents"

## [0.1.0] - 2026-03-30

### Added
- Initial release
- Pixel-art office visualization with 6 themed rooms
- Real-time Claude Code event integration via hooks
- IDE activity watcher for Antigravity and other editors
- Up to 5 simultaneous agents with unique color palettes
- A* pathfinding for agent navigation
- Interactive controls (click, double-click, zoom, pan)
- First-person agent view
- Dashboard with roster, activity log, and stats
- VS Code extension with webview panel
- Procedurally generated sprites and textures
