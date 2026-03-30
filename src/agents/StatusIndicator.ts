import Phaser from 'phaser';
import { AgentState } from '../types';

const STATE_TEXTURE: Record<AgentState, string> = {
  idle: 'status-done',
  walking: 'status-walking',
  arriving: 'status-walking',
  working: 'status-working',
  thinking: 'status-thinking',
  done: 'status-done',
  error: 'status-error',
};

export class StatusIndicator {
  private sprite: Phaser.GameObjects.Sprite;
  private pulseTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, 'status-done');
    this.sprite.setDepth(999);
    this.sprite.setScale(0.8);
  }

  setState(state: AgentState): void {
    const tex = STATE_TEXTURE[state];
    if (tex) {
      this.sprite.setTexture(tex);
    }
    this.pulseTimer = 0;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x + 10, y - 18);
  }

  update(delta: number): void {
    this.pulseTimer += delta;
    // Subtle pulse for working/thinking states
    const scale = 0.8 + Math.sin(this.pulseTimer / 300) * 0.15;
    this.sprite.setScale(scale);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
