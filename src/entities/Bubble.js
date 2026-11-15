// The circle created by holding the mouse. It grows while held and shrinks once released.
class Bubble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.age = 0;
    this.released = false;
    this.releaseRadius = 0;
  }

  moveTo(x, y) {
    if (this.released) return;
    this.x = x;
    this.y = y;
  }

  update(dt) {
    const { maxRadius, growTime, shrinkTime } = CONFIG.bubble;
    this.age += dt;

    if (this.released) {
      const t = Math.min(this.age / shrinkTime, 1);
      this.radius = this.releaseRadius * (1 - t) ** 2;
    } else {
      const t = Math.min(this.age / growTime, 1);
      this.radius = maxRadius * (1 - (1 - t) ** 3);
    }
  }

  release() {
    if (this.released) return;
    this.released = true;
    this.releaseRadius = this.radius;
    this.age = 0;
  }

  get isFinished() {
    return this.released && this.radius <= 0.5;
  }

  // Pushes a point closer than `radius + padding` out to exactly that distance.
  repel(point, padding) {
    const reach = this.radius + padding;
    if (this.radius <= 0) return point;

    const dx = point.x - this.x;
    const dy = point.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= reach) return point;

    const nx = distance < 0.001 ? 0 : dx / distance;
    const ny = distance < 0.001 ? -1 : dy / distance;
    return { x: this.x + nx * reach, y: this.y + ny * reach };
  }
}
