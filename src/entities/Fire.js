// A hazard tile: the player passes into it and dies.
class Fire extends Tile {
  burns(rect) {
    return Rect.overlaps(this.bounds, Rect.inset(rect, CONFIG.fire.hitInset));
  }
}
