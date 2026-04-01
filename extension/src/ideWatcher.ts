import * as vscode from 'vscode';

/**
 * Watches VS Code / Antigravity IDE events (file saves, terminal activity,
 * document opens, etc.) and converts them to VisualAgents events.
 *
 * This works with ANY AI agent running inside the IDE — Antigravity's Gemini,
 * Claude Code via extension, Copilot, Cursor, etc. — because it watches
 * the IDE's own activity rather than agent-specific logs.
 */

export interface IdeEvent {
  ts: number;
  phase: 'pre' | 'post';
  tool: string;
  input: string;
  result: string;
  agent_id: string;
  agent_name: string;
  raw_type: string;
}

type EventCallback = (events: IdeEvent[]) => void;

export class IdeWatcher {
  private disposables: vscode.Disposable[] = [];
  private onEvents: EventCallback;
  private active = false;
  private recentEdits: Map<string, number> = new Map(); // debounce file saves

  constructor(onEvents: EventCallback) {
    this.onEvents = onEvents;
  }

  start(): void {
    if (this.active) return;
    this.active = true;

    // File saves → "Write" / "Edit" tool events
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const now = Date.now();
        const key = doc.uri.fsPath;
        const last = this.recentEdits.get(key) || 0;
        // Debounce: skip if same file saved within 500ms
        if (now - last < 500) return;
        this.recentEdits.set(key, now);

        const relPath = vscode.workspace.asRelativePath(doc.uri);
        this.emit('Edit', relPath, '', 'ide-agent', 'IDE Agent');
      })
    );

    // File creates/deletes via FileSystemWatcher
    const watcher = vscode.workspace.createFileSystemWatcher('**/*', false, true, false);
    this.disposables.push(
      watcher.onDidCreate((uri) => {
        const relPath = vscode.workspace.asRelativePath(uri);
        // Skip node_modules, .git, dist, etc.
        if (this.shouldIgnore(relPath)) return;
        this.emit('Write', relPath, 'created', 'ide-agent', 'IDE Agent');
      })
    );
    this.disposables.push(
      watcher.onDidDelete((uri) => {
        const relPath = vscode.workspace.asRelativePath(uri);
        if (this.shouldIgnore(relPath)) return;
        this.emit('Bash', `rm ${relPath}`, 'deleted', 'ide-agent', 'IDE Agent');
      })
    );
    this.disposables.push(watcher);

    // Terminal open → "Bash" tool events
    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        this.emit('Bash', terminal.name || 'terminal', '', 'ide-agent', 'IDE Agent');
      })
    );

    // Terminal close
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        this.emit('Bash', `${terminal.name || 'terminal'} closed`, 'exit', 'ide-agent', 'IDE Agent');
      })
    );

    // Document open → "Read" tool events (only non-user-opened, i.e. programmatic)
    let lastDocOpen = 0;
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        const now = Date.now();
        // Batch rapid opens (agent exploring files)
        if (now - lastDocOpen < 200) return;
        lastDocOpen = now;

        // Skip untitled, output, etc.
        if (doc.uri.scheme !== 'file') return;
        const relPath = vscode.workspace.asRelativePath(doc.uri);
        if (this.shouldIgnore(relPath)) return;
        this.emit('Read', relPath, '', 'ide-agent', 'IDE Agent');
      })
    );

    // Diagnostics changes → detect errors (agent's code might cause them)
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics((e) => {
        for (const uri of e.uris) {
          const diags = vscode.languages.getDiagnostics(uri);
          const errors = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
          if (errors.length > 0) {
            const relPath = vscode.workspace.asRelativePath(uri);
            this.emit('Read', relPath, `${errors.length} error(s)`, 'ide-agent', 'IDE Agent');
          }
        }
      })
    );
  }

  stop(): void {
    this.active = false;
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  private emit(tool: string, input: string, result: string, agentId: string, agentName: string): void {
    const pre: IdeEvent = {
      ts: Date.now(),
      phase: 'pre',
      tool,
      input,
      result: '',
      agent_id: agentId,
      agent_name: agentName,
      raw_type: 'ide',
    };
    const post: IdeEvent = {
      ts: Date.now() + 1,
      phase: 'post',
      tool,
      input,
      result: result || 'ok',
      agent_id: agentId,
      agent_name: agentName,
      raw_type: 'ide',
    };
    this.onEvents([pre, post]);
  }

  private shouldIgnore(relPath: string): boolean {
    const ignore = ['node_modules', '.git', 'dist', '.next', '__pycache__',
      'events.jsonl', '.vsix', 'dist-webview', '.angular'];
    return ignore.some(p => relPath.includes(p));
  }
}
