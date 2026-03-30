#!/usr/bin/env node
/**
 * VisualAgents Hook for Claude Code
 *
 * This script is called by Claude Code hooks (PreToolUse / PostToolUse).
 * It reads the event JSON from stdin, adds metadata, and appends to
 * a JSONL file that VisualAgents reads in real-time.
 *
 * Setup: Add to your .claude/settings.json (or project .claude/settings.json):
 *
 * {
 *   "hooks": {
 *     "PreToolUse": [{ "type": "command", "command": "node hooks/va-hook.js pre" }],
 *     "PostToolUse": [{ "type": "command", "command": "node hooks/va-hook.js post" }],
 *     "SubagentCreate": [{ "type": "command", "command": "node hooks/va-hook.js agent-start" }],
 *     "SubagentComplete": [{ "type": "command", "command": "node hooks/va-hook.js agent-end" }]
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, '..', 'events.jsonl');
const phase = process.argv[2] || 'unknown';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = input.trim() ? JSON.parse(input) : {};
    const event = {
      ts: Date.now(),
      phase,               // "pre", "post", "agent-start", "agent-end"
      tool: data.tool_name || data.tool || '',
      input: summarizeInput(data),
      result: data.result ? String(data.result).substring(0, 200) : '',
      agent_id: data.agent_id || data.session_id || 'main',
      agent_name: data.agent_name || '',
      raw_type: data.type || '',
    };
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
  } catch (e) {
    // Silently ignore errors — don't break Claude Code
  }
  // Always exit cleanly so we don't block Claude Code
  process.exit(0);
});

function summarizeInput(data) {
  if (!data.tool_input && !data.input) return '';
  const inp = data.tool_input || data.input || {};
  if (typeof inp === 'string') return inp.substring(0, 200);
  // Summarize common tool inputs
  if (inp.file_path) return inp.file_path;
  if (inp.command) return inp.command.substring(0, 150);
  if (inp.pattern) return `grep: ${inp.pattern}`;
  if (inp.query) return inp.query.substring(0, 150);
  if (inp.prompt) return inp.prompt.substring(0, 150);
  return JSON.stringify(inp).substring(0, 200);
}
