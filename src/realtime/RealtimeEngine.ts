import { AgentManager } from '../agents/AgentManager';
import { getBuildingByType } from '../world/BuildingRegistry';
import { eventBus } from '../simulation/EventBus';
import { EVENTS } from '../types/events';
import { BuildingType, WorldStats, Task } from '../types';

interface RawEvent {
  ts: number;
  phase: string;       // "pre", "post", "agent-start", "agent-end"
  tool: string;
  input: string;
  result: string;
  agent_id: string;
  agent_name: string;
  raw_type: string;
}

// Map Claude Code tools to office rooms
function toolToRoom(tool: string): BuildingType {
  const t = tool.toLowerCase();
  if (t === 'read' || t === 'glob') return 'file-library';
  if (t === 'write' || t === 'edit' || t === 'notebookedit') return 'code-workshop';
  if (t === 'bash') return 'terminal-tower';
  if (t === 'grep' || t === 'websearch' || t === 'webfetch') return 'search-station';
  if (t === 'agent' || t === 'enterplanmode' || t === 'exitplanmode' || t === 'askeruserquestion') return 'think-tank';
  if (t === 'skill') return 'deploy-dock';
  // Default for unknown tools
  return 'code-workshop';
}

function toolToTaskType(tool: string): 'read' | 'write' | 'bash' | 'search' | 'think' | 'deploy' {
  const t = tool.toLowerCase();
  if (t === 'read' || t === 'glob') return 'read';
  if (t === 'write' || t === 'edit') return 'write';
  if (t === 'bash') return 'bash';
  if (t === 'grep' || t === 'websearch' || t === 'webfetch') return 'search';
  if (t === 'agent' || t === 'enterplanmode' || t === 'exitplanmode' || t === 'askeruserquestion') return 'think';
  if (t === 'skill') return 'deploy';
  return 'write';
}

function toolDescription(tool: string, input: string): string {
  const t = tool.toLowerCase();
  const short = input.length > 60 ? input.substring(0, 57) + '...' : input;
  if (t === 'read') return `Reading ${short}`;
  if (t === 'write') return `Writing ${short}`;
  if (t === 'edit') return `Editing ${short}`;
  if (t === 'bash') return `$ ${short}`;
  if (t === 'grep') return `Searching: ${short}`;
  if (t === 'glob') return `Finding files: ${short}`;
  if (t === 'agent') return `Spawning agent: ${short}`;
  if (t === 'websearch') return `Web search: ${short}`;
  if (t === 'enterplanmode') return 'Entering plan mode...';
  if (t === 'exitplanmode') return 'Plan complete';
  if (t === 'askeruserquestion') return 'Asking user...';
  if (t === 'skill') return `Running skill: ${short}`;
  return `${tool}: ${short}`;
}

// Assign real agent IDs to visual agent slots
const AGENT_SLOTS = ['blue', 'red', 'green', 'purple', 'orange'];

// Detect if running inside a VS Code / Antigravity webview
const isWebview = typeof (window as any).acquireVsCodeApi === 'function';
const vscodeApi = isWebview ? (window as any).acquireVsCodeApi() : null;

export class RealtimeEngine {
  private agentManager: AgentManager;
  private pollTimer = 0;
  private lastTs = 0;
  private agentIdMap: Map<string, string> = new Map(); // real_id → slot_id
  private nextSlot = 0;
  private connected = false;
  private stats: WorldStats = {
    tasksCompleted: 0, tasksFailed: 0, filesEdited: 0,
    testsRun: 0, searchesDone: 0, deploysCompleted: 0,
  };
  private taskCounter = 0;
  private activeToolByAgent: Map<string, number> = new Map(); // agent slot → start time

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;

    // In webview mode, listen for events from the extension host
    if (isWebview) {
      window.addEventListener('message', (event: MessageEvent) => {
        const msg = event.data;
        if (msg.type === 'events' && Array.isArray(msg.events)) {
          this.connected = true;
          for (const ev of msg.events) {
            this.processEvent(ev);
          }
        }
      });
      // Tell extension host we're ready
      vscodeApi?.postMessage({ type: 'ready' });
    }
  }

  update(delta: number): void {
    // In webview mode, events arrive via postMessage — no polling needed
    if (!isWebview) {
      this.pollTimer += delta;
      if (this.pollTimer >= 600) {
        this.pollTimer = 0;
        this.poll();
      }
    }
    eventBus.emit(EVENTS.WORLD_STATS_UPDATED, this.stats);
  }

  /** Force an immediate poll (ignores timer). */
  forcePoll(): void {
    if (!isWebview) this.poll();
  }

  isConnected(): boolean { return this.connected; }

  private async poll(): Promise<void> {
    try {
      const res = await fetch(`/api/events?since=${this.lastTs}`);
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        this.connected = true;
        for (const ev of data.events) {
          this.processEvent(ev);
        }
        this.lastTs = data.lastTs;
      }
    } catch {
      // Server not ready yet — ignore
    }
  }

  private getSlotForAgent(realId: string): string {
    if (this.agentIdMap.has(realId)) return this.agentIdMap.get(realId)!;
    const slot = AGENT_SLOTS[this.nextSlot % AGENT_SLOTS.length];
    this.agentIdMap.set(realId, slot);
    this.nextSlot++;
    return slot;
  }

  private processEvent(ev: RawEvent): void {
    const slotId = this.getSlotForAgent(ev.agent_id);
    const agent = this.agentManager.getAgent(slotId);
    if (!agent) return;

    if (ev.phase === 'pre') {
      // Tool starting — move agent to the right room
      const room = toolToRoom(ev.tool);
      const building = getBuildingByType(room);
      const taskType = toolToTaskType(ev.tool);
      const desc = toolDescription(ev.tool, ev.input);

      const task: Task = {
        id: `rt-${++this.taskCounter}`,
        type: taskType,
        building: room,
        description: desc,
        duration: 8000, // Will be ended by "post" event
        relatedFile: ev.input,
      };

      this.activeToolByAgent.set(slotId, ev.ts);

      agent.assignTask(task, building.entranceTile, () => {
        // Task complete callback
      });

      eventBus.emit(EVENTS.AGENT_TASK_ASSIGNED, {
        agentId: slotId,
        task,
        projectName: ev.tool,
      });
    }

    if (ev.phase === 'post') {
      // Tool finished — complete the task
      const isError = ev.result.toLowerCase().includes('error') ||
                      ev.result.toLowerCase().includes('failed');

      if (isError) {
        this.stats.tasksFailed++;
      } else {
        this.stats.tasksCompleted++;
      }
      if (ev.tool.toLowerCase() === 'write' || ev.tool.toLowerCase() === 'edit') this.stats.filesEdited++;
      if (ev.tool.toLowerCase() === 'bash') this.stats.testsRun++;
      if (ev.tool.toLowerCase() === 'grep' || ev.tool.toLowerCase() === 'websearch') this.stats.searchesDone++;
      if (ev.tool.toLowerCase() === 'skill') this.stats.deploysCompleted++;

      // Force-complete the agent's current task
      const s = agent.fsm.state;
      if (s === 'working' || s === 'thinking' || s === 'walking' || s === 'arriving') {
        agent.fsm.transition(isError ? 'error' : 'done');
      }

      // Always emit the completion event for the log
      const task = agent.currentTask || {
        id: `rt-post-${this.taskCounter}`,
        type: toolToTaskType(ev.tool),
        building: toolToRoom(ev.tool),
        description: toolDescription(ev.tool, ev.input),
        duration: 0,
        relatedFile: ev.input,
      };

      eventBus.emit(EVENTS.AGENT_TASK_COMPLETE, {
        agentId: slotId,
        task,
        result: isError ? 'error' : 'success',
      });

      this.activeToolByAgent.delete(slotId);
    }
  }
}
