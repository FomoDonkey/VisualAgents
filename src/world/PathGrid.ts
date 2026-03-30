// @ts-ignore
import { js as EasyStarJS } from 'easystarjs';
import { CONFIG } from '../config';
import { TilePos } from '../types';
import { BUILDINGS } from './BuildingRegistry';

export class PathGrid {
  private easystar: any;

  constructor() {
    this.easystar = new EasyStarJS();
    const grid = this.buildGrid();
    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([1]);
    this.easystar.enableDiagonals();
    this.easystar.enableCornerCutting();
    this.easystar.setIterationsPerCalculation(500);
  }

  private buildGrid(): number[][] {
    const w = CONFIG.WORLD_WIDTH;
    const h = CONFIG.WORLD_HEIGHT;
    const grid: number[][] = [];

    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        // Default: walkable in corridors and rooms (open floor)
        let walkable = false;

        // Corridor areas
        if (x >= 10 && x <= 13 && y >= 0 && y < h) walkable = true;    // Vertical corridor
        if (y >= 12 && y <= 15 && x >= 10 && x < w) walkable = true;   // Horizontal corridor
        if (x >= 27 && x <= 28 && y >= 0 && y < h - 4) walkable = true; // Right corridor

        // Inside rooms (floor area minus a border for walls)
        for (const b of BUILDINGS) {
          if (x >= b.x + 1 && x < b.x + b.width - 1 &&
              y >= b.y + 1 && y < b.y + b.height - 1) {
            walkable = true;
          }
          // Door tile is always walkable
          if (x === b.entranceTile.x && y === b.entranceTile.y) walkable = true;
          // Tiles adjacent to door
          if (Math.abs(x - b.entranceTile.x) + Math.abs(y - b.entranceTile.y) <= 1) walkable = true;
        }

        // Block furniture (rough positions of big furniture)
        // Meeting room table
        if (x >= 3 && x <= 7 && y >= 3 && y <= 4) walkable = false;
        // Bookshelves
        if (x === 1 && y >= 11 && y <= 16) walkable = false;
        if (x === 1 && y >= 17 && y <= 22) walkable = false;
        if (x === 3 && y >= 17 && y <= 19) walkable = false;
        // Server racks
        if (x >= 30 && x <= 37 && y >= 2 && y <= 4) walkable = false;

        row.push(walkable ? 1 : 0);
      }
      grid.push(row);
    }

    return grid;
  }

  findPath(from: TilePos, to: TilePos): Promise<TilePos[]> {
    return new Promise((resolve) => {
      const w = CONFIG.WORLD_WIDTH;
      const h = CONFIG.WORLD_HEIGHT;
      const fx = Math.max(0, Math.min(from.x, w - 1));
      const fy = Math.max(0, Math.min(from.y, h - 1));
      const tx = Math.max(0, Math.min(to.x, w - 1));
      const ty = Math.max(0, Math.min(to.y, h - 1));

      this.easystar.findPath(fx, fy, tx, ty, (path: any) => {
        if (path === null) {
          resolve([{ x: tx, y: ty }]);
        } else {
          resolve(path.map((p: any) => ({ x: p.x, y: p.y })));
        }
      });
      this.easystar.calculate();
    });
  }

  update(): void {
    this.easystar.calculate();
  }
}
