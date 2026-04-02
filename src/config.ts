export const CONFIG = {
  TILE_SIZE: 24,
  WORLD_WIDTH: 40,
  WORLD_HEIGHT: 28,
  // Game dimensions — used as reference, actual size set by Phaser RESIZE mode
  GAME_WIDTH: 1280,
  GAME_HEIGHT: 900,
  // Zoom levels — increased for better visibility in small viewports
  DEFAULT_ZOOM: 1.8,
  MIN_ZOOM: 0.6,
  MAX_ZOOM: 4.0,
  AGENT_SPEED: 55,
  CAMERA_LERP: 0.1,
  CAMERA_SCROLL_SPEED: 300,
  DAY_CYCLE_DURATION: 180000,
  TICK_INTERVAL: 500,
  ERROR_RATE: 0.08,
  NUM_AGENTS: 5,
  FP_ZOOM: 3.0,
  FOLLOW_ZOOM: 2.2,
} as const;

export const AGENT_PALETTES = [
  { id: 'blue',   name: 'Atlas',  color: '#4a8aff', dark: '#2a5acc', skin: '#f0c8a0' },
  { id: 'red',    name: 'Nova',   color: '#ff5a6a', dark: '#cc3040', skin: '#e8b898' },
  { id: 'green',  name: 'Sage',   color: '#40cc70', dark: '#208a40', skin: '#f0d0a8' },
  { id: 'purple', name: 'Iris',   color: '#aa6aef', dark: '#7a3abf', skin: '#f0c0b0' },
  { id: 'orange', name: 'Ember',  color: '#ffa040', dark: '#cc7020', skin: '#e8c0a0' },
] as const;

export const ROOM_DEFS = {
  'think-tank':     { name: 'Meeting Room',    floor: 0x1e2a3e, accent: 0x4a8aff },
  'search-station': { name: 'Research Corner', floor: 0x1e2e28, accent: 0x40cc70 },
  'file-library':   { name: 'Archive Room',    floor: 0x2a2420, accent: 0xddaa60 },
  'code-workshop':  { name: 'Dev Floor',       floor: 0x1a1e2a, accent: 0x4a8aff },
  'terminal-tower': { name: 'Server Room',     floor: 0x141420, accent: 0xff5a6a },
  'deploy-dock':    { name: 'Deploy Station',  floor: 0x1e1a26, accent: 0xaa6aef },
} as const;

export const ROOM_NAMES: Record<string, string> = {
  'think-tank': 'Meeting Room', 'search-station': 'Research Corner',
  'file-library': 'Archive Room', 'code-workshop': 'Dev Floor',
  'terminal-tower': 'Server Room', 'deploy-dock': 'Deploy Station',
};
