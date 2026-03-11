import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.PAUSE });
  }

  create() {
    const { width, height } = this.scale;

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    this.add.text(width / 2, height / 2 - 80, 'PAUSED', {
      fontSize: '48px', color: '#f0c040', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._btn(width / 2, height / 2, 'RESUME', () => {
      this.scene.resume(SCENES.GAME);
      this.scene.stop();
    });

    this._btn(width / 2, height / 2 + 70, 'SAVE & QUIT', () => {
      const gameScene = this.scene.get(SCENES.GAME);
      gameScene.saveGame();
      this.scene.stop(SCENES.GAME);
      this.scene.stop();
      this.scene.start(SCENES.MENU);
    });

    this._btn(width / 2, height / 2 + 140, 'QUIT (NO SAVE)', () => {
      this.scene.stop(SCENES.GAME);
      this.scene.stop();
      this.scene.start(SCENES.MENU);
    });
  }

  _btn(x, y, label, cb) {
    const t = this.add.text(x, y, label, {
      fontSize: '22px', color: '#ccddff', fontFamily: 'monospace',
      backgroundColor: '#1a2040', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerdown', cb);
    return t;
  }
}
