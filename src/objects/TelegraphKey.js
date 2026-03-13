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

  /** Invisible hit zone over the telegraph key in the background image. */
  _buildTouchKey() {
    const s = this.scene;

    // Position over the brass telegraph key in the bottom-right of the bg image
    const cx = 1160, cy = 665;
    const W = 220, H = 220;

    // Glow graphic — lights up when key is held down
    this._touchKeyGlow = s.add.graphics().setDepth(5).setAlpha(0);
    this._touchKeyGlow.fillStyle(0xffcc44, 0.25);
    this._touchKeyGlow.fillRoundedRect(cx - W/2, cy - H/2, W, H, 10);
    this._touchKeyGlow.lineStyle(2, 0xffcc44, 0.6);
    this._touchKeyGlow.strokeRoundedRect(cx - W/2, cy - H/2, W, H, 10);

    // Transparent hit zone (invisible rectangle over the image key)
    this._touchKeyBtn = s.add.rectangle(cx, cy, W, H)
      .setAlpha(0.001)   // near-invisible but still receives pointer events
      .setDepth(6)
      .setInteractive({ useHandCursor: true });

    // Subtle hint label (fades on first press)
    this._touchKeyLabel = s.add.text(cx, cy - 46, 'SPACE / CLICK', {
      fontSize: '11px', color: '#c8a040', fontFamily: 'monospace',
      backgroundColor: '#1a1008', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(7).setAlpha(0.7);

    // ─ pointer events ─
    this._touchKeyBtn.on('pointerdown', () => this._touchDown());
    this._touchKeyBtn.on('pointerup',   () => this._touchUp());
    this._touchKeyBtn.on('pointerout',  () => this._touchUp());
  }

  _touchDown() {
    if (this._keyIsDown || this._disabled) return;
    this._keyIsDown = true;
    this._touchKeyGlow?.setAlpha(1);
    // Fade hint label on first use
    if (this._touchKeyLabel?.alpha > 0) {
      this.scene.tweens.add({ targets: this._touchKeyLabel, alpha: 0, duration: 600 });
    }
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
    this._touchKeyGlow?.setAlpha(0);
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
      this._touchKeyGlow?.setAlpha(1);
      if (this._touchKeyLabel?.alpha > 0) {
        this.scene.tweens.add({ targets: this._touchKeyLabel, alpha: 0, duration: 600 });
      }
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
      this._touchKeyGlow?.setAlpha(0);
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

  /** Disable click input during message reception. */
  hide() {
    this._touchKeyBtn.disableInteractive();
    this._touchKeyGlow?.setAlpha(0);
  }

  /** Re-enable click input. */
  show() {
    this._touchKeyBtn.setInteractive({ useHandCursor: true });
  }
}
