// The exit: not solid, and the bubble can push it around like any other tile.
class Goal extends Tile {
  // Reached when the player's centre is inside it.
  isReachedBy(player) {
    return Rect.contains(this.bounds, player.centerX, player.centerY);
  }
}
