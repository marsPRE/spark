import { getTimings } from '../utils/TimingUtils.js';

const MORSE_TABLE = {
  A: '.-',   B: '-...', C: '-.-.', D: '-..',  E: '.',    F: '..-.',
  G: '--.',   H: '....', I: '..',   J: '.---', K: '-.-',  L: '.-..',
  M: '--',    N: '-.',   O: '---',  P: '.--.',  Q: '--.-', R: '.-.',
  S: '...',   T: '-',    U: '..-',  V: '...-', W: '.--',  X: '-..-',
  Y: '-.--',  Z: '--..',
  '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..',  '9': '----.', '0': '-----',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--',
  '/': '-..-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
};

const REVERSE_TABLE = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([k, v]) => [v, k])
);

export class MorseEngine {
  constructor() {
    this.wpm = 12;
    this.timings = getTimings(this.wpm);
    this.farnsworthMultiplier = 1.0;  // 1.0 = no extra spacing
    this.inputState = {
      currentSymbols: '',   // dots/dashes being built into a character
      decodedText: '',      // fully decoded text so far
      pendingChar: '',      // last finalized char waiting for word gap
    };
    this._keyDownTime    = null;
    this._lastKeyUpTime  = null;
    this._charTimer      = null;
    this._wordTimer      = null;
    this.onCharDecoded   = null;   // callback(char)
    this.onWordDecoded   = null;   // callback(word)

    // Adaptive timing — seeded from WPM, converges to player's actual speed
    this._ditEstimate   = this.timings.dit;
    this._dahEstimate   = this.timings.dah;
    this._pressDurations = [];   // all observed press durations this session
  }

  setFarnsworthMultiplier(mult) {
    this.farnsworthMultiplier = Math.max(1.0, mult);
  }

  setWPM(wpm) {
    this.wpm      = wpm;
    this.timings  = getTimings(wpm);
    this._resetAdaptive();
  }

  getTimings() { return { ...this.timings }; }

  // ─── Adaptive timing estimates ────────────────────────────────────────────

  /** Re-seed estimates and clear observations (call on new transmission). */
  _resetAdaptive() {
    this._ditEstimate    = this.timings.dit;
    this._dahEstimate    = this.timings.dit * 2;  // 2× not 3× — real keying is closer to 2×
    this._pressDurations = [];
  }

  /**
   * Record a press, re-cluster all observed durations into dots vs dashes,
   * then classify this press against the updated centroids.
   * Returns '.' or '-'.
   */
  _classifyAndLearn(duration) {
    this._pressDurations.push(duration);

    // Need at least 2 samples before clustering can be meaningful
    if (this._pressDurations.length >= 2) {
      this._recluster();
    }

    return duration < (this._ditEstimate + this._dahEstimate) / 2 ? '.' : '-';
  }

  /**
   * K-means (k=2) over all observed press durations.
   * Iterates until centroids stabilise; always keeps c1 < c2 (dot < dash).
   */
  _recluster() {
    const d  = this._pressDurations;
    let c1   = this._ditEstimate;
    let c2   = this._dahEstimate;

    for (let iter = 0; iter < 20; iter++) {
      const dots = d.filter(x => Math.abs(x - c1) <= Math.abs(x - c2));
      const dahs = d.filter(x => Math.abs(x - c2) <  Math.abs(x - c1));

      const n1 = dots.length > 0 ? dots.reduce((a, b) => a + b, 0) / dots.length : c1;
      const n2 = dahs.length > 0 ? dahs.reduce((a, b) => a + b, 0) / dahs.length : c2;

      if (Math.abs(n1 - c1) < 0.5 && Math.abs(n2 - c2) < 0.5) break;
      c1 = n1;
      c2 = n2;
    }

    // c1 must remain the dot (smaller) centroid
    this._ditEstimate = Math.min(c1, c2);
    this._dahEstimate = Math.max(c1, c2);
  }

  /** Char-gap threshold: midpoint between 1-unit and 3-unit gap */
  get _charGapMs() { return this._ditEstimate * 2; }

  /** Word-gap threshold: midpoint between 3-unit and 7-unit gap */
  get _wordGapMs() { return this._ditEstimate * 5; }

  /** How long to wait after last key-up before finalising a character */
  get _interCharMs() { return this._ditEstimate * 3; }

  /** Additional wait after char finalisation before adding a space */
  get _interWordRemainMs() { return this._ditEstimate * 4; }

  encode(text) {
    return text.toUpperCase().split('').map(c =>
      c === ' ' ? '/' : (MORSE_TABLE[c] || '')
    ).filter(Boolean).join(' ');
  }

  decode(morse) {
    return morse.split(' / ').map(word =>
      word.split(' ').map(code => REVERSE_TABLE[code] || '?').join('')
    ).join(' ');
  }

  encodeToTimings(text, wpm, farnsworthMultiplier = null) {
    const t = wpm ? getTimings(wpm) : this.timings;
    const result = [];
    const morseStr = this.encode(text);
    const tokens = morseStr.split(' ');

    // Apply Farnsworth spacing: longer gaps between chars and words
    // Use passed multiplier or the stored one (default to 1.0)
    const farnMult = farnsworthMultiplier ?? this.farnsworthMultiplier ?? 1.0;
    const charGap = t.interCharGap * farnMult;
    const wordGap = t.interWordGap * farnMult;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === '/') {
        result.push({ type: 'gap', duration: wordGap });
        continue;
      }
      for (let j = 0; j < token.length; j++) {
        const sym = token[j];
        result.push({ type: 'tone', duration: sym === '.' ? t.dit : t.dah });
        if (j < token.length - 1) {
          result.push({ type: 'gap', duration: t.intraCharGap });
        }
      }
      if (i < tokens.length - 1 && tokens[i + 1] !== '/') {
        result.push({ type: 'gap', duration: charGap });
      }
    }
    return result;
  }

  onKeyDown(timestamp) {
    this._keyDownTime = timestamp;

    // Cancel pending finalization timers
    if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
    if (this._wordTimer) { clearTimeout(this._wordTimer); this._wordTimer = null; }

    // Only finalize on key-down when symbols are still pending (guard against
    // double-finalization if the char timer already ran first)
    if (this._lastKeyUpTime !== null && this.inputState.currentSymbols) {
      const gap = timestamp - this._lastKeyUpTime;
      if (gap >= this._charGapMs) {
        this._finalizeCharacter();
        if (gap >= this._wordGapMs) this._finalizeWord();
      }
    }
  }

  onKeyUp(timestamp) {
    if (this._keyDownTime === null) return;
    const duration = timestamp - this._keyDownTime;
    this._keyDownTime    = null;
    this._lastKeyUpTime  = timestamp;

    // Classify press and update adaptive estimates
    const symbol = this._classifyAndLearn(duration);
    this.inputState.currentSymbols += symbol;

    // Finalization timers use current adaptive gap estimates
    this._charTimer = setTimeout(() => {
      this._finalizeCharacter();
      this._charTimer = null;
      this._wordTimer = setTimeout(() => {
        this._finalizeWord();
        this._wordTimer = null;
      }, this._interWordRemainMs);
    }, this._interCharMs);
  }

  _finalizeCharacter() {
    const syms = this.inputState.currentSymbols;
    if (!syms) return;
    const char = REVERSE_TABLE[syms] || '?';
    this.inputState.decodedText += char;
    this.inputState.pendingChar = char;
    this.inputState.currentSymbols = '';
    if (this.onCharDecoded) this.onCharDecoded(char);
  }

  _finalizeWord() {
    this.inputState.decodedText += ' ';
    if (this.onWordDecoded) this.onWordDecoded(this.inputState.decodedText.trim());
  }

  scoreTransmission(playerTimings, expectedText) {
    const expectedMorse = this.encode(expectedText);
    const expectedTimingsArr = this.encodeToTimings(expectedText);

    let totalScore = 0;
    let maxScore = 0;
    const t = this.timings;

    for (let i = 0; i < Math.min(playerTimings.length, expectedTimingsArr.length); i++) {
      const expected = expectedTimingsArr[i];
      const actual = playerTimings[i];
      if (!actual || actual.type !== expected.type) {
        maxScore += 1;
        continue;
      }
      const ratio = actual.duration / expected.duration;
      const tolerance = 0.20;
      const lo = 1 - tolerance, hi = 1 + tolerance;
      maxScore += 1;
      if (ratio >= lo && ratio <= hi) totalScore += 1;
      else if (ratio >= lo * 0.8 && ratio <= hi * 1.2) totalScore += 0.6;
      else totalScore += 0.2;
    }
    maxScore = Math.max(maxScore, 1);
    return Math.round((totalScore / maxScore) * 100);
  }

  /** Flush any pending symbols into decodedText immediately. */
  flushInput() {
    if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
    if (this._wordTimer) { clearTimeout(this._wordTimer); this._wordTimer = null; }
    if (this.inputState.currentSymbols) this._finalizeCharacter();
  }

  resetInput() {
    if (this._charTimer) clearTimeout(this._charTimer);
    if (this._wordTimer) clearTimeout(this._wordTimer);
    this._charTimer     = null;
    this._wordTimer     = null;
    this._keyDownTime   = null;
    this._lastKeyUpTime = null;
    this.inputState = {
      currentSymbols: '',
      decodedText: '',
      pendingChar: '',
    };
    this._resetAdaptive();   // re-seed from WPM, clear observations
  }
}
