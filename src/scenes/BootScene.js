import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  preload() {
    // Loading bar background
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    const progress = this.add.graphics();

    bar.fillStyle(0x222244, 1);
    bar.fillRect(width / 2 - 200, height / 2 - 15, 400, 30);

    this.load.on('progress', (value) => {
      progress.clear();
      progress.fillStyle(0x4488ff, 1);
      progress.fillRect(width / 2 - 198, height / 2 - 13, 396 * value, 26);
    });

    // Load data files
    this.load.json('morse_table', '/assets/data/morse_table.json');
    this.load.json('q_codes', '/assets/data/q_codes.json');
    this.load.json('ship_database', '/assets/data/ship_database.json');
    this.load.json('port_database', '/assets/data/port_database.json');
    this.load.json('tutorial', '/assets/data/voyages/tutorial.json');
    this.load.json('voyage_01', '/assets/data/voyages/voyage_01.json');
    this.load.json('land_irish_sea', '/assets/data/geo/land_irish_sea.geojson');
    this.load.json('land_atlantic',  '/assets/data/geo/land_atlantic.geojson');
  }

  create() {
    this.scene.start(SCENES.MENU);
  }
}
