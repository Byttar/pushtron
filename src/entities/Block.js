// A solid tile: the player can stand on it, gets carried by it and shoved aside by it.
class Block extends Tile {
  moveX(amount, world) {
    if (amount === 0) return;
    if (!world.playerAlive) return this.slideX(amount, world);
    const { player } = world;
    const riding = player.isStandingOn(this.bounds) || player.isHangingFrom(this.bounds);
    const startX = this.x;

    this.slideX(amount, world);

    if (Rect.overlaps(this.bounds, player.bounds)) this.shovePlayerX(amount, world);
    else if (riding) player.moveX(this.x - startX, world, World.IGNORE_BLOCKS);
  }

  moveY(amount, world) {
    if (amount === 0) return;
    if (!world.playerAlive) return this.slideY(amount, world);
    const { player } = world;
    const riding = player.isStandingOn(this.bounds);
    const hanging = player.isHangingFrom(this.bounds);
    const startY = this.y;

    this.slideY(amount, world);

    if (hanging) {
      player.moveY(this.y - startY, world, World.IGNORE_BLOCKS);
    } else if (Rect.overlaps(this.bounds, player.bounds)) {
      if (amount < 0) this.liftPlayer(world);
      else this.pushPlayerDown(world);
    } else if (riding && this.y > startY) {
      player.moveY(this.y - startY, world, this);
      player.onGround = true;
    }
  }

  // If the player is pinned against a door or the level edge the block stops, and may crush them.
  // Walls and other blocks do not stop it: the player stays where they are while the block passes.
  shovePlayerX(direction, world) {
    const { player } = world;
    const shove = direction > 0 ? this.x + CELL - player.x : this.x - (player.x + player.width);
    if (this.carryThroughBlocks(player, shove, 0, world)) return;
    this.x = direction > 0 ? player.x - CELL : player.x + player.width;
    this.blockedByPlayer(world, "x");
  }

  liftPlayer(world) {
    const { player } = world;
    if (this.carryThroughBlocks(player, 0, this.y - player.bottom, world)) {
      player.vy = Math.max(player.vy, 0);
      player.onGround = true;
      return;
    }
    this.y = player.bottom;
    this.blockedByPlayer(world, "y");
    player.vy = Math.max(player.vy, 0);
    player.onGround = true;
  }

  pushPlayerDown(world) {
    const { player } = world;
    if (this.carryThroughBlocks(player, 0, this.y + CELL - player.y, world)) return;
    this.y = player.y - CELL;
    this.blockedByPlayer(world, "y");
  }

  // Applies the shove. Other blocks are not in the way. Returns false when a door or the level
  // edge stops the player, leaving them where they were caught. A # wall does not.
  carryThroughBlocks(player, dx, dy, world) {
    const startX = player.x;
    const startY = player.y;
    if (dx !== 0) player.moveX(dx, world, this);
    if (dy !== 0) player.moveY(dy, world, this);
    if (!Rect.overlaps(this.bounds, player.bounds)) return true;
    // The block is already on its way through a wall. Leave the player on the near side.
    if (world.level.overlapsWallTile(this.bounds)) return true;
    const dest = { ...player.bounds, x: player.x + (dx - (player.x - startX)), y: player.y + (dy - (player.y - startY)) };
    if (world.level.wallRectsOverlapping(dest).length > 0) return false;
    player.x = dest.x;
    player.y = dest.y;
    return true;
  }

  // Crushes the pinned player only if the block is trying to go well past them,
  // whether the bubble is pushing it or it's sliding back home.
  blockedByPlayer(world, axis) {
    if (Math.abs(this.target[axis] - this[axis]) > CONFIG.block.crushDepth) world.playerCrushed = true;
  }
}
