#!/usr/bin/env node
/**
 * VisualAgents Hook for Claude Code
 * Captures tool events and writes to events.jsonl
 */

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
    const event = {
      ts: Date.now(),
      phase,
      tool: data.tool_name || data.tool || '',
      input: summarizeInput(data),
      result: summarizeResult(data),
      agent_id: data.agent_id || data.session_id || 'main',
      agent_name: data.agent_name || data.name || 'Claude',
      raw_type: data.type || '',
    };
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
  } catch (e) {
    // Silently ignore errors — don't break Claude Code
  }
  process.exit(0);
});

function shortPath(p) {
  if (!p) return '';
  const parts = p.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return parts.join('/');
  return parts.slice(-2).join('/');
}

function summarizeInput(data) {
  if (!data.tool_input && !data.input) return '';
  const inp = data.tool_input || data.input || {};
  if (typeof inp === 'string') return shortPath(inp.substring(0, 200));
  if (inp.file_path) return shortPath(inp.file_path);
  if (inp.command) {
    const cmd = inp.command.replace(/\s+2>&1$/, '').trim();
    return cmd.substring(0, 120);
  }
  if (inp.pattern) return inp.pattern.substring(0, 80);
  if (inp.query) return inp.query.substring(0, 80);
  if (inp.prompt) return inp.prompt.substring(0, 80);
  if (inp.description) return inp.description.substring(0, 80);
  if (inp.subject) return inp.subject.substring(0, 80);
  if (inp.skill) return inp.skill;
  if (inp.old_string) return shortPath(inp.file_path || '') + ' (replace)';
  return JSON.stringify(inp).substring(0, 120);
}

function summarizeResult(data) {
  // Claude Code sends tool_response (not tool_result) in PostToolUse hooks
  const r = data.tool_response || data.tool_result || data.result || '';
  if (!r) return '';
  // tool_response can be an object — stringify if needed
  const s = typeof r === 'object' ? JSON.stringify(r).substring(0, 300) : String(r);
  if (s.toLowerCase().includes('error')) return 'error';
  if (s.toLowerCase().includes('failed')) return 'failed';
  return s.substring(0, 100);
}
