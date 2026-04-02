import Phaser from 'phaser';
import { CONFIG } from '../config';
import { BUILDINGS } from '../world/BuildingRegistry';
import { AgentManager } from '../agents/AgentManager';

const T = CONFIG.TILE_SIZE;

interface AnimatedMonitor {
  g: Phaser.GameObjects.Graphics;
  tx: number;
  ty: number;
  lines: { w: number; color: number }[];
  cursor: number;
}

interface AnimatedLed {
  x: number;
  y: number;
  phase: number;
  speed: number;
  baseColor: number;
}

interface AnimatedPlant {
  g: Phaser.GameObjects.Graphics;
  tx: number;
  ty: number;
}

interface RoomGlow {
  g: Phaser.GameObjects.Graphics;
  buildingIdx: number;
  intensity: number;
}

/**
 * Animated office elements: flickering monitors, pulsing server LEDs,
 * swaying plants, and reactive room lighting.
 */
export class AmbientAnimations {
  private scene: Phaser.Scene;
  private timer = 0;

  // Animated monitors with scrolling code
  private monitors: AnimatedMonitor[] = [];

  // Server LEDs
  private ledGraphics: Phaser.GameObjects.Graphics;
  private leds: AnimatedLed[] = [];

  // Swaying plants
  private plants: AnimatedPlant[] = [];

  // Room glow that reacts to agents
  private roomGlows: RoomGlow[] = [];
  private agentManager: AgentManager | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ledGraphics = scene.add.graphics().setDepth(4);

    this.createMonitors();
    this.createLeds();
    this.createPlants();
    this.createRoomGlows();
  }

  setAgentManager(am: AgentManager): void {
    this.agentManager = am;
  }

  private createMonitors(): void {
    // Desk monitors — each gets animated code lines
    const deskPositions = [
      // Research Corner desks
      { tx: 2, ty: 10 }, { tx: 5, ty: 10 },
      // Archive desk
      { tx: 6, ty: 19 },
      // Dev Floor desks (3x3 grid)
      { tx: 15, ty: 2.5 }, { tx: 18.5, ty: 2.5 }, { tx: 22, ty: 2.5 },
      { tx: 15, ty: 6 }, { tx: 18.5, ty: 6 }, { tx: 22, ty: 6 },
      { tx: 15, ty: 9.5 }, { tx: 18.5, ty: 9.5 }, { tx: 22, ty: 9.5 },
      // Server Room desks
      { tx: 31, ty: 6.5 }, { tx: 34, ty: 6.5 },
      // Deploy Station desks
      { tx: 30, ty: 13.5 }, { tx: 33, ty: 13.5 },
    ];

    const codeColors = [0x40cc80, 0x4a8aff, 0xffaa40, 0x9a6adf, 0x60c0c0, 0xff6a7a];

    for (const pos of deskPositions) {
      const g = this.scene.add.graphics().setDepth(4);
      const lines: { w: number; color: number }[] = [];
      for (let i = 0; i < 5; i++) {
        lines.push({
          w: 0.15 + Math.random() * 0.45,
          color: codeColors[Math.floor(Math.random() * codeColors.length)],
        });
      }
      this.monitors.push({
        g, tx: pos.tx, ty: pos.ty,
        lines,
        cursor: Math.random() * 1000,
      });
    }
  }

  private createLeds(): void {
    // Server room rack LEDs
    for (let rack = 0; rack < 4; rack++) {
      const tx = 30 + rack * 2;
      for (let i = 0; i < 9; i++) {
        // Main LEDs
        this.leds.push({
          x: (tx + 0.3) * T,
          y: (2 + 0.2 + i * 0.3) * T,
          phase: Math.random() * Math.PI * 2,
          speed: 1.5 + Math.random() * 3,
          baseColor: Math.random() > 0.2 ? 0x40ff80 : 0xff4040,
        });
        // Secondary LEDs
        this.leds.push({
          x: (tx + 0.7) * T,
          y: (2 + 0.2 + i * 0.3) * T,
          phase: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * 4,
          baseColor: 0x4080ff,
        });
      }
    }
  }

  private createPlants(): void {
    const plantPositions = [
      { tx: 9, ty: 1.3 },      // Meeting Room
      { tx: 9, ty: 9.3 },      // Research Corner
      { tx: 9, ty: 22 },       // Archive
      { tx: 14.3, ty: 1.3 },   // Dev Floor left
      { tx: 25, ty: 1.3 },     // Dev Floor right
      { tx: 25, ty: 10.5 },    // Dev Floor bottom
      { tx: 38, ty: 12.5 },    // Deploy Station
    ];

    for (const pos of plantPositions) {
      const g = this.scene.add.graphics().setDepth(4);
      this.plants.push({ g, tx: pos.tx, ty: pos.ty });
    }
  }

  private createRoomGlows(): void {
    for (let i = 0; i < BUILDINGS.length; i++) {
      const g = this.scene.add.graphics().setDepth(1);
      this.roomGlows.push({ g, buildingIdx: i, intensity: 0 });
    }
  }

  private monitorTimer = 0;
  private ledTimer = 0;
  private slowTimer = 0;

  update(delta: number): void {
    this.timer += delta;
    const t = this.timer / 1000;

    // Monitors: update every 200ms (was every 100ms — 50% reduction)
    this.monitorTimer += delta;
    if (this.monitorTimer >= 200) {
      this.updateMonitors(t);
      this.monitorTimer = 0;
    }

    // LEDs: update every 300ms (tiny dots, don't need high frequency)
    this.ledTimer += delta;
    if (this.ledTimer >= 300) {
      this.updateLeds(t);
      this.ledTimer = 0;
    }

    // Plants + room glows: update every 500ms (very slow animations)
    this.slowTimer += delta;
    if (this.slowTimer >= 500) {
      this.updatePlants(t);
      this.updateRoomGlows(this.slowTimer);
      this.slowTimer = 0;
    }
  }

  private updateMonitors(t: number): void {
    for (const m of this.monitors) {
      m.g.clear();
      m.cursor += 0.02;

      const sx = (m.tx + 0.4) * T;
      const sy = (m.ty + 0.25) * T;
      const sw = T * 0.8;
      const sh = T * 0.5;

      // Screen glow — subtle pulse
      const pulse = 0.12 + Math.sin(t * 1.5 + m.tx) * 0.04;
      m.g.fillStyle(0x4a8aff, pulse);
      m.g.fillRoundedRect(sx, sy, sw, sh, 1);

      // Animated code lines
      for (let i = 0; i < m.lines.length; i++) {
        const line = m.lines[i];
        const ly = sy + 3 + i * (sh / 6);
        if (ly > sy + sh - 2) continue;

        // Typing effect — line width grows
        const typingPhase = (m.cursor + i * 0.7) % 4;
        const visibleW = typingPhase < 2 ? Math.min(1, typingPhase / 1.5) : 1;
        const lw = line.w * sw * visibleW;

        // Indent variation
        const indent = (i % 3 === 0) ? 0 : (i % 3 === 1) ? 4 : 8;

        m.g.fillStyle(line.color, 0.5 + Math.sin(t * 2 + i) * 0.15);
        m.g.fillRect(sx + 3 + indent, ly, Math.max(1, lw), 1.2);
      }

      // Blinking cursor
      if (Math.sin(t * 4 + m.tx * 3) > 0) {
        const cursorLine = Math.floor(m.cursor % m.lines.length);
        const cy = sy + 3 + cursorLine * (sh / 6);
        m.g.fillStyle(0xffffff, 0.8);
        m.g.fillRect(sx + 3 + m.lines[cursorLine].w * sw * 0.9, cy, 1, 3);
      }
    }
  }

  private updateLeds(t: number): void {
    this.ledGraphics.clear();

    for (const led of this.leds) {
      const flicker = 0.4 + Math.sin(t * led.speed + led.phase) * 0.35;
      const extra = Math.random() > 0.97 ? 0.4 : 0; // Random blink

      // LED glow halo
      this.ledGraphics.fillStyle(led.baseColor, (flicker + extra) * 0.15);
      this.ledGraphics.fillCircle(led.x, led.y, 3);

      // LED dot
      this.ledGraphics.fillStyle(led.baseColor, flicker + extra);
      this.ledGraphics.fillCircle(led.x, led.y, 1.5);
    }
  }

  private updatePlants(t: number): void {
    for (const p of this.plants) {
      p.g.clear();
      const sway = Math.sin(t * 0.8 + p.tx * 2) * 1.5;
      const sway2 = Math.sin(t * 1.2 + p.ty * 3) * 1;

      // Pot (static)
      p.g.fillStyle(0x5a3a2a, 1);
      p.g.fillRoundedRect((p.tx - 0.2) * T, (p.ty + 0.3) * T, T * 0.6, T * 0.5, 2);

      // Leaves (swaying)
      p.g.fillStyle(0x2aaa3a, 0.8);
      p.g.fillCircle(p.tx * T + sway, (p.ty + 0.1) * T, T * 0.35);
      p.g.fillStyle(0x40cc50, 0.7);
      p.g.fillCircle((p.tx - 0.15) * T + sway2, p.ty * T, T * 0.25);
      p.g.fillCircle((p.tx + 0.2) * T + sway * 0.7, (p.ty - 0.05) * T, T * 0.2);
      // Extra small leaf
      p.g.fillStyle(0x35bb45, 0.6);
      p.g.fillCircle((p.tx + 0.1) * T + sway2 * 0.5, (p.ty + 0.15) * T, T * 0.15);
    }
  }

  private updateRoomGlows(delta: number): void {
    if (!this.agentManager) return;

    const agents = this.agentManager.getAllAgents();

    for (const rg of this.roomGlows) {
      const b = BUILDINGS[rg.buildingIdx];

      // Check if any agent is inside this room and working
      let targetIntensity = 0;
      for (const agent of agents) {
        const ax = agent.sprite.x / T;
        const ay = agent.sprite.y / T;
        if (ax >= b.x && ax <= b.x + b.width &&
            ay >= b.y && ay <= b.y + b.height) {
          const s = agent.fsm.state;
          if (s === 'working' || s === 'thinking') targetIntensity = 0.25;
          else if (s === 'walking' || s === 'arriving') targetIntensity = Math.max(targetIntensity, 0.1);
          else targetIntensity = Math.max(targetIntensity, 0.05);
        }
      }

      // Smooth lerp
      rg.intensity += (targetIntensity - rg.intensity) * 0.03;

      rg.g.clear();
      if (rg.intensity > 0.01) {
        const x = b.x * T;
        const y = b.y * T;
        const w = b.width * T;
        const h = b.height * T;
        const accent = [0x4a8aff, 0x40cc70, 0xddaa60, 0x4a8aff, 0xff5a6a, 0xaa6aef][rg.buildingIdx] || 0x4a8aff;

        // Inner glow overlay
        rg.g.fillStyle(accent, rg.intensity * 0.08);
        rg.g.fillRoundedRect(x + 1, y + 1, w - 2, h - 2, 3);

        // Pulsing border
        const pulse = rg.intensity * (0.8 + Math.sin(this.timer / 600 + rg.buildingIdx) * 0.2);
        rg.g.lineStyle(1, accent, pulse * 0.4);
        rg.g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 2);
      }
    }
  }
}
