import Phaser from 'phaser';
import { CONFIG } from '../config';

// In-world wall-mounted screen showing status
// Just a visual decoration now - real stats are in HTML UI
export class Billboard {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private screenFlicker = 0;
  private screenGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
    this.scene = scene;
    const x = tileX * CONFIG.TILE_SIZE;
    const y = tileY * CONFIG.TILE_SIZE;

    this.screenGfx = scene.add.graphics();
    this.drawScreen(1);

    this.container = scene.add.container(x, y, [this.screenGfx]);
    this.container.setDepth(800);
  }

  private drawScreen(brightness: number): void {
    this.screenGfx.clear();
    // Monitor bezel
    this.screenGfx.fillStyle(0x1a1a2a, 0.95);
    this.screenGfx.fillRoundedRect(0, 0, 48, 28, 2);
    // Screen
    const alpha = 0.7 * brightness;
    this.screenGfx.fillStyle(0x0a2a1a, alpha);
    this.screenGfx.fillRect(2, 2, 44, 24);
    // Text lines (fake code/status)
    this.screenGfx.fillStyle(0x40ff80, alpha * 0.8);
    this.screenGfx.fillRect(4, 4, 16, 1);
    this.screenGfx.fillRect(4, 7, 24, 1);
    this.screenGfx.fillRect(4, 10, 12, 1);
    this.screenGfx.fillStyle(0x4a8aff, alpha * 0.8);
    this.screenGfx.fillRect(4, 13, 20, 1);
    this.screenGfx.fillRect(4, 16, 30, 1);
    this.screenGfx.fillStyle(0xffaa40, alpha * 0.6);
    this.screenGfx.fillRect(4, 19, 18, 1);
    this.screenGfx.fillRect(4, 22, 10, 1);
    // Screen glow
    this.screenGfx.lineStyle(0.5, 0x40ff80, 0.15 * brightness);
    this.screenGfx.strokeRoundedRect(-1, -1, 50, 30, 3);
  }

  update(delta: number): void {
    this.screenFlicker += delta;
    if (this.screenFlicker > 2000) {
      this.screenFlicker = 0;
      const brightness = 0.85 + Math.random() * 0.15;
      this.drawScreen(brightness);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
