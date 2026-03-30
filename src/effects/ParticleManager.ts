import Phaser from 'phaser';
import { CONFIG } from '../config';

const T = CONFIG.TILE_SIZE;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
  type: 'square' | 'circle' | 'glow' | 'ring' | 'text';
  text?: string;
  gravity?: number;
}

interface TrailPoint {
  x: number; y: number;
  age: number; color: number;
}

export class ParticleManager {
  private scene: Phaser.Scene;
  private particles: Particle[] = [];
  private trails: TrailPoint[] = [];
  private graphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Glow layer below agents
    this.glowGraphics = scene.add.graphics().setDepth(400);
    // Particles above agents
    this.graphics = scene.add.graphics().setDepth(1500);
  }

  // === AGENT TRAIL — glowing line behind walking agents ===
  addTrailPoint(x: number, y: number, color: number): void {
    this.trails.push({ x, y, age: 0, color });
    if (this.trails.length > 200) this.trails.shift();
  }

  // === FLOATING TEXT — rises and fades ===
  emitFloatingText(x: number, y: number, text: string, color: number): void {
    this.particles.push({
      x, y: y - 14,
      vx: (Math.random() - 0.5) * 6,
      vy: -20 - Math.random() * 10,
      life: 1200, maxLife: 1200,
      color, size: 0, type: 'text', text,
      gravity: -2,
    });
  }

  // === SUCCESS — green sparkle burst ===
  emitSuccess(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.3;
      const speed = 20 + Math.random() * 25;
      this.particles.push({
        x, y: y - 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        life: 500 + Math.random() * 300,
        maxLife: 500 + Math.random() * 300,
        color: [0x40ff80, 0x60ffaa, 0xaaffcc, 0xffffff][Math.floor(Math.random() * 4)],
        size: 1.2 + Math.random() * 1,
        type: 'circle',
      });
    }
  }

  // === ERROR — red burst ===
  emitError(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 15 + Math.random() * 18;
      this.particles.push({
        x, y: y - 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400 + Math.random() * 300,
        maxLife: 400 + Math.random() * 300,
        color: [0xff4a5a, 0xff6a3a, 0xff2020][Math.floor(Math.random() * 3)],
        size: 1.2 + Math.random() * 0.8,
        type: 'square',
      });
    }
  }

  // === THINKING — floating orbs that orbit ===
  emitThinking(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: x + Math.cos(angle) * 5,
        y: y - 12,
        vx: Math.cos(angle + Math.PI / 2) * 6,
        vy: -10 - Math.random() * 10,
        life: 1000 + Math.random() * 500,
        maxLife: 1000 + Math.random() * 500,
        color: [0x6abaff, 0x9a6adf, 0x4a8aff, 0xaa80ff][Math.floor(Math.random() * 4)],
        size: 0.8 + Math.random() * 0.8,
        type: 'glow',
        gravity: -8,
      });
    }
  }

  // === WALK DUST ===
  emitWalkDust(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + 8,
        vx: (Math.random() - 0.5) * 8,
        vy: -3 - Math.random() * 4,
        life: 300 + Math.random() * 150,
        maxLife: 300 + Math.random() * 150,
        color: [0x555566, 0x666677, 0x444455][Math.floor(Math.random() * 3)],
        size: 0.5 + Math.random() * 0.5,
        type: 'circle',
      });
    }
  }

  // === CODING — blue/green sparkle fountain ===
  emitCoding(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y - 6,
        vx: (Math.random() - 0.5) * 12,
        vy: -15 - Math.random() * 15,
        life: 700 + Math.random() * 400,
        maxLife: 700 + Math.random() * 400,
        color: [0x4a8aff, 0x40cc80, 0xffaa40, 0x60ddff, 0xaa80ff][Math.floor(Math.random() * 5)],
        size: 0.5 + Math.random() * 0.8,
        type: Math.random() > 0.3 ? 'square' : 'glow',
        gravity: 5,
      });
    }
  }

  // === SEARCH — floating dots ===
  emitSearch(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 10;
      this.particles.push({
        x: x + Math.cos(angle) * r,
        y: y - 6 + Math.sin(angle) * r,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8 - 6,
        life: 600 + Math.random() * 300,
        maxLife: 600 + Math.random() * 300,
        color: [0x40cc70, 0x60ffaa, 0x4ae0a0, 0x80ffcc][Math.floor(Math.random() * 4)],
        size: 0.5 + Math.random() * 0.6,
        type: 'glow',
        gravity: 3,
      });
    }
  }

  // === DEPLOY — rocket flame trail upward ===
  emitDeploy(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + 6,
        vx: (Math.random() - 0.5) * 10,
        vy: 12 + Math.random() * 18,
        life: 500 + Math.random() * 300,
        maxLife: 500 + Math.random() * 300,
        color: [0xffaa40, 0xff6030, 0xffcc60, 0xff4020, 0xffee80][Math.floor(Math.random() * 5)],
        size: 0.8 + Math.random() * 0.8,
        type: Math.random() > 0.4 ? 'glow' : 'circle',
      });
    }
  }

  // === TERMINAL — matrix rain ===
  emitTerminal(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 12,
        vx: (Math.random() - 0.5) * 3,
        vy: 12 + Math.random() * 18,
        life: 600 + Math.random() * 400,
        maxLife: 600 + Math.random() * 400,
        color: [0x40ff80, 0x30dd60, 0x20bb40, 0x60ffaa][Math.floor(Math.random() * 4)],
        size: 0.5 + Math.random() * 0.5,
        type: 'square',
        gravity: 20,
      });
    }
  }

  // === AMBIENT DUST ===
  emitAmbientDust(worldWidth: number, worldHeight: number): void {
    if (this.particles.length > 300) return;
    this.particles.push({
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 1.5,
      life: 4000 + Math.random() * 3000,
      maxLife: 4000 + Math.random() * 3000,
      color: [0x4a4a6a, 0x3a3a5a, 0x5a5a7a][Math.floor(Math.random() * 3)],
      size: 0.3 + Math.random() * 0.4,
      type: 'circle',
      gravity: 0,
    });
  }

  update(delta: number): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    // === Draw agent trails ===
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.age += delta;
      if (t.age > 600) {
        this.trails.splice(i, 1);
        continue;
      }
      const alpha = 1 - (t.age / 600);
      const a = alpha * alpha * 0.3;
      this.glowGraphics.fillStyle(t.color, a);
      this.glowGraphics.fillCircle(t.x, t.y, 3 + alpha * 3);
    }

    // === Draw particles ===
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const g = p.gravity ?? 15;
      p.vy += g * dt;

      const alpha = Math.max(0, p.life / p.maxLife);
      const ea = alpha * alpha; // eased alpha

      if (p.type === 'text' && p.text) {
        // Floating text — use Phaser text temporarily? No, draw with canvas.
        // Skip in graphics — handled by scene text objects
        // For now just draw a glow dot at the text position
        this.graphics.fillStyle(p.color, ea * 0.6);
        this.graphics.fillCircle(p.x, p.y, 2);
        continue;
      }

      if (p.type === 'ring') {
        // Expanding ring
        const progress = 1 - alpha;
        const radius = 4 + progress * 30;
        this.graphics.lineStyle(1.5 * alpha, p.color, ea * 0.7);
        this.graphics.strokeCircle(p.x, p.y, radius);
        // Inner glow
        this.glowGraphics.fillStyle(p.color, ea * 0.06);
        this.glowGraphics.fillCircle(p.x, p.y, radius);
        continue;
      }

      if (p.type === 'glow') {
        const s = p.size * (0.5 + alpha * 0.5);
        this.glowGraphics.fillStyle(p.color, ea * 0.12);
        this.glowGraphics.fillCircle(p.x, p.y, s * 3);
        this.graphics.fillStyle(p.color, ea * 0.7);
        this.graphics.fillCircle(p.x, p.y, s);
        continue;
      }

      // Standard particles
      this.graphics.fillStyle(p.color, ea);
      const s = p.size * (0.5 + alpha * 0.5);

      if (p.type === 'circle') {
        this.graphics.fillCircle(p.x, p.y, s);
      } else {
        this.graphics.fillRect(
          Math.round(p.x - s / 2),
          Math.round(p.y - s / 2),
          Math.ceil(s), Math.ceil(s)
        );
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
  }
}
