import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { CONFIG } from './config';
import { HtmlUI } from './ui/HtmlUI';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  antialias: true,
  roundPixels: false,
  backgroundColor: '#0c0c16',
  scene: [BootScene, WorldScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    mouse: { preventDefaultWheel: true },
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
    smoothStep: false,
  },
  disableVisibilityChange: true,
};

const game = new Phaser.Game(config);
const htmlUI = new HtmlUI();
(window as any).__htmlUI = htmlUI;

function withScene(fn: (s: WorldScene) => void) {
  const s = game.scene.getScene('WorldScene') as WorldScene | null;
  if (s?.scene.isActive()) fn(s);
}

document.getElementById('btn-zin')?.addEventListener('click', () => {
  withScene(s => { s.cameras.main.setZoom(Math.min(s.cameras.main.zoom + 0.2, CONFIG.MAX_ZOOM)); });
});

document.getElementById('btn-zout')?.addEventListener('click', () => {
  withScene(s => { s.cameras.main.setZoom(Math.max(s.cameras.main.zoom - 0.2, CONFIG.MIN_ZOOM)); });
});

document.getElementById('btn-center')?.addEventListener('click', () => {
  withScene(s => {
    htmlUI.exitFirstPerson();
    s.cameraController.stopFollow();
    s.cameras.main.setZoom(CONFIG.DEFAULT_ZOOM);
    const ww = CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE;
    const wh = CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE;
    s.cameras.main.centerOn(ww / 2, wh / 2);
  });
});

// OVERVIEW: fit the entire office perfectly in view
document.getElementById('btn-overview')?.addEventListener('click', () => {
  withScene(s => {
    htmlUI.exitFirstPerson();
    s.cameraController.stopFollow();
    const ww = CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE;
    const wh = CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE;
    const zx = CONFIG.GAME_WIDTH / ww;
    const zy = CONFIG.GAME_HEIGHT / wh;
    s.cameras.main.setZoom(Math.min(zx, zy) * 0.95); // 5% padding
    s.cameras.main.centerOn(ww / 2, wh / 2);
  });
});
