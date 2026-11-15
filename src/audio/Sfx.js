// One-shot sound effects, by name (see CONFIG.audio.effects).
class Sfx {
  constructor() {
    this.sounds = {};
    for (const [name, path] of Object.entries(CONFIG.audio.effects)) {
      const sound = new Audio(path);
      sound.preload = "auto";
      this.sounds[name] = sound;
    }
  }

  // Each play uses a copy, so quick repeats overlap instead of cutting each other off.
  play(name) {
    const sound = this.sounds[name];
    if (!sound) return;
    const copy = sound.cloneNode();
    copy.volume = CONFIG.audio.sfxVolume;
    copy.play().catch(() => {});
  }
}
