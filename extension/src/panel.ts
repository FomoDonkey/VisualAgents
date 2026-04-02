import * as vscode from 'vscode';
import * as path from 'path';
import { EventWatcher } from './eventWatcher';
import { IdeWatcher } from './ideWatcher';

export class VisualizationPanel {
  private static instance: VisualizationPanel | undefined;
  private static readonly viewType = 'visualagents';

  private panel: vscode.WebviewPanel;
  private context: vscode.ExtensionContext;
  private watcher: EventWatcher;
  private ideWatcher: IdeWatcher;
  private disposed = false;

  static createOrShow(context: vscode.ExtensionContext): VisualizationPanel {
    if (VisualizationPanel.instance) {
      VisualizationPanel.instance.panel.reveal(vscode.ViewColumn.One);
      return VisualizationPanel.instance;
    }

    const panel = vscode.window.createWebviewPanel(
      VisualizationPanel.viewType,
      'VisualAgents',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist-webview'),
        ],
      }
    );

    const instance = new VisualizationPanel(panel, context);
    VisualizationPanel.instance = instance;
    return instance;
  }

  static currentInstance(): VisualizationPanel | undefined {
    return VisualizationPanel.instance;
  }

  static dispose(): void {
    VisualizationPanel.instance?.disposeInternal();
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;

    const sendEvents = (events: any[]) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'events', events });
      }
    };

    // Watcher 1: Claude Code events.jsonl (works when hooks are configured)
    const eventsPath = this.resolveEventsPath();
    this.watcher = new EventWatcher(eventsPath, sendEvents);

    // Watcher 2: IDE activity (works with Antigravity, Cursor, any IDE agent)
    this.ideWatcher = new IdeWatcher(sendEvents);

    this.panel.webview.html = this.getHtml();
    this.watcher.start();
    this.ideWatcher.start();

    this.panel.onDidDispose(() => this.disposeInternal(), null, context.subscriptions);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'ready') {
        // Webview loaded, force a poll
        this.watcher.forcePoll();
      }
    }, null, context.subscriptions);
  }

  updateEventsPath(newPath: string): void {
    const resolved = this.resolveEventsPath(newPath);
    this.watcher.stop();
    this.watcher = new EventWatcher(resolved, (events) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'events', events });
      }
    });
    this.watcher.start();
  }

  private resolveEventsPath(override?: string): string {
    if (override) return override;

    const config = vscode.workspace.getConfiguration('visualagents');
    const configured = config.get<string>('eventsFile');
    if (configured) return configured;

    // Default: workspace root / events.jsonl
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    return path.join(workspaceRoot, 'events.jsonl');
  }

  private disposeInternal(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.watcher.stop();
    this.ideWatcher.stop();
    this.panel.dispose();
    VisualizationPanel.instance = undefined;
  }

  private getHtml(): string {
    const webview = this.panel.webview;
    const distUri = vscode.Uri.joinPath(this.context.extensionUri, 'dist-webview');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'visualagents.js'));
    const nonce = getNonce();

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    script-src 'nonce-${nonce}';
    style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
    font-src https://fonts.gstatic.com;
    img-src ${webview.cspSource} data: blob:;
    connect-src ${webview.cspSource};
  " />
  <title>VisualAgents</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{
      --bg-primary:#0c0c16;--bg-secondary:#10101c;--bg-tertiary:#181828;
      --bg-card:#14142280;--bg-glass:rgba(12,12,22,0.75);--bg-glass-solid:rgba(12,12,22,0.92);
      --border:#222240;--border-bright:#3a4a6a;
      --text-primary:#e0e0f0;--text-secondary:#8a8aaa;--text-dim:#4a4a6a;
      --accent:#4a8aff;--accent-glow:#4a8aff40;--accent-dim:#2a4a8a;
      --success:#40d880;--error:#ff4a5a;--warning:#ffaa40;--purple:#9a6adf;
      --radius:8px;--radius-lg:12px;
    }
    body{background:var(--bg-primary);font-family:'JetBrains Mono',monospace;color:var(--text-primary);overflow:hidden;height:100vh;width:100vw;position:relative}
    #game-container{position:absolute;inset:0;overflow:hidden;background:var(--bg-primary);z-index:1}
    #game-container canvas{image-rendering:pixelated;image-rendering:crisp-edges;-ms-interpolation-mode:nearest-neighbor;display:block}
    .hud{position:absolute;z-index:10;pointer-events:none}
    .hud>*{pointer-events:auto}
    #hud-top{top:0;left:0;right:0;padding:8px 14px;display:flex;align-items:center;gap:12px;
      background:linear-gradient(to bottom,rgba(8,8,18,0.85) 0%,rgba(8,8,18,0.4) 70%,transparent 100%);pointer-events:none}
    #hud-top>*{pointer-events:auto}
    #hud-top .logo{font-size:11px;font-weight:700;color:var(--accent);letter-spacing:1.5px;opacity:0.7;transition:opacity 0.3s}
    #hud-top .logo:hover{opacity:1}
    #hud-top .logo span{color:var(--text-dim);font-weight:300;font-size:9px;margin-left:4px}
    .hud-stats{display:flex;gap:10px;font-size:10px;margin-left:auto}
    .hud-stat{display:flex;align-items:baseline;gap:3px;opacity:0.6;transition:opacity 0.3s}
    .hud-stat:hover{opacity:1}
    .hud-stat .val{font-weight:700;color:var(--text-primary);font-size:11px}
    .hud-stat .lbl{color:var(--text-dim);font-size:8px;text-transform:uppercase;letter-spacing:0.5px}
    .hud-stat.success .val{color:var(--success)}
    .hud-mode{font-size:9px;color:var(--success);font-weight:600;opacity:0.5}
    .hud-time{font-size:9px;color:var(--text-dim);opacity:0.5}
    .hud-fps{font-size:8px;color:var(--text-dim);opacity:0.3}
    #hud-agents{position:absolute;top:38px;left:10px;z-index:10;pointer-events:none;
      display:flex;flex-direction:column;gap:3px;transition:opacity 0.4s,transform 0.4s;opacity:0.7}
    #hud-agents:hover{opacity:1}
    #hud-agents>*{pointer-events:auto}
    .agent-badge{display:flex;align-items:center;gap:6px;padding:5px 10px;
      background:var(--bg-glass-solid);border-radius:var(--radius);
      border:1px solid transparent;cursor:pointer;transition:all 0.25s;min-width:140px;max-width:200px}
    .agent-badge:hover{background:rgba(20,20,40,0.9);border-color:var(--border)}
    .agent-badge.selected{border-color:var(--accent-dim);background:rgba(20,20,40,0.95)}
    .agent-badge .ab-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;transition:box-shadow 0.3s}
    .agent-badge .ab-dot.active{animation:dotPulse 1.2s ease-in-out infinite}
    @keyframes dotPulse{0%,100%{box-shadow:0 0 3px var(--accent-glow)}50%{box-shadow:0 0 10px var(--accent-glow)}}
    .agent-badge .ab-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
    .agent-badge .ab-name{font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .agent-badge .ab-rename{font-size:8px;color:var(--text-dim);cursor:pointer;margin-left:2px;opacity:0;transition:opacity 0.15s;flex-shrink:0}
    .agent-badge:hover .ab-rename{opacity:0.6}
    .agent-badge .ab-rename:hover{opacity:1;color:var(--accent)}
    .agent-badge .ab-task{font-size:8px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .agent-badge .ab-state{font-size:7px;padding:1px 5px;border-radius:3px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;flex-shrink:0}
    .ab-state.idle{background:#152015;color:var(--success)} .ab-state.walking{background:#1f1f10;color:var(--warning)}
    .ab-state.working{background:#101528;color:var(--accent)} .ab-state.thinking{background:#151028;color:var(--purple)}
    .ab-state.done{background:#152015;color:var(--success)} .ab-state.error{background:#201015;color:var(--error)}
    .ab-state.arriving{background:#1f1f10;color:var(--warning)}
    .agent-badge .ab-bar{width:100%;height:1.5px;background:rgba(255,255,255,0.05);border-radius:1px;overflow:hidden;margin-top:2px}
    .agent-badge .ab-fill{height:100%;border-radius:1px;transition:width 0.5s ease-out}
    #hud-activity{position:absolute;bottom:56px;left:10px;z-index:10;pointer-events:none;
      width:320px;max-height:180px;display:flex;flex-direction:column;gap:0;transition:opacity 0.4s;opacity:0.5}
    #hud-activity:hover{opacity:0.95}
    #hud-activity>*{pointer-events:auto}
    #hud-activity .feed-header{font-size:8px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.5px;padding:4px 8px;opacity:0.5}
    #activity-log{display:flex;flex-direction:column;gap:2px;overflow:hidden;max-height:160px}
    .log-entry{padding:3px 8px;background:var(--bg-glass-solid);
      border-radius:5px;border-left:2px solid var(--accent);font-size:9px;color:var(--text-secondary);
      animation:feedIn 0.3s ease-out;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .log-entry.success{border-left-color:var(--success)} .log-entry.error{border-left-color:var(--error)}
    .log-entry.thinking{border-left-color:var(--purple)} .log-entry.deploy{border-left-color:var(--warning)}
    .log-entry .l-time{color:var(--text-dim);font-size:8px;margin-right:4px;font-variant-numeric:tabular-nums}
    .log-entry .l-agent{font-weight:600;font-size:9px;margin-right:3px}
    .log-entry .l-action{color:var(--text-secondary);font-size:9px}
    .log-entry .l-detail{color:var(--text-dim);font-size:8px}
    @keyframes feedIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
    #hud-stats{position:absolute;bottom:56px;right:10px;z-index:10;pointer-events:auto;
      display:flex;gap:8px;padding:5px 12px;background:var(--bg-glass-solid);
      border-radius:var(--radius);border:1px solid var(--border);opacity:0.4;transition:opacity 0.3s}
    #hud-stats:hover{opacity:0.95}
    .mini-stat{display:flex;flex-direction:column;align-items:center;gap:1px}
    .mini-stat .ms-val{font-size:11px;font-weight:700}
    .mini-stat .ms-val.s{color:var(--success)} .mini-stat .ms-val.e{color:var(--error)}
    .mini-stat .ms-lbl{font-size:7px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px}
    #cam-hud{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:20;
      background:var(--bg-glass-solid);padding:5px 12px;border-radius:var(--radius);
      border:1px solid var(--border);align-items:center;opacity:0.5;transition:opacity 0.3s}
    #cam-hud:hover{opacity:1}
    #cam-hud .hint{font-size:8px;color:var(--text-dim)}
    #cam-hud button{background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-secondary);
      padding:4px 10px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:9px;transition:all 0.15s;font-weight:500}
    #cam-hud button:hover{background:var(--accent-dim);color:var(--text-primary);border-color:var(--accent)}
    #cam-hud button.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    #hud-agents.collapsed{opacity:0;transform:translateX(-20px);pointer-events:none}
    #hud-activity.collapsed{opacity:0;transform:translateX(-20px);pointer-events:none}
    #fp-overlay{position:absolute;inset:0;z-index:30;pointer-events:none;opacity:0;transition:opacity 0.4s}
    #fp-overlay.active{opacity:1}
    #fp-overlay .vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.5) 100%)}
    #fp-agent-bar{position:absolute;top:0;left:0;right:0;padding:12px 20px;
      background:linear-gradient(to bottom,rgba(10,10,20,0.9),transparent);display:flex;align-items:center;gap:14px;pointer-events:auto}
    #fp-agent-bar .fp-dot{width:12px;height:12px;border-radius:50%}
    #fp-agent-bar .fp-name{font-size:16px;font-weight:700}
    #fp-agent-bar .fp-project{font-size:11px;color:var(--text-secondary);background:var(--bg-tertiary);padding:3px 10px;border-radius:4px}
    #fp-agent-bar .fp-state{font-size:10px;padding:3px 10px;border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
    #fp-exit{margin-left:auto;pointer-events:auto;background:var(--bg-tertiary);border:1px solid var(--border);
      color:var(--text-secondary);padding:6px 16px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;transition:all 0.15s}
    #fp-exit:hover{background:var(--error);color:#fff;border-color:var(--error)}
    #fp-feed{position:absolute;bottom:60px;left:20px;width:320px;pointer-events:none}
    .fp-feed-item{padding:6px 12px;margin:3px 0;background:var(--bg-glass-solid);
      border-radius:6px;border-left:3px solid var(--accent);font-size:11px;color:var(--text-secondary);animation:feedIn 0.3s ease-out;opacity:0.9}
    .fp-feed-item.success{border-left-color:var(--success)}
    .fp-feed-item.error{border-left-color:var(--error)}
    .fp-feed-item.think{border-left-color:var(--purple)}
    #fp-detail{position:absolute;bottom:60px;right:20px;width:280px;background:var(--bg-glass-solid);
      border-radius:var(--radius);border:1px solid var(--border);padding:12px;pointer-events:none}
    #fp-detail .fp-d-title{font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}
    #fp-detail .fp-d-file{font-size:12px;color:var(--accent);margin-bottom:4px}
    #fp-detail .fp-d-desc{font-size:10px;color:var(--text-secondary);line-height:1.5}
    #fp-detail .fp-d-progress{margin-top:8px;height:3px;background:var(--bg-primary);border-radius:2px;overflow:hidden}
    #fp-detail .fp-d-bar{height:100%;border-radius:2px;transition:width 0.4s ease-out}
  </style>
</head>
<body>
  <div id="game-container">
    <div id="fp-overlay">
      <div class="vignette"></div>
      <div id="fp-agent-bar">
        <div class="fp-dot" id="fp-dot"></div>
        <span class="fp-name" id="fp-name"></span>
        <span class="fp-project" id="fp-project"></span>
        <span class="fp-state" id="fp-state"></span>
        <button id="fp-exit">ESC — Exit First Person</button>
      </div>
      <div id="fp-feed"></div>
      <div id="fp-detail">
        <div class="fp-d-title">CURRENT TASK</div>
        <div class="fp-d-file" id="fp-file">—</div>
        <div class="fp-d-desc" id="fp-desc">Waiting for assignment...</div>
        <div class="fp-d-progress"><div class="fp-d-bar" id="fp-bar" style="width:0%;background:var(--accent)"></div></div>
      </div>
    </div>
  </div>

  <div id="hud-top" class="hud">
    <div class="logo">VISUALAGENTS<span>Office</span></div>
    <div id="mode-ind" class="hud-mode">● LIVE</div>
    <div class="hud-stats">
      <div class="hud-stat"><span class="val" id="s-tasks">0</span><span class="lbl">tasks</span></div>
      <div class="hud-stat"><span class="val" id="s-files">0</span><span class="lbl">files</span></div>
      <div class="hud-stat"><span class="val" id="s-tests">0</span><span class="lbl">cmds</span></div>
      <div class="hud-stat"><span class="val" id="s-deploys">0</span><span class="lbl">dep</span></div>
      <div class="hud-stat success"><span class="val" id="s-rate">100%</span><span class="lbl">ok</span></div>
    </div>
    <div id="time-ind" class="hud-time">Midday</div>
    <div id="fps-c" class="hud-fps">60</div>
  </div>

  <div id="hud-agents"></div>

  <div id="hud-activity">
    <div class="feed-header">Activity <span id="log-count">0</span></div>
    <div id="activity-log"></div>
  </div>

  <div id="hud-stats">
    <div class="mini-stat"><span class="ms-val s" id="sb-c">0</span><span class="ms-lbl">Done</span></div>
    <div class="mini-stat"><span class="ms-val e" id="sb-f">0</span><span class="ms-lbl">Fail</span></div>
    <div class="mini-stat"><span class="ms-val" id="sb-s">0</span><span class="ms-lbl">Search</span></div>
    <div class="mini-stat"><span class="ms-val" id="sb-d">0</span><span class="ms-lbl">Deploy</span></div>
  </div>

  <div id="cam-hud">
    <button id="btn-zin">+</button>
    <button id="btn-zout">−</button>
    <button id="btn-center">Center</button>
    <button id="btn-overview">Overview</button>
    <button id="btn-fp">👁 FP</button>
    <span class="hint">WASD · Scroll · Click agent</span>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
