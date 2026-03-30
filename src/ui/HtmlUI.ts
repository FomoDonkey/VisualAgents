import { AGENT_PALETTES } from '../config';
import { eventBus } from '../simulation/EventBus';
import { EVENTS } from '../types/events';
import { WorldStats, AgentState } from '../types';

const ROOM_NAMES: Record<string, string> = {
  'think-tank': 'Meeting Room', 'search-station': 'Research Corner',
  'file-library': 'Archive Room', 'code-workshop': 'Dev Floor',
  'terminal-tower': 'Server Room', 'deploy-dock': 'Deploy Station',
};

export class HtmlUI {
  private agentCards: Map<string, HTMLElement> = new Map();
  private logContainer: HTMLElement;
  private logCount = 0;
  private startTime = Date.now();
  private agentNames: Map<string, string> = new Map();

  // First person
  private fpActive = false;
  private fpAgentId: string | null = null;
  private fpOverlay: HTMLElement;
  private fpFeed: HTMLElement;
  private fpFeedItems: HTMLElement[] = [];

  // Callbacks to scene
  public onSelectAgent: ((id: string) => void) | null = null;
  public onEnterFP: ((id: string) => void) | null = null;
  public onExitFP: (() => void) | null = null;

  constructor() {
    this.logContainer = document.getElementById('activity-log')!;
    this.fpOverlay = document.getElementById('fp-overlay')!;
    this.fpFeed = document.getElementById('fp-feed')!;
    this.createAgentCards();
    this.setupEventListeners();
    this.setupFPControls();
    this.loadNames();
  }

  // === AGENT CARDS ===
  private createAgentCards(): void {
    const list = document.getElementById('agents-list')!;
    list.innerHTML = '';

    for (const agent of AGENT_PALETTES) {
      this.agentNames.set(agent.id, agent.name);

      const style = document.createElement('style');
      style.textContent = `.agent-card[data-agent-id="${agent.id}"]::before{background:${agent.color}}`;
      document.head.appendChild(style);

      const card = document.createElement('div');
      card.className = 'agent-card';
      card.dataset.agentId = agent.id;
      card.innerHTML = `
        <div class="a-row">
          <div class="a-dot" style="background:${agent.color};box-shadow:0 0 6px ${agent.color}40"></div>
          <span class="a-name" data-f="name">${agent.name}</span>
          <span class="a-rename" title="Rename agent">✏️</span>
          <span class="a-badge idle" data-f="state">IDLE</span>
        </div>
        <div class="a-task" data-f="task">Waiting for assignment...</div>
        <div class="a-loc" data-f="room"></div>
        <div class="a-bar"><div class="a-fill" data-f="bar" style="width:0%;background:${agent.color}"></div></div>
      `;

      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('a-rename')) return;
        this.selectAgent(agent.id);
      });

      card.addEventListener('dblclick', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('a-rename') || target.classList.contains('a-name')) return;
        e.preventDefault();
        this.enterFirstPerson(agent.id);
      });

      const renameBtn = card.querySelector('.a-rename') as HTMLElement;
      const nameEl = card.querySelector('.a-name') as HTMLElement;
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startRename(agent.id, nameEl);
      });

      list.appendChild(card);
      this.agentCards.set(agent.id, card);
    }
  }

  // === RENAME ===
  private startRename(agentId: string, nameEl: HTMLElement): void {
    const current = this.agentNames.get(agentId) || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.style.cssText = 'background:var(--bg-primary);border:1px solid var(--accent);color:var(--text-primary);font-family:inherit;font-size:12px;font-weight:600;padding:1px 4px;border-radius:3px;width:90px;outline:none;';

    nameEl.textContent = '';
    nameEl.appendChild(input);
    input.focus();
    input.select();

    const finish = () => {
      const newName = input.value.trim() || current;
      this.agentNames.set(agentId, newName);
      nameEl.textContent = newName;
      localStorage.setItem('va-names', JSON.stringify(Object.fromEntries(this.agentNames)));
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = current; input.blur(); }
    });
  }

  getAgentName(id: string): string {
    return this.agentNames.get(id) || id;
  }

  private loadNames(): void {
    try {
      const saved = localStorage.getItem('va-names');
      if (saved) {
        const names = JSON.parse(saved);
        for (const [id, name] of Object.entries(names)) {
          this.agentNames.set(id, name as string);
          const card = this.agentCards.get(id);
          if (card) {
            const el = card.querySelector('[data-f="name"]');
            if (el) el.textContent = name as string;
          }
        }
      }
    } catch {}
  }

  // === MODE ===
  setMode(mode: 'live'): void {
    const modeInd = document.getElementById('mode-ind');
    if (modeInd) {
      modeInd.textContent = '🟢 LIVE — Claude Code';
      modeInd.style.color = 'var(--success)';
    }
  }

  // === SELECT ===
  selectAgent(id: string): void {
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
    this.agentCards.get(id)?.classList.add('selected');
    if (this.fpActive) {
      this.fpAgentId = id;
      this.updateFPHeader(id);
      this.fpFeed.innerHTML = '';
      this.fpFeedItems = [];
    }
    this.onSelectAgent?.(id);
  }

  // === FIRST PERSON ===
  enterFirstPerson(agentId: string): void {
    this.fpActive = true;
    this.fpAgentId = agentId;
    this.fpOverlay.classList.add('active');
    this.fpFeed.innerHTML = '';
    this.fpFeedItems = [];
    this.updateFPHeader(agentId);
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
    this.agentCards.get(agentId)?.classList.add('selected');
    document.getElementById('btn-fp')?.classList.add('active');
    this.onEnterFP?.(agentId);
  }

  exitFirstPerson(): void {
    if (!this.fpActive) return;
    this.fpActive = false;
    this.fpAgentId = null;
    this.fpOverlay.classList.remove('active');
    document.getElementById('btn-fp')?.classList.remove('active');
    this.onExitFP?.();
  }

  isFirstPerson(): boolean { return this.fpActive; }
  getFirstPersonAgentId(): string | null { return this.fpAgentId; }

  private updateFPHeader(agentId: string): void {
    const palette = AGENT_PALETTES.find(a => a.id === agentId);
    if (!palette) return;
    const name = this.agentNames.get(agentId) || palette.name;
    const dot = document.getElementById('fp-dot') as HTMLElement;
    const nameEl = document.getElementById('fp-name') as HTMLElement;
    const bar = document.getElementById('fp-bar') as HTMLElement;
    if (dot) dot.style.background = palette.color;
    if (nameEl) nameEl.textContent = name;
    if (bar) bar.style.background = palette.color;
  }

  private setupFPControls(): void {
    document.getElementById('fp-exit')?.addEventListener('click', () => this.exitFirstPerson());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.fpActive) this.exitFirstPerson();
    });
    document.getElementById('btn-fp')?.addEventListener('click', () => {
      if (this.fpActive) { this.exitFirstPerson(); return; }
      const sel = document.querySelector('.agent-card.selected');
      const id = sel?.getAttribute('data-agent-id') || AGENT_PALETTES[0].id;
      this.enterFirstPerson(id);
    });
  }

  // === UPDATES ===
  updateAgent(agentId: string, state: AgentState, taskDesc: string, room: string, progress: number): void {
    const card = this.agentCards.get(agentId);
    if (!card) return;
    const q = (sel: string) => card.querySelector(`[data-f="${sel}"]`) as HTMLElement | null;
    const stateEl = q('state');
    if (stateEl) { stateEl.textContent = state.toUpperCase(); stateEl.className = `a-badge ${state}`; }
    q('task')?.replaceChildren(document.createTextNode(taskDesc || 'Waiting for assignment...'));
    const roomEl = q('room');
    if (roomEl) roomEl.textContent = room ? `📍 ${room}` : '';
    const barEl = q('bar');
    if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    const dot = card.querySelector('.a-dot') as HTMLElement;
    if (dot) {
      if (state === 'working' || state === 'thinking') dot.classList.add('active');
      else dot.classList.remove('active');
    }
  }

  updateFirstPerson(state: AgentState, taskDesc: string, room: string, progress: number, _project: string, relatedFile: string): void {
    if (!this.fpActive) return;
    const se = document.getElementById('fp-state') as HTMLElement;
    if (se) { se.textContent = state.toUpperCase(); se.className = `fp-state a-badge ${state}`; }
    const p = document.getElementById('fp-project') as HTMLElement;
    if (p) p.textContent = room || '—';
    const d = document.getElementById('fp-desc') as HTMLElement;
    if (d) d.textContent = taskDesc || 'Waiting...';
    const f = document.getElementById('fp-file') as HTMLElement;
    if (f) f.textContent = relatedFile || '—';
    const b = document.getElementById('fp-bar') as HTMLElement;
    if (b) b.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  addFirstPersonFeed(text: string, type: string = ''): void {
    if (!this.fpActive) return;
    const item = document.createElement('div');
    item.className = `fp-feed-item ${type}`;
    item.textContent = text;
    this.fpFeed.appendChild(item);
    this.fpFeedItems.push(item);
    while (this.fpFeedItems.length > 6) this.fpFeedItems.shift()?.remove();
  }

  updateTimeIndicator(n: string): void {
    const el = document.getElementById('time-ind');
    if (el) el.textContent = n;
  }
  updateFPS(fps: number): void {
    const el = document.getElementById('fps-c');
    if (el) el.textContent = `${fps} FPS`;
  }

  // === EVENTS ===
  private setupEventListeners(): void {
    eventBus.on(EVENTS.AGENT_TASK_ASSIGNED, (data: { agentId: string; task: any; projectName: string }) => {
      const pal = AGENT_PALETTES.find(a => a.id === data.agentId);
      const name = this.agentNames.get(data.agentId) || pal?.name || data.agentId;
      const room = ROOM_NAMES[data.task.building] || '';
      this.addLog(data.agentId, name, pal?.color || '#888', data.task.description, room, data.task.type);
      if (this.fpActive && this.fpAgentId === data.agentId) {
        this.addFirstPersonFeed(data.task.description, data.task.type === 'think' ? 'think' : '');
      }
    });

    eventBus.on(EVENTS.AGENT_TASK_COMPLETE, (data: { agentId: string; task: any; result: string }) => {
      const pal = AGENT_PALETTES.find(a => a.id === data.agentId);
      const name = this.agentNames.get(data.agentId) || pal?.name || data.agentId;
      const cls = data.result === 'success' ? 'success' : 'error';
      const msg = data.result === 'success' ? '✓ Completed' : '✗ Failed';
      this.addLog(data.agentId, name, pal?.color || '#888', msg, '', cls);
      if (this.fpActive && this.fpAgentId === data.agentId) {
        this.addFirstPersonFeed(msg, cls);
      }
    });

    eventBus.on(EVENTS.WORLD_STATS_UPDATED, (s: WorldStats) => this.updateStats(s));
  }

  private addLog(agentId: string, name: string, color: string, action: string, detail: string, type: string): void {
    const entry = document.createElement('div');
    const cls = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'think' ? 'thinking' : type === 'deploy' ? 'deploy' : '';
    entry.className = `log-entry ${cls}`;
    const el = Math.floor((Date.now() - this.startTime) / 1000);
    const m = Math.floor(el / 60).toString().padStart(2, '0');
    const s = (el % 60).toString().padStart(2, '0');
    entry.innerHTML = `<span class="l-time">${m}:${s}</span><span class="l-agent" style="color:${color}">${this.escapeHtml(name)}</span><span class="l-action">${this.escapeHtml(action)}</span>${detail ? `<span class="l-detail">↳ ${this.escapeHtml(detail)}</span>` : ''}`;
    this.logContainer.appendChild(entry);
    this.logCount++;
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
    while (this.logContainer.children.length > 300) this.logContainer.removeChild(this.logContainer.firstChild!);
    const c = document.getElementById('log-count');
    if (c) c.textContent = `${this.logCount} events`;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private updateStats(stats: WorldStats): void {
    const total = stats.tasksCompleted + stats.tasksFailed;
    const rate = total > 0 ? Math.round((stats.tasksCompleted / total) * 100) : 100;
    this.s('s-tasks', String(stats.tasksCompleted));
    this.s('s-files', String(stats.filesEdited));
    this.s('s-tests', String(stats.testsRun));
    this.s('s-deploys', String(stats.deploysCompleted));
    this.s('s-rate', `${rate}%`);
    this.s('sb-c', String(stats.tasksCompleted));
    this.s('sb-f', String(stats.tasksFailed));
    this.s('sb-s', String(stats.searchesDone));
    this.s('sb-d', String(stats.deploysCompleted));
  }

  private s(id: string, t: string): void { const el = document.getElementById(id); if (el) el.textContent = t; }
}
