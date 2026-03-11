import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';
import { SaveSystem } from '../systems/SaveSystem.js';

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

    // Request fullscreen on first touch (mobile)
    this.input.once('pointerdown', () => {
      if (this.scale.isFullscreen) return;
      this.scale.startFullscreen();
    });

    // Menu buttons
    this._addButton(width / 2, height / 2 + 40, 'NEW VOYAGE', () => {
      this.scene.start(SCENES.VOYAGE_SELECT);
    });

    const saveSystem = new SaveSystem();
    const hasSave = saveSystem.hasSave();

    const continueBtn = this._addButton(width / 2, height / 2 + 100, 'CONTINUE', () => {
      if (!hasSave) return;
      const save = saveSystem.load();
      this.scene.start(SCENES.GAME, { voyageId: save.voyageId, saveData: save });
    });
    if (!hasSave) {
      continueBtn.setColor('#555566').setAlpha(0.5).disableInteractive();
    }

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
