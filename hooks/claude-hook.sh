#!/usr/bin/env bash
#
# Claude Code Hook for VisualAgents
# ===================================
# This hook captures Claude Code tool events and writes them to events.jsonl
# so VisualAgents can visualize your agents in real time.
#
# SETUP:
# Add this to your Claude Code settings (~/.claude/settings.json or project .claude/settings.json):
#
# {
#   "hooks": {
#     "PreToolUse": [{ "command": "bash /path/to/claude-hook.sh pre" }],
#     "PostToolUse": [{ "command": "bash /path/to/claude-hook.sh post" }],
#     "SubagentStart": [{ "command": "bash /path/to/claude-hook.sh agent-start" }],
#     "SubagentEnd": [{ "command": "bash /path/to/claude-hook.sh agent-end" }]
#   }
# }

PHASE="$1"
EVENTS_FILE="${VISUALAGENTS_EVENTS:-./events.jsonl}"

# Read hook data from stdin (Claude Code sends JSON)
INPUT_JSON=$(cat)

# Extract fields from the hook JSON
TOOL=$(echo "$INPUT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name', d.get('tool', '')))" 2>/dev/null || echo "unknown")
TOOL_INPUT=$(echo "$INPUT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); i=d.get('tool_input', d.get('input', '')); print(i if isinstance(i, str) else json.dumps(i)[:200])" 2>/dev/null || echo "")
RESULT=$(echo "$INPUT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('tool_result', d.get('result', '')))[:200])" 2>/dev/null || echo "")
AGENT_ID=$(echo "$INPUT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('agent_id', d.get('session_id', 'main')))" 2>/dev/null || echo "main")
AGENT_NAME=$(echo "$INPUT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('agent_name', d.get('name', 'Main Agent')))" 2>/dev/null || echo "Main Agent")

TS=$(date +%s%3N 2>/dev/null || python3 -c "import time; print(int(time.time()*1000))")

# Write event as JSONL
printf '{"ts":%s,"phase":"%s","tool":"%s","input":"%s","result":"%s","agent_id":"%s","agent_name":"%s","raw_type":"hook"}\n' \
  "$TS" "$PHASE" "$TOOL" "$(echo "$TOOL_INPUT" | sed 's/"/\\"/g' | head -c 200)" "$(echo "$RESULT" | sed 's/"/\\"/g' | head -c 200)" "$AGENT_ID" "$AGENT_NAME" \
  >> "$EVENTS_FILE"
