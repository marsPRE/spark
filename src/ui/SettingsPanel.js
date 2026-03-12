/**
 * SettingsPanel — toggled with S key or HUD button.
 * Audio sliders + WPM + Farnsworth spacing + navigation.
 */
import { SCENES } from '../config/constants.js';
import { SettingsSystem, DEFAULT_SETTINGS } from '../systems/SettingsSystem.js';

export class SettingsPanel {
  constructor(scene, audioEngine, isMenuMode = false) {
    this.scene  = scene;
    this.audio  = audioEngine;
    this._visible = false;
    this._isMenuMode = isMenuMode;  // true when shown from main menu

    this._sliders = [];
    this._build();
    this._setupToggle();
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  _build() {
    const s  = this.scene;
    const W  = 380;
    const H  = 460;
    const X  = Math.round(s.scale.width  / 2 - W / 2);
    const Y  = 160;

    this._container = s.add.container(X, Y).setDepth(150).setVisible(false);

    // Background
    const bg = s.add.rectangle(W / 2, H / 2, W, H, 0x08080f, 0.97)
      .setStrokeStyle(1, 0x334466);
    this._container.add(bg);

    // Title
    const titleText = this._isMenuMode ? 'SETTINGS' : 'SETTINGS  (S to close)';
    const title = s.add.text(W / 2, 12, titleText, {
      fontSize: '12px', color: '#556688', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this._container.add(title);

    // Load saved settings or use defaults
    const savedSettings = SettingsSystem.load();
    const settings = { ...DEFAULT_SETTINGS, ...this.scene.settings, ...savedSettings };

    // ── Audio sliders ───────────────────────────────────────────────────────
    const audioSliders = [
      {
        label: 'Master Volume',
        gainFn: (v) => { 
          if (this.audio?.masterGain) this.audio.masterGain.gain.value = v;
          this._pendingSettings.masterVolume = v;
        },
        default: settings.masterVolume ?? 0.8, y: 50,
      },
      {
        label: 'Morse Tone',
        gainFn: (v) => { 
          if (this.audio?.settings) this.audio.settings.morseVolume = v;
          this._pendingSettings.morseVolume = v;
        },
        default: settings.morseVolume ?? 0.7, y: 95,
      },
      {
        label: 'Static / Noise',
        gainFn: (v) => {
          if (this.audio?.staticGain) this.audio.staticGain.gain.value = v;
          if (this.audio?.settings) this.audio.settings.staticVolume = v;
          this._pendingSettings.staticVolume = v;
        },
        default: settings.staticVolume ?? 0.15, y: 140,
      },
    ];
    audioSliders.forEach(def => this._addSlider(def, W, false));

    // ── Morse sliders ───────────────────────────────────────────────────────
    this._addSlider({
      label: 'Incoming WPM',
      gainFn: (v) => {
        const wpm = Math.round(5 + v * 20);  // 5–25 WPM
        if (this.scene.radioSystem) this.scene.radioSystem.wpmOverride = wpm;
        this._pendingSettings.receiveWpmOverride = wpm;
        this._wpmReadout?.setText(`${wpm}`);
      },
      default: ((settings.receiveWpmOverride ?? 5) - 5) / 20,
      y: 195,
      label2: `${settings.receiveWpmOverride ?? 5}`,
      isWpm: true,
    }, W, true);

    this._addSlider({
      label: 'Farnsworth Spacing',
      gainFn: (v) => {
        const mult = 1 + v * 3;  // 1.0×–4.0×
        if (this.scene.settings) this.scene.settings.farnsworthMultiplier = mult;
        if (this.scene.morseEngine) this.scene.morseEngine.setFarnsworthMultiplier(mult);
        this._pendingSettings.farnsworthMultiplier = mult;
        this._farnReadout?.setText(`${mult.toFixed(1)}×`);
      },
      default: ((settings.farnsworthMultiplier ?? 1.5) - 1) / 3,
      y: 240,
      label2: `${(settings.farnsworthMultiplier ?? 1.5).toFixed(1)}×`,
      isFarn: true,
    }, W, true);

    this._addSlider({
      label: 'Repeat Pause',
      gainFn: (v) => {
        const ms = Math.round(500 + v * 4500);  // 0.5–5 s
        if (this.scene.settings) this.scene.settings.repeatPauseMs = ms;
        this._pendingSettings.repeatPauseMs = ms;
        this._pauseReadout?.setText(`${(ms/1000).toFixed(1)}s`);
      },
      default: ((settings.repeatPauseMs ?? 2000) - 500) / 4500,
      y: 285,
      label2: `${((settings.repeatPauseMs ?? 2000)/1000).toFixed(1)}s`,
      isPause: true,
    }, W, true);

    this._addSlider({
      label: 'Initial Send WPM',
      gainFn: (v) => {
        const wpm = Math.round(5 + v * 20);  // 5–25 WPM
        if (this.scene.settings) this.scene.settings.initialSendWpm = wpm;
        this._pendingSettings.initialSendWpm = wpm;
        this._sendWpmReadout?.setText(`${wpm}`);
      },
      default: ((settings.initialSendWpm ?? 15) - 5) / 20,
      y: 330,
      label2: `${settings.initialSendWpm ?? 15}`,
      isSendWpm: true,
    }, W, true);

    this._addSlider({
      label: 'Button Display Time',
      gainFn: (v) => {
        const ms = Math.round(50 + v * 450);  // 50–500 ms
        if (this.scene.settings) this.scene.settings.buttonDisplayMs = ms;
        this._pendingSettings.buttonDisplayMs = ms;
        this._btnDisplayReadout?.setText(`${ms}ms`);
      },
      default: ((settings.buttonDisplayMs ?? 400) - 50) / 450,
      y: 375,
      label2: `${settings.buttonDisplayMs ?? 400}ms`,
      isBtnDisplay: true,
    }, W, true);

    // ── Navigation buttons ──────────────────────────────────────────────────
    const btnStyle = {
      fontSize: '14px', color: '#ccddff', fontFamily: 'monospace',
      backgroundColor: '#1a2040', padding: { x: 16, y: 8 },
    };

    if (this._isMenuMode) {
      // Back button for menu mode
      const backBtn = s.add.text(W / 2, H - 36, 'BACK', btnStyle)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
      backBtn.on('pointerout',  () => backBtn.setColor('#ccddff'));
      backBtn.on('pointerup',   () => this.hide());
      this._container.add(backBtn);
    } else {
      // Main menu + Close buttons for in-game mode
      const menuBtn = s.add.text(W / 2 - 60, H - 36, 'MAIN MENU', btnStyle)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
      menuBtn.on('pointerout',  () => menuBtn.setColor('#ccddff'));
      menuBtn.on('pointerup',   () => {
        this._saveSettings();
        this.hide();
        this.scene.scene.stop(SCENES.GAME);
        this.scene.scene.start(SCENES.MENU);
      });
      this._container.add(menuBtn);

      const closeBtn = s.add.text(W / 2 + 70, H - 36, 'CLOSE', btnStyle)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
      closeBtn.on('pointerout',  () => closeBtn.setColor('#ccddff'));
      closeBtn.on('pointerup',   () => this.hide());
      this._container.add(closeBtn);
    }

    // Initialize pending settings with current values
    this._pendingSettings = { ...settings };
  }

  _addSlider({ label, gainFn, default: defaultVal, y, label2, isWpm, isFarn, isPause, isSendWpm, isBtnDisplay }, panelW, isMorse) {
    const s       = this.scene;
    const trackX  = 20;
    const trackW  = panelW - 40;
    const trackH  = 12;  // Larger for touch (was 6)
    const knobR   = 16;  // Larger knob for touch (was 9)
    const color   = isMorse ? 0x44aa88 : 0x2255aa;
    const fillCol = isMorse ? 0x44aa88 : 0x2255aa;

    const lbl = s.add.text(trackX, y - 24, label, {
      fontSize: '14px', color: '#aabbcc', fontFamily: 'monospace',
    });
    this._container.add(lbl);

    const readout = s.add.text(panelW - trackX, y - 24, label2 ?? `${Math.round(defaultVal * 100)}%`, {
      fontSize: '14px', color: '#00ff88', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this._container.add(readout);

    if (isWpm)      this._wpmReadout      = readout;
    if (isFarn)     this._farnReadout     = readout;
    if (isPause)    this._pauseReadout    = readout;
    if (isSendWpm)  this._sendWpmReadout  = readout;
    if (isBtnDisplay) this._btnDisplayReadout = readout;

    const track = s.add.rectangle(
      trackX + trackW / 2, y + trackH / 2, trackW, trackH, 0x223344
    ).setStrokeStyle(1, 0x334466);
    this._container.add(track);

    const fill = s.add.rectangle(
      trackX, y + trackH / 2, trackW * defaultVal, trackH, fillCol
    ).setOrigin(0, 0.5);
    this._container.add(fill);

    const knobX = trackX + trackW * defaultVal;
    const knob  = s.add.circle(knobX, y + trackH / 2, knobR, color)
      .setInteractive({ draggable: true, useHandCursor: true });
    this._container.add(knob);

    // Larger invisible touch area for better mobile interaction
    const touchArea = s.add.rectangle(
      trackX + trackW / 2, y + trackH / 2, trackW, 44, 0x000000, 0
    ).setInteractive({ useHandCursor: true });
    this._container.add(touchArea);

    touchArea.on('pointerdown', (ptr) => {
      const t = Phaser.Math.Clamp((ptr.x - this._container.x - trackX) / trackW, 0, 1);
      this._applySlider(t, knob, fill, readout, gainFn, trackX, trackW, trackH);
    });

    s.input.setDraggable(knob);
    knob.on('drag', (ptr, dragX) => {
      // Use pointer position for more accurate touch tracking
      const worldX = ptr.x - this._container.x;
      const t = Phaser.Math.Clamp((worldX - trackX) / trackW, 0, 1);
      this._applySlider(t, knob, fill, readout, gainFn, trackX, trackW, trackH);
    });
  }

  _applySlider(t, knob, fill, readout, gainFn, trackX, trackW) {
    knob.x     = trackX + trackW * t;
    fill.width = trackW * t;
    gainFn(t);
  }

  _saveSettings() {
    // Save pending settings to localStorage
    SettingsSystem.save(this._pendingSettings);
    // Also update scene settings if available
    if (this.scene.settings) {
      Object.assign(this.scene.settings, this._pendingSettings);
    }
  }

  // ─── Toggle ──────────────────────────────────────────────────────────────────

  _setupToggle() {
    // Only bind S key in game mode, not menu mode
    if (!this._isMenuMode) {
      this.scene.input.keyboard.on('keydown-S', () => {
        this._visible ? this.hide() : this.show();
      });
    }
  }

  show() { 
    this._visible = true;  
    this._container.setVisible(true);
    // Refresh pending settings when showing
    const saved = SettingsSystem.load();
    this._pendingSettings = { ...saved };
  }
  
  hide() { 
    this._visible = false; 
    this._container.setVisible(false);
    // Save settings when hiding
    this._saveSettings();
  }
}
