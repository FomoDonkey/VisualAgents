# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
