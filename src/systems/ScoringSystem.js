/**
 * ScoringSystem — reputation and score tracking.
 */
import {
  REP_FIRED,
  REP_PROBATION,
  REP_COMPETENT,
  REP_SKILLED,
  REP_LEGENDARY,
} from '../config/constants.js';

export class ScoringSystem {
  constructor(scene) {
    this.scene      = scene;
    this.score      = 0;
    this.reputation = 50;   // starts at competent
    this.stats = {
      messagesDecoded:  0,
      messagesMissed:   0,
      distressHandled:  0,
      transmissionsSent: 0,
    };

    this.onReputationChange = null;
    this.onGameOver         = null;
  }

  addScore(points) {
    this.score = Math.max(0, this.score + points);
  }

  addReputation(delta) {
    const prev = this.reputation;
    this.reputation = Math.max(0, Math.min(100, this.reputation + delta));
    if (this.reputation !== prev) {
      this.onReputationChange?.(this.reputation, delta);
    }
    if (this.reputation <= REP_FIRED) {
      this.onGameOver?.('fired');
    }
  }

  getReputation() { return this.reputation; }
  getScore()      { return this.score; }

  getReputationLabel() {
    if (this.reputation >= REP_LEGENDARY)  return 'Legendary';
    if (this.reputation >= REP_SKILLED)    return 'Skilled';
    if (this.reputation >= REP_COMPETENT)  return 'Competent';
    if (this.reputation >= REP_PROBATION)  return 'Probation';
    return 'Fired';
  }

  recordDecoded()            { this.stats.messagesDecoded++;   this.addScore(5);  this.addReputation(2);  }
  recordMissed()             { this.stats.messagesMissed++;    this.addScore(-5); this.addReputation(-5); }
  recordDistressHandled()    { this.stats.distressHandled++;   this.addScore(50); this.addReputation(20); }
  recordTransmissionSent(q)  { this.stats.transmissionsSent++; this.addScore(Math.round(q * 0.1)); }

  getSummary() {
    return {
      score:            this.score,
      reputation:       this.reputation,
      reputationLabel:  this.getReputationLabel(),
      ...this.stats,
    };
  }
}
