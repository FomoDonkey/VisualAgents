#!/usr/bin/env node
/**
 * Quick event injector for testing.
 * Usage: node hooks/inject.cjs <phase> <tool> <input>
 * Example: node hooks/inject.cjs pre Read src/config.ts
 */
const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, '..', 'events.jsonl');
const phase = process.argv[2] || 'pre';
const tool = process.argv[3] || 'Read';
const input = process.argv.slice(4).join(' ') || '';
const agentId = process.env.VA_AGENT || 'main';

const event = {
  ts: Date.now(),
  phase,
  tool,
  input,
  result: phase === 'post' ? 'ok' : '',
  agent_id: agentId,
  agent_name: '',
  raw_type: '',
};

fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
