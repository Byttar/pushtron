// Cleared levels and settings, persisted in localStorage.
// Levels are identified by difficulty id and index, e.g. "easy:0".
class SaveData {
  static STORAGE_KEY = "push.save.v1";

  constructor() {
    const data = SaveData.read();
    this.cleared = new Set((data.cleared ?? []).filter((entry) => typeof entry === "string"));
    this.musicEnabled = data.musicEnabled ?? true;
    this.musicVolume = typeof data.musicVolume === "number" ? data.musicVolume : CONFIG.audio.musicVolume;
  }

  // Storage can be unavailable (private mode) or hold bad data; start fresh in that case.
  static read() {
    try {
      return JSON.parse(localStorage.getItem(SaveData.STORAGE_KEY)) ?? {};
    } catch {
      return {};
    }
  }

  static levelKey(difficultyId, index) {
    return `${difficultyId}:${index}`;
  }

  write() {
    const data = { cleared: [...this.cleared], musicEnabled: this.musicEnabled, musicVolume: this.musicVolume };
    try {
      localStorage.setItem(SaveData.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Progress just won't persist.
    }
  }

  isCleared(difficultyId, index) {
    return this.cleared.has(SaveData.levelKey(difficultyId, index));
  }

  // The first level of each difficulty is open; the rest unlock once the previous one is cleared.
  isUnlocked(difficultyId, index) {
    return index === 0 || this.isCleared(difficultyId, index) || this.isCleared(difficultyId, index - 1);
  }

  clearedCount(difficultyId, levelCount) {
    let count = 0;
    for (let i = 0; i < levelCount; i++) if (this.isCleared(difficultyId, i)) count++;
    return count;
  }

  markCleared(difficultyId, index) {
    if (this.isCleared(difficultyId, index)) return;
    this.cleared.add(SaveData.levelKey(difficultyId, index));
    this.write();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    this.write();
  }

  setMusicVolume(volume) {
    this.musicVolume = volume;
    this.write();
  }
}
