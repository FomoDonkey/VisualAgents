import Phaser from 'phaser';

// Singleton event bus for decoupling simulation from display
export const eventBus = new Phaser.Events.EventEmitter();
