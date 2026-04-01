# VisualAgents - Lessons Learned

## Architecture
- EventBus pattern works well for decoupling simulation from display
- Programmatic texture generation avoids asset management complexity
- Phaser.js textures.generate() with character arrays is ideal for pixel art
- EasyStar.js integrates smoothly with Phaser update loop

## Gotchas
- Phaser tilemap `data` creates a single-layer map; for multi-layer, need separate tilemaps
- `pixelArt: true` in config is critical for crisp rendering
- Font sizes below 6px can be blurry even with pixelArt mode
- `return` inside for loop breaks ALL iterations — use `continue` to skip one agent
- VS Code webviews need `'unsafe-inline'` for inline styles in CSP
- Vite terser is optional since v3 — use `minify: 'esbuild'` instead
- `acquireVsCodeApi()` is only available in webviews — detect before calling
- Phaser works in VS Code webviews since it only uses Canvas/WebGL (no special CSP needed)

## Performance (v0.4.0)
- Agent.drawBody() is the most expensive per-frame operation (30+ graphics calls). Throttling to only redraw on state change reduced CPU usage dramatically.
- Array.from(map.values()) called 10+ times per frame is surprisingly expensive — cache the array.
- splice() and shift() in hot loops cause O(n) array copies. Swap-and-pop is O(1) and trivial to implement.
- AGENT_PALETTES.find() + parseInt() called per agent per frame per effect layer adds up fast — pre-cache in a Map.
- querySelector() per agent per UI update cycle is wasteful — cache element refs at creation time.
- Emitting events every frame (even with no listeners doing heavy work) has overhead — throttle or dirty-flag.
- EasyStar.calculate() with 500 iterations per call is expensive even when no paths are queued — skip it.
- FP camera look-ahead was inverted (up→positive Y instead of negative) — always test direction logic visually.
- Creating DOM elements in hot paths (escapeHtml) is a subtle but real GC pressure source — reuse a single element.

## Extension Architecture
- Dual mode: same game code runs in browser (HTTP polling) and webview (postMessage)
- Extension host watches events.jsonl and posts events to webview
- Claude Code hooks write tool events to events.jsonl
- Build pipeline: Vite bundles game → single JS, tsc compiles extension host
- Antigravity no expone hooks ni logs de tool use como Claude Code
- Antigravity logs están en %APPDATA%/antigravity/logs/ pero solo contienen CLI/server info
- Solución: IdeWatcher usa VS Code API (onDidSave, FileSystemWatcher, etc.) para capturar actividad de cualquier agente IDE
- Dual watcher: EventWatcher (Claude Code hooks) + IdeWatcher (IDE activity) corren en paralelo
