/**
 * TelegraphKey — handles SPACEBAR input, drives MorseEngine + AudioEngine.
 * Also records player timing for transmission scoring.
 */
export class TelegraphKey {
  constructor(scene, morseEngine, audioEngine) {
    this.scene  = scene;
    this.morse  = morseEngine;
    this.audio  = audioEngine;

    this._recordingTimings = false;
    this._playerTimings    = [];
    this._lastEventTime    = 0;
    this._keyIsDown        = false;
    this._disabled         = false;

    this._setupInput();
    this._buildTouchKey();
  }

  _disableSpace() { this._disabled = true;  }
  _enableSpace()  { this._disabled = false; }

  /** Large touch-friendly Morse key button in the workspace area. */
  _buildTouchKey() {
    const s = this.scene;
    const cx = 1130, cy = 490;

    // Outer ring
    this._touchKeyRing = s.add.circle(cx, cy, 68, 0x223344)
      .setStrokeStyle(3, 0x4488aa).setDepth(5);

    // Inner button (changes color when pressed)
    this._touchKeyBtn = s.add.circle(cx, cy, 54, 0x1a3a50)
      .setStrokeStyle(2, 0x6699cc)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });

    this._touchKeyLabel = s.add.text(cx, cy - 90, 'KEY', {
      fontSize: '13px', color: '#4488aa', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(6);

    // ─ pointer events ─
    this._touchKeyBtn.on('pointerdown', () => this._touchDown());
    this._touchKeyBtn.on('pointerup',   () => this._touchUp());
    this._touchKeyBtn.on('pointerout',  () => this._touchUp());
  }

  _touchDown() {
    if (this._keyIsDown || this._disabled) return;
    this._keyIsDown = true;
    this._touchKeyBtn.setFillStyle(0x44aadd);
    const ts = performance.now();
    this.morse.onKeyDown(ts);
    this.audio.sideToneOn?.();
    if (this._recordingTimings) {
      if (this._lastEventTime > 0)
        this._playerTimings.push({ type: 'gap', duration: ts - this._lastEventTime });
      this._lastEventTime = ts;
    }
  }

  _touchUp() {
    if (!this._keyIsDown) return;
    this._keyIsDown = false;
    this._touchKeyBtn.setFillStyle(0x1a3a50);
    const ts = performance.now();
    this.morse.onKeyUp(ts);
    this.audio.sideToneOff?.();
    if (this._recordingTimings) {
      this._playerTimings.push({ type: 'tone', duration: ts - this._lastEventTime });
      this._lastEventTime = ts;
    }
  }

  _setupInput() {
    const spaceKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    spaceKey.on('down', () => {
      if (this._keyIsDown || this._disabled) return;
      this._keyIsDown = true;
      const ts = performance.now();

      this.morse.onKeyDown(ts);
      this.audio.sideToneOn?.();

      if (this._recordingTimings) {
        if (this._lastEventTime > 0) {
          // Record the gap since last key-up
          this._playerTimings.push({ type: 'gap', duration: ts - this._lastEventTime });
        }
        this._lastEventTime = ts;
      }
    });

    spaceKey.on('up', () => {
      if (!this._keyIsDown) return;
      this._keyIsDown = false;
      const ts = performance.now();

      this.morse.onKeyUp(ts);
      this.audio.sideToneOff?.();

      if (this._recordingTimings) {
        this._playerTimings.push({ type: 'tone', duration: ts - this._lastEventTime });
        this._lastEventTime = ts;
      }
    });
  }

  /** Start recording player key timings for a transmission. */
  startRecording() {
    this._playerTimings    = [];
    this._recordingTimings = true;
    this._lastEventTime    = 0;   // 0 = no previous event, first gap skipped
    this.morse.resetInput();
  }

  /** Stop recording and return timing array. */
  stopRecording() {
    this._recordingTimings = false;
    return [...this._playerTimings];
  }

  isDown() {
    return this._keyIsDown;
  }
}
