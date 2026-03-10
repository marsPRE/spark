/**
 * SaveSystem — LocalStorage persistence.
 */
const SAVE_KEY = 'sparks_save_v1';

export class SaveSystem {
  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
      return true;
    } catch (e) {
      console.warn('SaveSystem: could not save.', e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('SaveSystem: could not load.', e);
      return null;
    }
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }

  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }
}
