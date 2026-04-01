import Phaser from 'phaser';
import { CONFIG, ROOM_NAMES } from '../config';
import { OfficeRenderer } from '../world/OfficeRenderer';
import { PathGrid } from '../world/PathGrid';
import { AgentManager } from '../agents/AgentManager';
import { RealtimeEngine } from '../realtime/RealtimeEngine';
import { CameraController } from '../ui/CameraController';
import { ParticleManager } from '../effects/ParticleManager';
import { DayNightCycle } from '../effects/DayNightCycle';
import { AmbientAnimations } from '../effects/AmbientAnimations';
import { NeonOverlay } from '../effects/NeonOverlay';
import { CinematicEffects } from '../effects/CinematicEffects';
import { eventBus } from '../simulation/EventBus';
import { EVENTS } from '../types/events';
import { AGENT_PALETTES } from '../config';
import { HtmlUI } from '../ui/HtmlUI';

interface SpeechBubble {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  textObj: Phaser.GameObjects.Text;
  tail: Phaser.GameObjects.Graphics;
  timer: number;
  agentId: string;
}

export class WorldScene extends Phaser.Scene {
  public agentManager!: AgentManager;
  public cameraController!: CameraController;
  private pathGrid!: PathGrid;
  private realtime!: RealtimeEngine;
  private particles!: ParticleManager;
  private dayNight!: DayNightCycle;
  private ambient!: AmbientAnimations;
  private neon!: NeonOverlay;
  private cinematic!: CinematicEffects;
  private htmlUI!: HtmlUI;
  private uiTimer = 0;
  private thinkTimer = 0;
  private walkDustTimer = 0;
  private workParticleTimer = 0;
  private cosmeticTimer = 0;
  private speechBubbles: Map<string, SpeechBubble> = new Map();
  // Cached palette colors to avoid .find() + parseInt per call
  private agentColors: Map<string, number> = new Map();


  constructor() { super({ key: 'WorldScene' }); }

  create(): void {
    this.htmlUI = (window as any).__htmlUI;

    new OfficeRenderer(this).render();
    this.pathGrid = new PathGrid();
    this.agentManager = new AgentManager(this, this.pathGrid);
    this.cameraController = new CameraController(this);
    this.cameraController.setAgentManager(this.agentManager);

    this.realtime = new RealtimeEngine(this.agentManager);

    this.particles = new ParticleManager(this);
    this.dayNight = new DayNightCycle(this);
    this.ambient = new AmbientAnimations(this);
    this.ambient.setAgentManager(this.agentManager);
    this.neon = new NeonOverlay(this);
    this.cinematic = new CinematicEffects(this);
    this.cinematic.setAgentManager(this.agentManager);

    // Pre-cache agent palette colors
    for (const p of AGENT_PALETTES) {
      this.agentColors.set(p.id, parseInt(p.color.replace('#', ''), 16));
    }

    this.setupEvents();
    this.connectUI();

    // Camera starts centered on poker table
    this.cameras.main.centerOn(21 * CONFIG.TILE_SIZE, 14 * CONFIG.TILE_SIZE);

    this.htmlUI.setMode('live');
  }

  update(_t: number, rawDelta: number): void {
    const delta = Math.min(rawDelta, 50);
    this.cameraController.update(delta);
    this.agentManager.update(delta);
    this.particles.update(delta);
    this.dayNight.update(delta);
    this.pathGrid.update();

    this.realtime.update(delta);

    // Cosmetic effects — throttled to ~10fps (every 100ms)
    this.cosmeticTimer += delta;
    if (this.cosmeticTimer >= 100) {
      this.ambient.update(this.cosmeticTimer);
      this.neon.update(this.cosmeticTimer);
      this.cinematic.update(this.cosmeticTimer);
      this.cosmeticTimer = 0;
    }

    this.updateSpeechBubbles(delta);

    // Work particles — themed by task type
    this.thinkTimer += delta;
    this.walkDustTimer += delta;
    this.workParticleTimer += delta;

    // Particle effects — single agent loop handles all particle timers
    const needThink = this.thinkTimer > 800;
    const needDust = this.walkDustTimer > 200;
    const needWork = this.workParticleTimer > 1000;

    if (needThink || needDust || needWork) {
      const trailColors: Record<string, number> = { blue: 0x4a8aff, red: 0xff5a6a, green: 0x40cc70, purple: 0xaa6aef, orange: 0xffa040 };

      for (const a of this.agentManager.getAllAgents()) {
        const s = a.fsm.state;
        if (needThink && s === 'thinking') {
          this.particles.emitThinking(a.sprite.x, a.sprite.y);
        }
        if (needDust && s === 'walking') {
          this.particles.emitWalkDust(a.sprite.x, a.sprite.y);
          this.particles.addTrailPoint(a.sprite.x, a.sprite.y + 6, trailColors[a.id] || 0x4a8aff);
        }
        if (needWork && s === 'working' && a.currentTask) {
          const t = a.currentTask.type;
          if (t === 'write') this.particles.emitCoding(a.sprite.x, a.sprite.y);
          else if (t === 'search' || t === 'read') this.particles.emitSearch(a.sprite.x, a.sprite.y);
          else if (t === 'deploy') this.particles.emitDeploy(a.sprite.x, a.sprite.y);
          else if (t === 'bash') this.particles.emitTerminal(a.sprite.x, a.sprite.y);
        }
      }

      if (needThink) this.thinkTimer = 0;
      if (needDust) this.walkDustTimer = 0;
      if (needWork) this.workParticleTimer = 0;
    }

    // Ambient dust + UI sync — throttled
    this.uiTimer += delta;
    if (this.uiTimer >= 250) {
      this.uiTimer = 0;
      this.particles.emitAmbientDust(CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE, CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE);
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
        document.querySelectorAll('.agent-badge').forEach(c => c.classList.remove('selected'));
      }
    });
  }

  private setupEvents(): void {
    // Task assigned — show speech bubble above agent
    eventBus.on(EVENTS.AGENT_TASK_ASSIGNED, (d: { agentId: string; task: any }) => {
      const a = this.agentManager.getAgent(d.agentId);
      if (!a) return;
      // Truncate description for bubble
      let desc = d.task.description || '';
      if (desc.length > 40) desc = desc.substring(0, 38) + '…';
      this.showSpeechBubble(d.agentId, desc, 5000);
    });

    // Task complete — short flash bubble + particles
    eventBus.on(EVENTS.AGENT_TASK_COMPLETE, (d: { agentId: string; result: string }) => {
      const a = this.agentManager.getAgent(d.agentId);
      if (!a) return;
      if (d.result === 'success') {
        this.particles.emitSuccess(a.sprite.x, a.sprite.y);
        this.showSpeechBubble(d.agentId, '✓ Done!', 2000);
      } else {
        this.particles.emitError(a.sprite.x, a.sprite.y);
        this.cameras.main.shake(150, 0.002);
        this.showSpeechBubble(d.agentId, '✗ Error!', 2500);
      }
    });
  }

  // ===== SPEECH BUBBLE SYSTEM — RPG/game style dialogue above agents =====

  private showSpeechBubble(agentId: string, text: string, duration: number): void {
    // Remove existing bubble for this agent
    this.removeSpeechBubble(agentId);

    const accentHex = this.agentColors.get(agentId) ?? 0x4a8aff;

    // Create container
    const container = this.add.container(0, 0).setDepth(2500);

    // Create text first to measure width
    const textObj = this.add.text(0, 0, text, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '9px',
      color: '#e0e0f0',
      padding: { x: 0, y: 0 },
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    const paddingX = 10;
    const paddingY = 6;
    const bw = textObj.width + paddingX * 2;
    const bh = textObj.height + paddingY * 2;
    const tailH = 6;

    // Bubble background
    const bg = this.add.graphics();
    bg.fillStyle(0x0c0c18, 0.92);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 6);
    // Border with agent color
    bg.lineStyle(1.5, accentHex, 0.7);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 6);

    // Tail (triangle pointing down)
    const tail = this.add.graphics();
    tail.fillStyle(0x0c0c18, 0.92);
    tail.fillTriangle(
      -5, bh / 2,
      5, bh / 2,
      0, bh / 2 + tailH
    );
    // Tail border
    tail.lineStyle(1.5, accentHex, 0.7);
    tail.lineBetween(-5, bh / 2, 0, bh / 2 + tailH);
    tail.lineBetween(5, bh / 2, 0, bh / 2 + tailH);

    container.add([bg, tail, textObj]);

    // Pop-in animation
    container.setScale(0);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    const bubble: SpeechBubble = { container, bg, textObj, tail, timer: duration, agentId };
    this.speechBubbles.set(agentId, bubble);

    // Position immediately
    const agent = this.agentManager.getAgent(agentId);
    if (agent) {
      container.setPosition(agent.sprite.x, agent.sprite.y - 28 - bh / 2 - tailH);
    }
  }

  private removeSpeechBubble(agentId: string): void {
    const existing = this.speechBubbles.get(agentId);
    if (existing) {
      existing.container.destroy();
      this.speechBubbles.delete(agentId);
    }
  }

  private updateSpeechBubbles(delta: number): void {
    for (const [id, bubble] of this.speechBubbles) {
      bubble.timer -= delta;

      // Follow agent position
      const agent = this.agentManager.getAgent(id);
      if (agent) {
        const bh = bubble.textObj.height + 12;
        const tailH = 6;
        const targetX = agent.sprite.x;
        const targetY = agent.sprite.y - 28 - bh / 2 - tailH;
        // Smooth follow
        bubble.container.x += (targetX - bubble.container.x) * 0.2;
        bubble.container.y += (targetY - bubble.container.y) * 0.2;
      }

      // Fade out when timer low
      if (bubble.timer < 500) {
        bubble.container.setAlpha(bubble.timer / 500);
      }

      if (bubble.timer <= 0) {
        bubble.container.destroy();
        this.speechBubbles.delete(id);
      }
    }
  }
}
