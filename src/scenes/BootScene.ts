import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // No textures needed — everything is drawn with Graphics
    this.scene.start('WorldScene');
  }
}
