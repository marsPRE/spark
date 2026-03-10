/**
 * NotificationSystem — toast notifications (info / warning / urgent / success).
 */
const STYLES = {
  info:    { color: '#88bbff', bg: 0x112244 },
  warning: { color: '#ffcc44', bg: 0x332200 },
  urgent:  { color: '#ff4444', bg: 0x330000 },
  success: { color: '#44ff88', bg: 0x003322 },
};

const MAX_VISIBLE  = 3;
const DEFAULT_TTL  = 5000; // ms

export class NotificationSystem {
  constructor(scene) {
    this.scene  = scene;
    this._queue = [];
    this._items = [];
  }

  show(message, type = 'info', ttl = DEFAULT_TTL) {
    if (type === 'urgent') ttl = 10000;
    this._queue.push({ message, type, ttl });
    this._processQueue();
  }

  _processQueue() {
    while (this._items.length < MAX_VISIBLE && this._queue.length > 0) {
      const n = this._queue.shift();
      this._spawn(n);
    }
  }

  _spawn({ message, type, ttl }) {
    const s      = this.scene;
    const style  = STYLES[type] || STYLES.info;
    const ySlot  = s.scale.height - 50 - this._items.length * 40;

    const text = s.add.text(s.scale.width - 20, ySlot, message, {
      fontSize: '13px',
      color: style.color,
      fontFamily: 'monospace',
      backgroundColor: '#' + style.bg.toString(16).padStart(6, '0'),
      padding: { x: 10, y: 5 },
    })
      .setOrigin(1, 0.5)
      .setDepth(200)
      .setAlpha(0);

    // Fade in
    s.tweens.add({
      targets: text,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        // Auto-dismiss
        s.time.delayedCall(ttl, () => this._dismiss(text));
      },
    });

    const item = { text };
    this._items.push(item);

    text.setInteractive().on('pointerdown', () => this._dismiss(text));
  }

  _dismiss(text) {
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        text.destroy();
        this._items = this._items.filter(i => i.text !== text);
        this._restack();
        this._processQueue();
      },
    });
  }

  _restack() {
    const h = this.scene.scale.height;
    this._items.forEach((item, i) => {
      const targetY = h - 50 - i * 40;
      this.scene.tweens.add({ targets: item.text, y: targetY, duration: 150 });
    });
  }
}
