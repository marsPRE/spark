/**
 * HUD — status info + action buttons.
 * Top bar: info + action buttons (MENU, CHART, REF, PAUSE, 2X).
 * Bottom: status strip only.
 */
export class HUD {
  constructor(scene) {
    this.scene = scene;
    this._build();
  }

  _build() {
    const w  = this.scene.scale.width;
    const h  = this.scene.scale.height;
    const sc = this.scene;

    // ── Top bar ───────────────────────────────────────────────────────────────
    sc.add.rectangle(w / 2, 22, w, 44, 0x080818, 0.85)
      .setStrokeStyle(1, 0x223355).setDepth(30);

    this._titleText = sc.add.text(16, 6, 'SPARKS', {
      fontSize: '20px', color: '#f0c040', fontFamily: 'monospace',
    }).setDepth(31);

    this._timeText = sc.add.text(130, 6, 'DAY 1  08:00', {
      fontSize: '20px', color: '#aaccff', fontFamily: 'monospace',
    }).setDepth(31);

    this._watchText = sc.add.text(320, 10, 'Forenoon Watch', {
      fontSize: '14px', color: '#445566', fontFamily: 'monospace',
    }).setDepth(31);

    this._weatherText = sc.add.text(480, 10, 'Clear', {
      fontSize: '14px', color: '#55aa55', fontFamily: 'monospace',
    }).setDepth(31);

    this._repText = sc.add.text(560, 10, 'Rep: 50', {
      fontSize: '14px', color: '#99aa77', fontFamily: 'monospace',
    }).setDepth(31);

    // Signal alert (centre-left of top bar, moved to make room for bigger buttons)
    this._signalAlert = sc.add.text(w / 2 - 200, 6, '', {
      fontSize: '16px', color: '#ff5555', fontFamily: 'monospace',
      backgroundColor: '#330000', padding: { x: 12, y: 4 },
    }).setOrigin(0.5, 0).setVisible(false).setDepth(32);

    // ── Action buttons — top bar right side ───────────────────────────────────
    const btnBase = {
      fontSize: '18px', fontFamily: 'monospace',
      padding: { x: 12, y: 6 },
    };

    // 4 buttons spread evenly from x=750 with 120px spacing (no CHART button anymore)
    const BX_START = 750;
    const BX_GAP   = 120;
    const bx = (i) => BX_START + i * BX_GAP;
    const BY = 2;  // Top bar position (slightly higher for bigger buttons)

    // 1: MENU
    const settingsBtn = sc.add.text(bx(0), BY, '⚙ MENU', {
      ...btnBase, color: '#ffdd88', backgroundColor: '#261500',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    settingsBtn.on('pointerover', () => settingsBtn.setColor('#ffffff'));
    settingsBtn.on('pointerout',  () => settingsBtn.setColor('#ffdd88'));
    settingsBtn.on('pointerup', () => {
      if (!sc.settingsPanel) return;
      sc.settingsPanel._visible ? sc.settingsPanel.hide() : sc.settingsPanel.show();
    });

    // 2: MORSE REF
    const morseRefBtn = sc.add.text(bx(1), BY, '·— REF', {
      ...btnBase, color: '#aabbcc', backgroundColor: '#0c1420',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    morseRefBtn.on('pointerover', () => morseRefBtn.setColor('#ffffff'));
    morseRefBtn.on('pointerout',  () => morseRefBtn.setColor('#aabbcc'));
    morseRefBtn.on('pointerup', () => {
      if (!sc.morseReference) return;
      sc.morseReference._visible ? sc.morseReference.hide() : sc.morseReference.show();
    });

    // 3: PAUSE
    const pauseBtn = sc.add.text(bx(2), BY, '❚❚ PAUSE', {
      ...btnBase, color: '#99aabb', backgroundColor: '#0a1020',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    pauseBtn.on('pointerup', () => {
      sc.scene.pause();
      sc.scene.launch('PauseScene');
    });

    // 4: FAST FORWARD 4X
    this._ff = false;
    const ffBtn = sc.add.text(bx(3), BY, '▶▶ 4X', {
      ...btnBase, color: '#667788', backgroundColor: '#0a1020',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    ffBtn.on('pointerup', () => {
      this._ff = !this._ff;
      sc.timeSystem?.setFastForward(this._ff);
      ffBtn.setColor(this._ff ? '#ffff44' : '#667788');
    });

    this._ffBtn = ffBtn;

    // ── Bottom status strip ───────────────────────────────────────────────────
    sc.add.rectangle(w / 2, h - 16, w, 32, 0x080818)
      .setStrokeStyle(1, 0x223355).setDepth(30);

    this._statusText = sc.add.text(18, h - 27, 'Ready', {
      fontSize: '14px', color: '#445566', fontFamily: 'monospace',
    }).setDepth(31);
  }

  update(delta) {
    const ts = this.scene.timeSystem;
    const ss = this.scene.scoringSystem;
    const ws = this.scene.weatherSystem;

    if (ts) {
      this._timeText.setText(`DAY ${ts.day}  ${ts.getFormattedTime()}`);
      this._watchText.setText(ts.getCurrentWatch().name);
    }
    if (ws) this._weatherText.setText(ws.current.condition.toUpperCase());
    if (ss) this._repText.setText(`Rep: ${ss.getReputation()}  ${ss.getReputationLabel()}`);
  }

  resetFastForward() {
    if (!this._ff) return;
    this._ff = false;
    this.scene.timeSystem?.setFastForward(false);
    this._ffBtn?.setColor('#667788');
  }

  showIncomingSignal(msg) {
    const label = msg.type === 'DISTRESS'
      ? '⚠ DISTRESS SIGNAL INCOMING ⚠'
      : `SIGNAL: ${msg.type}`;
    this._signalAlert.setText(label).setVisible(true);
    this._statusText.setText(`Receiving from ${msg.sender?.callsign ?? '???'}`);
  }

  clearIncomingSignal() {
    this._signalAlert.setVisible(false);
    this._statusText.setText('Ready');
  }
}
