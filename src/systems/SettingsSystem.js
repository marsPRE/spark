/**
 * SettingsSystem — LocalStorage persistence for game settings.
 * Separate from SaveSystem to allow settings to persist across voyages.
 */
const SETTINGS_KEY = 'sparks_settings_v1';

export const DEFAULT_SETTINGS = {
  masterVolume: 0.8,
  morseVolume: 0.7,
  staticVolume: 0.15,
  receiveWpmOverride: 5,
  farnsworthMultiplier: 1.5,
  repeatPauseMs: 2000,
  initialSendWpm: 15,
  buttonDisplayMs: 400,
};

export class SettingsSystem {
  static save(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, savedAt: Date.now() }));
      return true;
    } catch (e) {
      console.warn('SettingsSystem: could not save.', e);
      return false;
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const saved = JSON.parse(raw);
      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch (e) {
      console.warn('SettingsSystem: could not load.', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  static clear() {
    localStorage.removeItem(SETTINGS_KEY);
  }

  static hasSettings() {
    return localStorage.getItem(SETTINGS_KEY) !== null;
  }
}
