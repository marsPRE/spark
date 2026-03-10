import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.RESULTS });
  }

  init(data) {
    this.results = data || {};
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 80, 'VOYAGE COMPLETE', {
      fontSize: '42px', color: '#f0c040', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const lines = [
      `Messages decoded:  ${this.results.decoded ?? 0}`,
      `Responses sent:    ${this.results.responses ?? 0}`,
      `Distress handled:  ${this.results.distress ?? 0}`,
      `Reputation:        ${this.results.reputation ?? 50}`,
      `Score:             ${this.results.score ?? 0}`,
    ];

    lines.forEach((line, i) => {
      this.add.text(width / 2, 200 + i * 50, line, {
        fontSize: '22px', color: '#ccddff', fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    this.add.text(width / 2, height - 80, 'CONTINUE', {
      fontSize: '24px', color: '#f0c040', fontFamily: 'monospace',
      backgroundColor: '#1a2040', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start(SCENES.VOYAGE_SELECT));
  }
}
