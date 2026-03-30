import Phaser from 'phaser';
import { CONFIG, ROOM_DEFS } from '../config';
import { BUILDINGS } from './BuildingRegistry';
import { BuildingDef } from '../types';

const T = CONFIG.TILE_SIZE;
const W = CONFIG.WORLD_WIDTH;
const H = CONFIG.WORLD_HEIGHT;

export class OfficeRenderer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  render(): void {
    this.drawFloor();
    this.drawCorridor();
    this.drawRooms();
    this.drawFurniture();
    this.drawLabels();
  }

  private drawFloor(): void {
    const g = this.scene.add.graphics().setDepth(0);
    // Office base floor
    g.fillStyle(0x14141e, 1);
    g.fillRect(0, 0, W * T, H * T);
    // Subtle grid
    g.lineStyle(0.5, 0xffffff, 0.02);
    for (let x = 0; x <= W; x++) g.lineBetween(x * T, 0, x * T, H * T);
    for (let y = 0; y <= H; y++) g.lineBetween(0, y * T, W * T, y * T);
  }

  private drawCorridor(): void {
    const g = this.scene.add.graphics().setDepth(1);
    // Vertical corridor (left side, x=10-13)
    g.fillStyle(0x1a1a28, 1);
    g.fillRect(10 * T, 0, 4 * T, H * T);
    // Horizontal corridor (y=12-15)
    g.fillRect(10 * T, 12 * T, (W - 10) * T, 4 * T);
    // Right corridor (x=27-28)
    g.fillRect(27 * T, 0, 2 * T, (H - 4) * T);

    // Corridor floor pattern — subtle stripes
    g.lineStyle(0.5, 0xffffff, 0.015);
    for (let y = 0; y < H; y++) {
      g.lineBetween(10 * T, y * T + T / 2, 14 * T, y * T + T / 2);
    }
    for (let x = 10; x < W; x++) {
      g.lineBetween(x * T + T / 2, 12 * T, x * T + T / 2, 16 * T);
    }
  }

  private drawRooms(): void {
    for (const b of BUILDINGS) {
      this.drawRoom(b);
    }
  }

  private drawRoom(b: BuildingDef): void {
    const g = this.scene.add.graphics().setDepth(2);
    const def = ROOM_DEFS[b.type];
    const x = b.x * T;
    const y = b.y * T;
    const w = b.width * T;
    const h = b.height * T;

    // Room floor
    g.fillStyle(def.floor, 1);
    g.fillRoundedRect(x + 1, y + 1, w - 2, h - 2, 3);

    // Room walls — thick outer border
    g.lineStyle(2.5, 0x2a2a40, 1);
    g.strokeRoundedRect(x, y, w, h, 3);

    // Inner glow border
    g.lineStyle(0.5, def.accent, 0.15);
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 2);

    // Accent strip at top of room
    g.fillStyle(def.accent, 0.25);
    g.fillRect(x + 4, y + 1, w - 8, 2);

    // Door gap
    const dx = b.entranceTile.x * T;
    const dy = b.entranceTile.y * T;
    g.fillStyle(0x1a1a28, 1);
    g.fillRect(dx - 2, dy - 1, T + 4, T + 2);
    // Door accent
    g.fillStyle(def.accent, 0.3);
    g.fillRect(dx, dy + T - 2, T, 2);
  }

  private drawFurniture(): void {
    const g = this.scene.add.graphics().setDepth(3);

    // === Meeting Room (1,1) 9x6 ===
    // Conference table
    g.fillStyle(0x3a3040, 1);
    g.fillRoundedRect(3 * T, 3 * T, 5 * T, 2 * T, 4);
    g.lineStyle(1, 0x4a4050, 0.6);
    g.strokeRoundedRect(3 * T, 3 * T, 5 * T, 2 * T, 4);
    // Chairs around table
    this.drawChair(g, 3.5, 2.3); this.drawChair(g, 5.5, 2.3); this.drawChair(g, 7, 2.3);
    this.drawChair(g, 3.5, 5.3); this.drawChair(g, 5.5, 5.3); this.drawChair(g, 7, 5.3);
    // Whiteboard
    this.drawWhiteboard(g, 2, 1.2, 4);
    // Plant
    this.drawPlant(g, 9, 1.3);

    // === Research Corner (1,9) 9x6 ===
    this.drawDesk(g, 2, 10, true);
    this.drawDesk(g, 5, 10, true);
    this.drawBookshelf(g, 1.3, 11, 1, 4);
    this.drawBookshelf(g, 1.3, 13, 1, 2);
    this.drawPlant(g, 9, 9.3);

    // === Archive Room (1,17) 9x6 ===
    this.drawBookshelf(g, 1.3, 17.5, 1, 5);
    this.drawBookshelf(g, 3, 17.5, 1, 5);
    this.drawDesk(g, 6, 19, true);
    this.drawPlant(g, 9, 22);

    // === Dev Floor (14,1) 12x11 — main workspace ===
    // Rows of desks
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        this.drawDesk(g, 15 + col * 3.5, 2.5 + row * 3.5, true);
      }
    }
    // Big wall monitor
    this.drawMonitor(g, 18, 1.2, 4);
    this.drawPlant(g, 14.3, 1.3);
    this.drawPlant(g, 25, 1.3);
    this.drawPlant(g, 25, 10.5);
    // Whiteboard
    this.drawWhiteboard(g, 14.3, 6, 2.5);

    // === Server Room (29,1) 10x8 ===
    for (let i = 0; i < 4; i++) {
      this.drawServerRack(g, 30 + i * 2, 2, 3);
    }
    this.drawDesk(g, 31, 6.5, false);
    this.drawDesk(g, 34, 6.5, false);

    // === Deploy Station (29,12) 10x7 ===
    this.drawDesk(g, 30, 13.5, true);
    this.drawDesk(g, 33, 13.5, true);
    this.drawMonitor(g, 36, 12.3, 2);
    this.drawWhiteboard(g, 30, 17, 3);
    this.drawPlant(g, 38, 12.5);

    // === Break area (corridor around y=13-15, x=14-27) ===
    // Coffee machine
    g.fillStyle(0x3a3035, 1);
    g.fillRoundedRect(14.5 * T, 13 * T, T * 1.2, T * 1.2, 3);
    g.fillStyle(0xff6040, 0.6);
    g.fillCircle(15.1 * T, 13.3 * T, 2);
    // Sofa
    g.fillStyle(0x2a3a5a, 1);
    g.fillRoundedRect(17 * T, 13.2 * T, 3 * T, T * 1.5, 5);
    g.lineStyle(1, 0x3a4a6a, 0.5);
    g.strokeRoundedRect(17 * T, 13.2 * T, 3 * T, T * 1.5, 5);
    // Round table
    g.fillStyle(0x3a3030, 1);
    g.fillCircle(22 * T, 13.8 * T, T * 0.7);
    g.lineStyle(0.5, 0x4a4040, 0.4);
    g.strokeCircle(22 * T, 13.8 * T, T * 0.7);
    // Another sofa
    g.fillStyle(0x2a3a5a, 1);
    g.fillRoundedRect(24 * T, 13.2 * T, 2.5 * T, T * 1.5, 5);
    // Water cooler
    g.fillStyle(0x8abcff, 0.3);
    g.fillRoundedRect(14.5 * T, 14.8 * T, T * 0.8, T * 1.2, 3);
    g.fillStyle(0x6a9aee, 0.6);
    g.fillCircle(14.9 * T, 14.9 * T, 4);
  }

  private drawChair(g: Phaser.GameObjects.Graphics, tx: number, ty: number): void {
    g.fillStyle(0x2a2a3e, 1);
    g.fillCircle(tx * T, ty * T, T * 0.35);
    g.lineStyle(0.5, 0x3a3a50, 0.5);
    g.strokeCircle(tx * T, ty * T, T * 0.35);
  }

  private drawDesk(g: Phaser.GameObjects.Graphics, tx: number, ty: number, withMonitor: boolean): void {
    // Desk surface
    g.fillStyle(0x3a3028, 1);
    g.fillRoundedRect(tx * T, ty * T, T * 2, T * 1.3, 2);
    g.lineStyle(0.5, 0x4a4038, 0.4);
    g.strokeRoundedRect(tx * T, ty * T, T * 2, T * 1.3, 2);
    if (withMonitor) {
      // Monitor
      g.fillStyle(0x0a1a2a, 1);
      g.fillRoundedRect((tx + 0.3) * T, (ty + 0.15) * T, T * 1, T * 0.7, 2);
      // Screen glow
      g.fillStyle(0x4a8aff, 0.15);
      g.fillRoundedRect((tx + 0.4) * T, (ty + 0.25) * T, T * 0.8, T * 0.5, 1);
      // Code lines on screen
      g.fillStyle(0x40cc80, 0.4);
      g.fillRect((tx + 0.5) * T, (ty + 0.35) * T, T * 0.4, 1);
      g.fillStyle(0x4a8aff, 0.4);
      g.fillRect((tx + 0.5) * T, (ty + 0.5) * T, T * 0.55, 1);
    }
    // Chair
    this.drawChair(g, tx + 1, ty + 1.7);
  }

  private drawBookshelf(g: Phaser.GameObjects.Graphics, tx: number, ty: number, w: number, h: number): void {
    g.fillStyle(0x3a2a20, 1);
    g.fillRoundedRect(tx * T, ty * T, w * T, h * T, 2);
    // Shelf lines
    g.lineStyle(0.5, 0x4a3a30, 0.5);
    for (let i = 1; i < h; i++) {
      g.lineBetween(tx * T + 2, (ty + i) * T, (tx + w) * T - 2, (ty + i) * T);
    }
    // Colored book spines
    const colors = [0x4a8aff, 0xff5a6a, 0x40cc70, 0xffa040, 0xaa6aef, 0x60c0c0];
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < 3; j++) {
        const bw = 2 + Math.random() * 3;
        g.fillStyle(colors[(i * 3 + j) % colors.length], 0.7);
        g.fillRect((tx + 0.1 + j * 0.3) * T, (ty + i + 0.15) * T, bw, T * 0.7);
      }
    }
  }

  private drawWhiteboard(g: Phaser.GameObjects.Graphics, tx: number, ty: number, w: number): void {
    g.fillStyle(0xdddde8, 0.9);
    g.fillRoundedRect(tx * T, ty * T, w * T, T * 0.8, 2);
    g.lineStyle(1, 0x8a8a9a, 0.4);
    g.strokeRoundedRect(tx * T, ty * T, w * T, T * 0.8, 2);
    // Scribbles
    g.lineStyle(0.8, 0x4a4aaa, 0.3);
    g.lineBetween((tx + 0.2) * T, (ty + 0.3) * T, (tx + w * 0.6) * T, (ty + 0.3) * T);
    g.lineStyle(0.8, 0xaa4a4a, 0.3);
    g.lineBetween((tx + 0.2) * T, (ty + 0.55) * T, (tx + w * 0.4) * T, (ty + 0.55) * T);
  }

  private drawMonitor(g: Phaser.GameObjects.Graphics, tx: number, ty: number, w: number): void {
    // Big wall-mounted screen
    g.fillStyle(0x0a0a14, 1);
    g.fillRoundedRect(tx * T, ty * T, w * T, T * 0.9, 3);
    g.lineStyle(1, 0x2a2a40, 0.8);
    g.strokeRoundedRect(tx * T, ty * T, w * T, T * 0.9, 3);
    // Screen content
    g.fillStyle(0x0a2a1a, 0.8);
    g.fillRoundedRect((tx + 0.15) * T, (ty + 0.1) * T, (w - 0.3) * T, T * 0.7, 2);
    // Terminal text
    g.fillStyle(0x40ff80, 0.5);
    for (let i = 0; i < 3; i++) {
      const lw = (0.3 + Math.random() * 0.4) * (w - 0.6);
      g.fillRect((tx + 0.3) * T, (ty + 0.2 + i * 0.2) * T, lw * T, 1.2);
    }
  }

  private drawServerRack(g: Phaser.GameObjects.Graphics, tx: number, ty: number, h: number): void {
    g.fillStyle(0x1a1a2a, 1);
    g.fillRoundedRect(tx * T, ty * T, T * 1.2, h * T, 2);
    g.lineStyle(0.8, 0x2a2a40, 0.6);
    g.strokeRoundedRect(tx * T, ty * T, T * 1.2, h * T, 2);
    // LEDs
    for (let i = 0; i < h * 3; i++) {
      const ledColor = Math.random() > 0.2 ? 0x40ff80 : 0xff4040;
      g.fillStyle(ledColor, 0.8);
      g.fillCircle((tx + 0.3) * T, (ty + 0.2 + i * 0.3) * T, 1.5);
      g.fillStyle(0x4080ff, 0.6);
      g.fillCircle((tx + 0.7) * T, (ty + 0.2 + i * 0.3) * T, 1.2);
    }
  }

  private drawPlant(g: Phaser.GameObjects.Graphics, tx: number, ty: number): void {
    // Pot
    g.fillStyle(0x5a3a2a, 1);
    g.fillRoundedRect((tx - 0.2) * T, (ty + 0.3) * T, T * 0.6, T * 0.5, 2);
    // Leaves
    g.fillStyle(0x2aaa3a, 0.8);
    g.fillCircle(tx * T, (ty + 0.1) * T, T * 0.35);
    g.fillStyle(0x40cc50, 0.7);
    g.fillCircle((tx - 0.15) * T, ty * T, T * 0.25);
    g.fillCircle((tx + 0.2) * T, (ty - 0.05) * T, T * 0.2);
  }

  private drawLabels(): void {
    for (const b of BUILDINGS) {
      const x = (b.x + b.width / 2) * T;
      const y = (b.y + 0.5) * T;
      this.scene.add.text(x, y, b.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#5a7a9a',
        stroke: '#0a0a14',
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(10).setAlpha(0.7);
    }
  }
}
