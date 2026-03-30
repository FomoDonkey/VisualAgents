import Phaser from 'phaser';
import { CONFIG } from '../config';
import { OfficeRenderer } from '../world/OfficeRenderer';
import { PathGrid } from '../world/PathGrid';
import { AgentManager } from '../agents/AgentManager';
import { RealtimeEngine } from '../realtime/RealtimeEngine';
import { CameraController } from '../ui/CameraController';
import { ParticleManager } from '../effects/ParticleManager';
import { DayNightCycle } from '../effects/DayNightCycle';
import { AmbientAnimations } from '../effects/AmbientAnimations';
import { eventBus } from '../simulation/EventBus';
import { EVENTS } from '../types/events';
import { HtmlUI } from '../ui/HtmlUI';

const ROOM_NAMES: Record<string, string> = {
  'think-tank': 'Meeting Room', 'search-station': 'Research Corner',
  'file-library': 'Archive Room', 'code-workshop': 'Dev Floor',
  'terminal-tower': 'Server Room', 'deploy-dock': 'Deploy Station',
};

export class WorldScene extends Phaser.Scene {
  public agentManager!: AgentManager;
  public cameraController!: CameraController;
  private pathGrid!: PathGrid;
  private realtime!: RealtimeEngine;
  private particles!: ParticleManager;
  private dayNight!: DayNightCycle;
  private ambient!: AmbientAnimations;
  private htmlUI!: HtmlUI;
  private uiTimer = 0;
  private thinkTimer = 0;
  private walkDustTimer = 0;
  private workParticleTimer = 0;

  constructor() { super({ key: 'WorldScene' }); }

  create(): void {
    this.htmlUI = (window as any).__htmlUI;

    new OfficeRenderer(this).render();
    this.pathGrid = new PathGrid();
    this.agentManager = new AgentManager(this, this.pathGrid);
    this.cameraController = new CameraController(this);

    this.realtime = new RealtimeEngine(this.agentManager);

    this.particles = new ParticleManager(this);
    this.dayNight = new DayNightCycle(this);
    this.ambient = new AmbientAnimations(this);
    this.ambient.setAgentManager(this.agentManager);

    this.setupEvents();
    this.connectUI();

    this.htmlUI.setMode('live');
  }

  update(_t: number, delta: number): void {
    this.cameraController.update(delta);
    this.agentManager.update(delta);
    this.particles.update(delta);
    this.dayNight.update(delta);
    this.pathGrid.update();

    this.realtime.update(delta);
    this.ambient.update(delta);

    // Work particles — themed by task type
    this.thinkTimer += delta;
    this.walkDustTimer += delta;
    this.workParticleTimer += delta;

    if (this.thinkTimer > 400) {
      this.thinkTimer = 0;
      for (const a of this.agentManager.getAllAgents()) {
        if (a.fsm.state === 'thinking') {
          this.particles.emitThinking(a.sprite.x, a.sprite.y);
        }
      }
    }

    // Walk dust every 150ms for walking agents
    if (this.walkDustTimer > 150) {
      this.walkDustTimer = 0;
      for (const a of this.agentManager.getAllAgents()) {
        if (a.fsm.state === 'walking') {
          this.particles.emitWalkDust(a.sprite.x, a.sprite.y);
        }
      }
    }

    // Work-specific particles every 500ms
    if (this.workParticleTimer > 500) {
      this.workParticleTimer = 0;
      for (const a of this.agentManager.getAllAgents()) {
        if (a.fsm.state !== 'working' || !a.currentTask) continue;
        const t = a.currentTask.type;
        if (t === 'write') this.particles.emitCoding(a.sprite.x, a.sprite.y);
        else if (t === 'search' || t === 'read') this.particles.emitSearch(a.sprite.x, a.sprite.y);
        else if (t === 'deploy') this.particles.emitDeploy(a.sprite.x, a.sprite.y);
        else if (t === 'bash') this.particles.emitTerminal(a.sprite.x, a.sprite.y);
      }
    }

    // Ambient dust
    this.particles.emitAmbientDust(CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE, CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE);

    // HTML UI sync
    this.uiTimer += delta;
    if (this.uiTimer >= 100) {
      this.uiTimer = 0;
      this.syncUI();
    }
  }

  private syncUI(): void {
    if (!this.htmlUI) return;
    for (const agent of this.agentManager.getAllAgents()) {
      const s = agent.fsm.state;
      const t = agent.currentTask;
      const desc = t?.description || '';
      const room = t ? (ROOM_NAMES[t.building] || '') : '';
      let prog = 0;
      if ((s === 'working' || s === 'thinking') && t) {
        prog = Math.min(100, (agent.fsm.timer / t.duration) * 100);
      } else if (s === 'done') prog = 100;

      this.htmlUI.updateAgent(agent.id, s, desc, room, prog);
      if (this.htmlUI.isFirstPerson() && this.htmlUI.getFirstPersonAgentId() === agent.id) {
        this.htmlUI.updateFirstPerson(s, desc, room, prog, '', t?.relatedFile || '');
      }
    }
    this.htmlUI.updateTimeIndicator(this.dayNight.getTimeName());
    this.htmlUI.updateFPS(Math.round(this.game.loop.actualFps));
  }

  private connectUI(): void {
    this.htmlUI.onSelectAgent = (id) => {
      const a = this.agentManager.getAgent(id);
      if (!a) return;
      this.agentManager.selectAgent(id);
      this.cameraController.fpMode
        ? this.cameraController.enterFirstPerson(a)
        : this.cameraController.followAgent(a);
    };
    this.htmlUI.onEnterFP = (id) => {
      const a = this.agentManager.getAgent(id);
      if (!a) return;
      this.agentManager.selectAgent(id);
      this.cameraController.enterFirstPerson(a);
    };
    this.htmlUI.onExitFP = () => this.cameraController.exitFirstPerson();

    for (const agent of this.agentManager.getAllAgents()) {
      let lastClick = 0;
      agent.sprite.on('pointerdown', () => {
        const now = Date.now();
        if (now - lastClick < 350) this.htmlUI.enterFirstPerson(agent.id);
        else this.htmlUI.selectAgent(agent.id);
        lastClick = now;
      });
    }

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.leftButtonDown()) return;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const hit = this.agentManager.getAllAgents().some(a =>
        Math.abs(wp.x - a.sprite.x) < 14 && Math.abs(wp.y - a.sprite.y) < 14
      );
      if (!hit) {
        this.agentManager.selectAgent(null);
        this.cameraController.stopFollow();
        this.htmlUI.exitFirstPerson();
        document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
      }
    });
  }

  private setupEvents(): void {
    eventBus.on(EVENTS.AGENT_TASK_COMPLETE, (d: { agentId: string; result: string }) => {
      const a = this.agentManager.getAgent(d.agentId);
      if (!a) return;
      d.result === 'success'
        ? this.particles.emitSuccess(a.sprite.x, a.sprite.y)
        : this.particles.emitError(a.sprite.x, a.sprite.y);
      if (d.result !== 'success') this.cameras.main.shake(150, 0.002);
    });
  }
}
