// The player's body breaking into pixels that fly apart and fall.
class ParticleBurst {
  static SPACING = 3; // px between particles sampled from the body
  static GRAVITY = 0.0012; // px per ms^2
  static SPREAD = 0.02; // outward speed per px of distance from the centre
  static JITTER = 0.15; // random extra speed, px per ms
  static BOUNCE = 0.35; // fraction of speed kept when hitting a wall
  static FRICTION = 0.7; // sideways speed kept when bouncing off a floor

  // `rect` is the area that breaks apart; `lift` is extra upward speed (px per ms).
  constructor(rect, lift = 0) {
    const { SPACING, SPREAD, JITTER } = ParticleBurst;
    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;
    this.particles = [];

    for (let y = rect.y; y < rect.y + rect.h; y += SPACING) {
      for (let x = rect.x; x < rect.x + rect.w; x += SPACING) {
        this.particles.push({
          x,
          y,
          vx: (x - centerX) * SPREAD + (Math.random() - 0.5) * JITTER,
          vy: (y - centerY) * SPREAD + (Math.random() - 0.5) * JITTER - lift * (0.5 + Math.random()),
          size: 2 + Math.floor(Math.random() * 3),
          age: 0,
          life: 700 + Math.random() * 900,
        });
      }
    }
  }

  // Particles bounce off walls; moving one axis at a time tells floors apart from side walls.
  update(dt, level) {
    const { GRAVITY, BOUNCE, FRICTION } = ParticleBurst;
    for (const p of this.particles) {
      if (p.age >= p.life) continue;
      p.age += dt;
      p.vy += GRAVITY * dt;

      p.x += p.vx * dt;
      if (ParticleBurst.isInWall(p, level)) {
        p.x -= p.vx * dt;
        p.vx *= -BOUNCE;
      }

      p.y += p.vy * dt;
      if (ParticleBurst.isInWall(p, level)) {
        p.y -= p.vy * dt;
        p.vy *= -BOUNCE;
        p.vx *= FRICTION;
      }
    }
  }

  static isInWall(p, level) {
    return level.isWall(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
  }

  // Particles that haven't faded yet, each with an `alpha` from 1 to 0.
  get visibleParticles() {
    return this.particles
      .filter((p) => p.age < p.life)
      .map((p) => ({ ...p, alpha: 1 - p.age / p.life }));
  }
}
