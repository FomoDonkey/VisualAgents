#!/usr/bin/env node
/**
 * Claude Code Hook for VisualAgents (Node.js version - works on Windows/Mac/Linux)
 *
 * SETUP — Add to your Claude Code settings:
 *
 * In ~/.claude/settings.json or .claude/settings.json:
 * {
 *   "hooks": {
 *     "PreToolUse": [{ "command": "node /path/to/hooks/claude-hook.js pre" }],
 *     "PostToolUse": [{ "command": "node /path/to/hooks/claude-hook.js post" }]
 *   }
 * }
 *
 * Set VISUALAGENTS_EVENTS env var to customize the events file path.
 * Default: ./events.jsonl (relative to where Claude Code runs)
 */

const fs = require('fs');
const path = require('path');

const phase = process.argv[2] || 'unknown';
const eventsFile = process.env.VISUALAGENTS_EVENTS || path.join(process.cwd(), 'events.jsonl');

// Read JSON from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(inputData); } catch {}

  const tool = data.tool_name || data.tool || 'unknown';
  const toolInput = typeof data.tool_input === 'string'
    ? data.tool_input.slice(0, 200)
    : JSON.stringify(data.tool_input || data.input || '').slice(0, 200);
  const result = String(data.tool_result || data.result || '').slice(0, 200);
  const agentId = data.agent_id || data.session_id || 'main';
  const agentName = data.agent_name || data.name || 'Main Agent';

  const event = {
    ts: Date.now(),
    phase,
    tool,
    input: toolInput,
    result,
    agent_id: agentId,
    agent_name: agentName,
    raw_type: 'hook',
  };

  fs.appendFileSync(eventsFile, JSON.stringify(event) + '\n');
});

// If stdin is already closed (no piped data), still write a minimal event
setTimeout(() => {
  if (!inputData) {
    const event = {
      ts: Date.now(),
      phase,
      tool: 'unknown',
      input: '',
      result: '',
      agent_id: 'main',
      agent_name: 'Main Agent',
      raw_type: 'hook',
    };
    fs.appendFileSync(eventsFile, JSON.stringify(event) + '\n');
  }
}, 100);
