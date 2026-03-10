import { AUDIO } from '../config/constants.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.toneOscillator = null;
    this.toneGain = null;
    this.sideToneOscillator = null;
    this.sideToneGain = null;
    this.staticNode = null;
    this.staticGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = AUDIO.MASTER_VOLUME;
      this.masterGain.connect(this.ctx.destination);

      // Static/noise generator
      this._initNoiseGenerator();

      // Side tone oscillator (for player key)
      this.sideToneOscillator = this.ctx.createOscillator();
      this.sideToneOscillator.type = 'sine';
      this.sideToneOscillator.frequency.value = AUDIO.SIDE_TONE_FREQ;
      this.sideToneGain = this.ctx.createGain();
      this.sideToneGain.gain.value = 0;
      this.sideToneOscillator.connect(this.sideToneGain);
      this.sideToneGain.connect(this.masterGain);
      this.sideToneOscillator.start();

      // Morse tone oscillator (for incoming signals)
      this.toneOscillator = this.ctx.createOscillator();
      this.toneOscillator.type = 'sine';
      this.toneOscillator.frequency.value = AUDIO.MORSE_FREQ;
      this.toneGain = this.ctx.createGain();
      this.toneGain.gain.value = 0;
      this.toneOscillator.connect(this.toneGain);
      this.toneGain.connect(this.masterGain);
      this.toneOscillator.start();

      this.initialized = true;

      // Resume suspended context (required after user gesture in some browsers)
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('AudioEngine: Web Audio API not available.', e);
    }
  }

  /** Call after any user interaction to ensure context is running. */
  ensureRunning() {
    if (this.initialized && this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _initNoiseGenerator() {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.staticNode = this.ctx.createBufferSource();
    this.staticNode.buffer = buffer;
    this.staticNode.loop = true;
    this.staticGain = this.ctx.createGain();
    this.staticGain.gain.value = AUDIO.STATIC_VOLUME;
    this.staticNode.connect(this.staticGain);
    this.staticGain.connect(this.masterGain);
    this.staticNode.start();
  }

  toneOn(frequency = AUDIO.MORSE_FREQ) {
    if (!this.initialized || !this.toneOscillator) return;
    this.toneOscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    this.toneGain.gain.setTargetAtTime(AUDIO.MORSE_VOLUME, this.ctx.currentTime, 0.005);
  }

  toneOff() {
    if (!this.initialized || !this.toneGain) return;
    this.toneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.005);
  }

  cancelMorseTone() {
    if (!this.initialized || !this.toneGain) return;
    this.toneGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.toneGain.gain.setValueAtTime(0, this.ctx.currentTime);
  }

  playMorseMessage(timings, frequency = AUDIO.MORSE_FREQ, onComplete) {
    if (!this.initialized) {
      if (onComplete) onComplete();
      return;
    }

    // Clear any leftover automation from a previous playback
    this.cancelMorseTone();

    const now = this.ctx.currentTime;
    let delay = 0;

    for (const segment of timings) {
      if (segment.type === 'tone') {
        const t0 = now + delay / 1000;
        const t1 = t0 + segment.duration / 1000;
        this.toneOscillator.frequency.setValueAtTime(frequency, t0);
        // 5 ms cosine-shaped ramp avoids clicks
        this.toneGain.gain.setValueAtTime(0, t0);
        this.toneGain.gain.linearRampToValueAtTime(AUDIO.MORSE_VOLUME, t0 + 0.005);
        this.toneGain.gain.setValueAtTime(AUDIO.MORSE_VOLUME, t1 - 0.005);
        this.toneGain.gain.linearRampToValueAtTime(0, t1);
      }
      delay += segment.duration;
    }

    if (onComplete) {
      setTimeout(onComplete, delay + 50);
    }
  }

  setStaticLevel(level) {
    if (!this.initialized || !this.staticGain) return;
    this.staticGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, level)),
      this.ctx.currentTime,
      0.1
    );
  }

  sideToneOn() {
    if (!this.initialized || !this.sideToneGain) return;
    this.sideToneGain.gain.setTargetAtTime(AUDIO.MORSE_VOLUME * 0.8, this.ctx.currentTime, 0.003);
  }

  sideToneOff() {
    if (!this.initialized || !this.sideToneGain) return;
    this.sideToneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.003);
  }

  updateTuning(targetFreq, currentFreq) {
    if (!this.initialized) return;
    // Detune effect: beat frequency between target and current
    const diff = Math.abs(targetFreq - currentFreq);
    const tuned = diff < 2;
    if (this.toneOscillator) {
      this.toneOscillator.frequency.setValueAtTime(
        AUDIO.MORSE_FREQ + (tuned ? 0 : (targetFreq - currentFreq) * 0.5),
        this.ctx.currentTime
      );
    }
  }

  playAtmosphericCrash() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 80 + Math.random() * 200;
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}
