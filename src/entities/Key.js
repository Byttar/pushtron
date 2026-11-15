// A collectible key. Once picked up it trails the player, each key following the one picked up before it.
// While a level has uncollected keys, its goal stays locked.
class Key {
  static SIZE = CELL * 0.7;

  constructor(col, row) {
    this.x = col * CELL + CELL / 2; // centre
    this.y = row * CELL + CELL / 2;
    this.collected = false;
  }

  get bounds() {
    const s = Key.SIZE;
    return { x: this.x - s / 2, y: this.y - s / 2, w: s, h: s };
  }

  // True on the frame the key gets picked up.
  tryCollect(player) {
    if (this.collected || !Rect.overlaps(this.bounds, player.bounds)) return false;
    this.collected = true;
    return true;
  }

  // Eases toward a spot behind `leader` (the player's centre or the previous key).
  follow(dt, leader, facing, lift) {
    const { followGap, followTime } = CONFIG.key;
    const t = 1 - Math.exp(-dt / followTime);
    this.x += (leader.x - facing * followGap - this.x) * t;
    this.y += (leader.y - lift - this.y) * t;
  }
}
