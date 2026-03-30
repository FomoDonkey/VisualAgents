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
      --bg-card:#14142280;--bg-glass:rgba(12,12,22,0.85);
      --border:#222240;--border-bright:#3a4a6a;
      --text-primary:#e0e0f0;--text-secondary:#8a8aaa;--text-dim:#4a4a6a;
      --accent:#4a8aff;--accent-glow:#4a8aff40;--accent-dim:#2a4a8a;
      --success:#40d880;--error:#ff4a5a;--warning:#ffaa40;--purple:#9a6adf;
      --radius:8px;
    }
    body{background:var(--bg-primary);font-family:'JetBrains Mono',monospace;color:var(--text-primary);overflow:hidden;height:100vh;display:flex;flex-direction:column}
    #top-bar{height:44px;background:var(--bg-secondary);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:20px;flex-shrink:0;z-index:100;backdrop-filter:blur(12px)}
    #top-bar .logo{font-size:13px;font-weight:700;color:var(--accent);letter-spacing:1.5px}
    #top-bar .logo span{color:var(--text-dim);font-weight:300;font-size:11px;margin-left:6px}
    #top-bar .sep{width:1px;height:20px;background:var(--border)}
    .top-stats{display:flex;gap:24px;font-size:11px}
    .top-stat{display:flex;align-items:baseline;gap:4px}
    .top-stat .val{font-weight:700;color:var(--text-primary);font-size:13px;min-width:20px}
    .top-stat .lbl{color:var(--text-dim);font-size:9px;text-transform:uppercase;letter-spacing:1px}
    .top-stat.success .val{color:var(--success)}
    .top-right{margin-left:auto;display:flex;align-items:center;gap:16px}
    .top-right .time{font-size:11px;color:var(--text-secondary);background:var(--bg-tertiary);padding:3px 10px;border-radius:4px;border:1px solid var(--border)}
    .top-right .fps{font-size:9px;color:var(--text-dim)}
    #main-layout{flex:1;display:flex;overflow:hidden;position:relative}
    #left-panel{width:240px;background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;z-index:50;transition:width 0.3s}
    .panel-head{padding:12px 14px;font-size:9px;font-weight:600;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
    #agents-list{flex:1;overflow-y:auto;padding:6px}
    #agents-list::-webkit-scrollbar{width:3px}
    #agents-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
    .agent-card{padding:10px 12px;margin:3px 0;border-radius:var(--radius);cursor:pointer;transition:all 0.2s;border:1px solid transparent;position:relative;overflow:hidden}
    .agent-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0;transition:opacity 0.2s;opacity:0}
    .agent-card:hover{background:var(--bg-tertiary)}
    .agent-card.selected{background:var(--bg-tertiary);border-color:var(--accent-dim)}
    .agent-card.selected::before{opacity:1}
    .agent-card .a-row{display:flex;align-items:center;gap:8px}
    .agent-card .a-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;box-shadow:0 0 6px var(--accent-glow);transition:box-shadow 0.3s}
    .agent-card .a-dot.active{animation:dotPulse 1.2s ease-in-out infinite}
    @keyframes dotPulse{0%,100%{box-shadow:0 0 4px var(--accent-glow)}50%{box-shadow:0 0 12px var(--accent-glow)}}
    .agent-card .a-name{font-size:12px;font-weight:600;cursor:default}
    .agent-card .a-rename{font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:2px;opacity:0;transition:opacity 0.15s}
    .agent-card:hover .a-rename{opacity:0.6}
    .agent-card .a-rename:hover{opacity:1;color:var(--accent)}
    .agent-card .a-badge{font-size:8px;padding:2px 6px;border-radius:3px;margin-left:auto;font-weight:600;letter-spacing:0.5px;text-transform:uppercase}
    .a-badge.idle{background:#152015;color:var(--success)} .a-badge.walking{background:#1f1f10;color:var(--warning)}
    .a-badge.working{background:#101528;color:var(--accent)} .a-badge.thinking{background:#151028;color:var(--purple)}
    .a-badge.done{background:#152015;color:var(--success)} .a-badge.error{background:#201015;color:var(--error)}
    .a-badge.arriving{background:#1f1f10;color:var(--warning)}
    .agent-card .a-task{font-size:10px;color:var(--text-secondary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .agent-card .a-loc{font-size:9px;color:var(--text-dim);margin-top:2px;display:flex;align-items:center;gap:4px}
    .agent-card .a-bar{height:2px;background:var(--bg-primary);border-radius:1px;margin-top:6px;overflow:hidden}
    .agent-card .a-fill{height:100%;border-radius:1px;transition:width 0.5s ease-out}
    #game-container{flex:1;position:relative;overflow:hidden;background:var(--bg-primary);display:flex;align-items:center;justify-content:center}
    #game-container canvas{image-rendering:pixelated;image-rendering:crisp-edges;-ms-interpolation-mode:nearest-neighbor}
    #cam-hud{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:20;background:var(--bg-glass);backdrop-filter:blur(12px);padding:6px 14px;border-radius:var(--radius);border:1px solid var(--border);align-items:center}
    #cam-hud .hint{font-size:9px;color:var(--text-dim)}
    #cam-hud button{background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-secondary);padding:5px 12px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:10px;transition:all 0.15s;font-weight:500}
    #cam-hud button:hover{background:var(--accent-dim);color:var(--text-primary);border-color:var(--accent)}
    #cam-hud button.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    #fp-overlay{position:absolute;inset:0;z-index:30;pointer-events:none;opacity:0;transition:opacity 0.4s}
    #fp-overlay.active{opacity:1}
    #fp-overlay .vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.5) 100%)}
    #fp-agent-bar{position:absolute;top:0;left:0;right:0;padding:12px 20px;background:linear-gradient(to bottom,rgba(10,10,20,0.9),transparent);display:flex;align-items:center;gap:14px;pointer-events:auto}
    #fp-agent-bar .fp-dot{width:12px;height:12px;border-radius:50%}
    #fp-agent-bar .fp-name{font-size:16px;font-weight:700}
    #fp-agent-bar .fp-project{font-size:11px;color:var(--text-secondary);background:var(--bg-tertiary);padding:3px 10px;border-radius:4px}
    #fp-agent-bar .fp-state{font-size:10px;padding:3px 10px;border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
    #fp-exit{margin-left:auto;pointer-events:auto;background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-secondary);padding:6px 16px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;transition:all 0.15s}
    #fp-exit:hover{background:var(--error);color:#fff;border-color:var(--error)}
    #fp-feed{position:absolute;bottom:60px;left:20px;width:320px;pointer-events:none}
    .fp-feed-item{padding:6px 12px;margin:3px 0;background:var(--bg-glass);backdrop-filter:blur(8px);border-radius:6px;border-left:3px solid var(--accent);font-size:11px;color:var(--text-secondary);animation:feedIn 0.3s ease-out;opacity:0.9}
    .fp-feed-item.success{border-left-color:var(--success)}
    .fp-feed-item.error{border-left-color:var(--error)}
    .fp-feed-item.think{border-left-color:var(--purple)}
    @keyframes feedIn{from{opacity:0;transform:translateX(-20px)}to{opacity:0.9;transform:translateX(0)}}
    #fp-detail{position:absolute;bottom:60px;right:20px;width:280px;background:var(--bg-glass);backdrop-filter:blur(8px);border-radius:var(--radius);border:1px solid var(--border);padding:12px;pointer-events:none}
    #fp-detail .fp-d-title{font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}
    #fp-detail .fp-d-file{font-size:12px;color:var(--accent);margin-bottom:4px}
    #fp-detail .fp-d-desc{font-size:10px;color:var(--text-secondary);line-height:1.5}
    #fp-detail .fp-d-progress{margin-top:8px;height:3px;background:var(--bg-primary);border-radius:2px;overflow:hidden}
    #fp-detail .fp-d-bar{height:100%;border-radius:2px;transition:width 0.4s ease-out}
    #right-panel{width:340px;background:var(--bg-secondary);border-left:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;z-index:50}
    #activity-log{flex:1;overflow-y:auto;padding:6px 10px;font-size:11px;line-height:1.5}
    #activity-log::-webkit-scrollbar{width:3px}
    #activity-log::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
    .log-entry{padding:5px 0;border-bottom:1px solid #12121e;animation:logIn 0.25s ease-out}
    @keyframes logIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    .log-entry .l-time{color:var(--text-dim);font-size:9px;margin-right:6px;font-variant-numeric:tabular-nums}
    .log-entry .l-agent{font-weight:600;font-size:10px;margin-right:4px}
    .log-entry .l-action{color:var(--text-secondary);font-size:10px}
    .log-entry .l-detail{color:var(--text-dim);font-size:9px;display:block;padding-left:52px;margin-top:1px}
    .log-entry.success .l-action{color:var(--success)} .log-entry.error .l-action{color:var(--error)}
    .log-entry.thinking .l-action{color:var(--purple)} .log-entry.deploy .l-action{color:var(--warning)}
    #stats-bar{padding:10px 14px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .stat-item{display:flex;justify-content:space-between;font-size:10px}
    .stat-item .label{color:var(--text-dim)} .stat-item .value{font-weight:600}
    .stat-item .value.s{color:var(--success)} .stat-item .value.e{color:var(--error)}
  </style>
</head>
<body>
  <div id="top-bar">
    <div class="logo">VISUALAGENTS<span>Claude Code Office</span></div>
    <div class="sep"></div>
    <div class="top-stats">
      <div class="top-stat"><span class="val" id="s-tasks">0</span><span class="lbl">tasks</span></div>
      <div class="top-stat"><span class="val" id="s-files">0</span><span class="lbl">files</span></div>
      <div class="top-stat"><span class="val" id="s-tests">0</span><span class="lbl">tests</span></div>
      <div class="top-stat"><span class="val" id="s-deploys">0</span><span class="lbl">deploys</span></div>
      <div class="top-stat success"><span class="val" id="s-rate">100%</span><span class="lbl">success</span></div>
    </div>
    <div class="top-right">
      <div id="mode-ind" style="font-size:10px;color:var(--success);font-weight:600">LIVE</div>
      <div class="time" id="time-ind">Midday</div>
      <div class="fps" id="fps-c">60 FPS</div>
    </div>
  </div>

  <div id="main-layout">
    <div id="left-panel">
      <div class="panel-head">TEAM<span id="agent-count">5 agents</span></div>
      <div id="agents-list"></div>
    </div>

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

      <div id="cam-hud">
        <button id="btn-zin">+</button>
        <button id="btn-zout">-</button>
        <button id="btn-center">Center</button>
        <button id="btn-overview">Overview</button>
        <button id="btn-fp">First Person</button>
        <div class="sep" style="width:1px;height:16px;background:var(--border)"></div>
        <span class="hint">WASD · Scroll zoom · Click/DblClick agent</span>
      </div>
    </div>

    <div id="right-panel">
      <div class="panel-head">ACTIVITY LOG<span id="log-count">0 events</span></div>
      <div id="activity-log"></div>
      <div id="stats-bar">
        <div class="stat-item"><span class="label">Completed</span><span class="value s" id="sb-c">0</span></div>
        <div class="stat-item"><span class="label">Failed</span><span class="value e" id="sb-f">0</span></div>
        <div class="stat-item"><span class="label">Searches</span><span class="value" id="sb-s">0</span></div>
        <div class="stat-item"><span class="label">Deploys</span><span class="value" id="sb-d">0</span></div>
      </div>
    </div>
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
