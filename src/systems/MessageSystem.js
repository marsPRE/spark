/**
 * MessageSystem — schedules, transmits, and tracks messages for a voyage.
 */
export class MessageSystem {
  constructor(morseEngine, radioSystem, timeSystem, scene) {
    this.morse  = morseEngine;
    this.radio  = radioSystem;
    this.time   = timeSystem;
    this.scene  = scene;

    this.scheduled  = [];   // messages not yet transmitted
    this.active     = [];   // currently transmitting
    this.received   = [];   // player has heard them
    this.missed     = [];   // timed out without player response
    this.sent       = [];   // player transmissions

    this.pendingResponses = [];

    // Callbacks
    this.onTransmissionStarted = null;
    this.onTransmissionEnded   = null;
    this.onResponseTimeout     = null;
  }

  loadVoyageMessages(voyageData) {
    this.scheduled = (voyageData.scheduled_messages || [])
      .map(m => ({ ...m, status: 'pending', elapsed: 0, repeatCount: 0 }))
      .sort((a, b) => a.timing.scheduled_time - b.timing.scheduled_time);
  }

  update(delta) {
    const now = this.time.getCurrentGameMinutes();

    // Trigger scheduled messages
    for (const msg of this.scheduled) {
      if (msg.status === 'pending' && now >= msg.timing.scheduled_time) {
        this._beginTransmission(msg);
      }
    }

    // Advance active transmissions
    for (let i = this.active.length - 1; i >= 0; i--) {
      const msg = this.active[i];
      msg.elapsed += delta;
      // Use actual audio duration if RadioSystem calculated it, else fall back to JSON value
      const durationMs  = msg._audioDuration ?? (msg.timing.duration_seconds * 1000);
      const pauseMs     = this.scene?.settings?.repeatPauseMs ?? 2000;
      const cycleDurMs  = durationMs + pauseMs;

      if (msg.elapsed >= cycleDurMs) {
        msg.repeatCount++;
        if (msg.repeatCount >= (msg.timing.repeats || 1)) {
          this._endTransmission(msg, i);
        } else {
          msg.elapsed = 0;
          this._retransmit(msg);
        }
      }
    }

    // Check response timeouts
    for (let i = this.pendingResponses.length - 1; i >= 0; i--) {
      const p = this.pendingResponses[i];
      p.remaining -= delta / 1000;
      if (p.remaining <= 0) {
        this._handleTimeout(p, i);
      }
    }
  }

  // ─── Submit decoded text for a received message ──────────────────────────────

  submitDecoding(messageId, decodedText) {
    const msg = [...this.received, ...this.active].find(m => m.id === messageId);
    if (!msg) return null;
    msg.playerDecoded = decodedText;

    // Cancel any remaining repeats — player has acknowledged the message
    const activeIdx = this.active.indexOf(msg);
    if (activeIdx !== -1) {
      this.radio.cancelSignal?.();
      this._endTransmission(msg, activeIdx);
    }

    const accuracy = this._levenshteinSimilarity(
      decodedText.toUpperCase(),
      msg.content.plain_text.toUpperCase()
    );
    return { accuracy, correct: msg.content.plain_text };
  }

  submitResponse(pendingId, responseText, morseTimings) {
    const p = this.pendingResponses.find(x => x.message.id === pendingId);
    if (!p) return null;
    p.responded = true;

    const contentScore = Math.max(
      ...(p.message.correct_responses || [responseText]).map(cr =>
        this._levenshteinSimilarity(responseText.toUpperCase(), cr.toUpperCase())
      )
    );
    const morseScore = morseTimings
      ? this.morse.scoreTransmission(morseTimings, responseText)
      : 100;

    const outcome = contentScore >= 60 ? 'correct' : 'incorrect';
    const impact  = p.message.narrative_impact?.[outcome] || {};

    const result = { originalMessage: p.message, responseText, contentScore, morseScore, impact };
    this.sent.push(result);

    const idx = this.pendingResponses.indexOf(p);
    if (idx !== -1) this.pendingResponses.splice(idx, 1);

    return result;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _beginTransmission(msg) {
    msg.status  = 'transmitting';
    msg.elapsed = 0;
    msg.repeatCount = 0;
    this.active.push(msg);

    // Let RadioSystem calculate actual audio duration and store it on msg
    const activeSignal = this.radio.transmitSignal(msg);
    if (activeSignal?.audioDuration) msg._audioDuration = activeSignal.audioDuration;

    this.onTransmissionStarted?.(msg);
  }

  _retransmit(msg) {
    const activeSignal = this.radio.transmitSignal(msg);
    if (activeSignal?.audioDuration) msg._audioDuration = activeSignal.audioDuration;
  }

  _endTransmission(msg, index) {
    this.active.splice(index, 1);

    if (msg.playerDecoded?.length > 0) {
      msg.status = 'received';
      this.received.push(msg);
    } else {
      msg.status = 'missed';
      this.missed.push(msg);
    }

    if (msg.response_required) {
      this.pendingResponses.push({
        message:    msg,
        remaining:  msg.time_limit || 300,
        responded:  false,
      });
    }

    this.onTransmissionEnded?.(msg);
  }

  _handleTimeout(pending, index) {
    const impact = pending.message.narrative_impact?.timeout || {};
    this.pendingResponses.splice(index, 1);
    this.onResponseTimeout?.(pending.message, impact);
  }

  _levenshteinSimilarity(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: n + 1 }, (_, i) =>
      Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        dp[i][j] = a[j-1] === b[i-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    const dist = dp[n][m];
    const maxLen = Math.max(m, n);
    return maxLen > 0 ? Math.round((1 - dist / maxLen) * 100) : 100;
  }
}
