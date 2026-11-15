class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.player.width;
    this.height = CONFIG.player.height;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.hanging = false;
    this.coyoteTimer = 0;
    this.direction = 0;
    this.facing = 1;
  }

  // Places the player standing on the floor of the given cell, centred horizontally.
  static spawnAt(col, row) {
    const { width, height } = CONFIG.player;
    return new Player(col * CELL + (CELL - width) / 2, (row + 1) * CELL - height);
  }

  get bounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  get bottom() {
    return this.y + this.height;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  isStandingOn(rect) {
    return (
      Math.abs(this.bottom - rect.y) < 1.5 &&
      this.x < rect.x + rect.w &&
      this.x + this.width > rect.x
    );
  }

  isHangingFrom(rect) {
    return (
      this.hanging &&
      Math.abs(this.y - CONFIG.player.hangGap - (rect.y + rect.h)) < 1.5 &&
      this.x < rect.x + rect.w &&
      this.x + this.width > rect.x
    );
  }

  update(dt, input, world) {
    const cfg = CONFIG.player;
    const direction = input.horizontal;
    this.direction = direction;
    if (direction !== 0) this.facing = direction;
    this.justJumped = false;

    if (this.hanging) {
      this.updateHanging(dt, input, world);
      if (this.hanging) return;
    }

    this.coyoteTimer = this.onGround ? cfg.coyoteTime : this.coyoteTimer - dt;
    if (input.hasBufferedJump(cfg.jumpBuffer) && this.coyoteTimer > 0) {
      this.vy = -cfg.jumpSpeed;
      this.coyoteTimer = 0;
      this.justJumped = true;
      input.consumeJump();
    }

    const steps = Math.ceil(dt / cfg.physicsStep);
    const h = dt / steps;
    const accel = this.horizontalAccel(direction);
    this.onGround = false;
    for (let i = 0; i < steps; i++) {
      this.vx = Player.approach(this.vx, direction * cfg.runSpeed, accel * h);

      let gravity = cfg.gravity;
      if (this.vy < 0 && !input.jumpHeld) gravity *= cfg.lowJumpGravity;
      this.vy = Math.min(this.vy + gravity * h, cfg.maxFallSpeed);

      if (this.moveX(this.vx * h, world)) this.vx = 0;
      const rising = this.vy < 0;
      if (this.moveY(this.vy * h, world)) {
        this.vy = 0;
        if (rising && input.jumpHeld && this.grabCeiling(world, input)) return;
      }
    }
  }

  // ---------- Hanging from a ceiling ----------

  // The lowest solid edge just above the player's head, or null if there's nothing to hold.
  ceilingAbove(world) {
    const reach = CONFIG.player.hangGap + 2;
    const probe = { x: this.x, y: this.y - reach, w: this.width, h: reach };
    const solids = world.solidsOverlapping(probe);
    if (solids.length === 0) return null;
    return Math.max(...solids.map((s) => s.y + s.h));
  }

  grabCeiling(world, input) {
    const ceiling = this.ceilingAbove(world);
    if (ceiling === null) return false;
    const below = { ...this.bounds, y: ceiling + CONFIG.player.hangGap };
    if (world.solidsOverlapping(below).length > 0) return false; // no room to hang
    this.y = below.y;
    this.hanging = true;
    this.vy = 0;
    input.consumeJump();
    return true;
  }

  // Slides along the ceiling while up is held; lets go when released or the ceiling ends.
  updateHanging(dt, input, world) {
    const cfg = CONFIG.player;
    if (!input.jumpHeld) {
      this.hanging = false;
      return;
    }

    const steps = Math.ceil(dt / cfg.physicsStep);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.vx = Player.approach(this.vx, this.direction * cfg.hangSpeed, cfg.groundAccel * h);
      if (this.moveX(this.vx * h, world)) this.vx = 0;

      const ceiling = this.ceilingAbove(world);
      if (ceiling === null) {
        this.hanging = false;
        return;
      }
      // Follows the ceiling if it shifts (e.g. a block being pushed by the bubble).
      const target = ceiling + cfg.hangGap;
      if (target !== this.y) this.moveY(target - this.y, world);
    }
    this.onGround = false;
    this.coyoteTimer = 0;
  }

  // Uses the grounded state from the previous frame, since onGround is recomputed while moving.
  horizontalAccel(direction) {
    const cfg = CONFIG.player;
    const turningOrStopping = direction === 0 || Math.sign(direction) !== Math.sign(this.vx);
    if (this.onGround) return turningOrStopping && this.vx !== 0 ? cfg.groundDecel : cfg.groundAccel;
    return direction === 0 ? cfg.airDecel : cfg.airAccel;
  }

  // Moves `value` toward `target` by at most `maxDelta`.
  static approach(value, target, maxDelta) {
    if (value < target) return Math.min(value + maxDelta, target);
    return Math.max(value - maxDelta, target);
  }

  // Both return true if something stopped the player. `ignore` is a block to skip.
  moveX(amount, world, ignore) {
    if (amount === 0) return false;
    this.x += amount;
    const hits = world.solidsOverlapping(this.bounds, ignore);
    for (const solid of hits) {
      this.x = amount > 0 ? Math.min(this.x, solid.x - this.width) : Math.max(this.x, solid.x + solid.w);
    }
    return hits.length > 0;
  }

  moveY(amount, world, ignore) {
    if (amount === 0) return false;
    this.y += amount;
    const hits = world.solidsOverlapping(this.bounds, ignore);
    for (const solid of hits) {
      if (amount > 0) {
        this.y = Math.min(this.y, solid.y - this.height);
        this.onGround = true;
      } else {
        this.y = Math.max(this.y, solid.y + solid.h);
      }
    }
    return hits.length > 0;
  }
}
