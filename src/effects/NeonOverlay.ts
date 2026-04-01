import Phaser from 'phaser';
import { CONFIG } from '../config';
import { BUILDINGS } from '../world/BuildingRegistry';
import { ROOM_DEFS } from '../config';

const T = CONFIG.TILE_SIZE;

/**
 * Animated neon overlay: glowing room borders, pulsing energy grid.
 */
export class NeonOverlay {
  private scene: Phaser.Scene;
  private neonGfx: Phaser.GameObjects.Graphics;
  private timer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.neonGfx = scene.add.graphics().setDepth(5);
  }

  update(delta: number): void {
    this.timer += delta;
    const t = this.timer / 1000;

    this.neonGfx.clear();

    this.drawNeonRoomBorders(t);
    this.drawCorridorEdgeGlow(t);
  }

  private drawNeonRoomBorders(t: number): void {
    for (let i = 0; i < BUILDINGS.length; i++) {
      const b = BUILDINGS[i];
      const def = ROOM_DEFS[b.type];
      const x = b.x * T;
      const y = b.y * T;
      const w = b.width * T;
      const h = b.height * T;

      // Pulsing glow intensity
      const pulse = 0.4 + Math.sin(t * 1.5 + i * 1.2) * 0.2;

      // Outer glow (thick, low alpha)
      this.neonGfx.lineStyle(4, def.accent, pulse * 0.15);
      this.neonGfx.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, 4);

      // Mid glow
      this.neonGfx.lineStyle(2, def.accent, pulse * 0.35);
      this.neonGfx.strokeRoundedRect(x, y, w, h, 3);

      // Inner bright line
      this.neonGfx.lineStyle(0.8, def.accent, pulse * 0.7);
      this.neonGfx.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 2);

      // Corner accents — bright dots at corners
      const corners = [
        [x + 3, y + 3], [x + w - 3, y + 3],
        [x + 3, y + h - 3], [x + w - 3, y + h - 3],
      ];
      for (const [cx, cy] of corners) {
        this.neonGfx.fillStyle(def.accent, pulse * 0.8);
        this.neonGfx.fillCircle(cx, cy, 1.5);
        this.neonGfx.fillStyle(def.accent, pulse * 0.2);
        this.neonGfx.fillCircle(cx, cy, 4);
      }

      // Room name glow underline
      const nameX = x + w / 2;
      const nameY = y + 10;
      this.neonGfx.fillStyle(def.accent, pulse * 0.3);
      this.neonGfx.fillRect(nameX - 20, nameY + 4, 40, 1);
    }
  }

  private drawCorridorEdgeGlow(t: number): void {
    const pulse = 0.15 + Math.sin(t * 0.8) * 0.05;

    // Horizontal corridor edges (y=12 and y=16)
    this.neonGfx.lineStyle(1.5, 0x4a8aff, pulse);
    this.neonGfx.lineBetween(10 * T, 12 * T, 39 * T, 12 * T);
    this.neonGfx.lineBetween(10 * T, 16 * T, 39 * T, 16 * T);

    // Vertical corridor edges (x=10 and x=14)
    this.neonGfx.lineStyle(1.5, 0x4a8aff, pulse * 0.8);
    this.neonGfx.lineBetween(10 * T, 0, 10 * T, CONFIG.WORLD_HEIGHT * T);
    this.neonGfx.lineBetween(14 * T, 0, 14 * T, 12 * T);
    this.neonGfx.lineBetween(14 * T, 16 * T, 14 * T, CONFIG.WORLD_HEIGHT * T);

    // Right corridor
    this.neonGfx.lineStyle(1, 0xaa6aef, pulse * 0.6);
    this.neonGfx.lineBetween(27 * T, 0, 27 * T, 24 * T);
    this.neonGfx.lineBetween(29 * T, 0, 29 * T, 12 * T);
  }
}
