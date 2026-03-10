import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';

export class VoyageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.VOYAGE_SELECT });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 60, 'SELECT VOYAGE', {
      fontSize: '36px',
      color: '#f0c040',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const voyages = [
      { id: 'tutorial', title: 'Tutorial: First Signal',  year: 1907, difficulty: 'CADET'  },
      { id: 'voyage_01', title: 'Maiden Passage',          year: 1909, difficulty: 'CADET'  },
    ];

    voyages.forEach((voyage, i) => {
      const y = 200 + i * 100;
      const card = this.add.rectangle(width / 2, y, 600, 80, 0x1a2040)
        .setInteractive({ useHandCursor: true });

      this.add.text(width / 2 - 280, y - 18, voyage.title, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
      });
      this.add.text(width / 2 - 280, y + 8, `${voyage.year}  ·  ${voyage.difficulty}`, {
        fontSize: '14px', color: '#8899bb', fontFamily: 'monospace',
      });

      card.on('pointerdown', () => {
        this.scene.start(SCENES.GAME, { voyageId: voyage.id });
      });
      card.on('pointerover', () => card.setFillStyle(0x2a3060));
      card.on('pointerout', () => card.setFillStyle(0x1a2040));
    });

    // Back button
    this.add.text(60, height - 50, '← BACK', {
      fontSize: '18px', color: '#8899bb', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.start(SCENES.MENU);
    });
  }
}
