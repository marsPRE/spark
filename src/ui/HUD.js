/**
 * HUD — top status bar and bottom status strip.
 */
export class HUD {
  constructor(scene) {
    this.scene = scene;
    this._build();
  }

  _build() {
    const s = scene => this.scene;
    const w = this.scene.scale.width;
    const sc = this.scene;

    // Top bar background
    sc.add.rectangle(w / 2, 18, w, 36, 0x0a0a1e).setStrokeStyle(1, 0x223355);

    this._titleText = sc.add.text(16, 10, '⚡ SPARKS', {
      fontSize: '16px', color: '#f0c040', fontFamily: 'monospace',
    });

    this._timeText = sc.add.text(200, 10, 'DAY 1  08:00', {
      fontSize: '14px', color: '#88aacc', fontFamily: 'monospace',
    });

    this._watchText = sc.add.text(380, 10, 'Forenoon Watch', {
      fontSize: '14px', color: '#556688', fontFamily: 'monospace',
    });

    this._weatherText = sc.add.text(580, 10, 'Clear', {
      fontSize: '14px', color: '#66aa66', fontFamily: 'monospace',
    });

    this._repText = sc.add.text(w - 180, 10, 'Rep: 50  Competent', {
      fontSize: '13px', color: '#aabb88', fontFamily: 'monospace',
    });

    // Signal alert (hidden by default)
    this._signalAlert = sc.add.text(w / 2, 10, '', {
      fontSize: '14px', color: '#ff4444', fontFamily: 'monospace',
      backgroundColor: '#330000', padding: { x: 8, y: 2 },
    }).setOrigin(0.5).setVisible(false);

    // Bottom bar
    sc.add.rectangle(w / 2, this.scene.scale.height - 14, w, 28, 0x0a0a1e)
      .setStrokeStyle(1, 0x223355);

    this._statusText = sc.add.text(16, this.scene.scale.height - 22, 'Ready', {
      fontSize: '12px', color: '#556688', fontFamily: 'monospace',
    });
  }

  update(delta) {
    const ts = this.scene.timeSystem;
    const ss = this.scene.scoringSystem;
    const ws = this.scene.weatherSystem;

    if (ts) {
      this._timeText.setText(
        `DAY ${ts.day}  ${ts.getFormattedTime()}`
      );
      this._watchText.setText(ts.getCurrentWatch().name);
    }

    if (ws) {
      this._weatherText.setText(ws.current.condition.toUpperCase());
    }

    if (ss) {
      this._repText.setText(
        `Rep: ${ss.getReputation()}  ${ss.getReputationLabel()}`
      );
    }
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
