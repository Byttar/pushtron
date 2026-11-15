// A small cloud of pixels kicked up from the player's feet when they jump.
// Puffs drift outward along the ground, rise a little, slow down and fade.
class DustPuff {
  static COUNT = 8;
  static SPEED = 0.05; // px per ms, sideways
  static RISE = 0.025; // px per ms, upward
  static DRAG = 0.006; // fraction of speed lost per ms
  static LIFE = 320; // ms

  // `x` is the centre of the feet, `y` the ground line; `drift` is the player's horizontal speed.
  constructor(x, y, drift = 0) {
    const { COUNT, SPEED, RISE, LIFE } = DustPuff;
    this.particles = [];
    for (let i = 0; i < COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.particles.push({
        x: x + side * Math.random() * 4,
        y: y - Math.random() * 2,
        // Dust trails behind the jump, so it leans against the player's motion.
        vx: side * SPEED * (0.4 + Math.random()) - drift * 0.15,
        vy: -RISE * (0.3 + Math.random()),
        size: 2 + Math.floor(Math.random() * 2),
        age: 0,
        life: LIFE * (0.6 + Math.random() * 0.6),
      });
    }
  }

  update(dt) {
    const keep = Math.exp(-DustPuff.DRAG * dt);
    for (const p of this.particles) {
      p.age += dt;
      p.vx *= keep;
      p.vy *= keep;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  get isFinished() {
    return this.particles.every((p) => p.age >= p.life);
  }

  // Particles that haven't faded yet, each with an `alpha` from 1 to 0.
  get visibleParticles() {
    return this.particles
      .filter((p) => p.age < p.life)
      .map((p) => ({ ...p, alpha: 1 - p.age / p.life }));
  }
}
