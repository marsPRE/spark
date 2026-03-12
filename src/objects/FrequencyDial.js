/**
 * FrequencyDial — interactive frequency tuning widget.
 * Rendered as a simple text+drag control until sprites are available.
 */
import { FREQ_MIN, FREQ_MAX, FREQ_DISTRESS } from '../config/constants.js';

const DIAL_X = 770;
const DIAL_Y = 467;

export class FrequencyDial {
  constructor(scene, radioSystem) {
    this.scene  = scene;
    this.radio  = radioSystem;
    this.freq   = FREQ_DISTRESS;

    this._build();
  }

  _build() {
    const s = this.scene;

    // Background
    s.add.rectangle(DIAL_X, DIAL_Y, 210, 100, 0x0d0d1e)
      .setStrokeStyle(1, 0x334466);

    s.add.text(DIAL_X, DIAL_Y - 36, 'FREQUENCY', {
      fontSize: '13px', color: '#4466aa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._freqText = s.add.text(DIAL_X, DIAL_Y - 10, `${this.freq} kHz`, {
      fontSize: '26px', color: '#00ff88', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Up / Down buttons
    const btnStyle = {
      fontSize: '22px', color: '#ccddff', fontFamily: 'monospace',
      backgroundColor: '#1a2040', padding: { x: 14, y: 6 },
    };

    s.add.text(DIAL_X - 50, DIAL_Y + 26, '▼', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._adjust(-1));

    s.add.text(DIAL_X + 50, DIAL_Y + 26, '▲', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._adjust(+1));

    // Scroll-wheel support
    s.input.on('wheel', (pointer, objs, dx, dy) => {
      if (pointer.x < 220) this._adjust(dy > 0 ? -1 : 1);
    });

    // Arrow key support
    const keys = s.input.keyboard;
    keys.on('keydown-UP',   () => this._adjust(+1));
    keys.on('keydown-DOWN', () => this._adjust(-1));
  }

  _adjust(delta) {
    this.freq = Math.max(FREQ_MIN, Math.min(FREQ_MAX, this.freq + delta));
    this._freqText.setText(`${this.freq} kHz`);
    this.radio.tuneFrequency(this.freq);
  }

  getFrequency() { return this.freq; }
}
