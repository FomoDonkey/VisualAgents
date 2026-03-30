import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Agent } from '../agents/Agent';

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

  private _fpMode = false;
  private fpZoom: number = CONFIG.FP_ZOOM;
  private fpOffX = 0;
  private fpOffY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    const ww = CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE;
    const wh = CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE;
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
        if (!this._fpMode) this.stopFollow();
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

  followAgent(agent: Agent): void {
    this.followTarget = agent;
    this.camera.stopFollow();
    this.camera.startFollow(agent.sprite, true, 0.1, 0.1);
    this.targetZoom = CONFIG.FOLLOW_ZOOM;
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
    this.targetZoom = CONFIG.FOLLOW_ZOOM;
    if (this.followTarget) {
      this.camera.stopFollow();
      this.camera.startFollow(this.followTarget.sprite, true, 0.1, 0.1, 0, 0);
    }
  }

  get fpMode(): boolean { return this._fpMode; }

  update(delta: number): void {
    // Smooth zoom
    const dz = this.targetZoom - this.camera.zoom;
    if (Math.abs(dz) > 0.002) {
      this.camera.setZoom(this.camera.zoom + dz * 0.08);
    }

    // FP look-ahead
    if (this._fpMode && this.followTarget) {
      const dir = this.followTarget.direction;
      let tx = 0, ty = 0;
      const ahead = CONFIG.TILE_SIZE * 2;
      switch (dir) {
        case 'up': ty = ahead; break;
        case 'down': ty = -ahead; break;
        case 'left': tx = ahead; break;
        case 'right': tx = -ahead; break;
      }
      this.fpOffX += (tx - this.fpOffX) * 0.04;
      this.fpOffY += (ty - this.fpOffY) * 0.04;
      this.camera.setFollowOffset(this.fpOffX, this.fpOffY);
      return;
    }

    if (this.followTarget) return;

    // Keyboard pan
    const spd = CONFIG.CAMERA_SCROLL_SPEED * (delta / 1000) / this.camera.zoom;
    let dx = 0, dy = 0;
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) dx -= spd;
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) dx += spd;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) dy -= spd;
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) dy += spd;
    if (dx || dy) { this.camera.scrollX += dx; this.camera.scrollY += dy; }
  }
}
