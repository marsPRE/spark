/**
 * HUD — status info + action buttons.
 * Top bar: informational only (no interactive elements).
 * Bottom-right: MENU, PAUSE, MORSE REF, SEA CHART buttons.
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
    sc.add.rectangle(w / 2, 22, w, 44, 0x080818)
      .setStrokeStyle(1, 0x223355).setDepth(30);

    this._titleText = sc.add.text(16, 6, 'SPARKS', {
      fontSize: '20px', color: '#f0c040', fontFamily: 'monospace',
    }).setDepth(31);

    this._timeText = sc.add.text(130, 6, 'DAY 1  08:00', {
      fontSize: '20px', color: '#aaccff', fontFamily: 'monospace',
    }).setDepth(31);

    this._watchText = sc.add.text(380, 10, 'Forenoon Watch', {
      fontSize: '14px', color: '#445566', fontFamily: 'monospace',
    }).setDepth(31);

    this._weatherText = sc.add.text(580, 10, 'Clear', {
      fontSize: '14px', color: '#55aa55', fontFamily: 'monospace',
    }).setDepth(31);

    this._repText = sc.add.text(680, 10, 'Rep: 50', {
      fontSize: '14px', color: '#99aa77', fontFamily: 'monospace',
    }).setDepth(31);

    // Signal alert (centre of top bar)
    this._signalAlert = sc.add.text(w / 2, 6, '', {
      fontSize: '16px', color: '#ff5555', fontFamily: 'monospace',
      backgroundColor: '#330000', padding: { x: 12, y: 4 },
    }).setOrigin(0.5, 0).setVisible(false).setDepth(32);

    // ── Bottom status strip ───────────────────────────────────────────────────
    sc.add.rectangle(w / 2, h - 16, w, 32, 0x080818)
      .setStrokeStyle(1, 0x223355).setDepth(30);

    this._statusText = sc.add.text(18, h - 27, 'Ready', {
      fontSize: '14px', color: '#445566', fontFamily: 'monospace',
    }).setDepth(31);

    // ── Action buttons — single row of 4, right panel ────────────────────────
    const BY = 578;   // single row, bottom edge at ~620 (safe zone)
    const btnBase = {
      fontSize: '15px', fontFamily: 'monospace',
      padding: { x: 14, y: 10 },
    };

    // 1: MENU
    const settingsBtn = sc.add.text(660, BY, '⚙ MENU', {
      ...btnBase, color: '#ffdd88', backgroundColor: '#261500',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    settingsBtn.on('pointerover', () => settingsBtn.setColor('#ffffff'));
    settingsBtn.on('pointerout',  () => settingsBtn.setColor('#ffdd88'));
    settingsBtn.on('pointerup', () => {
      if (!sc.settingsPanel) return;
      sc.settingsPanel._visible ? sc.settingsPanel.hide() : sc.settingsPanel.show();
    });

    // 2: SEA CHART
    const chartBtn = sc.add.text(810, BY, '⬡ CHART', {
      ...btnBase, color: '#88ccff', backgroundColor: '#001828',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    chartBtn.on('pointerover', () => chartBtn.setColor('#ffffff'));
    chartBtn.on('pointerout',  () => {
      if (!sc.seaChart?._visible) chartBtn.setColor('#88ccff');
    });
    chartBtn.on('pointerup', () => {
      const isVisible = sc.seaChart?.toggle();
      chartBtn.setColor(isVisible ? '#ffff88' : '#88ccff');
    });

    // 3: MORSE REF
    const morseRefBtn = sc.add.text(960, BY, '· — REF', {
      ...btnBase, color: '#aabbcc', backgroundColor: '#0c1420',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    morseRefBtn.on('pointerover', () => morseRefBtn.setColor('#ffffff'));
    morseRefBtn.on('pointerout',  () => morseRefBtn.setColor('#aabbcc'));
    morseRefBtn.on('pointerup', () => {
      if (!sc.morseReference) return;
      sc.morseReference._visible ? sc.morseReference.hide() : sc.morseReference.show();
    });

    // 4: PAUSE
    const pauseBtn = sc.add.text(1110, BY, '❚❚ PAUSE', {
      ...btnBase, color: '#99aabb', backgroundColor: '#0a1020',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    pauseBtn.on('pointerup', () => {
      sc.scene.pause();
      sc.scene.launch('PauseScene');
    });

    this._chartBtn = chartBtn;
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
