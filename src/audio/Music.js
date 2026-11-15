// The looping soundtrack and its on/off switch.
// Browsers block audio until the player interacts with the page, so playback
// starts on the first click or key press (see unlock).
class Music {
  static VOLUME_STEP = 0.1;

  constructor(enabled, volume) {
    this.enabled = enabled;
    this.unlocked = false;
    this.track = new Audio(CONFIG.audio.soundtrack);
    this.track.loop = true;
    this.setVolume(volume);
  }

  get volume() {
    return this.track.volume;
  }

  // Snapped to steps so the keyboard and the slider land on the same values.
  setVolume(volume) {
    const steps = Math.round(1 / Music.VOLUME_STEP);
    this.track.volume = Math.min(1, Math.max(0, Math.round(volume * steps) / steps));
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.sync();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.sync();
  }

  sync() {
    if (this.enabled && this.unlocked) this.track.play().catch(() => {});
    else this.track.pause();
  }
}
