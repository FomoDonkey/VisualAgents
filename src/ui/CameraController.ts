import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Agent } from '../agents/Agent';
import { AgentManager } from '../agents/AgentManager';

const T = CONFIG.TILE_SIZE;

export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  private isDragging = false;
  private dragX = 0;
  private dragY = 0;
  private followTarget: Agent | null = null;
  private targetZoom: number;
  private userControlled = false; // true when user manually panned/zoomed

  private _fpMode = false;
  private fpZoom: number = CONFIG.FP_ZOOM;
  private fpOffX = 0;
  private fpOffY = 0;

  // Auto-tracking
  private agentManager: AgentManager | null = null;
  private autoTrackX = 0;
  private autoTrackY = 0;
  private autoTrackZoom = CONFIG.DEFAULT_ZOOM;
  private userIdleTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    const ww = CONFIG.WORLD_WIDTH * T;
    const wh = CONFIG.WORLD_HEIGHT * T;
    this.camera.setBounds(-200, -200, ww + 400, wh + 400);
    this.camera.setZoom(CONFIG.DEFAULT_ZOOM);
    this.targetZoom = CONFIG.DEFAULT_ZOOM;
    this.camera.centerOn(ww / 2, wh / 2);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey('W'),
        A: scene.input.keyboard.addKey('A'),
        S: scene.input.keyboard.addKey('S'),
        D: scene.input.keyboard.addKey('D'),
      };
    }

    // Right/middle drag
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown() || p.middleButtonDown()) {
        this.isDragging = true;
        this.dragX = p.x; this.dragY = p.y;
        if (!this._fpMode) { this.stopFollow(); this.markUserControl(); }
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging || this._fpMode) return;
      this.camera.scrollX += (this.dragX - p.x) / this.camera.zoom;
      this.camera.scrollY += (this.dragY - p.y) / this.camera.zoom;
      this.dragX = p.x; this.dragY = p.y;
    });
    scene.input.on('pointerup', () => { this.isDragging = false; });

    // Scroll zoom
    scene.input.on('wheel', (_: any, __: any, ___: number, dy: number) => {
      this.markUserControl();
      if (this._fpMode) {
        this.fpZoom = Phaser.Math.Clamp(this.fpZoom - dy * 0.002, 1.5, 3.5);
        this.targetZoom = this.fpZoom;
      } else {
        this.targetZoom = Phaser.Math.Clamp(
          this.targetZoom - dy * 0.002, CONFIG.MIN_ZOOM, CONFIG.MAX_ZOOM
        );
      }
    });

    scene.game.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  setAgentManager(am: AgentManager): void {
    this.agentManager = am;
  }

  followAgent(agent: Agent): void {
    this.followTarget = agent;
    this.camera.stopFollow();
    this.camera.startFollow(agent.sprite, true, 0.1, 0.1);
    this.targetZoom = CONFIG.FOLLOW_ZOOM;
    this.markUserControl();
  }

  stopFollow(): void {
    this.followTarget = null;
    this.camera.stopFollow();
  }

  enterFirstPerson(agent: Agent): void {
    this._fpMode = true;
    this.followTarget = agent;
    this.fpZoom = CONFIG.FP_ZOOM;
    this.targetZoom = this.fpZoom;
    this.fpOffX = 0; this.fpOffY = 0;
    this.camera.stopFollow();
    this.camera.startFollow(agent.sprite, true, 0.12, 0.12, 0, 0);
  }

  exitFirstPerson(): void {
    this._fpMode = false;
    this.targetZoom = CONFIG.DEFAULT_ZOOM;
    this.followTarget = null;
    this.camera.stopFollow();
    this.userControlled = false;
  }

  get fpMode(): boolean { return this._fpMode; }

  private markUserControl(): void {
    this.userControlled = true;
    this.userIdleTimer = 0;
  }

  update(delta: number): void {
    // Smooth zoom — fast response
    const dz = this.targetZoom - this.camera.zoom;
    if (Math.abs(dz) > 0.001) {
      this.camera.setZoom(this.camera.zoom + dz * 0.12);
    }

    // FP look-ahead
    if (this._fpMode && this.followTarget) {
      const dir = this.followTarget.direction;
      let tx = 0, ty = 0;
      const ahead = T * 2;
      switch (dir) {
        case 'up': ty = -ahead; break;
        case 'down': ty = ahead; break;
        case 'left': tx = -ahead; break;
        case 'right': tx = ahead; break;
      }
      this.fpOffX += (tx - this.fpOffX) * 0.04;
      this.fpOffY += (ty - this.fpOffY) * 0.04;
      this.camera.setFollowOffset(this.fpOffX, this.fpOffY);
      return;
    }

    if (this.followTarget) return;

    // Keyboard pan — marks user control
    const spd = CONFIG.CAMERA_SCROLL_SPEED * (delta / 1000) / this.camera.zoom;
    let dx = 0, dy = 0;
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) dx -= spd;
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) dx += spd;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) dy -= spd;
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) dy += spd;
    if (dx || dy) {
      this.camera.scrollX += dx;
      this.camera.scrollY += dy;
      this.markUserControl();
      return;
    }

    // === AUTO-TRACKING ===
    // After 5s of no user input, camera follows the action automatically
    if (this.userControlled) {
      this.userIdleTimer += delta;
      if (this.userIdleTimer > 5000) {
        this.userControlled = false;
      }
      return;
    }

    if (!this.agentManager) return;
    this.autoTrack(delta);
  }

  /** Smart camera that follows active agents or centers on poker table */
  private autoTrack(delta: number): void {
    const agents = this.agentManager!.getAllAgents();
    const active: Agent[] = [];

    for (const a of agents) {
      const s = a.fsm.state;
      if (s === 'walking' || s === 'working' || s === 'thinking' || s === 'arriving') {
        active.push(a);
      }
    }

    let tx: number, ty: number, tz: number;

    if (active.length === 0) {
      // All idle — center on poker table
      tx = 21 * T;
      ty = 14 * T;
      tz = CONFIG.DEFAULT_ZOOM;
    } else if (active.length === 1) {
      // One active — follow closely
      tx = active[0].sprite.x;
      ty = active[0].sprite.y;
      tz = 1.5;
    } else {
      // Multiple active — frame them all
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const a of active) {
        minX = Math.min(minX, a.sprite.x);
        maxX = Math.max(maxX, a.sprite.x);
        minY = Math.min(minY, a.sprite.y);
        maxY = Math.max(maxY, a.sprite.y);
      }
      tx = (minX + maxX) / 2;
      ty = (minY + maxY) / 2;
      // Zoom to fit all agents with padding
      const spanX = maxX - minX + 200;
      const spanY = maxY - minY + 150;
      const zx = this.camera.width / spanX;
      const zy = this.camera.height / spanY;
      tz = Phaser.Math.Clamp(Math.min(zx, zy), 1.0, 2.2);
    }

    // Smooth lerp to target — fast and fluid
    const lerpSpeed = 0.08;
    this.autoTrackX += (tx - this.autoTrackX) * lerpSpeed;
    this.autoTrackY += (ty - this.autoTrackY) * lerpSpeed;
    this.autoTrackZoom += (tz - this.autoTrackZoom) * 0.05;

    this.camera.centerOn(this.autoTrackX, this.autoTrackY);
    this.targetZoom = this.autoTrackZoom;
  }
}
