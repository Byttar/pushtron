class Input {
  static LEFT_KEYS = ["a", "arrowleft"];
  static RIGHT_KEYS = ["d", "arrowright"];
  static JUMP_KEYS = ["w", "arrowup", " "];

  constructor(onKeyPressed) {
    this.held = new Set();
    this.jumpPressedAt = -Infinity;
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
    this.onKeyPressed(key);
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
