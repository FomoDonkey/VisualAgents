import { AGENT_PALETTES, ROOM_NAMES } from '../config';
import { eventBus } from '../simulation/EventBus';
import { EVENTS } from '../types/events';
import { WorldStats, AgentState } from '../types';

interface BadgeElements {
  root: HTMLElement;
  state: HTMLElement | null;
  task: HTMLElement | null;
  bar: HTMLElement | null;
  dot: HTMLElement | null;
}

export class HtmlUI {
  private agentBadges: Map<string, HTMLElement> = new Map();
  private badgeElements: Map<string, BadgeElements> = new Map();
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
  // Cached FP DOM refs
  private fpStateEl: HTMLElement | null = null;
  private fpProjectEl: HTMLElement | null = null;
  private fpDescEl: HTMLElement | null = null;
  private fpFileEl: HTMLElement | null = null;
  private fpBarEl: HTMLElement | null = null;

  // Callbacks to scene
  public onSelectAgent: ((id: string) => void) | null = null;
  public onEnterFP: ((id: string) => void) | null = null;
  public onExitFP: (() => void) | null = null;

  constructor() {
    this.logContainer = document.getElementById('activity-log')!;
    this.fpOverlay = document.getElementById('fp-overlay')!;
    this.fpFeed = document.getElementById('fp-feed')!;
    this.fpStateEl = document.getElementById('fp-state');
    this.fpProjectEl = document.getElementById('fp-project');
    this.fpDescEl = document.getElementById('fp-desc');
    this.fpFileEl = document.getElementById('fp-file');
    this.fpBarEl = document.getElementById('fp-bar');
    this.createAgentBadges();
    this.setupEventListeners();
    this.setupFPControls();
    this.loadNames();
  }

  // === AGENT BADGES (compact mini cards) ===
  private createAgentBadges(): void {
    const container = document.getElementById('hud-agents')!;
    container.innerHTML = '';

    for (const agent of AGENT_PALETTES) {
      this.agentNames.set(agent.id, agent.name);

      const badge = document.createElement('div');
      badge.className = 'agent-badge';
      badge.dataset.agentId = agent.id;
      badge.innerHTML = `
        <div class="ab-dot" style="background:${agent.color};box-shadow:0 0 4px ${agent.color}40"></div>
        <div class="ab-info">
          <div style="display:flex;align-items:center;gap:4px">
            <span class="ab-name" data-f="name">${agent.name}</span>
            <span class="ab-rename" title="Rename agent">✏️</span>
          </div>
          <span class="ab-task" data-f="task">Waiting...</span>
          <div class="ab-bar"><div class="ab-fill" data-f="bar" style="width:0%;background:${agent.color}"></div></div>
        </div>
        <span class="ab-state idle" data-f="state">IDLE</span>
      `;

      badge.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('ab-rename')) return;
        this.selectAgent(agent.id);
      });

      badge.addEventListener('dblclick', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('ab-rename') || target.classList.contains('ab-name')) return;
        e.preventDefault();
        this.enterFirstPerson(agent.id);
      });

      const renameBtn = badge.querySelector('.ab-rename') as HTMLElement;
      const nameEl = badge.querySelector('.ab-name') as HTMLElement;
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startRename(agent.id, nameEl);
      });

      container.appendChild(badge);
      this.agentBadges.set(agent.id, badge);
      // Cache DOM references to avoid querySelector on every update
      this.badgeElements.set(agent.id, {
        root: badge,
        state: badge.querySelector('[data-f="state"]'),
        task: badge.querySelector('[data-f="task"]'),
        bar: badge.querySelector('[data-f="bar"]'),
        dot: badge.querySelector('.ab-dot'),
      });
    }
  }

  // === RENAME ===
  private startRename(agentId: string, nameEl: HTMLElement): void {
    const current = this.agentNames.get(agentId) || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.style.cssText = 'background:var(--bg-primary);border:1px solid var(--accent);color:var(--text-primary);font-family:inherit;font-size:10px;font-weight:600;padding:1px 4px;border-radius:3px;width:70px;outline:none;';

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

  /** Update agent name from live event data */
  setAgentDisplayName(agentId: string, name: string): void {
    if (this.agentNames.get(agentId) === name) return;
    this.agentNames.set(agentId, name);
    const badge = this.agentBadges.get(agentId);
    if (badge) {
      const el = badge.querySelector('[data-f="name"]');
      if (el) el.textContent = name;
    }
  }

  private loadNames(): void {
    try {
      const saved = localStorage.getItem('va-names');
      if (saved) {
        const names = JSON.parse(saved);
        for (const [id, name] of Object.entries(names)) {
          this.agentNames.set(id, name as string);
          const badge = this.agentBadges.get(id);
          if (badge) {
            const el = badge.querySelector('[data-f="name"]');
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
      modeInd.textContent = '● LIVE';
      modeInd.style.color = 'var(--success)';
    }
  }

  // === SELECT ===
  selectAgent(id: string): void {
    document.querySelectorAll('.agent-badge').forEach(c => c.classList.remove('selected'));
    this.agentBadges.get(id)?.classList.add('selected');
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
    document.querySelectorAll('.agent-badge').forEach(c => c.classList.remove('selected'));
    this.agentBadges.get(agentId)?.classList.add('selected');
    document.getElementById('btn-fp')?.classList.add('active');
    // Hide HUD elements in FP mode for maximum immersion
    document.getElementById('hud-agents')?.classList.add('collapsed');
    document.getElementById('hud-activity')?.classList.add('collapsed');
    this.onEnterFP?.(agentId);
  }

  exitFirstPerson(): void {
    if (!this.fpActive) return;
    this.fpActive = false;
    this.fpAgentId = null;
    this.fpOverlay.classList.remove('active');
    document.getElementById('btn-fp')?.classList.remove('active');
    // Restore HUD elements
    document.getElementById('hud-agents')?.classList.remove('collapsed');
    document.getElementById('hud-activity')?.classList.remove('collapsed');
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
      const sel = document.querySelector('.agent-badge.selected');
      const id = sel?.getAttribute('data-agent-id') || AGENT_PALETTES[0].id;
      this.enterFirstPerson(id);
    });
  }

  // === UPDATES (using cached DOM references) ===
  updateAgent(agentId: string, state: AgentState, taskDesc: string, room: string, progress: number): void {
    const els = this.badgeElements.get(agentId);
    if (!els) return;
    if (els.state) { els.state.textContent = state.toUpperCase(); els.state.className = `ab-state ${state}`; }
    if (els.task) els.task.textContent = taskDesc || 'Waiting...';
    if (els.bar) els.bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    if (els.dot) {
      if (state === 'working' || state === 'thinking') els.dot.classList.add('active');
      else els.dot.classList.remove('active');
    }
  }

  updateFirstPerson(state: AgentState, taskDesc: string, room: string, progress: number, _project: string, relatedFile: string): void {
    if (!this.fpActive) return;
    if (this.fpStateEl) { this.fpStateEl.textContent = state.toUpperCase(); this.fpStateEl.className = `fp-state ab-state ${state}`; }
    if (this.fpProjectEl) this.fpProjectEl.textContent = room || '—';
    if (this.fpDescEl) this.fpDescEl.textContent = taskDesc || 'Waiting...';
    if (this.fpFileEl) this.fpFileEl.textContent = relatedFile || '—';
    if (this.fpBarEl) this.fpBarEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
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
    if (el) el.textContent = `${fps}`;
  }

  // === EVENTS ===
  private static readonly TOOL_ICONS: Record<string, string> = {
    read: '📖', write: '✏️', bash: '⚡', search: '🔍',
    think: '💭', deploy: '🚀',
  };

  private setupEventListeners(): void {
    eventBus.on(EVENTS.AGENT_TASK_ASSIGNED, (data: { agentId: string; task: any; projectName: string; silent?: boolean }) => {
      // Silent events are batch updates — skip logging, bubble is handled by WorldScene
      if (data.silent) return;

      const pal = AGENT_PALETTES.find(a => a.id === data.agentId);
      const name = this.agentNames.get(data.agentId) || pal?.name || data.agentId;
      const icon = HtmlUI.TOOL_ICONS[data.task.type] || '⚙️';
      const room = ROOM_NAMES[data.task.building] || '';

      this.addLog(
        name, pal?.color || '#888',
        `${icon} ${data.task.description}`,
        room,
        data.task.type
      );

      if (this.fpActive && this.fpAgentId === data.agentId) {
        this.addFirstPersonFeed(`${icon} ${data.task.description}`, data.task.type === 'think' ? 'think' : '');
      }
    });

    eventBus.on(EVENTS.AGENT_TASK_COMPLETE, (data: { agentId: string; task: any; result: string }) => {
      const pal = AGENT_PALETTES.find(a => a.id === data.agentId);
      const name = this.agentNames.get(data.agentId) || pal?.name || data.agentId;
      const ok = data.result === 'success';
      const desc = data.task?.description || 'task';
      const msg = ok ? `✅ ${desc}` : `❌ Failed: ${desc}`;

      this.addLog(
        name, pal?.color || '#888',
        msg, '',
        ok ? 'success' : 'error'
      );

      if (this.fpActive && this.fpAgentId === data.agentId) {
        this.addFirstPersonFeed(ok ? `✅ ${desc}` : `❌ ${desc}`, ok ? 'success' : 'error');
      }
    });

    eventBus.on(EVENTS.WORLD_STATS_UPDATED, (s: WorldStats) => this.updateStats(s));
  }

  private addLog(name: string, color: string, action: string, detail: string, type: string): void {
    const entry = document.createElement('div');
    const cls = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'think' ? 'thinking' : type === 'deploy' ? 'deploy' : '';
    entry.className = `log-entry ${cls}`;

    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');

    const detailHtml = detail ? `<span class="l-detail"> · ${this.escapeHtml(detail)}</span>` : '';
    entry.innerHTML =
      `<span class="l-time">${h}:${m}:${s}</span>` +
      `<span class="l-agent" style="color:${color}">${this.escapeHtml(name)}</span>` +
      `<span class="l-action">${this.escapeHtml(action)}</span>` +
      detailHtml;

    this.logContainer.appendChild(entry);
    this.logCount++;
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
    // Keep only last 8 entries visible for compact feed
    while (this.logContainer.children.length > 8) this.logContainer.removeChild(this.logContainer.firstChild!);
    const c = document.getElementById('log-count');
    if (c) c.textContent = `${this.logCount}`;
  }

  private static _escDiv: HTMLDivElement | null = null;
  private escapeHtml(str: string): string {
    if (!HtmlUI._escDiv) HtmlUI._escDiv = document.createElement('div');
    HtmlUI._escDiv.textContent = str;
    return HtmlUI._escDiv.innerHTML;
  }

  // Cached stat elements — avoid getElementById on every stats update
  private statEls: Record<string, HTMLElement | null> = {};
  private initStatEls(): void {
    for (const id of ['s-tasks','s-files','s-tests','s-deploys','s-rate','sb-c','sb-f','sb-s','sb-d']) {
      this.statEls[id] = document.getElementById(id);
    }
  }

  private updateStats(stats: WorldStats): void {
    if (!this.statEls['s-tasks']) this.initStatEls();
    const total = stats.tasksCompleted + stats.tasksFailed;
    const rate = total > 0 ? Math.round((stats.tasksCompleted / total) * 100) : 100;
    this.ss('s-tasks', String(stats.tasksCompleted));
    this.ss('s-files', String(stats.filesEdited));
    this.ss('s-tests', String(stats.testsRun));
    this.ss('s-deploys', String(stats.deploysCompleted));
    this.ss('s-rate', `${rate}%`);
    this.ss('sb-c', String(stats.tasksCompleted));
    this.ss('sb-f', String(stats.tasksFailed));
    this.ss('sb-s', String(stats.searchesDone));
    this.ss('sb-d', String(stats.deploysCompleted));
  }

  private ss(id: string, t: string): void { const el = this.statEls[id]; if (el) el.textContent = t; }
}
