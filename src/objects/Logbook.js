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

import { DEFAULT_SETTINGS } from '../systems/SettingsSystem.js';

const X   = 650;
const Y   = 44;
const W   = 420;
const H   = 370;
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

// ─── Morse confusable lookup ─────────────────────────────────────────────────
const MORSE_PAT = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',
  I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',
  Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',
  Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
};

/** Levenshtein distance between two strings */
function editDist(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i-1][j] + 1, d[i][j-1] + 1,
        d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
  return d[m][n];
}

/** Return 3 confusable characters for `char` based on Morse pattern similarity */
function getConfusables(char) {
  const pat = MORSE_PAT[char];
  if (!pat) return ['E', 'T', 'A'];
  const scored = Object.entries(MORSE_PAT)
    .filter(([c]) => c !== char)
    .map(([c, p]) => ({ c, d: editDist(pat, p) }))
    .sort((a, b) => a.d - b.d || Math.random() - 0.5);
  return scored.slice(0, 3).map(s => s.c);
}

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
    this._charTimers         = [];
    this._currentExpectedChar = null;
    this._currentCharIndex   = 0;

    this._build();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  addEntry(timestamp, callsign, text, type = 'ROUTINE', extra = {}) {
    const prefix = type === 'DISTRESS' ? '[SOS]' : type === 'URGENCY' ? '[URG]' : '[ · ]';
    this.entries.unshift({ 
      timestamp, 
      callsign, 
      text, 
      prefix,
      sender: extra.sender,
      receiver: extra.receiver,
      messageType: type,
      accuracy: extra.accuracy,
      playerDecode: extra.playerDecode
    });
    if (this.entries.length > 30) this.entries.pop();
    this._refreshLog();
  }

  startDecodeInput(message) {
    // If already decoding a different message, finish it first
    if (this._mode === 'decoding' && this._activeMsg?.id !== message.id) {
      this._finishCurrentDecode();
    }
    
    // If decoding the same message, ignore (duplicate call)
    if (this._mode === 'decoding' && this._activeMsg?.id === message.id) {
      return;
    }
    
    this._activeMsg = message;
    this._typedText = '';
    this._cursorPos = 0;
    this._mode      = 'decoding';
    this._hideTelegraphKey();  // hide telegraph key to show choice buttons
    this._refreshAll();
    this._startKeyCapture();

    // Schedule choice buttons for ALL repeats upfront
    const text    = message.content.plain_text;
    // Use same WPM as RadioSystem: override or message's own WPM
    const wpm     = this.scene.radioSystem?.wpmOverride || message.timing?.wpm;
    const repeats = message.timing?.repeats || 1;

    // Calculate exact one-play duration from actual timings (same as audio)
    const timings  = this.scene.morseEngine.encodeToTimings(text, wpm);
    const baseDur  = timings.reduce((s, t) => s + t.duration, 0);
    const pauseMs  = this.scene.settings?.repeatPauseMs ?? DEFAULT_SETTINGS.repeatPauseMs;
    const playDur  = baseDur + pauseMs;  // full cycle including pause

    this._scheduleAllRepeats(text, wpm, repeats, playDur);
  }

  _finishCurrentDecode() {
    // Clear any pending timers
    this._clearCharTimers();
    // Auto-submit current progress (even if incomplete)
    if (this._mode === 'decoding' && this._activeMsg) {
      this._stopKeyCapture();
      // Don't add to logbook - just clean up
      this._reset();
    }
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  _buildHiddenInput() {
    this._hiddenInput = document.createElement('input');
    Object.assign(this._hiddenInput, {
      type: 'text',
      autocomplete: 'off',
      autocorrect: 'off',
      autocapitalize: 'characters',
      spellcheck: false,
    });
    Object.assign(this._hiddenInput.style, {
      position: 'fixed', opacity: '0', pointerEvents: 'none',
      top: '0', left: '0', width: '1px', height: '1px',
    });
    document.body.appendChild(this._hiddenInput);

    this._hiddenInput.addEventListener('input', () => {
      if (this._mode !== 'decoding') return;
      this._typedText = this._hiddenInput.value.toUpperCase();
      this._cursorPos = this._typedText.length;
      this._refreshInput();
    });

    // Enter on mobile keyboard
    this._hiddenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this._mode === 'decoding') {
        e.preventDefault();
        this._submitDecode();
      }
    });
  }

  _build() {
    const s = this.scene;
    this._buildHiddenInput();

    s.add.rectangle(X + W / 2, Y + H / 2, W, H, 0x0e0c08)
      .setStrokeStyle(1, 0x5a4a2a);

    s.add.rectangle(X + W / 2, Y + 18, W, 36, 0x1a1508)
      .setStrokeStyle(1, 0x5a4a2a);
    s.add.text(X + PAD, Y + 8, 'LOGBOOK', {
      fontSize: '16px', color: '#a09060', fontFamily: 'monospace',
    });

    // Log entries (upper portion)
    const logAreaY = Y + 44;
    const logAreaH = Math.floor(H * 0.48);
    this._logLines = [];
    this._logClickAreas = [];  // Invisible click areas for each line
    const lineH    = 22;
    const maxLines = Math.floor(logAreaH / lineH);
    for (let i = 0; i < maxLines; i++) {
      const line = s.add.text(X + PAD, logAreaY + i * lineH, '', {
        fontSize: '13px', color: '#c8b070', fontFamily: 'monospace',
        wordWrap: { width: W - PAD * 2 },
      });
      this._logLines.push(line);
      
      // Invisible click area for the entire line width
      const clickArea = s.add.rectangle(
        X + W/2, logAreaY + i * lineH + 10, W - PAD*2, lineH, 0x000000, 0
      ).setInteractive({ useHandCursor: true });
      clickArea.on('pointerover', () => line.setColor('#f0d080'));
      clickArea.on('pointerout', () => line.setColor('#c8b070'));
      clickArea.on('pointerup', () => this._showLogEntryDetail(i));
      this._logClickAreas.push(clickArea);
    }
    
    // Create detail popup (hidden by default)
    this._createLogDetailPopup();

    // Divider
    const divY = Y + 44 + logAreaH + 4;
    s.add.line(X + PAD, divY, W - PAD * 2, 0, 0x5a4a2a, 0.6).setLineWidth(1);

    const A = divY + 8; // decode-area top

    // ── Shared elements (decode + transmit) — depth 15 to render above FreqDial
    this._modeLabel = s.add.text(X + PAD, A + R.label, '', {
      fontSize: '13px', color: '#556688', fontFamily: 'monospace',
    }).setDepth(15).setVisible(false);

    this._targetText = s.add.text(X + PAD, A + R.text, '', {
      fontSize: '14px', color: '#88aacc', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setDepth(15).setVisible(false);

    this._abbrText = s.add.text(X + PAD, A + R.abbr, '', {
      fontSize: '12px', color: '#7a9a7a', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setDepth(15).setVisible(false);

    this._inputLabel = s.add.text(X + PAD, A + R.decLabel, '', {
      fontSize: '13px', color: '#556688', fontFamily: 'monospace',
    }).setDepth(15).setVisible(false);

    this._inputDisplay = s.add.text(X + PAD, A + R.typed, '', {
      fontSize: '18px', color: '#00ff88', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setDepth(15).setVisible(false);

    this._resultText = s.add.text(X + PAD, A + R.result, '', {
      fontSize: '16px', fontFamily: 'monospace',
      wordWrap: { width: W - PAD * 2 },
    }).setDepth(15).setVisible(false);

    this._hintText = s.add.text(X + PAD, A + R.hint, '', {
      fontSize: '14px', color: '#556688', fontFamily: 'monospace',
    }).setDepth(15).setVisible(false);

    // Submit button (touch-friendly, replaces ENTER key)
    this._submitBtn = s.add.text(X + W - PAD, A + R.typed, 'SEND ▶', {
      fontSize: '13px', color: '#00ff88', fontFamily: 'monospace',
      backgroundColor: '#0a2a1a', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setDepth(15).setInteractive({ useHandCursor: true }).setVisible(false);
    this._submitBtn.on('pointerup', () => {
      if (this._mode === 'decoding')    this._submitDecode();
      else if (this._mode === 'transmitting') this._submitTransmit();
    });

    // ── Choice buttons (touch decode) ──────────────────────────────────────────
    // Positioned at the telegraph key location (right side of screen)
    // Telegraph key is hidden during decoding to make room for these buttons
    this._choiceBtns = [];
    const btnW = 172, btnH = 92, btnGap = 12;  // 10% larger + more gap
    // Center around the telegraph key position (1190, 280)
    const keyCx = 1190, keyCy = 280;

    // 4 choice buttons stacked vertically
    const btnPositions = [
      { x: keyCx, y: keyCy - 125 },  // top
      { x: keyCx, y: keyCy - 30 },   // upper-middle
      { x: keyCx, y: keyCy + 65 },   // lower-middle
      { x: keyCx, y: keyCy + 160 },  // bottom
    ];

    for (let i = 0; i < 4; i++) {
      const pos = btnPositions[i];
      const bg = s.add.rectangle(pos.x, pos.y, btnW, btnH, 0x1a2a40)
        .setStrokeStyle(2, 0x4488aa).setInteractive({ useHandCursor: true })
        .setDepth(10).setVisible(false);
      const label = s.add.text(pos.x, pos.y, '', {
        fontSize: '32px', color: '#ccddff', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(11).setVisible(false);
      bg.on('pointerup', () => {
        if (this._mode !== 'decoding') return;
        const ch = label.text;
        if (!ch) return;

        // Find the write position — map charIndex to string position (skipping spaces)
        const pos = this._charIndexToStringPos(this._currentCharIndex);
        if (pos < this._typedText.length) {
          // Overwrite existing character at this position
          this._typedText = this._typedText.slice(0, pos) + ch + this._typedText.slice(pos + 1);
        } else {
          this._typedText += ch;
        }
        // Keep cursor at current position (shows active char), or advance if at end
        const nextIdxPos = this._charIndexToStringPos(this._currentCharIndex + 1);
        this._cursorPos = Math.min(nextIdxPos, this._typedText.length);
        this._hiddenInput.value = this._typedText;
        this._refreshInput();
      });
      this._choiceBtns.push({ bg, label });
    }

    // No SPACE button - spaces are inserted automatically
    this._spaceBtn = { bg: null, label: null };

    // No DEL button - corrections happen by re-selecting the correct letter
    // during the next repeat pass (overwrites the character at same position)
    this._bkspBtn = { bg: null, label: null };

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

  // ─── Choice buttons logic ──────────────────────────────────────────────────

  _clearCharTimers() {
    this._charTimers.forEach(t => clearTimeout(t));
    this._charTimers = [];
    this._currentExpectedChar = null;
    this._currentCharIndex = 0;
  }

  /** Map a character index (ignoring spaces) to a position in _typedText (which has spaces). */
  _charIndexToStringPos(charIdx) {
    let count = 0;
    for (let i = 0; i < this._typedText.length; i++) {
      if (this._typedText[i] !== ' ') {
        if (count === charIdx) return i;
        count++;
      }
    }
    return this._typedText.length;   // beyond current text — append
  }

  /** Schedule buttons for all repeats at once. */
  _scheduleAllRepeats(text, wpm, repeats, playDur) {
    this._clearCharTimers();
    this._setChoiceVisible(false);

    for (let r = 0; r < repeats; r++) {
      const offset = r * playDur;
      this._scheduleOnePass(text, wpm, offset, r === 0);
    }
  }

  /** Schedule choice buttons for a single play of the message at `offset` ms.
   *  Uses EXACT same timings as the audio playback for perfect sync.
   *  Buttons appear when a character ends and stay visible until the NEXT character ends.
   */
  _scheduleOnePass(text, wpm, offset, isFirstPass) {
    // Get exact timings from MorseEngine - same as audio uses
    const morse = this.scene.morseEngine;
    const timings = morse.encodeToTimings(text, wpm);
    
    const chars = text.toUpperCase().split('');
    
    // First pass: calculate all character end times
    const charData = [];  // { char, charIndex, endMs }
    let ms = 0;
    let charIndex = 0;
    let timingIdx = 0;
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (char === ' ') {
        // Word gap - just advance time, no button
        while (timingIdx < timings.length && timings[timingIdx].type === 'gap') {
          ms += timings[timingIdx].duration;
          timingIdx++;
        }

        // Schedule space insertion at the correct position (idempotent on repeats)
        const capturedCharIndex = charIndex;
        const spaceAt = offset + ms;
        this._charTimers.push(setTimeout(() => {
          if (this._mode !== 'decoding') return;
          // Find the string position where the space belongs (before the next non-space char)
          const insertPos = this._charIndexToStringPos(capturedCharIndex);
          // Only insert if there's no space already at this position
          const alreadyThere = insertPos > 0 && this._typedText[insertPos - 1] === ' ';
          if (!alreadyThere) {
            this._typedText = this._typedText.slice(0, insertPos) + ' ' + this._typedText.slice(insertPos);
            if (this._cursorPos >= insertPos) this._cursorPos++;
            this._hiddenInput.value = this._typedText;
          }
          this._refreshInput();
        }, spaceAt));

        continue;
      }

      const pat = MORSE_PAT[char];
      if (!pat) {
        // Skip unknown chars
        while (timingIdx < timings.length && timings[timingIdx].type === 'tone') {
          ms += timings[timingIdx].duration;
          timingIdx++;
          if (timingIdx < timings.length && timings[timingIdx].type === 'gap') {
            ms += timings[timingIdx].duration;
            timingIdx++;
          }
        }
        continue;
      }

      // Calculate exact duration of this character (tones + intra-char gaps)
      let charEndMs = ms;
      
      for (let j = 0; j < pat.length; j++) {
        // Tone
        if (timingIdx < timings.length && timings[timingIdx].type === 'tone') {
          charEndMs += timings[timingIdx].duration;
          timingIdx++;
        }
        // Intra-character gap (between dots/dashes)
        if (j < pat.length - 1 && timingIdx < timings.length && timings[timingIdx].type === 'gap') {
          charEndMs += timings[timingIdx].duration;
          timingIdx++;
        }
      }
      
      // Inter-character gap (after this char, before next)
      let interGapMs = 0;
      if (timingIdx < timings.length && timings[timingIdx].type === 'gap') {
        interGapMs = timings[timingIdx].duration;
        timingIdx++;
      }

      // Store character data with its end time
      charData.push({ char, charIndex, endMs: charEndMs });
      
      ms = charEndMs + interGapMs;
      charIndex++;
    }

    // Second pass: schedule button timers
    // Buttons show when char ends, hide when NEXT char ends
    const buttonDisplayMs = this.scene.settings?.buttonDisplayMs ?? DEFAULT_SETTINGS.buttonDisplayMs;
    
    for (let i = 0; i < charData.length; i++) {
      const { char, charIndex: idx, endMs } = charData[i];
      const showAt = offset + endMs;
      
      // Hide when next character ends, or at end of message
      let hideAt;
      if (i < charData.length - 1) {
        // Hide when next character ends (overlap - next char's buttons will show immediately)
        hideAt = offset + charData[i + 1].endMs;
      } else {
        // Last character - stay visible longer so player has time to react
        hideAt = showAt + Math.max(buttonDisplayMs, 1200); // at least 1200ms (1.2s) for last char
      }

      // Show buttons when this character's audio ends
      this._charTimers.push(setTimeout(() => {
        if (this._mode !== 'decoding') return;
        this._currentExpectedChar = char;
        this._currentCharIndex = idx;
        this._updateChoiceButtons();
        this._setChoiceVisible(true);
        // Cursor stays at current input position (where player is typing)
        // Don't jump around - let the player control cursor position
        this._refreshInput();
      }, showAt));

      // Hide buttons when next char ends (or at end), insert underscore if needed
      this._charTimers.push(setTimeout(() => {
        if (this._mode !== 'decoding') return;
        // Check if this position still needs a character
        const pos = this._charIndexToStringPos(idx);
        if (pos >= this._typedText.length) {
          // Nothing entered yet - insert placeholder underscore
          this._typedText += '_';
          // Keep cursor at current position - don't jump
          this._hiddenInput.value = this._typedText;
          this._refreshInput();
        }
      }, hideAt));
    }

    // Hide buttons at end of this pass (safety net for last char)
    const lastCharEnd = charData.length > 0 ? charData[charData.length - 1].endMs : 0;
    this._charTimers.push(setTimeout(() => {
      if (this._mode !== 'decoding') return;
      this._setChoiceVisible(false);
    }, offset + lastCharEnd + Math.max(buttonDisplayMs, 1200) + 100));
  }

  _updateChoiceButtons() {
    const nextChar = this._currentExpectedChar;
    if (!nextChar || !MORSE_PAT[nextChar]) return;

    const confusables = getConfusables(nextChar);
    const choices = [nextChar, ...confusables].sort(() => Math.random() - 0.5);
    this._choiceBtns.forEach((btn, i) => btn.label.setText(choices[i]));
  }

  _setChoiceVisible(visible) {
    this._choiceBtns.forEach(b => {
      b.bg.setVisible(visible);
      b.label.setVisible(visible);
      visible ? b.bg.setInteractive({ useHandCursor: true }) : b.bg.disableInteractive();
    });
  }

  _hideTelegraphKey() {
    if (this.scene.telegraphKey) {
      this.scene.telegraphKey.hide();
    }
  }

  _showTelegraphKey() {
    if (this.scene.telegraphKey) {
      this.scene.telegraphKey.show();
    }
  }

  // ─── DECODING mode ───────────────────────────────────────────────────────────

  _startKeyCapture() {
    this.scene.telegraphKey?._disableSpace?.();
    this._typedText = '';
    this._cursorPos = 0;

    this._hiddenInput.value = '';

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
    this._hiddenInput.blur();
    this.scene.telegraphKey?._enableSpace?.();
  }

  _submitDecode() {
    this._clearCharTimers();
    this._stopKeyCapture();
    this._showTelegraphKey();  // show telegraph key again

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
      this._activeMsg.type,
      {
        sender: this._activeMsg.sender,
        receiver: this._activeMsg.receiver,
        playerDecode: this._typedText,
        accuracy: accuracy
      }
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

    // Re-enable telegraph key (was disabled during decoding)
    this.scene.telegraphKey?._enableSpace?.();

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
    this._clearCharTimers();
    this._mode      = 'idle';
    this._activeMsg = null;
    this._typedText = '';
    this._txKeyed   = '';
    this._hiddenInput.blur();
    this._setChoiceVisible(false);
    this._showTelegraphKey();  // show telegraph key again
    this._refreshAll();
  }

  destroy() {
    this._hiddenInput?.remove();
    this._logClickAreas?.forEach(area => area.destroy());
    this._logPopup?.container?.destroy();
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
    const showSubmit = this._mode === 'decoding' || this._mode === 'transmitting';
    this._submitBtn.setVisible(showSubmit);

    if (this._mode !== 'decoding') {
      this._setChoiceVisible(false);
    }

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
      const cursor = this._cursorVisible ? '█' : '▏';
      const t = this._typedText;
      const p = this._cursorPos;
      // Show cursor at current position, with a visual indicator of the active character
      let displayText = '';
      for (let i = 0; i < t.length; i++) {
        if (i === p) {
          displayText += cursor;
        }
        displayText += t[i];
      }
      if (p >= t.length) {
        displayText += cursor;
      }
      this._inputDisplay.setText(displayText);
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
      // Update click area data reference
      if (this._logClickAreas[i]) {
        this._logClickAreas[i].entryData = e || null;
      }
    });
  }

  _createLogDetailPopup() {
    const s = this.scene;
    const popupW = 480;
    const popupH = 320;
    const popupX = X + (W - popupW) / 2;
    const popupY = Y + (H - popupH) / 2;
    
    this._logPopup = {
      container: s.add.container(popupX, popupY).setDepth(100).setVisible(false),
      visible: false
    };
    
    // Background
    const bg = s.add.rectangle(popupW/2, popupH/2, popupW, popupH, 0x1a1508, 0.98)
      .setStrokeStyle(2, 0x5a4a2a);
    this._logPopup.container.add(bg);
    
    // Title
    this._logPopup.title = s.add.text(popupW/2, 15, 'MESSAGE DETAILS', {
      fontSize: '16px', color: '#a09060', fontFamily: 'monospace'
    }).setOrigin(0.5, 0);
    this._logPopup.container.add(this._logPopup.title);
    
    // Content area
    this._logPopup.content = s.add.text(20, 45, '', {
      fontSize: '14px', color: '#c8b070', fontFamily: 'monospace',
      wordWrap: { width: popupW - 40 }
    });
    this._logPopup.container.add(this._logPopup.content);
    
    // Close button
    const closeBtn = s.add.text(popupW/2, popupH - 35, 'CLOSE', {
      fontSize: '16px', color: '#44ff88', fontFamily: 'monospace',
      backgroundColor: '#0a2a1a', padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#44ff88'));
    closeBtn.on('pointerup', () => this._hideLogDetailPopup());
    this._logPopup.container.add(closeBtn);
    this._logPopup.closeBtn = closeBtn;
  }

  _showLogEntryDetail(lineIndex) {
    const entry = this._logClickAreas[lineIndex]?.entryData;
    if (!entry) return;
    
    // Build detailed content
    let content = `Time:     ${entry.timestamp}\n`;
    content += `Type:     ${entry.messageType}\n`;
    content += `From:     ${entry.callsign}${entry.sender ? ' (' + entry.sender.shipName + ')' : ''}\n`;
    if (entry.receiver) {
      content += `To:       ${entry.receiver.callsign}${entry.receiver.shipName ? ' (' + entry.receiver.shipName + ')' : ''}\n`;
    }
    content += '\n';
    content += `Message:\n${entry.text}`;
    if (entry.playerDecode && entry.playerDecode !== entry.text) {
      content += `\n\nYour decode:\n${entry.playerDecode}`;
    }
    if (entry.accuracy !== undefined) {
      const accColor = entry.accuracy >= 80 ? '✓' : entry.accuracy >= 50 ? '~' : '✗';
      content += `\n\nAccuracy: ${accColor} ${entry.accuracy}%`;
    }
    
    this._logPopup.content.setText(content);
    this._logPopup.container.setVisible(true);
    this._logPopup.visible = true;
  }

  _hideLogDetailPopup() {
    if (this._logPopup) {
      this._logPopup.container.setVisible(false);
      this._logPopup.visible = false;
    }
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
