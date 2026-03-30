import Phaser from 'phaser';
import { CONFIG } from '../config';

// For an indoor office, this is more of an ambient lighting system
// Subtle changes to simulate time passing (morning light, afternoon, evening overtime)
const PHASES = [
  { name: 'Early Morning', tint: 0x8899bb, alpha: 0.08 },
  { name: 'Morning',       tint: 0xffeedd, alpha: 0.02 },
  { name: 'Midday',        tint: 0xffffff, alpha: 0.00 },
  { name: 'Afternoon',     tint: 0xffeebb, alpha: 0.03 },
  { name: 'Late Afternoon', tint: 0xffcc99, alpha: 0.06 },
  { name: 'Evening',       tint: 0x8888aa, alpha: 0.10 },
  { name: 'Night Shift',   tint: 0x6666aa, alpha: 0.15 },
  { name: 'Late Night',    tint: 0x555599, alpha: 0.18 },
];

export class DayNightCycle {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle;
  private timer = 0;
  private cycleDuration: number;
  private currentPhaseIndex = 2;
  private phaseProgress = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cycleDuration = CONFIG.DAY_CYCLE_DURATION;

    this.overlay = scene.add.rectangle(
      CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2,
      CONFIG.GAME_WIDTH * 3, CONFIG.GAME_HEIGHT * 3,
      0x000000, 0
    );
    this.overlay.setDepth(2000);
    this.overlay.setScrollFactor(0);
  }

  getTimeName(): string {
    return PHASES[this.currentPhaseIndex].name;
  }

  isNight(): boolean {
    return this.currentPhaseIndex >= 5;
  }

  update(delta: number): void {
    this.timer += delta;

    const totalProgress = (this.timer % this.cycleDuration) / this.cycleDuration;
    const phaseFloat = totalProgress * PHASES.length;
    this.currentPhaseIndex = Math.floor(phaseFloat) % PHASES.length;
    this.phaseProgress = phaseFloat - Math.floor(phaseFloat);

    const current = PHASES[this.currentPhaseIndex];
    const next = PHASES[(this.currentPhaseIndex + 1) % PHASES.length];

    const alpha = current.alpha + (next.alpha - current.alpha) * this.phaseProgress;
    const tint = this.lerpColor(current.tint, next.tint, this.phaseProgress);

    this.overlay.setFillStyle(tint, alpha);
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return (Math.round(ar + (br - ar) * t) << 16) |
           (Math.round(ag + (bg - ag) * t) << 8) |
           Math.round(ab + (bb - ab) * t);
  }

  destroy(): void {
    this.overlay.destroy();
  }
}
