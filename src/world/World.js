// Everything alive in the current level: player, tiles, keys, buttons and bubbles.
class World {
  static TILE_CLASSES = { block: Block, fire: Fire, goal: Goal };
  static IGNORE_BLOCKS = "blocks"; // passed to solidsOverlapping to test walls only

  constructor(level) {
    this.level = level;
    this.player = Player.spawnAt(level.spawn.col, level.spawn.row);
    this.tiles = level.tileSpawns.map(({ type, col, row }) => new World.TILE_CLASSES[type](col, row));
    this.keys = level.keyCells.map(({ col, row }) => new Key(col, row));
    this.keyTrail = []; // collected keys, in pickup order
    this.buttons = level.buttonCells.map(({ col, row }) => new Button(col, row));
    this.lamps = level.lampCells.map(({ col, row }) => new Lamp(col, row, level.lampMount(col, row)));
    this.events = []; // sound effect names for this frame, e.g. "key"
    this.dust = []; // DustPuffs from jumps
    this.hintDismissed = false; // set by the player's first input in this attempt
    this.bubbles = [];
    this.playerCrushed = false; // set by a block that can't get past the player
    this.playerAlive = true; // once dead, blocks pass through the player's body
  }

  get blocks() {
    return this.tiles.filter((t) => t instanceof Block);
  }

  get fires() {
    return this.tiles.filter((t) => t instanceof Fire);
  }

  get goals() {
    return this.tiles.filter((t) => t instanceof Goal);
  }

  get activeBubble() {
    return this.bubbles.find((b) => !b.released);
  }

  update(dt, input) {
    this.events = [];
    const groundY = this.player.bottom; // the jump has already lifted the player by the end of update
    this.player.update(dt, input, this);
    if (this.player.justJumped) this.dust.push(new DustPuff(this.player.centerX, groundY, this.player.vx));
    this.updateDust(dt);

    for (const bubble of this.bubbles) bubble.update(dt);
    this.bubbles = this.bubbles.filter((b) => !b.isFinished);

    this.updateTiles(dt);
    this.updateKeys(dt);
    this.updateButtons();
  }

  updateDust(dt) {
    for (const puff of this.dust) puff.update(dt);
    this.dust = this.dust.filter((puff) => !puff.isFinished);
  }

  updateTiles(dt) {
    for (const tile of this.tiles) tile.update(dt, this);
    this.separatePlayerFromBlocks();
  }

  updateKeys(dt) {
    const { player } = this;
    for (const key of this.keys) {
      if (key.tryCollect(player)) {
        this.keyTrail.push(key);
        this.events.push("key");
      }
    }

    let leader = { x: player.centerX, y: player.centerY };
    this.keyTrail.forEach((key, i) => {
      key.follow(dt, leader, player.facing, i === 0 ? CONFIG.key.followLift : 0);
      leader = key;
    });
  }

  updateButtons() {
    for (const button of this.buttons) {
      if (button.pressed) continue;
      const pressed = button.isPressedBy(this.player.bounds) || this.blocks.some((b) => button.isPressedBy(b.bounds));
      if (!pressed) continue;
      button.pressed = true;
      this.level.doorsOpen = true;
      this.events.push("button");
    }
  }

  get hasAllKeys() {
    return this.keys.every((key) => key.collected);
  }

  // Walls and blocks overlapping `rect`, as rectangles.
  // `ignore` is one block to skip, or World.IGNORE_BLOCKS to skip every block (walls still count).
  solidsOverlapping(rect, ignore) {
    const solids = this.level.wallRectsOverlapping(rect);
    solids.push(...this.level.spikeRectsOverlapping(rect));
    if (ignore === World.IGNORE_BLOCKS) return solids;
    for (const block of this.blocks) {
      if (block !== ignore && Rect.overlaps(rect, block.bounds)) solids.push(block.bounds);
    }
    return solids;
  }

  // A block can come to rest overlapping another block. Push the player out of that overlap
  // so they aren't left inside a block the bubble shoved through them.
  separatePlayerFromBlocks() {
    const { player } = this;
    if (!this.playerAlive) return;
    for (let pass = 0; pass < this.blocks.length + 1; pass++) {
      const block = this.blocks.find((b) => Rect.overlaps(player.bounds, b.bounds));
      if (!block) return;
      const left = player.x + player.width - block.x;
      const right = block.x + CELL - player.x;
      const up = player.y + player.height - block.y;
      const down = block.y + CELL - player.y;
      const exits = [
        { x: player.x - left, y: player.y, pen: left },
        { x: player.x + right, y: player.y, pen: right },
        { x: player.x, y: player.y - up, pen: up },
        { x: player.x, y: player.y + down, pen: down },
      ].sort((a, b) => a.pen - b.pen);
      const free = exits.find((exit) => {
        const next = { x: exit.x, y: exit.y, w: player.width, h: player.height };
        if (this.level.wallRectsOverlapping(next).length > 0) return false;
        return !this.blocks.some((b) => Rect.overlaps(next, b.bounds));
      });
      if (!free) return;
      player.x = free.x;
      player.y = free.y;
    }
  }

  // The level's hint shows until the player's first input of this attempt.
  get showsHint() {
    return Boolean(this.level.hint) && !this.hintDismissed;
  }

  dismissHint() {
    this.hintDismissed = true;
  }

  startBubble(x, y) {
    this.releaseBubbles();
    this.bubbles.push(new Bubble(x, y));
  }

  // Dragging the bubble into a no-bubble zone turns it off, as if the mouse had been released.
  // The path since the last frame is checked in small steps, so a fast drag can't skip over a thin zone.
  moveBubble(x, y) {
    const bubble = this.activeBubble;
    if (!bubble) return;
    const toX = Math.min(Math.max(x, 0), this.level.pixelWidth);
    const toY = Math.min(Math.max(y, 0), this.level.pixelHeight);
    const steps = Math.max(1, Math.ceil(Math.hypot(toX - bubble.x, toY - bubble.y) / (CELL / 4)));
    const fromX = bubble.x;
    const fromY = bubble.y;
    for (let i = 1; i <= steps; i++) {
      bubble.moveTo(fromX + ((toX - fromX) * i) / steps, fromY + ((toY - fromY) * i) / steps);
      if (!this.level.allowsBubbleAt(bubble.x, bubble.y)) {
        bubble.release();
        return;
      }
    }
  }

  releaseBubbles() {
    for (const bubble of this.bubbles) bubble.release();
  }

  clearBubbles() {
    this.bubbles = [];
  }

  isPlayerBurned() {
    return this.fires.some((fire) => fire.burns(this.player.bounds));
  }

  // Flush contact counts: the player is stopped against the spike, so the bodies only touch.
  isPlayerSpiked() {
    const { x, y, w, h } = this.player.bounds;
    return this.level.spikeRectsOverlapping({ x: x - 1, y: y - 1, w: w + 2, h: h + 2 }).length > 0;
  }

  hasPlayerFallen() {
    return this.player.y > this.level.pixelHeight;
  }

  hasPlayerReachedGoal() {
    return Boolean(this.goalReachedByPlayer());
  }

  // The goal stays locked until every key has been collected.
  goalReachedByPlayer() {
    if (!this.hasAllKeys) return undefined;
    return this.goals.find((goal) => goal.isReachedBy(this.player));
  }
}
