// A solid tile: the player can stand on it, gets carried by it and shoved aside by it.
class Block extends Tile {
  moveX(amount, world) {
    if (amount === 0) return;
    if (!world.playerAlive) return super.moveX(amount, world);
    const { player } = world;
    const riding = player.isStandingOn(this.bounds) || player.isHangingFrom(this.bounds);
    const startX = this.x;

    super.moveX(amount, world);

    if (Rect.overlaps(this.bounds, player.bounds)) this.shovePlayerX(amount, world);
    else if (riding) player.moveX(this.x - startX, world, this);
  }

  moveY(amount, world) {
    if (amount === 0) return;
    if (!world.playerAlive) return super.moveY(amount, world);
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

  // If the player is pinned against something solid the block stops, and may crush them.
  shovePlayerX(direction, world) {
    const { player } = world;
    const shove = direction > 0 ? this.x + CELL - player.x : this.x - (player.x + player.width);
    player.moveX(shove, world, this);
    if (Rect.overlaps(this.bounds, player.bounds)) {
      this.x = direction > 0 ? player.x - CELL : player.x + player.width;
      this.blockedByPlayer(world, "x");
    }
  }

  liftPlayer(world) {
    const { player } = world;
    player.moveY(this.y - player.bottom, world, this);
    if (Rect.overlaps(this.bounds, player.bounds)) {
      this.y = player.bottom;
      this.blockedByPlayer(world, "y");
    }
    player.vy = Math.max(player.vy, 0);
    player.onGround = true;
  }

  pushPlayerDown(world) {
    const { player } = world;
    player.moveY(this.y + CELL - player.y, world, this);
    if (Rect.overlaps(this.bounds, player.bounds)) {
      this.y = player.y - CELL;
      this.blockedByPlayer(world, "y");
    }
  }

  // Crushes the pinned player only if the block is trying to go well past them,
  // whether the bubble is pushing it or it's sliding back home.
  blockedByPlayer(world, axis) {
    if (Math.abs(this.target[axis] - this[axis]) > CONFIG.block.crushDepth) world.playerCrushed = true;
  }
}
