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
    this.airJumpsLeft = CONFIG.player.airJumps;
    this.dashTimer = 0; // ms left in the current dash; 0 when not dashing
    this.dashDirection = 0;
    this.dashCooldown = 0; // ms until the next dash can start
  }

  get dashing() {
    return this.dashTimer > 0;
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
    this.justDashed = false;
    if (!this.dashing) this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    if (this.hanging) {
      this.airJumpsLeft = cfg.airJumps;
      this.updateHanging(dt, input, world);
      if (this.hanging) return;
    }

    if (this.onGround) this.airJumpsLeft = cfg.airJumps;
    this.coyoteTimer = this.onGround ? cfg.coyoteTime : this.coyoteTimer - dt;
    if (input.hasBufferedJump(cfg.jumpBuffer)) this.tryJump(input);
    this.tryDash(input);

    const steps = Math.ceil(dt / cfg.physicsStep);
    const h = dt / steps;
    // Turning around drops the old speed at once, instead of decelerating through zero first.
    if (direction !== 0 && Math.sign(this.vx) === -direction) this.vx = 0;
    const accel = this.horizontalAccel(direction);
    this.onGround = false;
    for (let i = 0; i < steps; i++) {
      if (this.dashing) this.updateDash(h);
      else this.vx = Player.approach(this.vx, direction * cfg.runSpeed, accel * h);

      // Gravity keeps pulling during a dash too; the dash only takes over horizontal speed.
      let gravity = cfg.gravity;
      if (this.vy < 0 && !input.jumpHeld) gravity *= cfg.lowJumpGravity;
      this.vy = Math.min(this.vy + gravity * h, cfg.maxFallSpeed);

      if (this.moveX(this.vx * h, world)) {
        this.vx = 0;
        this.dashTimer = 0; // running into a wall ends the dash
      }
      const rising = this.vy < 0;
      if (this.moveY(this.vy * h, world)) {
        this.vy = 0;
        if (rising && input.jumpHeld && this.grabCeiling(world, input)) return;
      }
    }
  }

  // ---------- Jumping and dashing ----------

  // A ground jump (also just after leaving a ledge), or else one of the air jumps.
  tryJump(input) {
    const cfg = CONFIG.player;
    if (this.coyoteTimer > 0) {
      this.vy = -cfg.jumpSpeed;
    } else if (this.airJumpsLeft > 0) {
      this.airJumpsLeft--;
      this.vy = -cfg.airJumpSpeed;
      this.dashTimer = 0; // jumping out of a dash cancels it
    } else {
      return; // stays buffered, so a press just before landing still jumps
    }
    this.coyoteTimer = 0;
    this.justJumped = true;
    input.consumeJump();
  }

  tryDash(input) {
    const { dash } = CONFIG.player;
    if (this.dashing || this.dashCooldown > 0) return;
    const direction = input.takeDash(dash.buffer);
    if (direction === 0) return;
    this.dashDirection = direction;
    this.facing = direction;
    this.dashTimer = dash.duration;
    this.dashCooldown = dash.cooldown;
    this.justDashed = true;
    // An air dash uses up the double jump until the player lands or grabs a ceiling again.
    if (!this.onGround) this.airJumpsLeft = 0;
  }

  // A horizontal burst. Afterwards the player keeps running at normal top speed.
  updateDash(h) {
    const { runSpeed, dash } = CONFIG.player;
    this.dashTimer = Math.max(0, this.dashTimer - h);
    this.vx = this.dashDirection * (this.dashing ? dash.speed : runSpeed);
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
      if (this.direction !== 0 && Math.sign(this.vx) === -this.direction) this.vx = 0;
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
    if (hits.length === 0 || this.stepUp(hits, world, ignore)) return false;
    for (const solid of hits) {
      this.x = amount > 0 ? Math.min(this.x, solid.x - this.width) : Math.max(this.x, solid.x + solid.w);
    }
    return true;
  }

  // Walks up ledges no taller than stepHeight, if there's room above them.
  stepUp(hits, world, ignore) {
    const top = Math.min(...hits.map((solid) => solid.y));
    const rise = this.bottom - top;
    if (rise <= 0 || rise > CONFIG.player.stepHeight) return false;
    const lifted = { ...this.bounds, y: top - this.height };
    if (world.solidsOverlapping(lifted, ignore).length > 0) return false;
    this.y = lifted.y;
    return true;
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
