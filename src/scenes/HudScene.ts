import Phaser from 'phaser';
import { AgentManager } from '../agents/AgentManager';
import { CameraController } from '../ui/CameraController';
import { DayNightCycle } from '../effects/DayNightCycle';
import { AGENT_PALETTES, CONFIG } from '../config';

interface HudData {
  agentManager: AgentManager;
  cameraController: CameraController;
  dayNight: DayNightCycle;
}

export class HudScene extends Phaser.Scene {
  private agentManager!: AgentManager;
  private cameraController!: CameraController;
  private dayNight!: DayNightCycle;
  private agentEntries: Array<{
    bg: Phaser.GameObjects.Rectangle;
    nameText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    dot: Phaser.GameObjects.Rectangle;
    projectText: Phaser.GameObjects.Text;
  }> = [];
  private timeText!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HudScene' });
  }

  init(data: HudData): void {
    this.agentManager = data.agentManager;
    this.cameraController = data.cameraController;
    this.dayNight = data.dayNight;
  }

  create(): void {
    // Top bar
    const topBg = this.add.rectangle(0, 0, CONFIG.GAME_WIDTH, 28, 0x0a0a14, 0.9);
    topBg.setOrigin(0, 0).setScrollFactor(0);

    // Accent line under top bar
    const accentLine = this.add.rectangle(0, 28, CONFIG.GAME_WIDTH, 1, 0x4a7aff, 0.4);
    accentLine.setOrigin(0, 0).setScrollFactor(0);

    this.add.text(12, 7, 'VISUALAGENTS', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#4a9aff',
      fontStyle: 'bold',
    }).setScrollFactor(0);

    this.add.text(145, 10, 'Claude Code Office Simulation', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#5a6a8a',
    }).setScrollFactor(0);

    this.timeText = this.add.text(CONFIG.GAME_WIDTH - 12, 10, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#6a8aaa',
    }).setOrigin(1, 0).setScrollFactor(0);

    this.fpsText = this.add.text(CONFIG.GAME_WIDTH - 12, 20, '', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#3a4a5a',
    }).setOrigin(1, 0).setScrollFactor(0);

    // Agent panel - bottom left
    const panelX = 8;
    const panelY = CONFIG.GAME_HEIGHT - 8;
    const panelWidth = 200;
    const entryHeight = 34;
    const numAgents = AGENT_PALETTES.length;
    const panelHeight = numAgents * entryHeight + 32;

    // Panel background
    const panelBg = this.add.rectangle(
      panelX, panelY - panelHeight,
      panelWidth, panelHeight,
      0x0a0a14, 0.9
    ).setOrigin(0, 0).setScrollFactor(0);

    // Panel border
    this.add.rectangle(
      panelX, panelY - panelHeight,
      panelWidth, panelHeight
    ).setOrigin(0, 0).setScrollFactor(0)
      .setStrokeStyle(1, 0x2a3a5a, 0.6).setFillStyle(0, 0);

    // Panel title
    this.add.text(panelX + panelWidth / 2, panelY - panelHeight + 10, 'TEAM', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#4a9aff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    // Separator
    this.add.rectangle(
      panelX + 8, panelY - panelHeight + 24,
      panelWidth - 16, 1,
      0x2a3a5a, 0.4
    ).setOrigin(0, 0).setScrollFactor(0);

    // Agent entries
    for (let i = 0; i < numAgents; i++) {
      const palette = AGENT_PALETTES[i];
      const ey = panelY - panelHeight + 28 + i * entryHeight;

      const bg = this.add.rectangle(panelX + 4, ey, panelWidth - 8, entryHeight - 4, 0x12121e, 0.7);
      bg.setOrigin(0, 0).setScrollFactor(0);
      bg.setInteractive({ useHandCursor: true });

      const dotColor = parseInt(palette.color.replace('#', ''), 16);
      const dot = this.add.rectangle(panelX + 14, ey + entryHeight / 2 - 2, 8, 8, dotColor);
      dot.setOrigin(0.5, 0.5).setScrollFactor(0);
      // Rounded dot look
      dot.setStrokeStyle(0.5, 0xffffff, 0.2);

      const nameText = this.add.text(panelX + 24, ey + 3, palette.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ddddef',
        fontStyle: 'bold',
      }).setScrollFactor(0);

      const statusText = this.add.text(panelX + 24, ey + 14, 'Idle', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#6a8a6a',
      }).setScrollFactor(0);

      const projectText = this.add.text(panelX + panelWidth - 12, ey + 6, '', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#4a5a6a',
      }).setOrigin(1, 0).setScrollFactor(0);

      bg.on('pointerdown', () => {
        this.agentManager.selectAgent(palette.id);
        const agent = this.agentManager.getAgent(palette.id);
        if (agent) this.cameraController.followAgent(agent);
      });

      bg.on('pointerover', () => bg.setFillStyle(0x1a1a2e, 0.9));
      bg.on('pointerout', () => bg.setFillStyle(0x12121e, 0.7));

      this.agentEntries.push({ bg, nameText, statusText, dot, projectText });
    }

    // Controls hint
    this.add.text(
      CONFIG.GAME_WIDTH - 10,
      CONFIG.GAME_HEIGHT - 10,
      'WASD: Move  Scroll: Zoom  Click: Select  Right-drag: Pan',
      {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#2a3a4a',
      }
    ).setOrigin(1, 1).setScrollFactor(0);
  }

  update(): void {
    this.timeText.setText(this.dayNight.getTimeName());
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);

    const agents = this.agentManager.getAllAgents();
    for (let i = 0; i < agents.length && i < this.agentEntries.length; i++) {
      const agent = agents[i];
      const entry = this.agentEntries[i];
      const state = agent.fsm.state;

      let statusStr = state.charAt(0).toUpperCase() + state.slice(1);
      let roomStr = '';
      if (agent.currentTask && (state === 'working' || state === 'thinking' || state === 'walking')) {
        const desc = agent.currentTask.description;
        statusStr = desc.length > 26 ? desc.substring(0, 26) + '...' : desc;
        const roomNames: Record<string, string> = {
          'think-tank': 'Meeting',
          'search-station': 'Research',
          'file-library': 'Archive',
          'code-workshop': 'Dev Floor',
          'terminal-tower': 'Servers',
          'deploy-dock': 'Deploy',
        };
        roomStr = roomNames[agent.currentTask.building] || '';
      }
      entry.statusText.setText(statusStr);
      entry.projectText.setText(roomStr);

      const colors: Record<string, string> = {
        idle: '#5a7a5a',
        walking: '#aaaa44',
        arriving: '#aaaa44',
        working: '#4a9aff',
        thinking: '#aa88ff',
        done: '#44ff88',
        error: '#ff4444',
      };
      entry.statusText.setColor(colors[state] || '#5a6a7a');

      const isSelected = this.agentManager.getSelectedAgent()?.id === agent.id;
      entry.bg.setStrokeStyle(isSelected ? 1 : 0, 0x4a7aff, isSelected ? 0.8 : 0);
    }
  }
}
