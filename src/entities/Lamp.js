// A decorative lamp: it doesn't collide with anything. It hangs from a wall above it, stands on
// a wall below it, or floats if neither is there. A few fireflies wander around its light.
class Lamp {
  static Mount = Object.freeze({ CEILING: "ceiling", FLOOR: "floor", FLOATING: "floating" });

  constructor(col, row, mount) {
    this.col = col;
    this.row = row;
    this.mount = mount;
    this.x = col * CELL + CELL / 2; // centre of the light
    this.y = row * CELL + (mount === Lamp.Mount.CEILING ? CELL * 0.6 : mount === Lamp.Mount.FLOOR ? CELL * 0.35 : CELL / 2);
    this.flicker = Math.random() * 1000; // phase, so neighbouring lamps don't flicker in step
    this.flies = Array.from({ length: CONFIG.lamp.flies }, () => Lamp.randomFly());
  }

  static randomFly() {
    const { flyRange } = CONFIG.lamp;
    return {
      radiusX: flyRange * (0.4 + Math.random() * 0.6),
      radiusY: flyRange * (0.3 + Math.random() * 0.5),
      speed: (0.6 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1), // radians per second
      phase: Math.random() * Math.PI * 2,
      wobble: 1.5 + Math.random() * 2.5, // how fast it jitters off its loop
      blink: Math.random() * 1000,
    };
  }

  // 0..1; a slow breathing glow with an occasional quick dip, like an old bulb.
  brightnessAt(time) {
    const t = (time + this.flicker) / 1000;
    const breathe = 0.85 + 0.15 * Math.sin(t * 2.1);
    const dip = Math.sin(t * 13.7) > 0.97 ? 0.6 : 1;
    return breathe * dip;
  }

  // Fly positions loop around the light on wobbly ellipses; `alpha` makes them blink softly.
  fliesAt(time) {
    const t = time / 1000;
    return this.flies.map((fly) => {
      const angle = fly.phase + t * fly.speed;
      const jitter = Math.sin(t * fly.wobble * 3 + fly.phase) * 3;
      return {
        x: this.x + Math.cos(angle) * fly.radiusX + jitter,
        y: this.y + Math.sin(angle * 1.3) * fly.radiusY + Math.cos(t * fly.wobble * 2.3) * 2,
        alpha: 0.35 + 0.65 * ((Math.sin((time + fly.blink) / 220) + 1) / 2),
      };
    });
  }
}
