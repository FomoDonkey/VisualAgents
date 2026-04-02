import { AgentManager } from '../agents/AgentManager';
import { getBuildingByType, BUILDINGS } from '../world/BuildingRegistry';
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

/** How long (ms) of silence before a batch is considered complete */
const BATCH_TIMEOUT = 3500;

/**
 * A batch groups rapid consecutive tool calls that go to the same room
 * into a single visual task so the agent has time to walk, work, and
 * the logs stay readable.
 */
interface AgentBatch {
  room: BuildingType;
  taskType: 'read' | 'write' | 'bash' | 'search' | 'think' | 'deploy';
  firstDesc: string;
  count: number;
  postCount: number;
  hasError: boolean;
  idleTime: number;       // ms since last pre/post event (counted by update)
  lastInput: string;
  toolCounts: Map<string, number>;
  // Stats accumulated during this batch (applied on flush)
  filesEdited: number;
  searchesDone: number;
  commandsRun: number;
  deploysCompleted: number;
}

// Map Claude Code tools to office rooms
function toolToRoom(tool: string): BuildingType {
  const t = tool.toLowerCase();
  if (t === 'read' || t === 'glob') return 'file-library';
  if (t === 'write' || t === 'edit' || t === 'notebookedit') return 'code-workshop';
  if (t === 'bash') return 'terminal-tower';
  if (t === 'grep' || t === 'websearch' || t === 'webfetch') return 'search-station';
  if (t === 'agent' || t === 'enterplanmode' || t === 'exitplanmode' || t === 'askuserquestion') return 'think-tank';
  if (t === 'taskcreate' || t === 'taskupdate' || t === 'taskget' || t === 'tasklist') return 'think-tank';
  if (t === 'skill') return 'deploy-dock';
  return 'code-workshop';
}

function toolToTaskType(tool: string): 'read' | 'write' | 'bash' | 'search' | 'think' | 'deploy' {
  const t = tool.toLowerCase();
  if (t === 'read' || t === 'glob') return 'read';
  if (t === 'write' || t === 'edit') return 'write';
  if (t === 'bash') return 'bash';
  if (t === 'grep' || t === 'websearch' || t === 'webfetch') return 'search';
  if (t === 'agent' || t === 'enterplanmode' || t === 'exitplanmode' || t === 'askuserquestion') return 'think';
  if (t === 'taskcreate' || t === 'taskupdate' || t === 'taskget' || t === 'tasklist') return 'think';
  if (t === 'skill') return 'deploy';
  return 'write';
}

function fileName(input: string): string {
  if (!input) return '';
  const parts = input.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || '';
}

function toolDescription(tool: string, input: string): string {
  const t = tool.toLowerCase();
  const name = fileName(input);

  if (t === 'read') return `Reading ${name || 'file'}`;
  if (t === 'write') return `Writing ${name || 'file'}`;
  if (t === 'edit') return `Editing ${name || 'file'}`;
  if (t === 'bash') {
    const raw = input.replace(/\s+2>&1$/, '').trim();
    if (!raw) return 'Running command';
    const clean = raw.replace(/[A-Za-z]:[\\\/][^\s"']*/g, (p) => {
      const parts = p.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1];
    }).replace(/\/[^\s"']*\//g, (p) => {
      const parts = p.split('/').filter(Boolean);
      return parts[parts.length - 1] + '/';
    });
    const parts = clean.split(/\s+/);
    const cmd = parts[0];
    if (cmd === 'npx') return `Running ${parts[1] || 'npx'}`;
    if (cmd === 'npm') return `npm ${parts.slice(1, 3).join(' ')}`;
    if (cmd === 'git') return `git ${parts.slice(1, 3).join(' ')}`;
    if (cmd === 'node') return `Running script`;
    const short = clean.length > 40 ? clean.substring(0, 37) + '...' : clean;
    return `$ ${short}`;
  }
  if (t === 'grep') return `Searching "${input.substring(0, 30)}"`;
  if (t === 'glob') return 'Finding files';
  if (t === 'agent') return 'Spawning sub-agent';
  if (t === 'websearch') return 'Searching the web';
  if (t === 'webfetch') return 'Fetching web page';
  if (t === 'enterplanmode') return 'Planning approach';
  if (t === 'exitplanmode') return 'Plan ready';
  if (t === 'askuserquestion') return 'Waiting for user';
  if (t === 'notebookedit') return `Editing notebook ${name || ''}`.trim();
  if (t === 'skill') return `Running skill ${name}`;
  if (t === 'taskcreate') return 'Creating task';
  if (t === 'taskupdate') return 'Updating task';
  if (t === 'taskget' || t === 'tasklist') return 'Checking tasks';
  return `${tool}`;
}

/** Build a human-readable summary for a batch of tool calls */
function batchSummary(batch: AgentBatch): string {
  if (batch.count === 1) return batch.firstDesc;

  // Find the dominant tool
  let maxTool = '';
  let maxCount = 0;
  for (const [tool, count] of batch.toolCounts) {
    if (count > maxCount) { maxTool = tool; maxCount = count; }
  }
  const t = maxTool.toLowerCase();
  const n = batch.count;

  if (t === 'read' || t === 'glob') return `Reading files (${n})`;
  if (t === 'write') return `Writing files (${n})`;
  if (t === 'edit') return `Editing code (${n})`;
  if (t === 'bash') return `Running commands (${n})`;
  if (t === 'grep') return `Searching codebase (${n})`;
  if (t === 'websearch' || t === 'webfetch') return `Web research (${n})`;
  if (t === 'agent') return `Coordinating agents (${n})`;
  if (t === 'enterplanmode' || t === 'exitplanmode' || t === 'askuserquestion') return `Planning (${n})`;
  if (t === 'taskcreate' || t === 'taskupdate' || t === 'taskget' || t === 'tasklist') return `Managing tasks (${n})`;
  if (t === 'skill') return `Running skills (${n})`;
  return `Working (${n})`;
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
  private agentIdMap: Map<string, string> = new Map();
  private nextSlot = 0;
  private connected = false;
  private stats: WorldStats = {
    tasksCompleted: 0, tasksFailed: 0, filesEdited: 0,
    testsRun: 0, searchesDone: 0, deploysCompleted: 0,
  };
  private taskCounter = 0;
  private statsDirty = true;
  private statsTimer = 0;

  /** Active batches per agent slot — groups rapid tool calls into one visual task */
  private agentBatches: Map<string, AgentBatch> = new Map();

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;

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
      vscodeApi?.postMessage({ type: 'ready' });
    }
  }

  update(delta: number): void {
    if (!isWebview) {
      this.pollTimer += delta;
      if (this.pollTimer >= 600) {
        this.pollTimer = 0;
        this.poll();
      }
    }

    // Check batch timeouts — flush batches with no recent activity
    for (const [slotId, batch] of this.agentBatches) {
      batch.idleTime += delta;
      if (batch.idleTime >= BATCH_TIMEOUT) {
        this.flushBatch(slotId);
      }
    }

    this.statsTimer += delta;
    if (this.statsDirty || this.statsTimer > 2000) {
      eventBus.emit(EVENTS.WORLD_STATS_UPDATED, this.stats);
      this.statsDirty = false;
      this.statsTimer = 0;
    }
  }

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
    } catch {}
  }

  private getSlotForAgent(realId: string): string {
    if (this.agentIdMap.has(realId)) return this.agentIdMap.get(realId)!;
    const slot = AGENT_SLOTS[this.nextSlot % AGENT_SLOTS.length];
    this.agentIdMap.set(realId, slot);
    this.nextSlot++;
    return slot;
  }

  // ======================== CORE EVENT PROCESSING ========================

  private processEvent(ev: RawEvent): void {
    const slotId = this.getSlotForAgent(ev.agent_id);
    const agent = this.agentManager.getAgent(slotId);
    if (!agent) return;

    // Update agent display name
    if (ev.agent_name && ev.agent_name !== 'Claude') {
      const htmlUI = (window as any).__htmlUI;
      if (htmlUI?.setAgentDisplayName) {
        htmlUI.setAgentDisplayName(slotId, ev.agent_name);
      }
    }

    if (ev.phase === 'pre') {
      this.handlePre(slotId, ev);
    } else if (ev.phase === 'post') {
      this.handlePost(slotId, ev);
    }
  }

  private handlePre(slotId: string, ev: RawEvent): void {
    const agent = this.agentManager.getAgent(slotId)!;
    const room = toolToRoom(ev.tool);
    const taskType = toolToTaskType(ev.tool);
    const desc = toolDescription(ev.tool, ev.input);
    const existing = this.agentBatches.get(slotId);

    // ---- Same room? Extend the current batch ----
    if (existing && existing.room === room) {
      existing.count++;
      existing.idleTime = 0;
      existing.toolCounts.set(ev.tool, (existing.toolCounts.get(ev.tool) || 0) + 1);
      existing.lastInput = ev.input;

      // Update agent's visible task description to batch summary
      const summary = batchSummary(existing);
      if (agent.currentTask) {
        agent.currentTask.description = summary;
        agent.currentTask.relatedFile = ev.input;
      }
      // Keep agent working — don't let workTimer expire mid-batch
      agent.extendWork(6000);

      // Update speech bubble (silent = don't create a new log entry)
      eventBus.emit(EVENTS.AGENT_TASK_ASSIGNED, {
        agentId: slotId,
        task: agent.currentTask || { id: 'batch', type: taskType, building: room, description: summary, duration: 0, relatedFile: ev.input },
        projectName: ev.tool,
        silent: true,
      });
      return;
    }

    // ---- Different room or no batch — flush old, start new ----
    if (existing) {
      this.flushBatch(slotId);
    }

    // Create new batch
    const toolCounts = new Map<string, number>();
    toolCounts.set(ev.tool, 1);
    this.agentBatches.set(slotId, {
      room, taskType, firstDesc: desc, count: 1, postCount: 0,
      hasError: false, idleTime: 0, lastInput: ev.input, toolCounts,
      filesEdited: 0, searchesDone: 0, commandsRun: 0, deploysCompleted: 0,
    });

    // Assign visual task — agent walks to the room
    const building = getBuildingByType(room);
    const task: Task = {
      id: `rt-${++this.taskCounter}`,
      type: taskType,
      building: room,
      description: desc,
      duration: 30000, // Long duration — batch flush will end it
      relatedFile: ev.input,
    };

    agent.assignTask(task, building.entranceTile, () => {});

    // Log + speech bubble (not silent — first event in batch)
    eventBus.emit(EVENTS.AGENT_TASK_ASSIGNED, {
      agentId: slotId,
      task,
      projectName: ev.tool,
    });
  }

  private handlePost(slotId: string, ev: RawEvent): void {
    const agent = this.agentManager.getAgent(slotId)!;
    const isError = ev.result.toLowerCase().includes('error') ||
                    ev.result.toLowerCase().includes('failed');
    const batch = this.agentBatches.get(slotId);

    if (batch) {
      // Part of an active batch — accumulate, don't complete yet
      batch.postCount++;
      batch.idleTime = 0;
      if (isError) batch.hasError = true;

      // Accumulate stats (applied to global stats on flush)
      const tl = ev.tool.toLowerCase();
      if (tl === 'write' || tl === 'edit') batch.filesEdited++;
      if (tl === 'bash') batch.commandsRun++;
      if (tl === 'grep' || tl === 'websearch' || tl === 'webfetch') batch.searchesDone++;
      if (tl === 'skill') batch.deploysCompleted++;

      // Keep agent working
      agent.extendWork(6000);
    } else {
      // No active batch (edge case: orphan post event) — immediate completion
      this.applyPostStats(ev);
      const s = agent.fsm.state;
      if (s === 'working' || s === 'thinking' || s === 'walking' || s === 'arriving') {
        agent.fsm.transition(isError ? 'error' : 'done');
      }
      const task = agent.currentTask || {
        id: `rt-post-${this.taskCounter}`,
        type: toolToTaskType(ev.tool), building: toolToRoom(ev.tool),
        description: toolDescription(ev.tool, ev.input),
        duration: 0, relatedFile: ev.input,
      };
      eventBus.emit(EVENTS.AGENT_TASK_COMPLETE, {
        agentId: slotId, task, result: isError ? 'error' : 'success',
      });
    }
  }

  // ======================== BATCH FLUSH ========================

  private flushBatch(slotId: string): void {
    const batch = this.agentBatches.get(slotId);
    if (!batch) return;
    this.agentBatches.delete(slotId);

    const agent = this.agentManager.getAgent(slotId);
    if (!agent) return;

    // Apply accumulated stats to global totals
    this.stats.filesEdited += batch.filesEdited;
    this.stats.testsRun += batch.commandsRun;
    this.stats.searchesDone += batch.searchesDone;
    this.stats.deploysCompleted += batch.deploysCompleted;
    if (batch.hasError) this.stats.tasksFailed++;
    else this.stats.tasksCompleted++;
    this.statsDirty = true;

    // Complete the agent's visual task
    const s = agent.fsm.state;
    if (s === 'working' || s === 'thinking' || s === 'walking' || s === 'arriving') {
      agent.fsm.transition(batch.hasError ? 'error' : 'done');
    }

    // Build final summary for the log
    const summary = batchSummary(batch);
    if (agent.currentTask) agent.currentTask.description = summary;

    const task = agent.currentTask || {
      id: `rt-flush-${this.taskCounter}`,
      type: batch.taskType, building: batch.room,
      description: summary, duration: 0, relatedFile: batch.lastInput,
    };

    eventBus.emit(EVENTS.AGENT_TASK_COMPLETE, {
      agentId: slotId,
      task,
      result: batch.hasError ? 'error' : 'success',
    });
  }

  /** Apply stats from a single orphan post event */
  private applyPostStats(ev: RawEvent): void {
    const isError = ev.result.toLowerCase().includes('error') ||
                    ev.result.toLowerCase().includes('failed');
    if (isError) this.stats.tasksFailed++;
    else this.stats.tasksCompleted++;
    const tl = ev.tool.toLowerCase();
    if (tl === 'write' || tl === 'edit') this.stats.filesEdited++;
    if (tl === 'bash') this.stats.testsRun++;
    if (tl === 'grep' || tl === 'websearch' || tl === 'webfetch') this.stats.searchesDone++;
    if (tl === 'skill') this.stats.deploysCompleted++;
    this.statsDirty = true;
  }
}
