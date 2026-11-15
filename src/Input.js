class Input {
  static LEFT_KEYS = ["a", "arrowleft"];
  static RIGHT_KEYS = ["d", "arrowright"];
  static JUMP_KEYS = ["w", "arrowup", " "];

  constructor(onKeyPressed) {
    this.held = new Set();
    this.jumpPressedAt = -Infinity;
    this.lastTap = { direction: 0, at: -Infinity }; // last left/right press, for double taps
    this.dash = { direction: 0, at: -Infinity }; // last double tap
    this.onKeyPressed = onKeyPressed;

    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.held.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.held.clear());
  }

  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key.startsWith("arrow") || key === " ") e.preventDefault();
    this.held.add(key);
    if (e.repeat) return;

    if (Input.JUMP_KEYS.includes(key)) this.jumpPressedAt = performance.now();
    if (Input.LEFT_KEYS.includes(key)) this.registerTap(-1);
    if (Input.RIGHT_KEYS.includes(key)) this.registerTap(1);
    this.onKeyPressed(key);
  }

  // Two presses toward the same side within the double-tap window request a dash.
  registerTap(direction) {
    const now = performance.now();
    const { direction: lastDirection, at } = this.lastTap;
    if (lastDirection === direction && now - at <= CONFIG.player.dash.doubleTapWindow) {
      this.dash = { direction, at: now };
      this.lastTap = { direction: 0, at: -Infinity }; // a third tap starts a new pair
    } else {
      this.lastTap = { direction, at: now };
    }
  }

  // The direction of a dash requested within the last `windowMs`, or 0. Reading it uses it up.
  takeDash(windowMs) {
    if (performance.now() - this.dash.at > windowMs) return 0;
    const { direction } = this.dash;
    this.dash = { direction: 0, at: -Infinity };
    return direction;
  }

  isAnyHeld(keys) {
    return keys.some((k) => this.held.has(k));
  }

  // -1 for left, 1 for right, 0 for none or both.
  get horizontal() {
    return Number(this.isAnyHeld(Input.RIGHT_KEYS)) - Number(this.isAnyHeld(Input.LEFT_KEYS));
  }

  get jumpHeld() {
    return this.isAnyHeld(Input.JUMP_KEYS);
  }

  hasBufferedJump(windowMs) {
    return performance.now() - this.jumpPressedAt <= windowMs;
  }

  consumeJump() {
    this.jumpPressedAt = -Infinity;
  }
}
