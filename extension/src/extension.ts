import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VisualizationPanel } from './panel';

const HOOK_SCRIPT = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const EVENTS_FILE = path.join(process.env.VISUALAGENTS_EVENTS || process.cwd(), 'events.jsonl');
const phase = process.argv[2] || 'unknown';
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = input.trim() ? JSON.parse(input) : {};
    const inp = data.tool_input || data.input || {};
    let summary = '';
    if (typeof inp === 'string') summary = inp.substring(0, 200);
    else if (inp.file_path) summary = inp.file_path;
    else if (inp.command) summary = inp.command.substring(0, 150);
    else if (inp.pattern) summary = 'grep: ' + inp.pattern;
    else if (inp.prompt) summary = inp.prompt.substring(0, 150);
    else summary = JSON.stringify(inp).substring(0, 200);
    const event = {
      ts: Date.now(),
      phase,
      tool: data.tool_name || data.tool || '',
      input: summary,
      result: data.result ? String(data.result).substring(0, 200) : '',
      agent_id: data.agent_id || data.session_id || 'main',
      agent_name: data.agent_name || '',
      raw_type: data.type || '',
    };
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\\n');
  } catch {}
  process.exit(0);
});`;

export function activate(context: vscode.ExtensionContext) {
  // Command: open the visualizer panel
  context.subscriptions.push(
    vscode.commands.registerCommand('visualagents.open', () => {
      VisualizationPanel.createOrShow(context);
    })
  );

  // Command: connect Claude Code — writes hook file + shows instructions
  context.subscriptions.push(
    vscode.commands.registerCommand('visualagents.connectClaudeCode', async () => {
      const panel = VisualizationPanel.createOrShow(context);

      // Write hook script to extension storage (persistent across sessions)
      const hookDir = path.join(context.globalStorageUri.fsPath, 'hooks');
      fs.mkdirSync(hookDir, { recursive: true });
      const hookPath = path.join(hookDir, 'va-hook.cjs');
      fs.writeFileSync(hookPath, HOOK_SCRIPT);

      const hookPathNorm = hookPath.replace(/\\/g, '/');

      // Offer to auto-configure or show manual instructions
      const choice = await vscode.window.showInformationMessage(
        'VisualAgents: How do you want to set up the Claude Code hooks?',
        'Auto-configure (project)',
        'Auto-configure (global)',
        'Show manual instructions'
      );

      if (choice === 'Show manual instructions') {
        const doc = await vscode.workspace.openTextDocument({
          content: getManualInstructions(hookPathNorm),
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc);
        return;
      }

      if (choice === 'Auto-configure (project)' || choice === 'Auto-configure (global)') {
        const isGlobal = choice.includes('global');
        const settingsPath = isGlobal
          ? path.join(getClaudeHome(), 'settings.json')
          : path.join(getWorkspaceRoot(), '.claude', 'settings.local.json');

        try {
          const settingsDir = path.dirname(settingsPath);
          fs.mkdirSync(settingsDir, { recursive: true });

          let settings: any = {};
          if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          }

          if (!settings.hooks) settings.hooks = {};

          // Merge — don't overwrite existing hooks
          for (const phase of ['PreToolUse', 'PostToolUse']) {
            const cmd = `node "${hookPathNorm}" ${phase === 'PreToolUse' ? 'pre' : 'post'}`;
            const entry = {
              matcher: '',
              hooks: [{ type: 'command', command: cmd }],
            };

            if (!settings.hooks[phase]) {
              settings.hooks[phase] = [entry];
            } else {
              // Check if already configured
              const exists = settings.hooks[phase].some(
                (h: any) => h.hooks?.some((hh: any) => hh.command?.includes('va-hook'))
              );
              if (!exists) {
                settings.hooks[phase].push(entry);
              }
            }
          }

          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

          vscode.window.showInformationMessage(
            `VisualAgents: hooks configured in ${isGlobal ? 'global' : 'project'} settings. ` +
            'Restart Claude Code for changes to take effect.'
          );
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to write settings: ${err.message}`);
        }
      }
    })
  );

  // Command: connect (custom events path)
  context.subscriptions.push(
    vscode.commands.registerCommand('visualagents.setEventsPath', async () => {
      const config = vscode.workspace.getConfiguration('visualagents');
      const currentPath = config.get<string>('eventsFile') || '';

      const result = await vscode.window.showInputBox({
        prompt: 'Path to events.jsonl (leave empty for workspace root)',
        value: currentPath,
        placeHolder: '/path/to/your/project/events.jsonl',
      });

      if (result !== undefined) {
        await config.update('eventsFile', result, vscode.ConfigurationTarget.Workspace);
        const panel = VisualizationPanel.currentInstance();
        if (panel) panel.updateEventsPath(result);
        vscode.window.showInformationMessage(
          result
            ? `VisualAgents: watching ${result}`
            : 'VisualAgents: watching workspace root for events.jsonl'
        );
      }
    })
  );

  // Auto-open when agent activity is detected
  const autoOpenConfig = vscode.workspace.getConfiguration('visualagents');
  const autoOpen = autoOpenConfig.get<boolean>('autoOpen');

  if (autoOpen) {
    VisualizationPanel.createOrShow(context);
  } else {
    // Lightweight auto-open: just one listener for file saves (minimal resources)
    // The full IdeWatcher with all its listeners only starts when the panel opens
    const saveWatcher = vscode.workspace.onDidSaveTextDocument(() => {
      if (!VisualizationPanel.currentInstance()) {
        VisualizationPanel.createOrShow(context);
      }
      saveWatcher.dispose(); // One-shot: stop after first trigger
    });
    context.subscriptions.push(saveWatcher);
  }
}

export function deactivate() {
  VisualizationPanel.dispose();
}

function getClaudeHome(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.claude');
}

function getWorkspaceRoot(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
}

function getManualInstructions(hookPath: string): string {
  return `# VisualAgents — Claude Code Setup

## Add these hooks to your Claude Code settings

File: \`~/.claude/settings.json\` (global) or \`.claude/settings.local.json\` (per-project)

\`\`\`json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node \\"${hookPath}\\" pre"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node \\"${hookPath}\\" post"
          }
        ]
      }
    ]
  }
}
\`\`\`

## Then:
1. Restart Claude Code (or start a new session)
2. Open VS Code/Antigravity command palette: \`Ctrl+Shift+P\`
3. Run: **VisualAgents: Open Agent Visualizer**
4. Start using Claude Code — your agents will appear in the visualization!
`;
}
