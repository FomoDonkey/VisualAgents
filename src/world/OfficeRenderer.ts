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
    this.drawDecorations();
    this.drawLabels();
  }

  private drawFloor(): void {
    const g = this.scene.add.graphics().setDepth(0);
    // Office base floor — dark with subtle variation
    g.fillStyle(0x12121a, 1);
    g.fillRect(0, 0, W * T, H * T);
    // Subtle grid
    g.lineStyle(0.5, 0xffffff, 0.02);
    for (let x = 0; x <= W; x++) g.lineBetween(x * T, 0, x * T, H * T);
    for (let y = 0; y <= H; y++) g.lineBetween(0, y * T, W * T, y * T);

    // Light pools — visible glow on floor from overhead lights
    const glowLayer = this.scene.add.graphics().setDepth(1);
    const lightPools = [
      { x: 5, y: 4, r: 5, color: 0x4a8aff },
      { x: 5, y: 12, r: 4, color: 0x40cc70 },
      { x: 5, y: 20, r: 4, color: 0xddaa60 },
      { x: 20, y: 6, r: 7, color: 0x4a8aff },
      { x: 34, y: 4, r: 5, color: 0xff5a6a },
      { x: 34, y: 15, r: 5, color: 0xaa6aef },
      { x: 21, y: 14, r: 4, color: 0xffaa40 },
    ];
    for (const lp of lightPools) {
      const cx = lp.x * T;
      const cy = lp.y * T;
      const r = lp.r * T;
      for (let i = 8; i >= 1; i--) {
        const frac = i / 8;
        glowLayer.fillStyle(lp.color, 0.04 * frac * frac);
        glowLayer.fillCircle(cx, cy, r * (1.3 - frac * 0.3));
      }
    }
  }

  private drawCorridor(): void {
    const g = this.scene.add.graphics().setDepth(1);

    // Corridor base — slightly lighter than void
    g.fillStyle(0x16161f, 1);
    g.fillRect(10 * T, 0, 4 * T, H * T);
    g.fillRect(10 * T, 12 * T, (W - 10) * T, 4 * T);
    g.fillRect(27 * T, 0, 2 * T, (H - 4) * T);

    // Floor tiles — subtle checkerboard
    g.fillStyle(0x1a1a26, 1);
    const drawCheck = (sx: number, sy: number, ex: number, ey: number) => {
      for (let y = sy; y < ey; y++) {
        for (let x = sx; x < ex; x++) {
          if ((x + y) % 2 === 0) g.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
        }
      }
    };
    drawCheck(10, 0, 14, H);
    drawCheck(10, 12, W, 16);
    drawCheck(27, 0, 29, H - 4);

    // Center line — dashed guide
    g.fillStyle(0x2a2a3e, 0.25);
    for (let x = 10; x < W; x += 2) {
      g.fillRect(x * T + 6, 14 * T - 1, T * 0.8, 2);
    }
    for (let y = 0; y < H; y += 2) {
      g.fillRect(12 * T - 1, y * T + 6, 2, T * 0.8);
    }

    // Corridor wall shadow (depth where corridor meets rooms)
    g.fillStyle(0x000000, 0.08);
    // Top of horizontal corridor
    g.fillRect(14 * T, 12 * T, (W - 14) * T, 3);
    // Bottom of horizontal corridor
    g.fillRect(14 * T, 16 * T - 3, (W - 14) * T, 3);
    // Right edge of vertical corridor
    g.fillRect(14 * T - 3, 0, 3, 12 * T);
    g.fillRect(14 * T - 3, 16 * T, 3, (H - 16) * T);

    // Floor light strips along corridor edges (LED strips in floor)
    g.fillStyle(0x4a8aff, 0.06);
    g.fillRect(10 * T + 1, 12 * T + 1, (W - 10) * T - 2, 1.5);
    g.fillRect(10 * T + 1, 16 * T - 2, (W - 10) * T - 2, 1.5);
    g.fillRect(10 * T + 1, 0, 1.5, H * T);
    g.fillRect(14 * T - 2, 0, 1.5, 12 * T);
    g.fillRect(14 * T - 2, 16 * T, 1.5, (H - 16) * T);

    // Corridor intersection highlight
    g.fillStyle(0x4a8aff, 0.02);
    g.fillRect(10 * T, 12 * T, 4 * T, 4 * T);

    // Emergency exit sign at corridor ends
    this.drawExitSign(g, 10.5, 0.3);
    this.drawExitSign(g, 10.5, H - 1.5);

    // Ceiling lights in corridor (pools on floor)
    const cg = this.scene.add.graphics().setDepth(1);
    const corridorLights = [
      { x: 12, y: 3 }, { x: 12, y: 8 }, { x: 12, y: 20 },
      { x: 18, y: 14 }, { x: 24, y: 14 }, { x: 32, y: 14 },
      { x: 28, y: 5 }, { x: 28, y: 10 },
    ];
    for (const cl of corridorLights) {
      cg.fillStyle(0xddeeff, 0.025);
      cg.fillCircle(cl.x * T, cl.y * T, T * 1.8);
      cg.fillStyle(0xeeeeff, 0.015);
      cg.fillCircle(cl.x * T, cl.y * T, T * 1);
      // Fixture dot
      g.fillStyle(0xffffff, 0.1);
      g.fillCircle(cl.x * T, cl.y * T, 1.5);
    }
  }

  private drawExitSign(g: Phaser.GameObjects.Graphics, tx: number, ty: number): void {
    g.fillStyle(0x105010, 0.8);
    g.fillRoundedRect(tx * T, ty * T, T * 1.5, T * 0.5, 2);
    g.fillStyle(0x40ff80, 0.5);
    g.fillRect((tx + 0.15) * T, (ty + 0.12) * T, T * 1.2, T * 0.26);
    // Arrow
    g.fillStyle(0x40ff80, 0.7);
    g.fillRect((tx + 0.3) * T, (ty + 0.2) * T, T * 0.4, 2);
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

    // Room floor base
    g.fillStyle(def.floor, 1);
    g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 2);

    // Floor tile pattern — checkerboard
    g.fillStyle(0xffffff, 0.018);
    for (let ry = b.y + 1; ry < b.y + b.height - 1; ry++) {
      for (let rx = b.x + 1; rx < b.x + b.width - 1; rx++) {
        if ((rx + ry) % 2 === 0) {
          g.fillRect(rx * T + 1, ry * T + 1, T - 2, T - 2);
        }
      }
    }

    // Floor edge shadow (depth effect — darker near walls)
    g.fillStyle(0x000000, 0.06);
    g.fillRect(x + 3, y + 3, w - 6, T * 0.4); // top
    g.fillRect(x + 3, y + h - T * 0.4 - 3, w - 6, T * 0.4); // bottom
    g.fillRect(x + 3, y + 3, T * 0.4, h - 6); // left
    g.fillRect(x + w - T * 0.4 - 3, y + 3, T * 0.4, h - 6); // right

    // === WALLS ===
    // Thick wall fill
    g.fillStyle(0x222235, 1);
    g.fillRect(x, y, w, 3); // top wall
    g.fillRect(x, y + h - 3, w, 3); // bottom wall
    g.fillRect(x, y, 3, h); // left wall
    g.fillRect(x + w - 3, y, 3, h); // right wall

    // Wall panel texture — vertical lines on left/right walls
    g.lineStyle(0.3, 0x2a2a42, 0.3);
    for (let py = b.y + 1; py < b.y + b.height - 1; py++) {
      g.lineBetween(x + 1, py * T, x + 2.5, py * T);
      g.lineBetween(x + w - 2.5, py * T, x + w - 1, py * T);
    }

    // Wall outer border (dark edge)
    g.lineStyle(1.5, 0x181825, 1);
    g.strokeRoundedRect(x, y, w, h, 2);
    // Wall inner border (lighter)
    g.lineStyle(0.5, 0x303048, 0.5);
    g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 1);

    // === GLASS WINDOW SECTIONS on walls facing corridor ===
    // Only on the wall adjacent to the corridor (right side for left rooms, bottom for top rooms)
    if (b.x < 10) {
      // Left-side rooms — glass on right wall
      const glassX = x + w - 3;
      const glassY = y + T;
      const glassH = h - T * 2;
      // Glass pane
      g.fillStyle(0x3a4a6a, 0.12);
      g.fillRect(glassX, glassY, 3, glassH);
      // Glass frame dividers
      g.lineStyle(0.8, 0x3a3a55, 0.5);
      for (let i = 1; i < Math.floor(glassH / T); i++) {
        g.lineBetween(glassX, glassY + i * T, glassX + 3, glassY + i * T);
      }
      // Glass reflection highlight
      g.fillStyle(0xffffff, 0.03);
      g.fillRect(glassX + 0.5, glassY + 4, 1, glassH - 8);
    }

    // === ACCENT STRIP (LED strip on top wall) ===
    g.fillStyle(def.accent, 0.4);
    g.fillRect(x + 6, y + 1, w - 12, 2);
    // Glow spill from LED strip
    g.fillStyle(def.accent, 0.05);
    g.fillRect(x + 4, y + 3, w - 8, T * 0.8);

    // Accent dots at ends of strip
    g.fillStyle(def.accent, 0.6);
    g.fillCircle(x + 6, y + 2, 1.5);
    g.fillCircle(x + w - 6, y + 2, 1.5);

    // === BASEBOARD ===
    g.fillStyle(0x1a1a28, 0.7);
    g.fillRect(x + 3, y + h - 5, w - 6, 2);

    // === CEILING VENT (small detail) ===
    const ventX = x + w / 2 - T * 0.6;
    const ventY = y + 4;
    g.fillStyle(0x2a2a3a, 0.4);
    g.fillRect(ventX, ventY, T * 1.2, T * 0.3);
    g.lineStyle(0.3, 0x3a3a4a, 0.3);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(ventX + 2 + i * T * 0.28, ventY + 1, ventX + 2 + i * T * 0.28, ventY + T * 0.3 - 1);
    }

    // === DOOR ===
    const dx = b.entranceTile.x * T;
    const dy = b.entranceTile.y * T;
    // Door opening
    g.fillStyle(0x181824, 1);
    g.fillRect(dx - 2, dy - 2, T + 4, T + 4);
    // Door frame (double line)
    g.lineStyle(1.2, 0x3a3a55, 0.6);
    g.lineBetween(dx - 3, dy - 2, dx - 3, dy + T + 2);
    g.lineBetween(dx + T + 3, dy - 2, dx + T + 3, dy + T + 2);
    g.lineBetween(dx - 3, dy - 2, dx + T + 3, dy - 2);
    // Door threshold (bright accent bar)
    g.fillStyle(def.accent, 0.55);
    g.fillRect(dx - 1, dy + T, T + 2, 3);
    // Door light spill into corridor
    g.fillStyle(def.accent, 0.025);
    for (let i = 1; i <= 3; i++) {
      g.fillRect(dx - i * 3, dy - i * 2, T + i * 6, T + i * 4);
    }
    // Room number plate next to door
    g.fillStyle(0x2a2a3a, 0.6);
    g.fillRoundedRect(dx + T + 6, dy + 2, T * 0.5, T * 0.35, 1);
    g.fillStyle(def.accent, 0.4);
    g.fillRect(dx + T + 8, dy + 5, T * 0.3, 2);
  }

  private drawFurniture(): void {
    const g = this.scene.add.graphics().setDepth(3);

    // === Meeting Room (1,1) 9x6 ===
    // Conference table shadow
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect(3 * T + 2, 3 * T + 3, 5 * T, 2 * T, 5);
    // Conference table
    g.fillStyle(0x3a3040, 1);
    g.fillRoundedRect(3 * T, 3 * T, 5 * T, 2 * T, 5);
    g.lineStyle(1, 0x4a4050, 0.6);
    g.strokeRoundedRect(3 * T, 3 * T, 5 * T, 2 * T, 5);
    // Table surface highlight
    g.fillStyle(0xffffff, 0.04);
    g.fillRoundedRect(3.2 * T, 3.15 * T, 4.6 * T, 0.8 * T, 3);
    // Laptop on table
    g.fillStyle(0x222230, 0.8);
    g.fillRoundedRect(4.5 * T, 3.3 * T, T * 0.8, T * 0.5, 1);
    g.fillStyle(0x4a8aff, 0.15);
    g.fillRect(4.55 * T, 3.35 * T, T * 0.7, T * 0.35);
    // Papers/notepad
    g.fillStyle(0xdddde0, 0.3);
    g.fillRect(6 * T, 3.4 * T, T * 0.5, T * 0.6);
    g.fillStyle(0x4a4aaa, 0.15);
    for (let i = 0; i < 4; i++) {
      g.fillRect(6.05 * T, (3.48 + i * 0.12) * T, T * 0.35, 0.8);
    }
    // Chairs around table
    this.drawChair(g, 3.5, 2.3); this.drawChair(g, 5.5, 2.3); this.drawChair(g, 7, 2.3);
    this.drawChair(g, 3.5, 5.3); this.drawChair(g, 5.5, 5.3); this.drawChair(g, 7, 5.3);
    // Whiteboard
    this.drawWhiteboard(g, 2, 1.2, 4);
    // TV/screen for presentations
    this.drawMonitor(g, 6, 1.2, 2.5);
    // Plant
    this.drawPlant(g, 9, 1.3);
    this.drawPlant(g, 1.5, 5.5);

    // === Research Corner (1,9) 9x6 ===
    this.drawDesk(g, 2, 10, true);
    this.drawDesk(g, 5, 10, true);
    this.drawBookshelf(g, 1.3, 11.5, 1, 3);
    this.drawBookshelf(g, 1.3, 13.5, 1, 1.5);
    this.drawPlant(g, 9, 9.3);
    this.drawPlant(g, 1.5, 9.5);
    // Globe on shelf
    g.fillStyle(0x3060aa, 0.4);
    g.fillCircle(8.5 * T, 14 * T, 4);
    g.lineStyle(0.3, 0x40aa40, 0.3);
    g.strokeCircle(8.5 * T, 14 * T, 4);
    // Microscope
    g.fillStyle(0x555566, 0.6);
    g.fillRect(8 * T, 10.3 * T, 3, T * 0.5);
    g.fillRect(8.1 * T, 10.1 * T, 1.5, T * 0.2);

    // === Archive Room (1,17) 9x6 ===
    this.drawBookshelf(g, 1.3, 17.5, 1, 5);
    this.drawBookshelf(g, 3, 17.5, 1, 5);
    this.drawBookshelf(g, 8, 17.5, 1, 3);
    this.drawDesk(g, 5, 19, true);
    this.drawPlant(g, 9, 22);
    this.drawPlant(g, 1.5, 22);
    // Filing cabinet
    g.fillStyle(0x2a2a3a, 0.8);
    g.fillRoundedRect(7 * T, 21 * T, T * 1, T * 1.5, 2);
    g.lineStyle(0.5, 0x3a3a4a, 0.4);
    g.strokeRoundedRect(7 * T, 21 * T, T * 1, T * 1.5, 2);
    // Drawer handles
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0x5a5a6a, 0.5);
      g.fillRect(7.3 * T, (21.2 + i * 0.45) * T, T * 0.3, 1.5);
    }

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
    this.drawDesk(g, 31, 6.5, true);
    this.drawDesk(g, 34, 6.5, true);
    // Server room has a big monitoring wall screen
    this.drawMonitor(g, 30, 1.2, 6);
    // Warning sign
    g.fillStyle(0xffaa20, 0.3);
    g.fillRect(38 * T, 2 * T, T * 0.5, T * 0.5);
    g.lineStyle(0.5, 0xffaa20, 0.5);
    g.strokeRect(38 * T, 2 * T, T * 0.5, T * 0.5);
    // UPS / backup batteries
    g.fillStyle(0x1a1a2a, 0.8);
    g.fillRoundedRect(38 * T, 4 * T, T * 0.9, T * 2, 2);
    g.fillStyle(0x40ff80, 0.15);
    g.fillRect(38.1 * T, 4.2 * T, T * 0.7, T * 0.3);
    g.fillStyle(0x40ff80, 0.4);
    g.fillCircle(38.5 * T, 5.2 * T, 2);

    // === Deploy Station (29,12) 10x7 ===
    this.drawDesk(g, 30, 13.5, true);
    this.drawDesk(g, 33, 13.5, true);
    this.drawDesk(g, 36, 13.5, true);
    this.drawMonitor(g, 30, 12.3, 4);
    this.drawWhiteboard(g, 36, 17, 2.5);
    this.drawPlant(g, 38, 12.5);
    this.drawPlant(g, 29.5, 17.5);
    // Rocket poster on wall
    g.fillStyle(0x1a1a2a, 0.8);
    g.fillRoundedRect(35 * T, 12.3 * T, T * 0.8, T * 0.7, 1);
    g.fillStyle(0xaa6aef, 0.3);
    g.fillRect(35.1 * T, 12.4 * T, T * 0.6, T * 0.5);
    // Rocket shape
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(35.35 * T, 12.45 * T, T * 0.1, T * 0.35);
    g.fillStyle(0xff6040, 0.4);
    g.fillRect(35.3 * T, 12.75 * T, T * 0.2, T * 0.08);

    // === Break area — POKER TABLE ===
    const ptx = 21.2 * T;
    const pty = 13.8 * T;
    // Table shadow (larger, offset)
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(ptx + 2, pty + 5, T * 3.8, T * 2.4);
    // Table rim (dark wood with grain)
    g.fillStyle(0x3a2820, 1);
    g.fillEllipse(ptx, pty, T * 3.5, T * 2.1);
    g.lineStyle(1, 0x4a3830, 0.5);
    g.strokeEllipse(ptx, pty, T * 3.5, T * 2.1);
    // Wood rim highlight
    g.lineStyle(0.5, 0x5a4838, 0.3);
    g.strokeEllipse(ptx, pty - 1, T * 3.4, T * 2.0);
    // Green felt
    g.fillStyle(0x1a6a2a, 1);
    g.fillEllipse(ptx, pty, T * 3, T * 1.7);
    // Felt edge shadow
    g.lineStyle(1, 0x104a18, 0.5);
    g.strokeEllipse(ptx, pty, T * 3, T * 1.7);
    // Felt texture — inner marking
    g.lineStyle(0.5, 0x2a8a3a, 0.25);
    g.strokeEllipse(ptx, pty, T * 2.2, T * 1.1);
    // Dealer button
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(ptx + T * 0.8, pty - T * 0.3, 3);
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(ptx + T * 0.8, pty - T * 0.3, 2);
    // Center pot glow
    g.fillStyle(0xffcc40, 0.06);
    g.fillCircle(ptx, pty, T * 0.6);
    // Card shapes on table (face down)
    const cardPositions = [
      { x: -1.2, y: -0.2, r: -0.2 }, { x: -0.4, y: -0.4, r: 0.1 },
      { x: 0.4, y: -0.3, r: -0.1 }, { x: 1.1, y: -0.1, r: 0.15 },
      { x: 0, y: 0.2, r: 0 },
    ];
    for (const c of cardPositions) {
      g.save();
      // Card back (blue)
      g.fillStyle(0x2a3a8a, 0.8);
      g.fillRoundedRect(ptx + c.x * T - 3, pty + c.y * T - 4, 6, 8, 1);
      g.lineStyle(0.3, 0x4a5aaa, 0.5);
      g.strokeRoundedRect(ptx + c.x * T - 3, pty + c.y * T - 4, 6, 8, 1);
      // Diamond pattern on card back
      g.fillStyle(0x3a4a9a, 0.6);
      g.fillRect(ptx + c.x * T - 1, pty + c.y * T - 2, 2, 2);
      g.restore();
    }
    // Chips stacks
    const chipColors = [0xff4040, 0x4a8aff, 0x40cc70, 0xffaa40, 0xffffff];
    for (let i = 0; i < 3; i++) {
      const cx = ptx + (i - 1) * T * 0.6;
      const cy = pty + T * 0.5;
      for (let j = 0; j < 3; j++) {
        g.fillStyle(chipColors[(i + j) % chipColors.length], 0.8);
        g.fillCircle(cx, cy - j * 2, 3);
        g.lineStyle(0.3, 0xffffff, 0.3);
        g.strokeCircle(cx, cy - j * 2, 3);
      }
    }

    // Chairs around poker table — pixel positions / T to get tile coords for drawChair
    // Matches POKER_SEATS pixel coords in AgentManager
    const chairPixels = [
      { px: 480, py: 300 },  // top-left
      { px: 540, py: 300 },  // top-right
      { px: 558, py: 336 },  // right
      { px: 540, py: 372 },  // bottom-right
      { px: 480, py: 372 },  // bottom-left
    ];
    for (const c of chairPixels) {
      this.drawChair(g, c.px / T, c.py / T);
    }

    // Coffee machine (moved to corner)
    g.fillStyle(0x3a3035, 1);
    g.fillRoundedRect(14.5 * T, 13 * T, T * 1.2, T * 1.2, 3);
    g.fillStyle(0xff6040, 0.6);
    g.fillCircle(15.1 * T, 13.3 * T, 2);
    // Water cooler
    g.fillStyle(0x8abcff, 0.3);
    g.fillRoundedRect(14.5 * T, 14.8 * T, T * 0.8, T * 1.2, 3);
    g.fillStyle(0x6a9aee, 0.6);
    g.fillCircle(14.9 * T, 14.9 * T, 4);
  }

  private drawChair(g: Phaser.GameObjects.Graphics, tx: number, ty: number): void {
    // Chair shadow
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(tx * T + 1, ty * T + 2, T * 0.7, T * 0.5);
    // Chair seat (padded)
    g.fillStyle(0x2a2a42, 1);
    g.fillCircle(tx * T, ty * T, T * 0.38);
    // Chair cushion highlight
    g.fillStyle(0x34345a, 0.6);
    g.fillCircle(tx * T - 1, ty * T - 1, T * 0.25);
    // Chair rim
    g.lineStyle(0.7, 0x3a3a58, 0.6);
    g.strokeCircle(tx * T, ty * T, T * 0.38);
  }

  private drawDesk(g: Phaser.GameObjects.Graphics, tx: number, ty: number, withMonitor: boolean): void {
    // Desk surface
    g.fillStyle(0x3a3028, 1);
    g.fillRoundedRect(tx * T, ty * T, T * 2, T * 1.3, 2);
    g.lineStyle(0.5, 0x4a4038, 0.4);
    g.strokeRoundedRect(tx * T, ty * T, T * 2, T * 1.3, 2);
    if (withMonitor) {
      // Monitor glow on desk surface (reflection)
      g.fillStyle(0x4a8aff, 0.06);
      g.fillRoundedRect((tx + 0.2) * T, (ty + 0.5) * T, T * 1.2, T * 0.6, 2);
      // Monitor frame
      g.fillStyle(0x0a0a14, 1);
      g.fillRoundedRect((tx + 0.3) * T, (ty + 0.1) * T, T * 1.1, T * 0.75, 2);
      g.lineStyle(0.5, 0x2a2a40, 0.8);
      g.strokeRoundedRect((tx + 0.3) * T, (ty + 0.1) * T, T * 1.1, T * 0.75, 2);
      // Screen
      g.fillStyle(0x0a1a2a, 1);
      g.fillRoundedRect((tx + 0.38) * T, (ty + 0.18) * T, T * 0.94, T * 0.6, 1);
      // Screen glow
      g.fillStyle(0x4a8aff, 0.2);
      g.fillRoundedRect((tx + 0.4) * T, (ty + 0.2) * T, T * 0.9, T * 0.55, 1);
      // Code lines (more of them, varied)
      const lineColors = [0x40cc80, 0x4a8aff, 0xffaa40, 0x9a6adf, 0x60ddff];
      for (let i = 0; i < 4; i++) {
        const lw = (0.2 + Math.random() * 0.5) * T * 0.7;
        const indent = (i === 0 || i === 3) ? 0 : 4;
        g.fillStyle(lineColors[i % lineColors.length], 0.45);
        g.fillRect((tx + 0.48) * T + indent, (ty + 0.28 + i * 0.12) * T, lw, 1.3);
      }
      // Monitor stand
      g.fillStyle(0x2a2a38, 1);
      g.fillRect((tx + 0.75) * T, (ty + 0.85) * T, T * 0.2, T * 0.1);
      g.fillRect((tx + 0.6) * T, (ty + 0.93) * T, T * 0.5, T * 0.04);
    }
    // Keyboard on desk
    g.fillStyle(0x222230, 0.7);
    g.fillRoundedRect((tx + 0.4) * T, (ty + 0.9) * T, T * 0.6, T * 0.15, 1);
    // Mug
    g.fillStyle(0x4a3a3a, 0.8);
    g.fillCircle((tx + 1.6) * T, (ty + 0.5) * T, 3);
    g.fillStyle(0x6a4a3a, 0.5);
    g.fillCircle((tx + 1.6) * T, (ty + 0.5) * T, 2);
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
    // Board shadow
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect((tx + 0.05) * T, (ty + 0.05) * T, w * T, T * 0.85, 2);
    // Board
    g.fillStyle(0xe8e8f0, 0.92);
    g.fillRoundedRect(tx * T, ty * T, w * T, T * 0.8, 2);
    g.lineStyle(1.5, 0x8a8a9a, 0.5);
    g.strokeRoundedRect(tx * T, ty * T, w * T, T * 0.8, 2);
    // Scribbles — diagram-like
    const colors = [0x4a4aaa, 0xaa4a4a, 0x4a8a4a, 0x8a6a2a];
    for (let i = 0; i < 4; i++) {
      const lw = (0.15 + Math.random() * 0.4) * w;
      g.lineStyle(0.8, colors[i], 0.35);
      const ly = ty + 0.2 + i * 0.15;
      const lx = tx + 0.15 + (i % 2) * 0.1;
      g.lineBetween(lx * T, ly * T, (lx + lw) * T, ly * T);
    }
    // Box diagram
    g.lineStyle(0.6, 0x4a4aaa, 0.25);
    g.strokeRect((tx + w * 0.6) * T, (ty + 0.15) * T, w * 0.25 * T, T * 0.2);
    g.strokeRect((tx + w * 0.6) * T, (ty + 0.45) * T, w * 0.25 * T, T * 0.2);
    g.lineBetween((tx + w * 0.725) * T, (ty + 0.35) * T, (tx + w * 0.725) * T, (ty + 0.45) * T);
    // Marker tray
    g.fillStyle(0x666670, 0.5);
    g.fillRect(tx * T + 4, (ty + 0.8) * T - 2, w * T - 8, 3);
    // Colored markers
    const markerColors = [0xff3030, 0x3060ff, 0x30aa30, 0x222222];
    for (let i = 0; i < 4; i++) {
      g.fillStyle(markerColors[i], 0.7);
      g.fillRect((tx + 0.2 + i * 0.15) * T, (ty + 0.78) * T, 2, 5);
    }
  }

  private drawMonitor(g: Phaser.GameObjects.Graphics, tx: number, ty: number, w: number): void {
    // Wall glow behind monitor
    g.fillStyle(0x40ff80, 0.04);
    g.fillRoundedRect((tx - 0.3) * T, (ty - 0.2) * T, (w + 0.6) * T, T * 1.4, 6);
    // Big wall-mounted screen frame
    g.fillStyle(0x0a0a14, 1);
    g.fillRoundedRect(tx * T, ty * T, w * T, T * 0.95, 3);
    g.lineStyle(1.5, 0x2a2a40, 0.8);
    g.strokeRoundedRect(tx * T, ty * T, w * T, T * 0.95, 3);
    // Screen content background
    g.fillStyle(0x081a10, 1);
    g.fillRoundedRect((tx + 0.12) * T, (ty + 0.08) * T, (w - 0.24) * T, T * 0.78, 2);
    // Screen glow
    g.fillStyle(0x40ff80, 0.08);
    g.fillRoundedRect((tx + 0.12) * T, (ty + 0.08) * T, (w - 0.24) * T, T * 0.78, 2);
    // Terminal text lines (more detailed)
    const termColors = [0x40ff80, 0x30dd60, 0x60ffaa, 0x80ffcc, 0x40cc70];
    for (let i = 0; i < 5; i++) {
      const lw = (0.15 + Math.random() * 0.5) * (w - 0.5);
      const indent = i === 0 ? 0 : (i % 2 === 0 ? 6 : 12);
      g.fillStyle(termColors[i % termColors.length], 0.5 + Math.random() * 0.2);
      g.fillRect((tx + 0.25) * T + indent, (ty + 0.18 + i * 0.13) * T, lw * T, 1.3);
    }
    // Cursor blink indicator
    g.fillStyle(0x40ff80, 0.8);
    g.fillRect((tx + 0.25) * T, (ty + 0.18 + 5 * 0.13) * T, 4, 1.5);
    // Floor reflection below monitor
    g.fillStyle(0x40ff80, 0.03);
    g.fillRect(tx * T, (ty + 1) * T, w * T, T * 0.5);
  }

  private drawServerRack(g: Phaser.GameObjects.Graphics, tx: number, ty: number, h: number): void {
    // Rack body
    g.fillStyle(0x16161e, 1);
    g.fillRoundedRect(tx * T, ty * T, T * 1.2, h * T, 2);
    g.lineStyle(0.8, 0x2a2a40, 0.6);
    g.strokeRoundedRect(tx * T, ty * T, T * 1.2, h * T, 2);
    // Rack slots
    for (let i = 0; i < h * 2; i++) {
      g.fillStyle(0x1a1a28, 1);
      g.fillRect((tx + 0.1) * T, (ty + 0.1 + i * 0.5) * T, T * 1, T * 0.4);
      g.lineStyle(0.3, 0x252535, 0.5);
      g.strokeRect((tx + 0.1) * T, (ty + 0.1 + i * 0.5) * T, T * 1, T * 0.4);
    }
    // LEDs with glow
    for (let i = 0; i < h * 3; i++) {
      const isGreen = Math.random() > 0.15;
      const ledColor = isGreen ? 0x40ff80 : 0xff4040;
      // LED glow halo
      g.fillStyle(ledColor, 0.12);
      g.fillCircle((tx + 0.3) * T, (ty + 0.2 + i * 0.3) * T, 4);
      // LED dot
      g.fillStyle(ledColor, 0.9);
      g.fillCircle((tx + 0.3) * T, (ty + 0.2 + i * 0.3) * T, 1.5);
      // Secondary LED
      g.fillStyle(0x4080ff, 0.1);
      g.fillCircle((tx + 0.8) * T, (ty + 0.2 + i * 0.3) * T, 3);
      g.fillStyle(0x4080ff, 0.7);
      g.fillCircle((tx + 0.8) * T, (ty + 0.2 + i * 0.3) * T, 1.2);
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

  private drawDecorations(): void {
    const g = this.scene.add.graphics().setDepth(3);
    const glow = this.scene.add.graphics().setDepth(1);

    // === CEILING LIGHTS (glow on floor) ===
    const lights = [
      // Meeting room
      { x: 5.5, y: 3.5, r: 2.5, color: 0xffeedd },
      // Research
      { x: 5.5, y: 11.5, r: 2.5, color: 0xddfff0 },
      // Archive
      { x: 5, y: 20, r: 2.5, color: 0xfff0dd },
      // Dev floor — multiple lights
      { x: 17, y: 4, r: 2.5, color: 0xddeeff },
      { x: 22, y: 4, r: 2.5, color: 0xddeeff },
      { x: 17, y: 8, r: 2.5, color: 0xddeeff },
      { x: 22, y: 8, r: 2.5, color: 0xddeeff },
      // Server room
      { x: 34, y: 4, r: 2, color: 0xffdde0 },
      // Deploy
      { x: 34, y: 15, r: 2, color: 0xe8ddff },
      // Corridor intersection
      { x: 12, y: 14, r: 2, color: 0xeeeeff },
    ];
    for (const l of lights) {
      // Glow pool on floor
      for (let i = 4; i >= 1; i--) {
        glow.fillStyle(l.color, 0.02 * i);
        glow.fillCircle(l.x * T, l.y * T, l.r * T * (1.2 - i * 0.15));
      }
      // Tiny ceiling fixture dot
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(l.x * T, l.y * T, 2);
      g.fillStyle(l.color, 0.08);
      g.fillCircle(l.x * T, l.y * T, 5);
    }

    // === RUGS / CARPETS ===
    // Meeting room rug under table
    glow.fillStyle(0x4a8aff, 0.03);
    glow.fillRoundedRect(2.5 * T, 2.5 * T, 6 * T, 3.5 * T, 6);
    glow.lineStyle(0.5, 0x4a8aff, 0.06);
    glow.strokeRoundedRect(2.8 * T, 2.8 * T, 5.4 * T, 2.9 * T, 4);

    // Dev floor center rug
    glow.fillStyle(0x4a8aff, 0.02);
    glow.fillRoundedRect(16 * T, 5 * T, 8 * T, 4 * T, 4);

    // === WALL ART / POSTERS ===
    // Meeting room — company logo on wall
    this.drawWallArt(g, 7.5, 1.2, 0x4a8aff);
    // Research — periodic table poster
    this.drawWallArt(g, 7, 9.3, 0x40cc70);
    // Archive — old map
    this.drawWallArt(g, 7.5, 17.5, 0xddaa60);
    // Dev floor — motivational posters
    this.drawWallArt(g, 14.5, 3, 0x4a8aff);
    this.drawWallArt(g, 14.5, 8, 0xaa6aef);
    // Deploy — launch poster
    this.drawWallArt(g, 38, 14, 0xaa6aef);

    // === CLOCK on meeting room wall ===
    g.fillStyle(0x222230, 0.8);
    g.fillCircle(8.5 * T, 1.5 * T, 5);
    g.lineStyle(0.5, 0x4a4a60, 0.6);
    g.strokeCircle(8.5 * T, 1.5 * T, 5);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(8.5 * T, 1.5 * T, 3.5);
    // Clock hands
    g.lineStyle(0.5, 0x333340, 0.8);
    g.lineBetween(8.5 * T, 1.5 * T, 8.5 * T, 1.5 * T - 2.5);
    g.lineBetween(8.5 * T, 1.5 * T, 8.5 * T + 2, 1.5 * T);

    // === FIRE EXTINGUISHER in corridor ===
    g.fillStyle(0xcc2020, 0.7);
    g.fillRoundedRect(14.2 * T, 11.2 * T, T * 0.3, T * 0.6, 1);
    g.fillStyle(0x888888, 0.5);
    g.fillRect(14.25 * T, 11 * T, T * 0.2, T * 0.2);

    // === VENDING MACHINE in corridor ===
    g.fillStyle(0x2a2a44, 1);
    g.fillRoundedRect(26 * T, 12.2 * T, T * 0.9, T * 1.5, 2);
    g.lineStyle(0.5, 0x3a3a60, 0.5);
    g.strokeRoundedRect(26 * T, 12.2 * T, T * 0.9, T * 1.5, 2);
    // Display
    g.fillStyle(0x4a8aff, 0.2);
    g.fillRect(26.1 * T, 12.4 * T, T * 0.7, T * 0.5);
    // Colored items
    const vendColors = [0xff4040, 0x40cc70, 0xffaa40, 0x4a8aff, 0xaa6aef, 0xffee40];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        g.fillStyle(vendColors[(r * 3 + c) % vendColors.length], 0.5);
        g.fillRect(26.12 * T + c * T * 0.22, 12.95 * T + r * T * 0.18, T * 0.15, T * 0.12);
      }
    }

    // === TRASH BIN next to desks ===
    this.drawTrashBin(g, 14.8, 10.5);
    this.drawTrashBin(g, 25.5, 10.5);
    this.drawTrashBin(g, 37, 6);

    // === EXTRA PLANTS in corridor ===
    this.drawPlant(g, 14.3, 14.5);
    this.drawPlant(g, 27.5, 14.5);

    // === COAT RACK near meeting room door ===
    g.fillStyle(0x3a3a4a, 0.6);
    g.fillRect(10.5 * T, 4.5 * T, 2, T * 0.8);
    g.fillStyle(0x3a3a50, 0.5);
    g.fillCircle(10.5 * T, 4.4 * T, 3);
    // Hanging coat
    g.fillStyle(0x2a3a5a, 0.4);
    g.fillRect(10.2 * T, 4.6 * T, T * 0.4, T * 0.3);

    // === FLOOR CABLE CHANNELS in server room ===
    g.lineStyle(1.5, 0x222230, 0.4);
    for (let i = 0; i < 4; i++) {
      const rx = (30.5 + i * 2) * T;
      g.lineBetween(rx, 5 * T, rx, 2 * T);
    }

    // === STANDING LAMP in corridor ===
    g.fillStyle(0x3a3a4a, 0.5);
    g.fillRect(10.4 * T, 10 * T, 2, T * 0.8);
    g.fillStyle(0xffddaa, 0.15);
    g.fillCircle(10.5 * T, 9.8 * T, T * 0.4);
    g.fillStyle(0xffcc80, 0.3);
    g.fillCircle(10.5 * T, 9.8 * T, 3);
  }

  private drawWallArt(g: Phaser.GameObjects.Graphics, tx: number, ty: number, accent: number): void {
    // Frame shadow
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect((tx + 0.03) * T, (ty + 0.03) * T, T * 0.8, T * 0.6, 1);
    // Frame
    g.fillStyle(0x2a2a38, 0.9);
    g.fillRoundedRect(tx * T, ty * T, T * 0.8, T * 0.6, 1);
    g.lineStyle(0.5, 0x3a3a50, 0.5);
    g.strokeRoundedRect(tx * T, ty * T, T * 0.8, T * 0.6, 1);
    // Art content (abstract colored block)
    g.fillStyle(accent, 0.25);
    g.fillRect((tx + 0.1) * T, (ty + 0.1) * T, T * 0.6, T * 0.4);
    g.fillStyle(accent, 0.15);
    g.fillRect((tx + 0.1) * T, (ty + 0.1) * T, T * 0.3, T * 0.4);
  }

  private drawTrashBin(g: Phaser.GameObjects.Graphics, tx: number, ty: number): void {
    g.fillStyle(0x2a2a3a, 0.7);
    g.fillRoundedRect(tx * T, ty * T, T * 0.4, T * 0.5, 2);
    g.lineStyle(0.5, 0x3a3a4a, 0.4);
    g.strokeRoundedRect(tx * T, ty * T, T * 0.4, T * 0.5, 2);
    // Rim
    g.fillStyle(0x3a3a4a, 0.6);
    g.fillRect(tx * T - 1, ty * T, T * 0.4 + 2, 2);
  }

  private drawLabels(): void {
    for (const b of BUILDINGS) {
      const def = ROOM_DEFS[b.type];
      const x = (b.x + b.width / 2) * T;
      const y = (b.y + 0.8) * T;
      // Convert accent hex to CSS color
      const r = (def.accent >> 16) & 0xff;
      const gv = (def.accent >> 8) & 0xff;
      const bv = def.accent & 0xff;
      const accentCSS = `rgb(${r},${gv},${bv})`;

      this.scene.add.text(x, y, b.name.toUpperCase(), {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '7px',
        fontStyle: 'bold',
        color: accentCSS,
        stroke: '#0a0a14',
        strokeThickness: 3,
        letterSpacing: 2,
      }).setOrigin(0.5, 0.5).setDepth(10).setAlpha(0.8).setResolution(2);
    }
  }
}
