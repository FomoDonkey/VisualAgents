import Phaser from 'phaser';
import { Agent } from './Agent';
import { PathGrid } from '../world/PathGrid';
import { AGENT_PALETTES, CONFIG } from '../config';

const T = CONFIG.TILE_SIZE;

// Poker seats — pixel positions around the table (center ~509, 331)
// These are the EXACT pixel coords where agents sit, plus the nearest
// walkable tile for pathfinding purposes.
const POKER_SEATS = [
  { px: 480, py: 300, tx: 20, ty: 12 },  // top-left
  { px: 540, py: 300, tx: 22, ty: 12 },  // top-right
  { px: 558, py: 336, tx: 23, ty: 13 },  // right
  { px: 540, py: 372, tx: 22, ty: 15 },  // bottom-right
  { px: 480, py: 372, tx: 20, ty: 15 },  // bottom-left
];

export class AgentManager {
  private scene: Phaser.Scene;
  private agents: Map<string, Agent> = new Map();
  private selectedAgentId: string | null = null;

  constructor(scene: Phaser.Scene, pathGrid: PathGrid) {
    this.scene = scene;

    for (let i = 0; i < CONFIG.NUM_AGENTS; i++) {
      const p = AGENT_PALETTES[i];
      const seat = POKER_SEATS[i % POKER_SEATS.length];

      const agent = new Agent(
        scene, p.id, p.name,
        p.color, p.dark,
        { x: seat.tx, y: seat.ty },
        pathGrid
      );
      agent.setHomeSeat({ x: seat.tx, y: seat.ty }, { x: seat.px, y: seat.py });
      // Place sprite at exact pixel position
      agent.sprite.x = seat.px;
      agent.sprite.y = seat.py;
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
