import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AgentState, Task, TilePos } from '../types';
import { AgentStateMachine } from './AgentStateMachine';
import { PathGrid } from '../world/PathGrid';

const T = CONFIG.TILE_SIZE;

// State → emoji icon shown above agent
const STATE_ICONS: Record<AgentState, string> = {
  idle: '',
  walking: '🚶',
  arriving: '🚶',
  working: '💻',
  thinking: '🧠',
  done: '✅',
  error: '❌',
};

export class Agent {
  public id: string;
  public name: string;
  public sprite: Phaser.GameObjects.Container;
  public fsm: AgentStateMachine;
  public currentTask: Task | null = null;
  public selected = false;
  public direction: 'down' | 'up' | 'left' | 'right' = 'down';

  private scene: Phaser.Scene;
  private pathGrid: PathGrid;
  private color: number;
  private darkColor: number;

  private body: Phaser.GameObjects.Graphics;
  private nameLabel: Phaser.GameObjects.Text;
  private stateIcon: Phaser.GameObjects.Text;
  private selRing: Phaser.GameObjects.Graphics;
  private statusDot: Phaser.GameObjects.Graphics;

  private currentPath: TilePos[] = [];
  private pathIndex = 0;
  private tileX: number;
  private tileY: number;
  private animTimer = 0;
  private workTimer = 0;
  private taskCallback: (() => void) | null = null;
  private bobOffset = 0;
  private blinkTimer = 0;
  private blinkDuration = 0;
  private nextBlink = 2000 + Math.random() * 3000;
  private eyeLookX = 0;
  private eyeLookY = 0;
  private lookTimer = 0;

  constructor(
    scene: Phaser.Scene, id: string, name: string,
    colorHex: string, darkHex: string,
    startTile: TilePos, pathGrid: PathGrid
  ) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.pathGrid = pathGrid;
    this.color = parseInt(colorHex.replace('#', ''), 16);
    this.darkColor = parseInt(darkHex.replace('#', ''), 16);
    this.tileX = startTile.x;
    this.tileY = startTile.y;

    const wx = startTile.x * T + T / 2;
    const wy = startTile.y * T + T / 2;

    this.sprite = scene.add.container(wx, wy).setDepth(500);

    // Selection ring
    this.selRing = scene.add.graphics();
    this.selRing.setAlpha(0);
    this.sprite.add(this.selRing);

    // Body
    this.body = scene.add.graphics();
    this.drawBody();
    this.sprite.add(this.body);

    // Status dot (small colored circle top-right)
    this.statusDot = scene.add.graphics();
    this.sprite.add(this.statusDot);
    this.drawStatusDot(0x40d880);

    // Name (clean, readable, bigger)
    this.nameLabel = scene.add.text(0, 12, name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      color: '#b0b0d0',
      stroke: '#08080f',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0).setResolution(2);
    this.sprite.add(this.nameLabel);

    // State icon (emoji above head — always readable because it scales)
    this.stateIcon = scene.add.text(0, -16, '', {
      fontSize: '12px',
      align: 'center',
    }).setOrigin(0.5, 1).setResolution(2);
    this.sprite.add(this.stateIcon);

    // Hit area for clicks
    const hitArea = scene.add.rectangle(0, 0, T * 1.2, T * 1.5, 0x000000, 0).setInteractive();
    this.sprite.add(hitArea);
    hitArea.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.sprite.emit('pointerdown', p);
    });

    // FSM
    this.fsm = new AgentStateMachine({
      onEnter: this.onEnter.bind(this),
      onUpdate: this.onUpdate.bind(this),
      onExit: this.onExit.bind(this),
    });
  }

  private drawBody(blink = false): void {
    this.body.clear();
    // Shadow
    this.body.fillStyle(0x000000, 0.25);
    this.body.fillEllipse(0, 8, T * 0.7, T * 0.2);
    // Body
    this.body.fillStyle(this.darkColor, 1);
    this.body.fillRoundedRect(-6, -2, 12, 12, 4);
    // Arms (small nubs on sides, animated during walk)
    const s = this.fsm.state;
    if (s === 'walking') {
      const swing = Math.sin(this.animTimer / 80) * 2;
      this.body.fillStyle(this.darkColor, 1);
      this.body.fillCircle(-7, 3 + swing, 2);
      this.body.fillCircle(7, 3 - swing, 2);
      // Legs
      this.body.fillStyle(this.darkColor, 0.9);
      this.body.fillRoundedRect(-4, 9 + swing * 0.5, 3, 4, 1);
      this.body.fillRoundedRect(1, 9 - swing * 0.5, 3, 4, 1);
    } else {
      // Static arms
      this.body.fillStyle(this.darkColor, 1);
      this.body.fillCircle(-7, 3, 2);
      this.body.fillCircle(7, 3, 2);
    }
    // Head
    this.body.fillStyle(this.color, 1);
    this.body.fillCircle(0, -5, 6);
    // Highlight on head
    this.body.fillStyle(0xffffff, 0.15);
    this.body.fillCircle(-2, -7, 2.5);

    if (blink) {
      // Closed eyes — horizontal lines
      this.body.lineStyle(1.2, 0x101020, 0.8);
      this.body.lineBetween(-3.5, -5.5, -1, -5.5);
      this.body.lineBetween(1.5, -5.5, 4, -5.5);
    } else {
      // Open eyes — whites
      this.body.fillStyle(0xffffff, 0.95);
      this.body.fillCircle(-2.5, -5.5, 2);
      this.body.fillCircle(2.5, -5.5, 2);
      // Pupils — follow direction/look
      const px = this.eyeLookX * 0.8;
      const py = this.eyeLookY * 0.5;
      this.body.fillStyle(0x101020, 1);
      this.body.fillCircle(-2 + px, -5.5 + py, 1);
      this.body.fillCircle(3 + px, -5.5 + py, 1);
      // Tiny white highlight in pupils
      this.body.fillStyle(0xffffff, 0.5);
      this.body.fillCircle(-2.3 + px, -6 + py, 0.4);
      this.body.fillCircle(2.7 + px, -6 + py, 0.4);
    }

    // Mouth — tiny expression
    if (s === 'error') {
      // Frown
      this.body.lineStyle(0.8, 0x101020, 0.5);
      this.body.lineBetween(-1.5, -2.5, 1.5, -2.5);
    } else if (s === 'done') {
      // Smile
      this.body.lineStyle(0.8, 0x101020, 0.4);
      this.body.arc(0, -3.5, 2, 0.2, Math.PI - 0.2, false);
      this.body.strokePath();
    }
  }

  private drawStatusDot(color: number): void {
    this.statusDot.clear();
    this.statusDot.fillStyle(0x08080f, 1);
    this.statusDot.fillCircle(8, -9, 3.5);
    this.statusDot.fillStyle(color, 1);
    this.statusDot.fillCircle(8, -9, 2.5);
  }

  private drawSelectionRing(): void {
    this.selRing.clear();
    this.selRing.lineStyle(1.5, this.color, 0.9);
    this.selRing.strokeEllipse(0, 8, T * 0.9, T * 0.3);
    this.selRing.lineStyle(4, this.color, 0.12);
    this.selRing.strokeEllipse(0, 8, T * 1, T * 0.35);
  }

  setSelected(sel: boolean): void {
    this.selected = sel;
    if (sel) { this.drawSelectionRing(); this.selRing.setAlpha(1); }
    else { this.selRing.setAlpha(0); }
  }

  async assignTask(task: Task, targetTile: TilePos, onComplete: () => void): Promise<void> {
    this.currentTask = task;
    this.taskCallback = onComplete;
    const dist = Math.abs(this.tileX - targetTile.x) + Math.abs(this.tileY - targetTile.y);
    if (dist <= 2) {
      this.fsm.transition(task.type === 'think' ? 'thinking' : 'working');
      this.workTimer = task.duration;
      return;
    }
    const path = await this.pathGrid.findPath({ x: this.tileX, y: this.tileY }, targetTile);
    this.currentPath = path;
    this.pathIndex = 0;
    this.fsm.transition('walking');
  }

  update(delta: number): void {
    this.fsm.update(delta);
    this.updateBob(delta);
    if (this.selected) {
      this.selRing.setAlpha(0.5 + Math.sin(Date.now() / 400) * 0.5);
    }
  }

  private updateBob(delta: number): void {
    this.bobOffset += delta;
    const s = this.fsm.state;
    if (s === 'working' || s === 'thinking') {
      this.body.y = Math.sin(this.bobOffset / 250) * 1;
      this.stateIcon.y = -16 + Math.sin(this.bobOffset / 400) * 1.5;
    } else if (s === 'idle' || s === 'done') {
      this.body.y = Math.sin(this.bobOffset / 800) * 0.4;
    } else {
      this.body.y = 0;
    }

    // Blinking
    this.blinkTimer += delta;
    let isBlinking = false;
    if (this.blinkDuration > 0) {
      this.blinkDuration -= delta;
      isBlinking = true;
    } else if (this.blinkTimer >= this.nextBlink) {
      this.blinkTimer = 0;
      this.blinkDuration = 100 + Math.random() * 60;
      this.nextBlink = 2000 + Math.random() * 4000;
      isBlinking = true;
    }

    // Eye direction
    this.lookTimer += delta;
    if (s === 'walking') {
      // Eyes look in walk direction
      this.eyeLookX = this.direction === 'right' ? 1 : this.direction === 'left' ? -1 : 0;
      this.eyeLookY = this.direction === 'down' ? 0.5 : this.direction === 'up' ? -0.5 : 0;
    } else if (s === 'working' || s === 'thinking') {
      // Eyes look down at desk/work
      this.eyeLookX = Math.sin(this.lookTimer / 2000) * 0.5;
      this.eyeLookY = 0.4;
    } else if (s === 'idle') {
      // Occasionally look around
      if (this.lookTimer > 3000) {
        this.lookTimer = 0;
        this.eyeLookX = (Math.random() - 0.5) * 2;
        this.eyeLookY = (Math.random() - 0.5) * 1;
      }
    } else {
      this.eyeLookX = 0;
      this.eyeLookY = 0;
    }

    // Redraw body with current blink/eye state
    this.drawBody(isBlinking);
  }

  // === STATE CALLBACKS ===
  private onEnter(state: AgentState): void {
    this.stateIcon.setText(STATE_ICONS[state] || '');

    switch (state) {
      case 'idle':
        this.drawStatusDot(0x40d880);
        break;
      case 'walking':
        this.drawStatusDot(0xffaa40);
        break;
      case 'arriving':
        this.drawStatusDot(0xffaa40);
        break;
      case 'working':
        this.drawStatusDot(0x4a8aff);
        if (this.currentTask) this.workTimer = this.currentTask.duration;
        break;
      case 'thinking':
        this.drawStatusDot(0xaa6aef);
        if (this.currentTask) this.workTimer = this.currentTask.duration;
        break;
      case 'done':
        this.drawStatusDot(0x40d880);
        this.scene.time.delayedCall(700, () => {
          if (this.fsm.state === 'done') {
            this.fsm.transition('idle');
            this.taskCallback?.();
            this.taskCallback = null;
          }
        });
        break;
      case 'error':
        this.drawStatusDot(0xff4040);
        this.scene.time.delayedCall(1200, () => {
          if (this.fsm.state === 'error') {
            this.fsm.transition('idle');
            this.taskCallback?.();
            this.taskCallback = null;
          }
        });
        break;
    }
  }

  private onUpdate(state: AgentState, delta: number): void {
    this.animTimer += delta;
    switch (state) {
      case 'walking': this.moveAlongPath(delta); break;
      case 'arriving':
        if (this.fsm.timer > 300) {
          const t = this.currentTask?.type;
          this.fsm.transition(t === 'think' ? 'thinking' : 'working');
          if (this.currentTask) this.workTimer = this.currentTask.duration;
        }
        break;
      case 'working':
      case 'thinking':
        this.workTimer -= delta;
        if (this.workTimer <= 0) this.fsm.transition('done');
        break;
    }
  }

  private onExit(): void { this.animTimer = 0; }

  private moveAlongPath(delta: number): void {
    if (this.pathIndex >= this.currentPath.length) {
      this.tileX = Math.round(this.sprite.x / T);
      this.tileY = Math.round(this.sprite.y / T);
      this.fsm.transition('arriving');
      return;
    }
    const tgt = this.currentPath[this.pathIndex];
    const tx = tgt.x * T + T / 2;
    const ty = tgt.y * T + T / 2;
    const dx = tx - this.sprite.x;
    const dy = ty - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      this.sprite.x = tx; this.sprite.y = ty;
      this.tileX = tgt.x; this.tileY = tgt.y;
      this.pathIndex++;
      return;
    }

    const spd = CONFIG.AGENT_SPEED * (delta / 1000);
    const mv = Math.min(spd, dist);
    this.sprite.x += (dx / dist) * mv;
    this.sprite.y += (dy / dist) * mv;

    if (Math.abs(dx) > Math.abs(dy)) this.direction = dx > 0 ? 'right' : 'left';
    else this.direction = dy > 0 ? 'down' : 'up';

    // Walk wobble
    this.body.setRotation(Math.sin(this.animTimer / 80) * 0.1);
  }

  destroy(): void { this.sprite.destroy(); }
}
