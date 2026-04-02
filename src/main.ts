import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { CONFIG } from './config';
import { HtmlUI } from './ui/HtmlUI';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: false,
  roundPixels: true,
  backgroundColor: '#0c0c16',
  scene: [BootScene, WorldScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    mouse: { preventDefaultWheel: true },
  },
  fps: {
    target: 30,
    forceSetTimeOut: false,
    smoothStep: false,
  },
};
// Prevent double-init on Vite HMR
if ((window as any).__PHASER_GAME__) {
  (window as any).__PHASER_GAME__.destroy(true);
}

const game = new Phaser.Game(config);
(window as any).__PHASER_GAME__ = game;

const htmlUI = new HtmlUI();
(window as any).__htmlUI = htmlUI;

function withScene(fn: (s: WorldScene) => void) {
  const s = game.scene.getScene('WorldScene') as WorldScene | null;
  if (s?.scene.isActive()) fn(s);
}

document.getElementById('btn-zin')?.addEventListener('click', () => {
  withScene(s => { s.cameras.main.setZoom(Math.min(s.cameras.main.zoom + 0.3, CONFIG.MAX_ZOOM)); });
});

document.getElementById('btn-zout')?.addEventListener('click', () => {
  withScene(s => { s.cameras.main.setZoom(Math.max(s.cameras.main.zoom - 0.3, CONFIG.MIN_ZOOM)); });
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

// OVERVIEW: fit the entire office perfectly in view using actual canvas size
document.getElementById('btn-overview')?.addEventListener('click', () => {
  withScene(s => {
    htmlUI.exitFirstPerson();
    s.cameraController.stopFollow();
    const ww = CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE;
    const wh = CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE;
    const cam = s.cameras.main;
    const zx = cam.width / ww;
    const zy = cam.height / wh;
    cam.setZoom(Math.min(zx, zy) * 0.92); // 8% padding
    cam.centerOn(ww / 2, wh / 2);
  });
});
