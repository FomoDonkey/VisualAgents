import Phaser from 'phaser';
import { CONFIG, ROOM_DEFS } from '../config';
import { BUILDINGS } from '../world/BuildingRegistry';
import { AgentManager } from '../agents/AgentManager';
import { AGENT_PALETTES } from '../config';

const T = CONFIG.TILE_SIZE;

/**
 * Cinematic visual effects layer — the WOW factor.
 *
 * - Holographic room name signs that flicker
 * - Floor reflections of agents (mirror effect)
 * - Dynamic light cones under agents
 * - Energy beam connecting working agent to target
 * - Ambient room-specific particles (sparks in server room, papers in archive, etc.)
 * - Scanning line on wall monitors
 * - Pulsing heartbeat on the whole office when idle
 */
export class CinematicEffects {
  private scene: Phaser.Scene;
  private agentManager: AgentManager | null = null;
  private timer = 0;

  // Graphics layers
  private reflectionGfx: Phaser.GameObjects.Graphics;  // Below agents
  private beamGfx: Phaser.GameObjects.Graphics;         // Below agents
  private overlayGfx: Phaser.GameObjects.Graphics;       // Above most things

  // Holographic room signs
  private holoSigns: Phaser.GameObjects.Text[] = [];

  // Room ambient particles
  private roomParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number; room: number }[] = [];

  // Cached agent color map (avoids .find() + parseInt per agent per frame)
  private agentColorCache: Map<string, number> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.reflectionGfx = scene.add.graphics().setDepth(450); // Just below agent sprites (500)
    this.beamGfx = scene.add.graphics().setDepth(100);
    this.overlayGfx = scene.add.graphics().setDepth(1800);

    this.createHoloSigns();
  }

  setAgentManager(am: AgentManager): void {
    this.agentManager = am;
    // Pre-cache agent colors to avoid .find() + parseInt() every frame
    for (const p of AGENT_PALETTES) {
      this.agentColorCache.set(p.id, parseInt(p.color.replace('#', ''), 16));
    }
  }

  private getAgentColor(id: string): number {
    return this.agentColorCache.get(id) ?? 0x4a8aff;
  }

  private createHoloSigns(): void {
    for (const b of BUILDINGS) {
      const def = ROOM_DEFS[b.type];
      const r = (def.accent >> 16) & 0xff;
      const g = (def.accent >> 8) & 0xff;
      const bv = def.accent & 0xff;

      const cx = (b.x + b.width / 2) * T;
      const cy = (b.y + b.height / 2) * T;

      const text = this.scene.add.text(cx, cy, b.shortName.toUpperCase(), {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '18px',
        fontStyle: 'bold',
        color: `rgba(${r},${g},${bv},0.12)`,
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(3).setAlpha(0.15).setResolution(2);

      this.holoSigns.push(text);
    }
  }

  update(delta: number): void {
    this.timer += delta;
    const t = this.timer / 1000;

    this.reflectionGfx.clear();
    this.beamGfx.clear();
    this.overlayGfx.clear();

    this.updateAgentReflections(t);
    this.updateAgentLightCones(t);
    this.updateEnergyBeams(t);
    this.updateHoloSigns(t);
    this.updateRoomAmbientParticles(delta, t);
    this.updateScanlines(t);
    this.updateIdlePulse(t);
  }

  // === AGENT REFLECTIONS — mirrored silhouettes below agents ===
  private updateAgentReflections(t: number): void {
    if (!this.agentManager) return;
    for (const a of this.agentManager.getAllAgents()) {
      const color = this.getAgentColor(a.id);

      // Reflection (flipped, faded, below)
      const rx = a.sprite.x;
      const ry = a.sprite.y + 18;

      // Reflection shimmer
      const shimmer = 0.08 + Math.sin(t * 2 + a.sprite.x * 0.1) * 0.03;

      // Body reflection
      this.reflectionGfx.fillStyle(color, shimmer);
      this.reflectionGfx.fillEllipse(rx, ry, 8, 4);

      // Head reflection
      this.reflectionGfx.fillStyle(color, shimmer * 0.7);
      this.reflectionGfx.fillEllipse(rx, ry - 2, 5, 2);
    }
  }

  // === DYNAMIC LIGHT CONES — pool of light under each agent ===
  private updateAgentLightCones(t: number): void {
    if (!this.agentManager) return;
    for (const a of this.agentManager.getAllAgents()) {
      const color = this.getAgentColor(a.id);
      const s = a.fsm.state;

      let radius = T * 1.2;
      let alpha = 0.04;

      if (s === 'working' || s === 'thinking') {
        radius = T * 1.8 + Math.sin(t * 3) * T * 0.2;
        alpha = 0.07;
      } else if (s === 'walking') {
        radius = T * 1.4;
        alpha = 0.05;
      }

      // Light pool
      this.reflectionGfx.fillStyle(color, alpha);
      this.reflectionGfx.fillCircle(a.sprite.x, a.sprite.y + 8, radius);
      this.reflectionGfx.fillStyle(color, alpha * 0.5);
      this.reflectionGfx.fillCircle(a.sprite.x, a.sprite.y + 8, radius * 1.5);
    }
  }

  // === ENERGY BEAMS — line from working agent to room center ===
  private updateEnergyBeams(t: number): void {
    if (!this.agentManager) return;

    for (const a of this.agentManager.getAllAgents()) {
      if (a.fsm.state !== 'working' && a.fsm.state !== 'thinking') continue;
      if (!a.currentTask) continue;

      const color = this.getAgentColor(a.id);
      const building = BUILDINGS.find(b => b.type === a.currentTask!.building);
      if (!building) continue;

      const bx = (building.x + building.width / 2) * T;
      const by = (building.y + building.height / 2) * T;
      const ax = a.sprite.x;
      const ay = a.sprite.y;

      // Pulsing beam segments
      const segments = 6;
      const pulse = t * 4;

      for (let i = 0; i < segments; i++) {
        const frac = i / segments;
        const nextFrac = (i + 1) / segments;
        const px = ax + (bx - ax) * frac;
        const py = ay + (by - ay) * frac;
        const nx = ax + (bx - ax) * nextFrac;
        const ny = ay + (by - ay) * nextFrac;

        // Traveling pulse brightness
        const wave = Math.sin(pulse - frac * 8) * 0.5 + 0.5;
        const alpha = 0.03 + wave * 0.06;

        this.beamGfx.lineStyle(1.5, color, alpha);
        this.beamGfx.lineBetween(px, py, nx, ny);
      }

      // Bright dot at agent end
      this.beamGfx.fillStyle(color, 0.2);
      this.beamGfx.fillCircle(ax, ay + 8, 3);
    }
  }

  // === HOLOGRAPHIC SIGNS — large translucent room names that breathe ===
  private updateHoloSigns(t: number): void {
    for (let i = 0; i < this.holoSigns.length; i++) {
      const sign = this.holoSigns[i];
      const breath = 0.1 + Math.sin(t * 0.5 + i * 1.5) * 0.05;
      sign.setAlpha(breath);

      // Subtle float
      const b = BUILDINGS[i];
      const cy = (b.y + b.height / 2) * T + Math.sin(t * 0.8 + i) * 2;
      sign.setY(cy);
    }
  }

  // === ROOM AMBIENT PARTICLES — unique per room type ===
  private updateRoomAmbientParticles(delta: number, t: number): void {
    const dt = delta / 1000;

    // Spawn new particles occasionally
    if (Math.random() < 0.05) {
      const ri = Math.floor(Math.random() * BUILDINGS.length);
      const b = BUILDINGS[ri];
      const def = ROOM_DEFS[b.type];

      const px = (b.x + 1 + Math.random() * (b.width - 2)) * T;
      const py = (b.y + 1 + Math.random() * (b.height - 2)) * T;

      let color: number = def.accent;
      let vx = 0, vy = 0, size = 0.5;

      if (b.type === 'terminal-tower') {
        // Server room: tiny sparks falling
        vy = 6 + Math.random() * 10;
        vx = (Math.random() - 0.5) * 2;
        color = [0x40ff80, 0xff4040, 0x4080ff][Math.floor(Math.random() * 3)];
        size = 0.3 + Math.random() * 0.3;
      } else if (b.type === 'file-library') {
        // Archive: dust motes floating
        vy = -1 - Math.random() * 2;
        vx = (Math.random() - 0.5) * 3;
        color = 0xddaa60;
        size = 0.3 + Math.random() * 0.2;
      } else if (b.type === 'code-workshop') {
        // Dev floor: faint blue dots rising
        vy = -3 - Math.random() * 4;
        vx = (Math.random() - 0.5) * 2;
        color = [0x4a8aff, 0x60ddff][Math.floor(Math.random() * 2)];
        size = 0.2 + Math.random() * 0.3;
      } else if (b.type === 'deploy-dock') {
        // Deploy: upward sparks
        vy = -5 - Math.random() * 5;
        color = [0xaa6aef, 0xcc90ff][Math.floor(Math.random() * 2)];
        size = 0.3 + Math.random() * 0.2;
      } else if (b.type === 'search-station') {
        // Research: floating orbs
        vy = -1 - Math.random() * 2;
        vx = (Math.random() - 0.5) * 4;
        color = 0x40cc70;
        size = 0.3 + Math.random() * 0.3;
      } else {
        // Meeting: nothing special
        vy = -0.5;
        vx = (Math.random() - 0.5) * 1;
        size = 0.2;
      }

      if (this.roomParticles.length < 40) {
        this.roomParticles.push({
          x: px, y: py, vx, vy,
          life: 2000 + Math.random() * 2000,
          maxLife: 2000 + Math.random() * 2000,
          color, size, room: ri,
        });
      }
    }

    // Update and draw (swap-and-pop removal)
    let len = this.roomParticles.length;
    for (let i = len - 1; i >= 0; i--) {
      const p = this.roomParticles[i];
      p.life -= delta;
      if (p.life <= 0) { this.roomParticles[i] = this.roomParticles[--len]; continue; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const alpha = (p.life / p.maxLife);
      this.overlayGfx.fillStyle(p.color, alpha * 0.3);
      this.overlayGfx.fillCircle(p.x, p.y, p.size);
    }
    this.roomParticles.length = len;
  }

  // === SCANLINES on wall monitors ===
  private updateScanlines(t: number): void {
    // Wall monitor positions (from OfficeRenderer drawMonitor calls)
    const monitors = [
      { x: 6, y: 1.2, w: 2.5 },   // Meeting room TV
      { x: 18, y: 1.2, w: 4 },     // Dev floor monitor  (note: was moved/changed)
      { x: 30, y: 1.2, w: 6 },     // Server room big screen
      { x: 30, y: 12.3, w: 4 },    // Deploy station monitor
    ];

    for (const m of monitors) {
      const sx = (m.x + 0.12) * T;
      const sy = (m.y + 0.08) * T;
      const sw = (m.w - 0.24) * T;
      const sh = T * 0.78;

      // Scanning line moving down
      const scanY = sy + ((t * 20) % sh);
      this.overlayGfx.fillStyle(0xffffff, 0.04);
      this.overlayGfx.fillRect(sx, scanY, sw, 2);
      // Glow trail above scanline
      this.overlayGfx.fillStyle(0xffffff, 0.02);
      this.overlayGfx.fillRect(sx, scanY - 4, sw, 4);
    }
  }

  // === IDLE PULSE — subtle breathing glow on the whole office when all agents idle ===
  private updateIdlePulse(t: number): void {
    if (!this.agentManager) return;
    const allIdle = this.agentManager.getAllAgents().every(a => a.fsm.state === 'idle');
    if (!allIdle) return;

    // Gentle blue pulse over the poker table area
    const pulse = Math.sin(t * 1.5) * 0.5 + 0.5;
    this.overlayGfx.fillStyle(0x4a8aff, pulse * 0.015);
    this.overlayGfx.fillCircle(21 * T, 14 * T, T * 5);
  }
}
