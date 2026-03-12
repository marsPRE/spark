/**
 * NarrativeDialog — full modal for captain/officer dialogs.
 * Pauses game time while visible; queues multiple dialogs.
 */
const DLG_W = 720;
const DLG_H = 240;
const DEPTH  = 150;

export class NarrativeDialog {
  constructor(scene) {
    this.scene   = scene;
    this._queue  = [];
    this._active = false;
    this._build();
  }

  /** Queue a dialog. Will display immediately if none is active. */
  show(speaker, lines) {
    this._queue.push({ speaker, lines });
    if (!this._active) this._next();
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _next() {
    if (this._queue.length === 0) {
      this._hide();
      return;
    }
    const { speaker, lines } = this._queue.shift();
    this._speakerText.setText(`— ${speaker.toUpperCase()} —`);
    this._bodyText.setText(lines.join('\n\n'));
    this._show();
  }

  _show() {
    this._active = true;
    this.scene.timeSystem.paused = true;
    this._container.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this._container,
      alpha: 1,
      duration: 250,
    });
  }

  _hide() {
    this._active = false;
    this.scene.timeSystem.paused = false;
    this.scene.tweens.add({
      targets: this._container,
      alpha: 0,
      duration: 200,
      onComplete: () => this._container.setVisible(false),
    });
  }

  _build() {
    const s  = this.scene;
    const cx = s.scale.width  / 2;
    const cy = s.scale.height / 2 + 20;   // slightly below center (avoids HUD)

    this._container = s.add.container(cx, cy).setDepth(DEPTH).setVisible(false);

    // Backdrop
    const bg = s.add.rectangle(0, 0, DLG_W, DLG_H, 0x06090f, 0.97)
      .setStrokeStyle(2, 0xc8a050);
    this._container.add(bg);

    // Top accent line
    const accent = s.add.rectangle(0, -DLG_H / 2 + 3, DLG_W - 4, 3, 0xc8a050);
    this._container.add(accent);

    // Speaker label
    this._speakerText = s.add.text(0, -DLG_H / 2 + 22, '', {
      fontSize: '14px', color: '#c8a050', fontFamily: 'monospace',
      letterSpacing: 3,
    }).setOrigin(0.5, 0);
    this._container.add(this._speakerText);

    // Divider
    const div = s.add.rectangle(0, -DLG_H / 2 + 46, DLG_W - 60, 1, 0x5a4a2a);
    this._container.add(div);

    // Body text
    this._bodyText = s.add.text(0, -10, '', {
      fontSize: '20px', color: '#e8dcc0', fontFamily: 'monospace',
      wordWrap: { width: DLG_W - 80 }, align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0.5);
    this._container.add(this._bodyText);

    // Acknowledge button
    const ackBtn = s.add.text(0, DLG_H / 2 - 28, '  ACKNOWLEDGE  ', {
      fontSize: '15px', color: '#44ff88', fontFamily: 'monospace',
      backgroundColor: '#081a10', padding: { x: 18, y: 8 },
    }).setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    ackBtn.on('pointerover', () => ackBtn.setStyle({ color: '#ffffff', backgroundColor: '#0f3020' }));
    ackBtn.on('pointerout',  () => ackBtn.setStyle({ color: '#44ff88', backgroundColor: '#081a10' }));
    ackBtn.on('pointerup',   () => this._next());
    this._container.add(ackBtn);

    // Keyboard shortcut: ENTER or SPACE acknowledges
    this._keyHandler = (e) => {
      if (!this._active) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._next();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  destroy() {
    window.removeEventListener('keydown', this._keyHandler);
    this._container.destroy();
  }
}
