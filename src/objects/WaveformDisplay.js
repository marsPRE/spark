/**
 * WaveformDisplay — phosphor-green CRT waveform strip.
 * Draws signal amplitude over a 3-second rolling window.
 */
const WF_X = 650;
const WF_Y = 520;
const WF_W = 360;
const WF_H = 50;

export class WaveformDisplay {
  constructor(scene) {
    this.scene      = scene;
    this._signal    = 0;    // 0..1 — set by RadioSystem
    this._samples   = new Array(WF_W).fill(0);
    this._graphics  = scene.add.graphics();
    this._timer     = 0;
    this._sampleInterval = 40; // ms between samples

    // CRT background
    scene.add.rectangle(WF_X + WF_W / 2, WF_Y + WF_H / 2, WF_W, WF_H, 0x001100)
      .setStrokeStyle(1, 0x003300);
  }

  setSignalLevel(level) {
    this._signal = Math.max(0, Math.min(1, level));
  }

  update(delta) {
    this._timer += delta;
    if (this._timer < this._sampleInterval) return;
    this._timer -= this._sampleInterval;

    const noise  = Math.random() * 0.04 - 0.02;
    const sample = this._signal > 0.01
      ? this._signal + noise
      : Math.abs(noise) * 0.3;

    this._samples.shift();
    this._samples.push(Math.max(0, Math.min(1, sample)));
    this._draw();
  }

  _draw() {
    const g = this._graphics;
    g.clear();
    g.lineStyle(1, 0x00ff44, 0.8);
    g.beginPath();

    const midY = WF_Y + WF_H / 2;
    const amp  = WF_H / 2 - 4;

    for (let i = 0; i < this._samples.length; i++) {
      const x = WF_X + i;
      const y = midY - this._samples[i] * amp;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.strokePath();

    // Scanlines
    g.lineStyle(1, 0x000000, 0.3);
    for (let y = WF_Y; y < WF_Y + WF_H; y += 2) {
      g.lineBetween(WF_X, y, WF_X + WF_W, y);
    }
  }
}
