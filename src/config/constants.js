export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Morse timing base
export const BASE_WPM = 12;
export const UNIT_DURATION_MS = 1200 / BASE_WPM; // 100ms at 12 WPM

// Frequency range (kHz)
export const FREQ_MIN = 300;
export const FREQ_MAX = 600;
export const FREQ_DISTRESS = 500;

// Game time ratio: 1 real second = GAME_TIME_RATIO game seconds
export const GAME_TIME_RATIO = 15;

// Reputation thresholds
export const REP_FIRED = 20;
export const REP_PROBATION = 40;
export const REP_COMPETENT = 60;
export const REP_SKILLED = 80;
export const REP_LEGENDARY = 95;

// Scene keys
export const SCENES = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  VOYAGE_SELECT: 'VoyageSelectScene',
  GAME: 'GameScene',
  PAUSE: 'PauseScene',
  RESULTS: 'ResultsScene',
};

// Message types
export const MSG_TYPE = {
  DISTRESS: 'DISTRESS',
  URGENCY: 'URGENCY',
  SAFETY: 'SAFETY',
  ROUTINE: 'ROUTINE',
  NAVIGATION: 'NAVIGATION',
};

// Watch periods (game hours)
export const WATCHES = [
  { name: 'Middle Watch',    start: 0,  end: 4  },
  { name: 'Morning Watch',   start: 4,  end: 8  },
  { name: 'Forenoon Watch',  start: 8,  end: 12 },
  { name: 'Afternoon Watch', start: 12, end: 16 },
  { name: 'Dog Watch',       start: 16, end: 20 },
  { name: 'First Watch',     start: 20, end: 24 },
];

// Audio settings
export const AUDIO = {
  MORSE_FREQ: 700,
  SIDE_TONE_FREQ: 600,
  MORSE_VOLUME: 0.7,
  STATIC_VOLUME: 0.3,
  AMBIENT_VOLUME: 0.5,
  MASTER_VOLUME: 0.8,
};
