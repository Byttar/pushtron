// The looping soundtrack and its on/off switch.
// Browsers block audio until the player interacts with the page, so playback
// starts on the first click or key press (see unlock).
//
// The track plays at the player's volume times a "duck" level, which drops while dialog
// text is on screen and eases back afterwards (see setDucked and update).
class Music {
  static VOLUME_STEP = 0.1;

  constructor(enabled, volume) {
    this.enabled = enabled;
    this.unlocked = false;
    this.baseVolume = 1;
    this.duck = 1; // current multiplier, eased toward duckTarget
    this.duckTarget = 1;
    this.trackPath = CONFIG.audio.soundtrack;
    this.track = new Audio(this.trackPath);
    this.track.loop = true;
    this.setVolume(volume);

    // Some browsers allow autoplay (e.g. Chrome on sites you visit often); otherwise unlock() starts it.
    if (enabled) this.track.play().then(() => (this.unlocked = true), () => {});
  }

  // The player's chosen volume, without ducking.
  get volume() {
    return this.baseVolume;
  }

  // Snapped to steps so the keyboard and the slider land on the same values.
  setVolume(volume) {
    const steps = Math.round(1 / Music.VOLUME_STEP);
    this.baseVolume = Math.min(1, Math.max(0, Math.round(volume * steps) / steps));
    this.applyVolume();
  }

  setDucked(ducked) {
    this.duckTarget = ducked ? CONFIG.audio.duckedVolume : 1;
  }

  update(dt) {
    if (this.duck === this.duckTarget) return;
    const step = dt / CONFIG.audio.duckFadeTime;
    this.duck = this.duck < this.duckTarget ? Math.min(this.duckTarget, this.duck + step) : Math.max(this.duckTarget, this.duck - step);
    this.applyVolume();
  }

  applyVolume() {
    this.track.volume = this.baseVolume * this.duck;
  }

  // Swaps to another looping song from its start, keeping the volume; does nothing if it's already playing.
  switchTo(path) {
    if (path === this.trackPath) return;
    this.track.pause();
    this.trackPath = path;
    this.track = new Audio(path);
    this.track.loop = true;
    this.applyVolume();
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
