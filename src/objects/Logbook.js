/**
 * Logbook — right panel.
 *
 * Mode flow:
 *   idle → decoding → result → transmitting → tx_result → idle
 *
 * decoding   : player types what they heard (keyboard)
 * result     : shows correct text + annotations + accuracy
 * transmitting: player keys the suggested response in Morse (SPACE)
 * tx_result  : shows transmission quality score
 */

const X   = 860;
const Y   = 354;
const W   = 400;
const H   = 338;
const PAD = 14;

// Y positions relative to the decode-area top
const R = {
  label:      0,
  text:      16,
  abbr:      36,
  decLabel:  80,
  typed:     96,
  result:   145,
  hint:     165,
};

export class Logbook {
  constructor(scene) {
    this.scene       = scene;
    this.entries     = [];
    this._mode       = 'idle';
    this._typedText  = '';
    this._cursorPos  = 0;       // insertion point within _typedText
    this._activeMsg  = null;
    this._keyHandler = null;
    this._enterHandler = null;
    this._cursorVisible = true;

    this._build();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  addEntry(timestamp, callsign, text, type = 'ROUTINE') {
    const prefix = type === 'DISTRESS' ? '[SOS]' : type === 'URGENCY' ? '[URG]' : '[ · ]';
    this.entries.unshift({ timestamp, callsign, text, prefix });
    if (this.entries.length > 30) this.entries.pop();
    this._refreshLog();
  }

  startDecodeInput(message) {
    this._activeMsg = message;
    this._typedText = '';
    this._mode      = 'decoding';
    this._refreshAll();
    this._startKeyCapture();
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  _build() {
    const s = this.scene;

    s.add.rectangle(X + W / 2, Y + H / 2, W, H, 0x0e0c08)
      .setStrokeStyle(1, 0x5a4a2a);

    s.add.rectangle(X + W / 2, Y + 18, W, 36, 0x1a1508)
      .setStrokeStyle(1, 0x5a4a2a);
    s.add.text(X + PAD, Y + 9, 'LOGBOOK', {
      fontSize: '14px', color: '#a09060', fontFamily: 'monospace',
    });

    // Log entries (upper portion)
    const logAreaY = Y + 44;
    const logAreaH = Math.floor(H * 0.48);
    this._logLines = [];
    const lineH    = 20;
    const maxLines = Math.floor(logAreaH / lineH);
    for (let i = 0; i < maxLines; i++) {
      this._logLines.push(
        s.add.text(X + PAD, logAreaY + i * lineH, '', {
          fontSize: '11px', color: '#c8b070', fontFamily: 'monospace',
          wordWrap: { width: W - PAD * 2 },
        })
      );
    }

    // Divider
    const divY = Y + 44 + logAreaH + 4;
    s.add.line(X + PAD, divY, W - PAD * 2, 0, 0x5a4a2a, 0.6).setLineWidth(1);

    const A = divY + 8; // decode-area top

    // ── Shared elements (decode + transmit) ───────────────────────────────────
    this._modeLabel = s.add.text(X + PAD, A + R.label, '', {
      fontSize: '11px', color: '#556688', fontFamily: 'monospace',
    }).setVisible(false);

    this._targetText = s.add.text(X + PAD, A + R.text, '', {
      fontSize: '12px', color: '#88aacc', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setVisible(false);

    this._abbrText = s.add.text(X + PAD, A + R.abbr, '', {
      fontSize: '11px', color: '#7a9a7a', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setVisible(false);

    this._inputLabel = s.add.text(X + PAD, A + R.decLabel, '', {
      fontSize: '11px', color: '#556688', fontFamily: 'monospace',
    }).setVisible(false);

    this._inputDisplay = s.add.text(X + PAD, A + R.typed, '', {
      fontSize: '14px', color: '#00ff88', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setVisible(false);

    this._resultText = s.add.text(X + PAD, A + R.result, '', {
      fontSize: '13px', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setVisible(false);

    this._hintText = s.add.text(X + PAD, A + R.hint, '', {
      fontSize: '11px', color: '#556688', fontFamily: 'monospace',
    }).setVisible(false);

    // Cursor blink timer
    s.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        this._cursorVisible = !this._cursorVisible;
        if (this._mode === 'decoding' || this._mode === 'transmitting') {
          this._refreshInput();
        }
      },
    });

    // Wire MorseEngine → live keyed-text display during transmitting
    // (set up lazily in _startTransmit when morseEngine is ready)
  }

  // ─── DECODING mode ───────────────────────────────────────────────────────────

  _startKeyCapture() {
    this.scene.telegraphKey?._disableSpace?.();
    this._typedText = '';
    this._cursorPos = 0;

    this._keyHandler = (e) => {
      if (this._mode !== 'decoding') return;
      const t = this._typedText;
      const p = this._cursorPos;

      if (e.key === 'Enter') {
        this._submitDecode();
      } else if (e.key === 'ArrowLeft') {
        this._cursorPos = Math.max(0, p - 1);
        this._refreshInput();
      } else if (e.key === 'ArrowRight') {
        this._cursorPos = Math.min(t.length, p + 1);
        this._refreshInput();
      } else if (e.key === 'Home') {
        this._cursorPos = 0;
        this._refreshInput();
      } else if (e.key === 'End') {
        this._cursorPos = t.length;
        this._refreshInput();
      } else if (e.key === 'Backspace' && p > 0) {
        this._typedText = t.slice(0, p - 1) + t.slice(p);
        this._cursorPos = p - 1;
        this._refreshInput();
      } else if (e.key === 'Delete' && p < t.length) {
        this._typedText = t.slice(0, p) + t.slice(p + 1);
        this._refreshInput();
      } else if (e.key === ' ') {
        this._typedText = t.slice(0, p) + ' ' + t.slice(p);
        this._cursorPos = p + 1;
        this._refreshInput();
      } else if (e.key.length === 1 && /[A-Za-z0-9?.,/]/.test(e.key)) {
        this._typedText = t.slice(0, p) + e.key.toUpperCase() + t.slice(p);
        this._cursorPos = p + 1;
        this._refreshInput();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _stopKeyCapture() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this.scene.telegraphKey?._enableSpace?.();
  }

  _submitDecode() {
    this._stopKeyCapture();

    const result   = this.scene.messageSystem?.submitDecoding(
      this._activeMsg.id, this._typedText
    );
    const accuracy = result?.accuracy ?? 0;
    const correct  = result?.correct  ?? this._activeMsg.content.plain_text;
    const col      = accuracy >= 80 ? '#44ff88' : accuracy >= 50 ? '#ffcc44' : '#ff4444';

    this._mode = 'result';

    this._modeLabel.setText(
      `INCOMING  [${this._activeMsg.type}]  ${this._activeMsg.sender.callsign}`
    );
    this._targetText.setText(correct);
    this._abbrText.setText(this._annotateText(correct, this._activeMsg));
    this._inputLabel.setText('YOUR DECODE:');
    this._inputDisplay.setText(this._typedText).setColor('#aabbcc');
    this._resultText.setText(`Accuracy: ${accuracy}%`).setColor(col);

    const nextAction = this._activeMsg.response_required ? 'transmitting…' : '';
    this._hintText.setText(nextAction);

    this._refreshAll();

    if (accuracy >= 60) this.scene.scoringSystem?.recordDecoded();
    else                this.scene.scoringSystem?.recordMissed();

    this.addEntry(
      this.scene.timeSystem?.getFormattedTime() ?? '--:--',
      this._activeMsg.sender.callsign,
      correct,
      this._activeMsg.type
    );

    // Auto-advance: show result briefly then proceed
    setTimeout(() => {
      if (this._activeMsg?.response_required) {
        this._startTransmit();
      } else {
        this._reset();
      }
    }, 2000);
  }

  // ─── TRANSMITTING mode ───────────────────────────────────────────────────────

  _startTransmit() {
    const suggested = this._activeMsg.correct_responses?.[0] ?? '';
    this._txTarget  = suggested;
    this._txKeyed   = '';
    this._mode      = 'transmitting';

    // Show what to send
    this._modeLabel.setText('SEND THIS IN MORSE:');
    this._targetText.setText(suggested).setColor('#f0c040');
    this._abbrText.setText(this._annotateText(suggested, this._activeMsg));
    this._inputLabel.setText('YOU ARE SENDING:  (ENTER when done)');
    this._inputDisplay.setText('').setColor('#00ff88');
    this._resultText.setText('').setVisible(false);
    this._hintText.setText('[ SPACE = key  ·  ENTER = send ]');

    this._refreshAll();

    // Start recording player timings
    const tk = this.scene.telegraphKey;
    tk?.startRecording?.();

    // Hook MorseEngine to display keyed text live
    const morse = this.scene.morseEngine;
    if (morse) {
      morse.onCharDecoded = () => {
        this._txKeyed = morse.inputState.decodedText;
        this._refreshInput();
      };
      morse.onWordDecoded = () => {
        this._txKeyed = morse.inputState.decodedText;
        this._refreshInput();
      };
    }

    // ENTER = submit transmission
    this._enterHandler = (e) => {
      if (e.key === 'Enter' && this._mode === 'transmitting') {
        this._submitTransmit();
      }
    };
    window.addEventListener('keydown', this._enterHandler);
  }

  _submitTransmit() {
    window.removeEventListener('keydown', this._enterHandler);
    this._enterHandler = null;

    // Flush any symbol still being keyed (timer may not have fired yet)
    const morse = this.scene.morseEngine;
    if (morse) {
      morse.flushInput();
      morse.onCharDecoded = null;
      morse.onWordDecoded = null;
    }

    const tk            = this.scene.telegraphKey;
    const playerTimings = tk?.stopRecording?.() ?? [];
    const morseEngine   = this.scene.morseEngine;

    const txScore  = morseEngine
      ? morseEngine.scoreTransmission(playerTimings, this._txTarget)
      : 0;
    const col      = txScore >= 80 ? '#44ff88' : txScore >= 50 ? '#ffcc44' : '#ff4444';

    this._mode = 'tx_result';

    this._modeLabel.setText('TRANSMISSION SENT');
    this._targetText.setText(this._txTarget).setColor('#88aacc');
    this._abbrText.setText('');
    this._inputLabel.setText('YOU SENT:');
    this._inputDisplay.setText(morse?.inputState?.decodedText || this._txKeyed || '—')
      .setColor('#aabbcc');
    this._resultText.setText(`Timing quality: ${txScore}%`).setColor(col).setVisible(true);
    this._hintText.setText('');

    this._refreshAll();

    this.scene.scoringSystem?.recordTransmissionSent?.(txScore);
    this.scene.messageSystem?.submitResponse?.(
      this._activeMsg.id, this._txKeyed, playerTimings
    );

    setTimeout(() => this._reset(), 2000);
  }

  // ─── Reset ───────────────────────────────────────────────────────────────────

  _reset() {
    this._mode      = 'idle';
    this._activeMsg = null;
    this._typedText = '';
    this._txKeyed   = '';
    this._refreshAll();
  }

  // ─── Refresh helpers ─────────────────────────────────────────────────────────

  _refreshAll() {
    const active = this._mode !== 'idle';
    const isResult = this._mode === 'result' || this._mode === 'tx_result';

    this._modeLabel.setVisible(active);
    this._targetText.setVisible(active);
    this._abbrText.setVisible(active);
    this._inputLabel.setVisible(active);
    this._inputDisplay.setVisible(active);
    this._resultText.setVisible(isResult);
    this._hintText.setVisible(active);

    if (this._mode === 'decoding') {
      this._targetText.setColor('#88aacc');
      this._targetText.setText('');
      this._abbrText.setText('');
      this._inputLabel.setText('YOUR DECODE:  (type + ENTER)');
      this._modeLabel.setText(
        `INCOMING  [${this._activeMsg?.type ?? ''}]  ${this._activeMsg?.sender?.callsign ?? ''}`
      );
      this._refreshInput();
    }
  }

  _refreshInput() {
    if (this._mode === 'decoding') {
      const cursor = this._cursorVisible ? '█' : ' ';
      const t = this._typedText;
      const p = this._cursorPos;
      this._inputDisplay.setText(t.slice(0, p) + cursor + t.slice(p));
    } else if (this._mode === 'transmitting') {
      const morse  = this.scene.morseEngine;
      const done   = morse?.inputState?.decodedText ?? this._txKeyed;
      const syms   = morse?.inputState?.currentSymbols ?? '';
      const cursor = this._cursorVisible ? '█' : ' ';
      this._inputDisplay.setText(done + (syms ? `[${syms}]` : cursor));

      // Live WPM estimate from adaptive dit duration
      if (morse?._ditEstimate > 0) {
        const wpm = Math.round(1200 / morse._ditEstimate);
        this._hintText.setText(`[ SPACE = key  ·  ENTER = send ]  ~${wpm} WPM`);
      }
    }
  }

  _refreshLog() {
    const visible = this.entries.slice(0, this._logLines.length);
    this._logLines.forEach((line, i) => {
      const e = visible[i];
      line.setText(e ? `${e.prefix} ${e.timestamp} ${e.callsign}` : '');
    });
  }

  // ─── Inline annotation ───────────────────────────────────────────────────────

  _annotateText(text, msg) {
    const qCache    = this.scene.cache?.json?.get('q_codes')      ?? {};
    const shipCache = this.scene.cache?.json?.get('ship_database') ?? [];

    const callsigns = {};
    for (const ship of shipCache) callsigns[ship.callsign] = ship.name;
    if (msg?.sender?.callsign)   callsigns[msg.sender.callsign]   = msg.sender.shipName;
    if (msg?.receiver?.callsign) callsigns[msg.receiver.callsign] = msg.receiver.shipName;

    const ABBR = {
      DE: 'from', K: 'over', KN: 'over (specific)', AR: 'end of message',
      SK: 'end of contact', BT: 'break', SOS: 'DISTRESS', CQ: 'all stations',
      CQD: 'DISTRESS (old)', R: 'received', QSL: 'acknowledged',
      TNX: 'thanks', TKS: 'thanks', UR: 'your', HR: 'here', ES: 'and',
      NR: 'number', PSE: 'please', RPT: 'repeat', WX: 'weather',
      QTH: 'position', QRM: 'interference', QRN: 'static',
      QRT: 'stop tx', QRV: 'ready', QRZ: 'who calls?',
      QSO: 'in contact', QSY: 'change freq', QTR: 'time',
      ...Object.fromEntries(
        Object.entries(qCache).map(([k, v]) => [k, v.answer ?? ''])
      ),
    };

    return text.toUpperCase().split(/\s+/).map(token => {
      const c = token.replace(/[^A-Z0-9]/g, '');
      if (callsigns[c]) return `${token} (${callsigns[c]})`;
      if (ABBR[c])      return `${token} (${ABBR[c]})`;
      return token;
    }).join('  ');
  }
}
