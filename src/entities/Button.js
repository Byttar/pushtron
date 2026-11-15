// A plate on the floor of its cell. The player or a block touching it presses it for good,
// which opens every door in the level.
class Button {
  constructor(col, row) {
    this.x = col * CELL;
    this.y = row * CELL;
    this.pressed = false;
  }

  get plate() {
    return { x: this.x + 3, y: this.y + CELL - 6, w: CELL - 6, h: 6 };
  }

  isPressedBy(rect) {
    return Rect.overlaps(this.plate, rect);
  }
}
