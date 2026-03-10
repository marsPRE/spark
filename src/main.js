import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { VoyageSelectScene } from './scenes/VoyageSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 640, height: 360 },
    max: { width: 1920, height: 1080 },
  },
  scene: [
    BootScene,
    MenuScene,
    VoyageSelectScene,
    GameScene,
    PauseScene,
    ResultsScene,
  ],
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
};

export const game = new Phaser.Game(config);
