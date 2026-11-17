// A one-cell object that is repelled by bubbles and slides back to its home cell.
class Tile {
  constructor(col, row) {
    this.homeX = col * CELL;
    this.homeY = row * CELL;
    this.x = this.homeX;
    this.y = this.homeY;
  }

  get bounds() {
    return { x: this.x, y: this.y, w: CELL, h: CELL };
  }

  get isAwayFromHome() {
    return Math.abs(this.x - this.homeX) + Math.abs(this.y - this.homeY) > 2;
  }

  // Home position, pushed out to the edge of every bubble covering it.
  targetPosition(bubbles) {
    let center = { x: this.homeX + CELL / 2, y: this.homeY + CELL / 2 };
    for (const bubble of bubbles) center = bubble.repel(center, CELL / 2);
    return { x: center.x - CELL / 2, y: center.y - CELL / 2 };
  }

  update(dt, world) {
    const target = this.targetPosition(world.bubbles);
    this.target = target;
    const follow = 1 - Math.exp(-dt / CONFIG.tile.followTime);
    // The easing never quite arrives, so snap the last bit. Otherwise neighbouring blocks end up a
    // fraction of a pixel uneven, and the seam between them catches the player.
    const snap = (from, to) => (Math.abs(to - from) < CONFIG.tile.snapDistance ? to - from : (to - from) * follow);
    const dx = snap(this.x, target.x);
    const dy = snap(this.y, target.y);

    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / CONFIG.tile.maxStep));
    for (let i = 0; i < steps; i++) {
      this.moveX(dx / steps, world);
      this.moveY(dy / steps, world);
    }
  }

  moveX(amount, world) {
    if (amount === 0) return;
    this.x += amount;
    this.resolveX(amount, world.level.wallRectsOverlapping(this.bounds));
  }

  moveY(amount, world) {
    if (amount === 0) return;
    this.y += amount;
    this.resolveY(amount, world.level.wallRectsOverlapping(this.bounds));
  }

  resolveX(amount, rects) {
    for (const wall of rects) {
      this.x = amount > 0 ? Math.min(this.x, wall.x - CELL) : Math.max(this.x, wall.x + wall.w);
    }
  }

  resolveY(amount, rects) {
    for (const wall of rects) {
      this.y = amount > 0 ? Math.min(this.y, wall.y - CELL) : Math.max(this.y, wall.y + wall.h);
    }
  }

  // # walls are not solid. Doors and the outside of the map still are.
  slideX(amount, world) {
    this.x += amount;
    this.resolveX(amount, world.level.barrierRectsOverlapping(this.bounds, false));
    this.resolveX(amount, world.level.spikeRectsOverlapping(this.bounds));
  }

  slideY(amount, world) {
    this.y += amount;
    this.resolveY(amount, world.level.barrierRectsOverlapping(this.bounds, false));
    this.resolveY(amount, world.level.spikeRectsOverlapping(this.bounds));
  }
}
