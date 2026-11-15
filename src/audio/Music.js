// The looping soundtrack and its on/off switch.
// Browsers block audio until the player interacts with the page, so playback
// starts on the first click or key press (see unlock).
class Music {
  static VOLUME_STEP = 0.1;

  constructor(enabled, volume) {
    this.enabled = enabled;
    this.unlocked = false;
    this.trackPath = CONFIG.audio.soundtrack;
    this.track = new Audio(this.trackPath);
    this.track.loop = true;
    this.setVolume(volume);

    // Some browsers allow autoplay (e.g. Chrome on sites you visit often); otherwise unlock() starts it.
    if (enabled) this.track.play().then(() => (this.unlocked = true), () => {});
  }

  get volume() {
    return this.track.volume;
  }

  // Snapped to steps so the keyboard and the slider land on the same values.
  setVolume(volume) {
    const steps = Math.round(1 / Music.VOLUME_STEP);
    this.track.volume = Math.min(1, Math.max(0, Math.round(volume * steps) / steps));
  }

  // Swaps to another looping song from its start, keeping the volume; does nothing if it's already playing.
  switchTo(path) {
    if (path === this.trackPath) return;
    const volume = this.track.volume;
    this.track.pause();
    this.trackPath = path;
    this.track = new Audio(path);
    this.track.loop = true;
    this.track.volume = volume;
    this.sync();
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
