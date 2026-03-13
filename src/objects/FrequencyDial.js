/**
 * FrequencyDial — interactive frequency tuning widget.
 * Rendered as a simple text+drag control until sprites are available.
 */
import { FREQ_MIN, FREQ_MAX, FREQ_DISTRESS } from '../config/constants.js';

// Positioned above the TelegraphKey (which is at cx=1190, cy=280)
const DIAL_X = 1190;
const DIAL_Y = 160;

export class FrequencyDial {
  constructor(scene, radioSystem) {
    this.scene  = scene;
    this.radio  = radioSystem;
    this.freq   = FREQ_DISTRESS;

    this._build();
  }

  _build() {
    // No UI — frequency fixed at initialisation value
  }

  _adjust(delta) {
    this.freq = Math.max(FREQ_MIN, Math.min(FREQ_MAX, this.freq + delta));
    this.radio.tuneFrequency(this.freq);
  }

  getFrequency() { return this.freq; }
}
