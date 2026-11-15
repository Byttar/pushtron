// Everything alive in the current level: player, tiles, keys, buttons and bubbles.
class World {
  static TILE_CLASSES = { block: Block, fire: Fire, goal: Goal };

  constructor(level) {
    this.level = level;
    this.player = Player.spawnAt(level.spawn.col, level.spawn.row);
    this.tiles = level.tileSpawns.map(({ type, col, row }) => new World.TILE_CLASSES[type](col, row));
    this.keys = level.keyCells.map(({ col, row }) => new Key(col, row));
    this.keyTrail = []; // collected keys, in pickup order
    this.buttons = level.buttonCells.map(({ col, row }) => new Button(col, row));
    this.events = []; // sound effect names for this frame, e.g. "key"
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
    this.player.update(dt, input, this);

    for (const bubble of this.bubbles) bubble.update(dt);
    this.bubbles = this.bubbles.filter((b) => !b.isFinished);

    this.updateTiles(dt);
    this.updateKeys(dt);
    this.updateButtons();
  }

  updateTiles(dt) {
    for (const tile of this.tiles) tile.update(dt, this);
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
  solidsOverlapping(rect, ignore) {
    const solids = this.level.wallRectsOverlapping(rect);
    for (const block of this.blocks) {
      if (block !== ignore && Rect.overlaps(rect, block.bounds)) solids.push(block.bounds);
    }
    return solids;
  }

  startBubble(x, y) {
    this.releaseBubbles();
    this.bubbles.push(new Bubble(x, y));
  }

  moveBubble(x, y) {
    this.activeBubble?.moveTo(
      Math.min(Math.max(x, 0), this.level.pixelWidth),
      Math.min(Math.max(y, 0), this.level.pixelHeight)
    );
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
