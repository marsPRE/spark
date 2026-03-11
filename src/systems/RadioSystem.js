import { FREQ_DISTRESS, FREQ_MIN, FREQ_MAX } from '../config/constants.js';

export class RadioSystem {
  constructor(audioEngine, morseEngine) {
    this.audio = audioEngine;
    this.morse = morseEngine;
    this.currentFrequency = FREQ_DISTRESS;
    this.antennaCondition = 1.0;   // 0..1
    this.wpmOverride      = null;  // null = use message's own WPM
    this.activeSignals = [];        // currently playing signals
    this.signalQueue = [];          // signals waiting to play
    this.listeners = {
      tuned: [],
      signalStart: [],
      signalEnd: [],
    };
  }

  tuneFrequency(freq) {
    const clamped = Math.max(FREQ_MIN, Math.min(FREQ_MAX, freq));
    const prev = this.currentFrequency;
    this.currentFrequency = clamped;
    this.audio.updateTuning?.(clamped, prev);
    this._notifyListeners('tuned', { frequency: clamped, prev });
  }

  getFrequency() {
    return this.currentFrequency;
  }

  setAntennaCondition(value) {
    this.antennaCondition = Math.max(0, Math.min(1, value));
  }

  queueSignal(signal) {
    this.signalQueue.push(signal);
  }

  update(delta) {
    // Advance active signal timers
    for (let i = this.activeSignals.length - 1; i >= 0; i--) {
      const sig = this.activeSignals[i];
      sig.elapsed += delta;
      if (sig.elapsed >= sig.totalDuration) {
        this.activeSignals.splice(i, 1);
        this._notifyListeners('signalEnd', sig);
      }
    }
  }

  transmitSignal(signal) {
    // Message objects nest frequency under signal.signal.frequency
    const sigFreq = signal.signal?.frequency ?? signal.frequency;
    if (!this._isOnFrequency(sigFreq)) return;

    const snr = this._calculateSNR(signal);
    const sigWpm = this.wpmOverride || signal.timing?.wpm;
    const timings = this.morse.encodeToTimings(signal.content?.plain_text || '', sigWpm);
    // Use actual audio duration + 300ms tail so repeats never overlap
    const audioDuration = timings.reduce((s, t) => s + t.duration, 0) + 300;

    const activeSignal = { ...signal, snr, timings, audioDuration, elapsed: 0 };
    this.activeSignals.push(activeSignal);
    this._notifyListeners('signalStart', activeSignal);

    // Reduce static while signal plays so Morse is clearly audible
    this.audio.setStaticLevel?.(0.08);

    // Cancel any leftover automation before scheduling new playback
    this.audio.cancelMorseTone?.();

    // Play audio
    this.audio.playMorseMessage?.(
      timings,
      700,
      () => {
        this.audio.setStaticLevel?.(0.3);
      }
    );

    return activeSignal;
  }

  _isOnFrequency(signalFreq) {
    return Math.abs(this.currentFrequency - signalFreq) <= 5;
  }

  _calculateSNR(signal) {
    const baseStrength = signal.signal?.strength ?? 0.8;
    const noise = signal.signal?.noise_level ?? 0.2;
    return Math.max(0, Math.min(1, baseStrength * this.antennaCondition - noise));
  }

  onTuned(fn) { this.listeners.tuned.push(fn); }
  onSignalStart(fn) { this.listeners.signalStart.push(fn); }
  onSignalEnd(fn) { this.listeners.signalEnd.push(fn); }

  _notifyListeners(event, data) {
    (this.listeners[event] || []).forEach(fn => fn(data));
  }

  /** Stop all active signals immediately (e.g. player acknowledged, cancel repeats). */
  cancelSignal() {
    this.audio.cancelMorseTone?.();
    this.audio.setStaticLevel?.(0.3);
    for (const sig of this.activeSignals) {
      this._notifyListeners('signalEnd', sig);
    }
    this.activeSignals = [];
  }

  getActiveSignals() { return [...this.activeSignals]; }
  isReceivingSignal() { return this.activeSignals.length > 0; }
}
