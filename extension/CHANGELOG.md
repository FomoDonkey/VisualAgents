# Changelog

## [0.4.0] - 2026-04-01

### Performance — Major optimization pass
- **Agent rendering**: Body redraws only on visual state change (~95% fewer GPU draws)
- **Particle system**: O(1) swap-and-pop removal instead of O(n) splice/shift
- **Pathfinding**: Skips calculation when no paths are pending
- **DOM updates**: All element references pre-cached — zero querySelector per frame
- **Stats emission**: Only emits when data changes (was every frame)
- **Effect throttling**: Cosmetic effects at 100ms, UI sync at 250ms
- **Agent manager**: Cached array eliminates Array.from() per call (10+ times/frame)
- **Palette lookups**: Pre-cached color map avoids .find() + parseInt per frame

### Fixed
- First-person camera look-ahead direction (was inverted)
- escapeHtml memory allocation (reuses single element)

### Removed
- Dead code: TilesetGenerator, WorldBuilder, Billboard (all unused)
- Dead stream code from NeonOverlay
- Unused terminalData map from ideWatcher

## [0.3.2] - 2026-03-31

### Changed
- Updated marketplace documentation — improved description, keywords, and feature highlights
- Added performance section and links to README
- Expanded supported editors list (Cursor, Windsurf)

## [0.3.1] - 2026-03-31

### Added
- **Smart camera system** — auto-follows active agents, frames multiple workers, returns to poker table when idle
- **Poker table** with detailed wood grain, felt, dealer button, cards, and chip stacks
- Clean console logs — removed debug noise

### Fixed
- Camera flash on scene transitions
- Delta capped at 50ms to prevent lag spikes after tab switch

## [0.3.0] - 2026-03-30

### Added — Cinematic Visual Overhaul
- **Agent reflections** on the floor with shimmer effect
- **Dynamic light cones** under each agent that pulse when working
- **Energy beams** connecting working agents to their room center
- **Holographic room signs** — large translucent names that breathe and float
- **Per-room ambient particles**: sparks in Server Room, dust in Archive, blue motes in Dev Floor, green orbs in Research, purple sparks in Deploy
- **Scanlines** on wall monitors
- **Idle pulse** — blue glow over poker table when all agents are idle
- **Floating task labels** — descriptions rise and fade when tasks are assigned
- **Neon room borders** with pulsing accent colors and corner dots
- **Corridor floor LED strips** along edges
- **Animated desk monitors** with typing effects, scrolling code, blinking cursors
- **Flickering server LEDs** with glow halos
- **Swaying plants** with wind animation
- **Room glow** that intensifies when agents work inside
- **Agent 3D shading** — head highlights, specular, body gradient
- **Bigger expressive eyes** with colored irises and specular highlights
- **Facial expressions** — smile (done), frown (error), focus (working), O-mouth (thinking)
- **Agent body glow** and dynamic shadow sizing
- **Agent name labels** in agent color with bold font
- **Smart auto-camera** — follows active agents, frames multiple, returns to poker table when idle
- **Glowing trails** behind walking agents
- **Detailed office decorations** — ceiling lights, rugs, wall art, clock, vending machine, exit signs, coat rack, fire extinguisher, trash bins, filing cabinet, cable channels, standing lamp
- **Improved room rendering** — thick walls with panel texture, glass window sections, ceiling vents, floor edge shadows, LED accent strips, door frames with light spill, room number plates
- **Improved corridor** — checkerboard tiles, dashed center lines, wall shadows, ceiling lights
- **Improved furniture** — monitor stands, keyboards, coffee mugs, desk reflections, server rack slots, whiteboard diagrams with markers, better bookshelves
- **Poker table** — wood grain, felt edge shadow, dealer button, pot glow, detailed cards and chip stacks

### Changed
- Default zoom increased to 1.3 for better detail visibility
- Camera starts centered on poker table
- Success/error particles optimized (no more lag)
- Activity log uses real timestamps (HH:MM:SS), tool icons, short file names
- Bash commands show actual command instead of raw path

### Fixed
- Eliminated particle explosion lag (removed expensive ring/glow draws)
- Camera flash removed (caused frame drops)
- Delta capped at 50ms to prevent lag spikes after tab switch

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
