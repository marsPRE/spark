import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MENU });
  }

  create() {
    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, height / 3, '⚡ SPARKS', {
      fontSize: '72px',
      color: '#f0c040',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 70, 'Maritime Telegraphy', {
      fontSize: '24px',
      color: '#8899bb',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Menu buttons
    this._addButton(width / 2, height / 2 + 40, 'NEW VOYAGE', () => {
      this.scene.start(SCENES.VOYAGE_SELECT);
    });

    this._addButton(width / 2, height / 2 + 100, 'CONTINUE', () => {
      // TODO: load save
    });

    this._addButton(width / 2, height / 2 + 160, 'TUTORIAL', () => {
      this.scene.start(SCENES.GAME, { voyageId: 'tutorial' });
    });
  }

  _addButton(x, y, label, callback) {
    const text = this.add.text(x, y, label, {
      fontSize: '22px',
      color: '#ccddff',
      fontFamily: 'monospace',
      backgroundColor: '#1a2040',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.on('pointerover', () => text.setColor('#ffffff'));
    text.on('pointerout', () => text.setColor('#ccddff'));
    text.on('pointerdown', callback);

    return text;
  }
}
