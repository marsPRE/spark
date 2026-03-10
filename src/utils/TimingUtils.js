/**
 * Timing utilities for Morse code dit/dah classification.
 * All durations are in milliseconds.
 * PARIS standard: 1 unit = 1200 / WPM ms
 */

export function getTimings(wpm) {
  const unit = 1200 / wpm;
  return {
    dit:             unit,
    dah:             unit * 3,
    intraCharGap:    unit,
    interCharGap:    unit * 3,
    interWordGap:    unit * 7,
    ditDahThreshold: unit * 2,
    charGapThreshold: unit * 2,
    wordGapThreshold: unit * 5,
  };
}

/**
 * Classify a key-press duration as 'dit' or 'dah'.
 */
export function classifyPress(durationMs, wpm) {
  const { ditDahThreshold } = getTimings(wpm);
  return durationMs < ditDahThreshold ? '.' : '-';
}

/**
 * Classify a silence gap as 'intra' (same char), 'char', or 'word'.
 */
export function classifyGap(durationMs, wpm) {
  const { charGapThreshold, wordGapThreshold } = getTimings(wpm);
  if (durationMs >= wordGapThreshold) return 'word';
  if (durationMs >= charGapThreshold) return 'char';
  return 'intra';
}
