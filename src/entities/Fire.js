// A hazard tile: the player passes into it and dies. Like a block, a push carries it through
// other blocks and walls; doors and the outside of the map still stop it.
class Fire extends Tile {
  moveX(amount, world) {
    if (amount === 0) return;
    this.slideX(amount, world);
  }

  moveY(amount, world) {
    if (amount === 0) return;
    this.slideY(amount, world);
  }

  burns(rect) {
    return Rect.overlaps(this.bounds, Rect.inset(rect, CONFIG.fire.hitInset));
  }
}
