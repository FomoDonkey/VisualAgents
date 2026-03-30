import { CONFIG } from '../config';
import { TILE } from '../sprites/TilesetGenerator';
import { BUILDINGS } from './BuildingRegistry';

export interface WorldData {
  ground: number[][];
  buildings: number[][];
  decorations: number[][];
}

export class WorldBuilder {
  private w = CONFIG.WORLD_WIDTH;
  private h = CONFIG.WORLD_HEIGHT;

  generate(): WorldData {
    const ground = this.createLayer(TILE.FLOOR_DARK);
    const buildings = this.createLayer(-1);
    const decorations = this.createLayer(-1);

    // Fill base floor
    this.fillBaseFloors(ground);

    // Draw office walls (perimeter + room dividers)
    this.drawWalls(ground, buildings);

    // Main corridor
    this.drawCorridor(ground);

    // Place room furniture
    this.buildMeetingRoom(ground, decorations);
    this.buildResearchCorner(ground, decorations);
    this.buildArchiveRoom(ground, decorations);
    this.buildDevFloor(ground, decorations);
    this.buildServerRoom(ground, decorations);
    this.buildDeployStation(ground, decorations);

    // Break area in the corridor
    this.buildBreakArea(ground, decorations);

    // Place doors
    this.placeDoors(ground, buildings);

    // Hallway decorations
    this.decorateHallway(ground, decorations);

    return { ground, buildings, decorations };
  }

  private createLayer(fill: number): number[][] {
    return Array.from({ length: this.h }, () =>
      Array.from({ length: this.w }, () => fill)
    );
  }

  private fillBaseFloors(ground: number[][]): void {
    // Entire office floor
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        ground[y][x] = TILE.FLOOR_DARK;
      }
    }

    // Meeting room - carpet
    this.fillRoom(ground, 2, 2, 12, 8, TILE.FLOOR_CARPET);
    // Research - light floor
    this.fillRoom(ground, 2, 12, 10, 8, TILE.FLOOR_LIGHT);
    // Archive - wood floor
    this.fillRoom(ground, 2, 22, 10, 8, TILE.FLOOR_WOOD);
    // Dev floor - tile floor
    this.fillRoom(ground, 18, 2, 16, 14, TILE.FLOOR_TILE);
    // Server room - raised floor
    this.fillRoom(ground, 38, 2, 12, 12, TILE.FLOOR_SERVER);
    // Deploy station - light floor
    this.fillRoom(ground, 38, 18, 12, 10, TILE.FLOOR_LIGHT);

    // Corridor
    for (let y = 0; y < this.h; y++) {
      for (let x = 14; x < 18; x++) {
        if (x < this.w) ground[y][x] = TILE.FLOOR_TILE;
      }
    }
    for (let y = 16; y < 20; y++) {
      for (let x = 14; x < 50; x++) {
        if (x < this.w && y < this.h) ground[y][x] = TILE.FLOOR_TILE;
      }
    }
    // Corridor to server/deploy
    for (let y = 0; y < 32; y++) {
      for (let x = 35; x < 38; x++) {
        if (x < this.w && y < this.h) ground[y][x] = TILE.FLOOR_TILE;
      }
    }
  }

  private fillRoom(ground: number[][], rx: number, ry: number, rw: number, rh: number, tile: number): void {
    for (let y = ry; y < ry + rh && y < this.h; y++) {
      for (let x = rx; x < rx + rw && x < this.w; x++) {
        ground[y][x] = tile;
      }
    }
  }

  private drawWalls(ground: number[][], buildings: number[][]): void {
    // Outer perimeter walls
    for (let x = 0; x < this.w; x++) {
      buildings[0][x] = TILE.WALL_TOP;
      if (this.h - 1 >= 0) buildings[this.h - 1][x] = TILE.WALL_BOTTOM;
    }
    for (let y = 0; y < this.h; y++) {
      buildings[y][0] = TILE.WALL_LEFT;
      buildings[y][this.w - 1] = TILE.WALL_RIGHT;
    }
    buildings[0][0] = TILE.WALL_CORNER_TL;
    buildings[0][this.w - 1] = TILE.WALL_CORNER_TR;

    // Room divider walls
    // Left column divider (x=14) between left rooms and corridor
    for (let y = 1; y < this.h - 1; y++) {
      if (!this.isDoorPos(14, y)) {
        buildings[y][14] = TILE.WALL_RIGHT;
      }
    }

    // Meeting room bottom wall (y=10)
    for (let x = 1; x < 14; x++) {
      if (!this.isDoorPos(x, 10)) {
        buildings[10][x] = TILE.WALL_BOTTOM;
      }
    }

    // Research bottom wall (y=20)
    for (let x = 1; x < 14; x++) {
      if (!this.isDoorPos(x, 20)) {
        buildings[20][x] = TILE.WALL_BOTTOM;
      }
    }

    // Dev floor bottom wall (y=16) - only from 18 to 34
    for (let x = 18; x < 35; x++) {
      if (!this.isDoorPos(x, 16)) {
        buildings[16][x] = TILE.WALL_BOTTOM;
      }
    }

    // Dev floor left wall (x=17) from top to corridor
    for (let y = 1; y < 16; y++) {
      buildings[y][17] = TILE.WALL_LEFT;
    }

    // Right column divider (x=35) for server/deploy rooms
    for (let y = 1; y < this.h - 1; y++) {
      if (!this.isDoorPos(35, y)) {
        buildings[y][35] = TILE.WALL_LEFT;
      }
    }

    // Dev floor right wall (x=34) from top to dev bottom
    for (let y = 1; y < 16; y++) {
      if (!this.isDoorPos(34, y)) {
        buildings[y][34] = TILE.WALL_RIGHT;
      }
    }

    // Server room bottom wall (y=14)
    for (let x = 35; x < this.w - 1; x++) {
      if (!this.isDoorPos(x, 14)) {
        buildings[14][x] = TILE.WALL_BOTTOM;
      }
    }

    // Deploy station top wall is the corridor bottom
    // Server/Deploy divider at y=17
    for (let x = 38; x < this.w - 1; x++) {
      if (!this.isDoorPos(x, 17)) {
        buildings[17][x] = TILE.WALL_TOP;
      }
    }

    // Windows on exterior walls
    // Top wall windows
    for (let x = 4; x < this.w - 2; x += 6) {
      if (buildings[0][x] === TILE.WALL_TOP) {
        buildings[0][x] = TILE.WINDOW;
      }
    }
    // Bottom wall windows
    for (let x = 4; x < this.w - 2; x += 6) {
      if (buildings[this.h - 1][x] === TILE.WALL_BOTTOM) {
        // Can't put window on bottom, place on y = h-1 as poster instead
      }
    }
    // Left wall windows
    for (let y = 4; y < this.h - 2; y += 5) {
      if (buildings[y][0] === TILE.WALL_LEFT) {
        buildings[y][0] = TILE.WINDOW;
      }
    }
    // Right wall windows
    for (let y = 4; y < this.h - 2; y += 5) {
      if (buildings[y][this.w - 1] === TILE.WALL_RIGHT) {
        buildings[y][this.w - 1] = TILE.WINDOW;
      }
    }
  }

  private isDoorPos(x: number, y: number): boolean {
    return BUILDINGS.some(b => b.entranceTile.x === x && b.entranceTile.y === y);
  }

  private drawCorridor(_ground: number[][]): void {
    // Already handled in fillBaseFloors
  }

  private placeDoors(ground: number[][], buildings: number[][]): void {
    for (const b of BUILDINGS) {
      const dx = b.entranceTile.x;
      const dy = b.entranceTile.y;
      if (dy >= 0 && dy < this.h && dx >= 0 && dx < this.w) {
        buildings[dy][dx] = -1; // Clear wall at door
        ground[dy][dx] = TILE.DOOR_H;
      }
    }
  }

  // === ROOM FURNITURE ===

  private buildMeetingRoom(ground: number[][], deco: number[][]): void {
    // Meeting room: top-left (2,2) 12x8
    // Whiteboard on top wall
    deco[2][6] = TILE.WHITEBOARD;
    deco[2][7] = TILE.WHITEBOARD;
    deco[2][8] = TILE.STICKY_NOTES;

    // Big table in center
    deco[5][5] = TILE.TABLE_ROUND;
    deco[5][6] = TILE.TABLE_ROUND;
    deco[5][7] = TILE.TABLE_ROUND;
    deco[5][8] = TILE.TABLE_ROUND;
    deco[6][5] = TILE.TABLE_ROUND;
    deco[6][6] = TILE.TABLE_ROUND;
    deco[6][7] = TILE.TABLE_ROUND;
    deco[6][8] = TILE.TABLE_ROUND;

    // Chairs around table
    deco[4][5] = TILE.CHAIR;
    deco[4][8] = TILE.CHAIR;
    deco[7][5] = TILE.CHAIR;
    deco[7][8] = TILE.CHAIR;

    // Plant in corner
    deco[2][12] = TILE.PLANT_POT;
    // Clock on wall
    deco[2][3] = TILE.CLOCK;
    // Lamp
    deco[4][6] = TILE.LAMP_CEILING;

    // Rug
    ground[5][4] = TILE.RUG;
    ground[6][4] = TILE.RUG;
    ground[5][9] = TILE.RUG;
    ground[6][9] = TILE.RUG;
  }

  private buildResearchCorner(ground: number[][], deco: number[][]): void {
    // Research: (2,12) 10x8
    // Bookshelves along left wall
    deco[13][2] = TILE.BOOKSHELF;
    deco[14][2] = TILE.BOOKSHELF;
    deco[15][2] = TILE.BOOKSHELF;
    deco[16][2] = TILE.BOOKSHELF;

    // Desk with monitor
    deco[13][6] = TILE.DESK_MONITOR_L;
    deco[13][7] = TILE.DESK_MONITOR_R;
    deco[14][6] = TILE.CHAIR;
    deco[14][7] = TILE.CHAIR;

    // Another desk
    deco[17][5] = TILE.DESK_MONITOR_L;
    deco[17][6] = TILE.DESK_MONITOR_R;
    deco[18][5] = TILE.CHAIR;

    // Plant
    deco[12][10] = TILE.PLANT_POT;
    // Sticky notes on wall
    deco[12][4] = TILE.STICKY_NOTES;
    // Poster
    deco[12][8] = TILE.POSTER;
  }

  private buildArchiveRoom(ground: number[][], deco: number[][]): void {
    // Archive: (2,22) 10x8
    // Bookshelves along walls
    deco[22][2] = TILE.BOOKSHELF;
    deco[23][2] = TILE.BOOKSHELF;
    deco[24][2] = TILE.BOOKSHELF;
    deco[25][2] = TILE.BOOKSHELF;
    deco[22][3] = TILE.BOOKSHELF;
    deco[23][3] = TILE.BOOKSHELF;

    // Desk
    deco[24][6] = TILE.DESK_MONITOR_L;
    deco[24][7] = TILE.DESK_MONITOR_R;
    deco[25][6] = TILE.CHAIR;

    // Printer
    deco[27][10] = TILE.PRINTER;

    // Trash bin
    deco[28][2] = TILE.TRASH_BIN;

    // Lamp
    deco[22][7] = TILE.LAMP_CEILING;
  }

  private buildDevFloor(ground: number[][], deco: number[][]): void {
    // Dev floor: (18,2) 16x14 - The main workspace
    // Row 1 of desks (y=3-4)
    deco[3][19] = TILE.DESK_MONITOR_L;
    deco[3][20] = TILE.KEYBOARD;
    deco[4][19] = TILE.CHAIR;
    deco[4][20] = TILE.CHAIR;

    deco[3][22] = TILE.DESK_MONITOR_R;
    deco[3][23] = TILE.KEYBOARD;
    deco[4][22] = TILE.CHAIR;

    deco[3][25] = TILE.DESK_MONITOR_L;
    deco[3][26] = TILE.MUG;
    deco[4][25] = TILE.CHAIR;
    deco[4][26] = TILE.CHAIR;

    deco[3][29] = TILE.DESK_MONITOR_R;
    deco[3][30] = TILE.KEYBOARD;
    deco[4][29] = TILE.CHAIR;

    // Row 2 of desks (y=7-8)
    deco[7][19] = TILE.DESK_MONITOR_L;
    deco[7][20] = TILE.MUG;
    deco[8][19] = TILE.CHAIR;

    deco[7][22] = TILE.DESK_MONITOR_R;
    deco[7][23] = TILE.KEYBOARD;
    deco[8][22] = TILE.CHAIR;
    deco[8][23] = TILE.CHAIR;

    deco[7][25] = TILE.DESK_MONITOR_L;
    deco[7][26] = TILE.KEYBOARD;
    deco[8][25] = TILE.CHAIR;

    deco[7][29] = TILE.DESK_MONITOR_R;
    deco[7][30] = TILE.MUG;
    deco[8][29] = TILE.CHAIR;
    deco[8][30] = TILE.CHAIR;

    // Row 3 of desks (y=11-12)
    deco[11][19] = TILE.DESK_MONITOR_L;
    deco[11][20] = TILE.KEYBOARD;
    deco[12][19] = TILE.CHAIR;

    deco[11][22] = TILE.DESK_MONITOR_R;
    deco[11][23] = TILE.MUG;
    deco[12][22] = TILE.CHAIR;
    deco[12][23] = TILE.CHAIR;

    deco[11][25] = TILE.DESK_MONITOR_L;
    deco[11][26] = TILE.KEYBOARD;
    deco[12][25] = TILE.CHAIR;

    // Big monitor on wall (status display)
    deco[2][24] = TILE.MONITOR_ON;
    deco[2][25] = TILE.MONITOR_ON;

    // Plants in corners
    deco[2][18] = TILE.PLANT_POT;
    deco[2][33] = TILE.PLANT_POT;
    deco[14][33] = TILE.PLANT_POT;

    // Ceiling lamps
    deco[5][21] = TILE.LAMP_CEILING;
    deco[5][28] = TILE.LAMP_CEILING;
    deco[9][21] = TILE.LAMP_CEILING;
    deco[9][28] = TILE.LAMP_CEILING;

    // Whiteboard on left wall
    deco[6][18] = TILE.WHITEBOARD;
    deco[10][18] = TILE.STICKY_NOTES;

    // Poster
    deco[2][31] = TILE.POSTER;
  }

  private buildServerRoom(ground: number[][], deco: number[][]): void {
    // Server room: (38,2) 12x12
    // Server racks in rows
    deco[3][39] = TILE.SERVER_RACK;
    deco[4][39] = TILE.SERVER_RACK;
    deco[5][39] = TILE.SERVER_RACK;
    deco[6][39] = TILE.SERVER_RACK;

    deco[3][41] = TILE.SERVER_RACK;
    deco[4][41] = TILE.SERVER_RACK;
    deco[5][41] = TILE.SERVER_RACK;
    deco[6][41] = TILE.SERVER_RACK;

    deco[3][43] = TILE.SERVER_RACK;
    deco[4][43] = TILE.SERVER_RACK;
    deco[5][43] = TILE.SERVER_RACK;

    deco[3][45] = TILE.SERVER_RACK;
    deco[4][45] = TILE.SERVER_RACK;
    deco[5][45] = TILE.SERVER_RACK;

    deco[3][47] = TILE.SERVER_RACK;
    deco[4][47] = TILE.SERVER_RACK;

    // Monitoring desk
    deco[9][40] = TILE.DESK_MONITOR_L;
    deco[9][41] = TILE.MONITOR_ON;
    deco[10][40] = TILE.CHAIR;

    deco[9][44] = TILE.MONITOR_ON;
    deco[9][45] = TILE.DESK_MONITOR_R;
    deco[10][45] = TILE.CHAIR;

    // Blinking lights aesthetic
    deco[8][39] = TILE.LAMP_CEILING;
    deco[8][45] = TILE.LAMP_CEILING;
  }

  private buildDeployStation(ground: number[][], deco: number[][]): void {
    // Deploy: (38,18) 12x10
    // Desks with monitors
    deco[19][39] = TILE.DESK_MONITOR_L;
    deco[19][40] = TILE.DESK_MONITOR_R;
    deco[20][39] = TILE.CHAIR;
    deco[20][40] = TILE.CHAIR;

    deco[19][43] = TILE.DESK_MONITOR_L;
    deco[19][44] = TILE.KEYBOARD;
    deco[20][43] = TILE.CHAIR;

    // Big status monitor on wall
    deco[18][46] = TILE.MONITOR_ON;
    deco[18][47] = TILE.MONITOR_ON;

    // Whiteboard
    deco[22][48] = TILE.WHITEBOARD;

    // Plant
    deco[18][39] = TILE.PLANT_POT;

    // Printer
    deco[25][48] = TILE.PRINTER;

    // Sticky notes
    deco[18][42] = TILE.STICKY_NOTES;

    // Lamp
    deco[21][42] = TILE.LAMP_CEILING;
  }

  private buildBreakArea(ground: number[][], deco: number[][]): void {
    // Break area in the wide corridor section (around y=17-19, x=18-34)
    // Coffee machine
    deco[17][19] = TILE.COFFEE_MACHINE;

    // Sofa
    deco[18][20] = TILE.SOFA_L;
    deco[18][21] = TILE.SOFA_R;

    // Small table
    deco[18][23] = TILE.TABLE_ROUND;

    // Water cooler
    deco[17][25] = TILE.WATER_COOLER;

    // Another sofa
    deco[18][28] = TILE.SOFA_L;
    deco[18][29] = TILE.SOFA_R;

    // Plant
    deco[17][31] = TILE.PLANT_POT;

    // Rug in break area
    ground[18][22] = TILE.RUG;
    ground[18][24] = TILE.RUG;
    ground[19][22] = TILE.RUG;
    ground[19][23] = TILE.RUG;
    ground[19][24] = TILE.RUG;
  }

  private decorateHallway(ground: number[][], deco: number[][]): void {
    // Corridor decorations
    // Left corridor (x=14-17, full height)
    // Plants along corridor
    deco[4][15] = TILE.PLANT_POT;
    deco[12][15] = TILE.PLANT_POT;
    deco[22][15] = TILE.PLANT_POT;

    // Posters on corridor walls
    deco[6][14] = TILE.POSTER;
    deco[14][14] = TILE.POSTER;
    deco[24][14] = TILE.POSTER;

    // Water cooler in corridor
    deco[8][16] = TILE.WATER_COOLER;

    // Trash bins
    deco[10][16] = TILE.TRASH_BIN;
    deco[24][16] = TILE.TRASH_BIN;

    // Right corridor
    deco[20][36] = TILE.PLANT_POT;
    deco[10][36] = TILE.PLANT_POT;

    // Lamps in corridor
    deco[5][16] = TILE.LAMP_CEILING;
    deco[15][16] = TILE.LAMP_CEILING;
    deco[25][16] = TILE.LAMP_CEILING;
  }
}
