import Phaser from 'phaser';
import { Agent } from './Agent';
import { PathGrid } from '../world/PathGrid';
import { AGENT_PALETTES, CONFIG } from '../config';
import { BUILDINGS } from '../world/BuildingRegistry';

export class AgentManager {
  private scene: Phaser.Scene;
  private agents: Map<string, Agent> = new Map();
  private selectedAgentId: string | null = null;

  constructor(scene: Phaser.Scene, pathGrid: PathGrid) {
    this.scene = scene;

    const spawns = [
      BUILDINGS[0].entranceTile,
      BUILDINGS[1].entranceTile,
      BUILDINGS[3].entranceTile,
      BUILDINGS[4].entranceTile,
      BUILDINGS[5].entranceTile,
    ];

    for (let i = 0; i < CONFIG.NUM_AGENTS; i++) {
      const p = AGENT_PALETTES[i];
      const sp = spawns[i % spawns.length];
      const agent = new Agent(
        scene, p.id, p.name,
        p.color, p.dark,
        { x: sp.x + (i % 2), y: sp.y + 1 },
        pathGrid
      );
      this.agents.set(p.id, agent);
    }
  }

  getAgent(id: string): Agent | undefined { return this.agents.get(id); }
  getAllAgents(): Agent[] { return Array.from(this.agents.values()); }
  getSelectedAgent(): Agent | null {
    return this.selectedAgentId ? this.agents.get(this.selectedAgentId) || null : null;
  }

  selectAgent(id: string | null): void {
    if (this.selectedAgentId) this.agents.get(this.selectedAgentId)?.setSelected(false);
    this.selectedAgentId = id;
    if (id) this.agents.get(id)?.setSelected(true);
  }

  update(delta: number): void {
    for (const a of this.agents.values()) a.update(delta);
  }

  destroy(): void {
    for (const a of this.agents.values()) a.destroy();
    this.agents.clear();
  }
}
