// A solid tile: the player can stand on it, gets carried by it and shoved aside by it.
class Block extends Tile {
  moveX(amount, world) {
    if (amount === 0) return;
    const { player } = world;
    const riding = player.isStandingOn(this.bounds) || player.isHangingFrom(this.bounds);
    const startX = this.x;

    super.moveX(amount, world);

    if (Rect.overlaps(this.bounds, player.bounds)) this.shovePlayerX(amount, world);
    else if (riding) player.moveX(this.x - startX, world, this);
  }

  moveY(amount, world) {
    if (amount === 0) return;
    const { player } = world;
    const riding = player.isStandingOn(this.bounds);
    const hanging = player.isHangingFrom(this.bounds);
    const startY = this.y;

    super.moveY(amount, world);

    if (hanging) {
      player.moveY(this.y - startY, world, this);
    } else if (Rect.overlaps(this.bounds, player.bounds)) {
      if (amount < 0) this.liftPlayer(world);
      else this.pushPlayerDown(world);
    } else if (riding && this.y > startY) {
      player.moveY(this.y - startY, world, this);
      player.onGround = true;
    }
  }

  // If the player is pinned against a wall the block stops instead.
  shovePlayerX(direction, world) {
    const { player } = world;
    const shove = direction > 0 ? this.x + CELL - player.x : this.x - (player.x + player.width);
    player.moveX(shove, world, this);
    if (Rect.overlaps(this.bounds, player.bounds)) {
      this.x = direction > 0 ? player.x - CELL : player.x + player.width;
    }
  }

  liftPlayer(world) {
    const { player } = world;
    player.moveY(this.y - player.bottom, world, this);
    if (Rect.overlaps(this.bounds, player.bounds)) this.y = player.bottom;
    player.vy = Math.max(player.vy, 0);
    player.onGround = true;
  }

  pushPlayerDown(world) {
    const { player } = world;
    player.moveY(this.y + CELL - player.y, world, this);
    if (Rect.overlaps(this.bounds, player.bounds)) this.y = player.y - CELL;
  }
}
