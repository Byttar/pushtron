// Sound effects, by name (see CONFIG.audio.effects): one-shots, plus loops that run until stopped.
class Sfx {
  constructor() {
    this.sounds = {};
    for (const [name, path] of Object.entries(CONFIG.audio.effects)) {
      const sound = new Audio(path);
      sound.preload = "auto";
      this.sounds[name] = sound;
    }
    this.loops = {}; // name -> playing Audio
  }

  // Each play uses a copy, so quick repeats overlap instead of cutting each other off.
  play(name) {
    const sound = this.sounds[name];
    if (!sound) return;
    const copy = sound.cloneNode();
    copy.volume = CONFIG.audio.sfxVolume;
    copy.play().catch(() => {});
  }

  // Does nothing if the loop is already playing.
  startLoop(name) {
    if (this.loops[name] || !this.sounds[name]) return;
    const loop = this.sounds[name].cloneNode();
    loop.loop = true;
    loop.volume = CONFIG.audio.sfxVolume;
    loop.play().catch(() => {});
    this.loops[name] = loop;
  }

  stopLoop(name) {
    this.loops[name]?.pause();
    delete this.loops[name];
  }
}
