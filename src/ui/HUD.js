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

    // ── Top bar (informational only) ─────────────────────────────────────────
    sc.add.rectangle(w / 2, 18, w, 36, 0x0a0a1e)
      .setStrokeStyle(1, 0x223355).setDepth(30);

    this._titleText = sc.add.text(16, 8, '⚡ SPARKS', {
      fontSize: '15px', color: '#f0c040', fontFamily: 'monospace',
    }).setDepth(31);

    this._timeText = sc.add.text(180, 8, 'DAY 1  08:00', {
      fontSize: '13px', color: '#88aacc', fontFamily: 'monospace',
    }).setDepth(31);

    this._watchText = sc.add.text(340, 8, 'Forenoon Watch', {
      fontSize: '13px', color: '#556688', fontFamily: 'monospace',
    }).setDepth(31);

    this._weatherText = sc.add.text(510, 8, 'Clear', {
      fontSize: '13px', color: '#66aa66', fontFamily: 'monospace',
    }).setDepth(31);

    this._repText = sc.add.text(610, 8, 'Rep: 50', {
      fontSize: '12px', color: '#aabb88', fontFamily: 'monospace',
    }).setDepth(31);

    // Signal alert (hidden by default, centre of top bar)
    this._signalAlert = sc.add.text(w / 2, 8, '', {
      fontSize: '13px', color: '#ff4444', fontFamily: 'monospace',
      backgroundColor: '#330000', padding: { x: 8, y: 2 },
    }).setOrigin(0.5, 0).setVisible(false).setDepth(32);

    // ── Bottom status strip ───────────────────────────────────────────────────
    sc.add.rectangle(w / 2, h - 14, w, 28, 0x0a0a1e)
      .setStrokeStyle(1, 0x223355).setDepth(30);

    this._statusText = sc.add.text(16, h - 22, 'Ready', {
      fontSize: '12px', color: '#556688', fontFamily: 'monospace',
    }).setDepth(31);

    // ── Action buttons — bottom-right block, always visible ───────────────────
    // Positioned well inside the canvas, away from browser chrome
    const BX = 660;   // left edge of button block
    const BY = h - 70; // just above the bottom bar
    const btnStyle = {
      fontSize: '14px', fontFamily: 'monospace',
      padding: { x: 14, y: 8 },
    };

    const settingsBtn = sc.add.text(BX, BY, '⚙ MENU', {
      ...btnStyle, color: '#ffdd88', backgroundColor: '#2a1a00',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    settingsBtn.on('pointerover', () => settingsBtn.setColor('#ffffff'));
    settingsBtn.on('pointerout',  () => settingsBtn.setColor('#ffdd88'));
    settingsBtn.on('pointerup', () => {
      if (!sc.settingsPanel) return;
      sc.settingsPanel._visible ? sc.settingsPanel.hide() : sc.settingsPanel.show();
    });

    const pauseBtn = sc.add.text(BX + 130, BY, '❚❚ PAUSE', {
      ...btnStyle, color: '#aabbdd', backgroundColor: '#0a1020',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    pauseBtn.on('pointerup', () => {
      sc.scene.pause();
      sc.scene.launch('PauseScene');
    });

    const morseRefBtn = sc.add.text(BX + 280, BY, 'MORSE REF', {
      ...btnStyle, color: '#aabbcc', backgroundColor: '#0e1520',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    morseRefBtn.on('pointerover', () => morseRefBtn.setColor('#ffffff'));
    morseRefBtn.on('pointerout',  () => morseRefBtn.setColor('#aabbcc'));
    morseRefBtn.on('pointerup', () => {
      if (!sc.morseReference) return;
      sc.morseReference._visible ? sc.morseReference.hide() : sc.morseReference.show();
    });

    const chartBtn = sc.add.text(BX + 440, BY, 'SEA CHART', {
      ...btnStyle, color: '#aabbcc', backgroundColor: '#0e1520',
    }).setInteractive({ useHandCursor: true }).setDepth(32);
    chartBtn.on('pointerover', () => chartBtn.setColor('#ffffff'));
    chartBtn.on('pointerout',  () => chartBtn.setColor('#aabbcc'));
    chartBtn.on('pointerup', () => {
      sc.notifications?.show('Sea chart coming soon', 'info');
    });
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
