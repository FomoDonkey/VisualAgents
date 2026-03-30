import Phaser from 'phaser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: 'square' | 'circle';
}

export class ParticleManager {
  private scene: Phaser.Scene;
  private particles: Particle[] = [];
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1500);
  }

  emitSuccess(x: number, y: number): void {
    // Green sparkle burst
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.3;
      const speed = 15 + Math.random() * 25;
      this.particles.push({
        x, y: y - 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 600 + Math.random() * 400,
        maxLife: 600 + Math.random() * 400,
        color: [0x40ff80, 0x60ffaa, 0x80ffcc, 0x20dd60][Math.floor(Math.random() * 4)],
        size: 0.8 + Math.random() * 0.8,
        type: Math.random() > 0.5 ? 'square' : 'circle',
      });
    }
    // Central flash
    this.particles.push({
      x, y: y - 4,
      vx: 0, vy: -5,
      life: 200,
      maxLife: 200,
      color: 0xffffff,
      size: 3,
      type: 'circle',
    });
  }

  emitError(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.particles.push({
        x, y: y - 4,
        vx: Math.cos(angle) * (10 + Math.random() * 15),
        vy: Math.sin(angle) * (10 + Math.random() * 15),
        life: 500 + Math.random() * 300,
        maxLife: 500 + Math.random() * 300,
        color: [0xff4a5a, 0xff6a5a, 0xff3040][Math.floor(Math.random() * 3)],
        size: 1 + Math.random() * 0.5,
        type: 'square',
      });
    }
  }

  emitThinking(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y - 10,
        vx: (Math.random() - 0.5) * 3,
        vy: -8 - Math.random() * 8,
        life: 800 + Math.random() * 400,
        maxLife: 800 + Math.random() * 400,
        color: [0x6abaff, 0x9a6adf, 0x4a8aff][Math.floor(Math.random() * 3)],
        size: 0.6 + Math.random() * 0.5,
        type: 'circle',
      });
    }
  }

  emitWalkDust(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + 7,
        vx: (Math.random() - 0.5) * 5,
        vy: -2 - Math.random() * 3,
        life: 250 + Math.random() * 100,
        maxLife: 250 + Math.random() * 100,
        color: [0x555566, 0x666677, 0x444455][Math.floor(Math.random() * 3)],
        size: 0.4 + Math.random() * 0.4,
        type: 'circle',
      });
    }
  }

  // Coding sparkles — bracket/curly symbols feeling
  emitCoding(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y - 8,
        vx: (Math.random() - 0.5) * 8,
        vy: -12 - Math.random() * 8,
        life: 600 + Math.random() * 300,
        maxLife: 600 + Math.random() * 300,
        color: [0x4a8aff, 0x40cc80, 0xffaa40, 0x60ddff][Math.floor(Math.random() * 4)],
        size: 0.5 + Math.random() * 0.6,
        type: 'square',
      });
    }
  }

  // Search/research — magnifying glass vibe, floating dots
  emitSearch(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 8;
      this.particles.push({
        x: x + Math.cos(angle) * r,
        y: y - 6 + Math.sin(angle) * r,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4 - 5,
        life: 500 + Math.random() * 300,
        maxLife: 500 + Math.random() * 300,
        color: [0x40cc70, 0x60ffaa, 0x4ae0a0][Math.floor(Math.random() * 3)],
        size: 0.4 + Math.random() * 0.4,
        type: 'circle',
      });
    }
  }

  // Deploy — upward rocket trail
  emitDeploy(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + 4,
        vx: (Math.random() - 0.5) * 6,
        vy: 8 + Math.random() * 12,
        life: 400 + Math.random() * 200,
        maxLife: 400 + Math.random() * 200,
        color: [0xffaa40, 0xff6030, 0xffcc60, 0xff4020][Math.floor(Math.random() * 4)],
        size: 0.6 + Math.random() * 0.5,
        type: Math.random() > 0.5 ? 'square' : 'circle',
      });
    }
  }

  // Terminal/bash — green matrix rain
  emitTerminal(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y - 10,
        vx: (Math.random() - 0.5) * 2,
        vy: 8 + Math.random() * 12,
        life: 500 + Math.random() * 300,
        maxLife: 500 + Math.random() * 300,
        color: [0x40ff80, 0x30dd60, 0x20bb40][Math.floor(Math.random() * 3)],
        size: 0.4 + Math.random() * 0.4,
        type: 'square',
      });
    }
  }

  // Ambient floating dust particles
  emitAmbientDust(worldWidth: number, worldHeight: number): void {
    if (this.particles.length > 300) return;
    this.particles.push({
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 1,
      life: 3000 + Math.random() * 2000,
      maxLife: 3000 + Math.random() * 2000,
      color: 0x4a4a6a,
      size: 0.3 + Math.random() * 0.3,
      type: 'circle',
    });
  }

  update(delta: number): void {
    this.graphics.clear();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.vy += 15 * (delta / 1000); // gravity

      const alpha = Math.max(0, (p.life / p.maxLife));
      // Ease out alpha
      const easedAlpha = alpha * alpha;

      this.graphics.fillStyle(p.color, easedAlpha);
      const s = p.size * (0.5 + alpha * 0.5); // shrink as dying

      if (p.type === 'circle') {
        this.graphics.fillCircle(p.x, p.y, s);
      } else {
        this.graphics.fillRect(
          Math.round(p.x - s / 2),
          Math.round(p.y - s / 2),
          Math.ceil(s),
          Math.ceil(s)
        );
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
