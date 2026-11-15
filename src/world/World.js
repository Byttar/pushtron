// Everything alive in the current level: player, tiles and bubbles.
class World {
  static TILE_CLASSES = { block: Block, fire: Fire, goal: Goal };

  constructor(level) {
    this.level = level;
    this.player = Player.spawnAt(level.spawn.col, level.spawn.row);
    this.tiles = level.tileSpawns.map(({ type, col, row }) => new World.TILE_CLASSES[type](col, row));
    this.bubbles = [];
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
    this.player.update(dt, input, this);

    for (const bubble of this.bubbles) bubble.update(dt);
    this.bubbles = this.bubbles.filter((b) => !b.isFinished);

    for (const tile of this.tiles) tile.update(dt, this);
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

  goalReachedByPlayer() {
    return this.goals.find((goal) => goal.isReachedBy(this.player));
  }
}
