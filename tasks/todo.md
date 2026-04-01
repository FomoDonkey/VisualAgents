# VisualAgents - Tasks

## Completed
- [x] Scaffold proyecto (Vite + TS + Phaser)
- [x] Generacion de texturas programaticas
- [x] Mundo tipo oficina interior con 6 salas
- [x] Pathfinding con EasyStar.js
- [x] Sistema de agentes con FSM
- [x] Motor de simulacion con 8 project templates
- [x] UI HTML profesional (paneles, logs, stats)
- [x] Camara mejorada con smooth zoom
- [x] Sistema de particulas
- [x] Ciclo dia/noche ambiental
- [x] Camera primera persona al seleccionar agente
- [x] Overlay de primera persona con vignette y feed
- [x] Panel de detalle en primera persona
- [x] Screen shake en errores
- [x] Flash visual en asignacion de tareas

## Completed (Extension)
- [x] Extension scaffolding (package.json, tsconfig, entry point)
- [x] WebviewPanel con HTML embebido y CSP
- [x] EventWatcher para leer events.jsonl desde extension host
- [x] WebviewBridge en RealtimeEngine (postMessage vs HTTP polling)
- [x] Vite config para bundle webview (single JS file)
- [x] Build scripts (build:webview, build:ext, build:extension, package:vsix)
- [x] Claude Code hook scripts (bash + node.js)
- [x] Fix bug: return→continue en SimulationEngine.tick()
- [x] Comando auto-configuración de hooks (project/global)
- [x] VSIX empaquetado y instalado en VS Code + Antigravity
- [x] IdeWatcher para capturar eventos de Antigravity/Cursor/cualquier agente IDE
- [x] Soporte dual: Claude Code hooks + IDE file system events
- [x] Reinstalación final en VS Code + Antigravity

## Completed (Documentation)
- [x] README.md profesional con badges, features, architecture, FAQ
- [x] LICENSE MIT con copyright 0xArlee
- [x] CONTRIBUTING.md con guía de contribución
- [x] CODE_OF_CONDUCT.md
- [x] SECURITY.md
- [x] CHANGELOG.md root (basado en extension changelog)
- [x] GitHub issue templates (bug report, feature request)
- [x] GitHub PR template
- [x] FUNDING.yml

## Completed (v0.3.1)
- [x] Smart auto-camera (sigue agentes activos, vuelve a poker table)
- [x] Poker table con wood grain, felt, dealer button, cards, chips
- [x] Limpieza de console logs
- [x] Fix camera flash en transiciones
- [x] Delta cap 50ms anti-lag
- [x] Actualizar documentación marketplace (extension README, CHANGELOG, package.json)

## Completed (v0.4.0)
- [x] Performance: Agent.drawBody() throttled — only redraws on visual state change (~95% fewer GPU ops)
- [x] Performance: ParticleManager swap-and-pop removal (O(1) vs O(n) splice/shift)
- [x] Performance: PathGrid skips easystar.calculate() when no pending paths
- [x] Performance: Cached agent color map (avoids .find()+parseInt per frame in CinematicEffects)
- [x] Performance: Cached DOM refs in HtmlUI (zero querySelector per update)
- [x] Performance: Stats emission only on change (was every frame)
- [x] Performance: AgentManager.getAllAgents() cached array (no Array.from() per call)
- [x] Performance: Merged 3 particle timer loops into single pass
- [x] Performance: Cosmetic effects throttled to 100ms, UI sync to 250ms
- [x] Bug fix: CameraController FP look-ahead direction inverted
- [x] Bug fix: escapeHtml reuses single DOM element
- [x] Dead code: Deleted TilesetGenerator.ts (empty stub)
- [x] Dead code: Deleted WorldBuilder.ts (never used)
- [x] Dead code: Deleted Billboard.ts (never instantiated)
- [x] Dead code: Removed NeonOverlay stream code (empty array)
- [x] Dead code: Removed ideWatcher terminalData (unused)
- [x] Updated version to 0.4.0 across all files
- [x] Updated CHANGELOG, extension CHANGELOG, README badge
- [x] Built extension + packaged VSIX 0.4.0

## Pending
- [ ] Agregar sonido ambiental (tecleo, clicks)
- [ ] Minimap en esquina
- [ ] Más variedad de tareas
- [ ] Animaciones de monitores en el mundo
- [ ] Publicar en OpenVSX / VS Code Marketplace
- [x] Crear SVG banner hero, architecture diagram, y office layout
- [ ] Agregar screenshots/GIFs reales de la app corriendo al README
