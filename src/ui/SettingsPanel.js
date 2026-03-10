/**
 * SettingsPanel — toggled with S key.
 * Sliders for master, morse tone, and static volume.
 */
export class SettingsPanel {
  constructor(scene, audioEngine) {
    this.scene  = scene;
    this.audio  = audioEngine;
    this._visible = false;

    this._sliders = [];
    this._build();
    this._setupToggle();
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  _build() {
    const s  = this.scene;
    const W  = 340;
    const H  = 210;
    const X  = Math.round(s.scale.width  / 2 - W / 2);
    const Y  = 370;

    this._container = s.add.container(X, Y).setDepth(150).setVisible(false);

    // Background
    const bg = s.add.rectangle(W / 2, H / 2, W, H, 0x08080f, 0.95)
      .setStrokeStyle(1, 0x334466);
    this._container.add(bg);

    // Title
    const title = s.add.text(W / 2, 12, 'SETTINGS  (S to close)', {
      fontSize: '12px', color: '#556688', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this._container.add(title);

    // Sliders
    const sliderDefs = [
      {
        label:   'Master Volume',
        key:     'masterVolume',
        gainFn:  (v) => { if (this.audio.masterGain) this.audio.masterGain.gain.value = v; },
        default: 0.8,
        y:       55,
      },
      {
        label:   'Morse Tone',
        key:     'morseVolume',
        gainFn:  (v) => { this.audio.settings && (this.audio.settings.morseVolume = v); },
        default: 0.7,
        y:       105,
      },
      {
        label:   'Static / Noise',
        key:     'staticVolume',
        gainFn:  (v) => {
          if (this.audio.staticGain) {
            this.audio.staticGain.gain.value = v;
          }
          this.audio.settings && (this.audio.settings.staticVolume = v);
        },
        default: 0.15,
        y:       155,
      },
    ];

    sliderDefs.forEach(def => this._addSlider(def, W));

    // Hint
    const hint = s.add.text(W / 2, H - 14, 'drag sliders or click track', {
      fontSize: '10px', color: '#334455', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);
    this._container.add(hint);
  }

  _addSlider({ label, gainFn, default: defaultVal, y }, panelW) {
    const s       = this.scene;
    const trackX  = 20;
    const trackW  = panelW - 40;
    const trackH  = 6;
    const knobR   = 9;

    // Label
    const lbl = s.add.text(trackX, y - 18, label, {
      fontSize: '12px', color: '#aabbcc', fontFamily: 'monospace',
    });
    this._container.add(lbl);

    // Value readout
    const readout = s.add.text(panelW - trackX, y - 18,
      `${Math.round(defaultVal * 100)}%`, {
        fontSize: '12px', color: '#00ff88', fontFamily: 'monospace',
      }).setOrigin(1, 0);
    this._container.add(readout);

    // Track background
    const track = s.add.rectangle(
      trackX + trackW / 2, y + trackH / 2, trackW, trackH, 0x223344
    ).setStrokeStyle(1, 0x334466);
    this._container.add(track);

    // Fill
    const fill = s.add.rectangle(
      trackX, y + trackH / 2, trackW * defaultVal, trackH, 0x2255aa
    ).setOrigin(0, 0.5);
    this._container.add(fill);

    // Knob
    const knobX = trackX + trackW * defaultVal;
    const knob  = s.add.circle(knobX, y + trackH / 2, knobR, 0x4488ff)
      .setInteractive({ draggable: true, useHandCursor: true });
    this._container.add(knob);

    // Click on track to jump value
    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', (ptr) => {
      // ptr is in world space; adjust for container offset
      const contX = this._container.x;
      const rawX  = ptr.x - contX;
      const t     = Phaser.Math.Clamp((rawX - trackX) / trackW, 0, 1);
      this._applySlider(t, knob, fill, readout, gainFn, trackX, trackW, trackH);
    });

    // Drag knob
    s.input.setDraggable(knob);
    knob.on('drag', (ptr, dragX) => {
      const contX = this._container.x;
      const t     = Phaser.Math.Clamp((dragX - trackX) / trackW, 0, 1);
      this._applySlider(t, knob, fill, readout, gainFn, trackX, trackW, trackH);
    });

    this._sliders.push({ gainFn, default: defaultVal });
  }

  _applySlider(t, knob, fill, readout, gainFn, trackX, trackW, trackH) {
    knob.x   = trackX + trackW * t;
    fill.width = trackW * t;
    readout.setText(`${Math.round(t * 100)}%`);
    gainFn(t);
  }

  // ─── Toggle ──────────────────────────────────────────────────────────────────

  _setupToggle() {
    this.scene.input.keyboard.on('keydown-S', () => {
      this._visible = !this._visible;
      this._container.setVisible(this._visible);
    });
  }

  show() { this._visible = true;  this._container.setVisible(true);  }
  hide() { this._visible = false; this._container.setVisible(false); }
}
