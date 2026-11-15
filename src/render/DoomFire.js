// The classic "Doom fire" effect: heat rises from a hot bottom row, cooling and drifting randomly.
class DoomFire {
  static MAX_HEAT = 12;
  static TICK = 45; // ms per simulation step, independent of frame rate
  static MAX_COOLING = 3.6; // higher = shorter, more ragged flames

  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.heat = new Uint8Array(cols * rows);
    this.elapsed = 0;
    for (let i = 0; i < rows; i++) this.step(); // start already burning
  }

  update(dt) {
    this.elapsed += dt;
    while (this.elapsed >= DoomFire.TICK) {
      this.elapsed -= DoomFire.TICK;
      this.step();
    }
  }

  step() {
    const { cols, rows, heat } = this;
    this.feedSource();

    // Each cell pushes its heat into the row above, losing some and drifting sideways.
    for (let row = 1; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const below = heat[row * cols + col];
        const drift = Math.floor(Math.random() * 3) - 1;
        const cooling = Math.floor(Math.random() * DoomFire.MAX_COOLING);
        const targetCol = Math.min(cols - 1, Math.max(0, col + drift));
        heat[(row - 1) * cols + targetCol] = Math.max(0, below - cooling);
      }
    }
  }

  // The bottom row is the fuel. It is weaker near the edges so each tile burns as a rounded
  // flame, and jittered so the base doesn't look like a solid bar.
  feedSource() {
    const base = (this.rows - 1) * this.cols;
    const middle = (this.cols - 1) / 2;
    for (let col = 0; col < this.cols; col++) {
      const edgeFalloff = 1 - 0.45 * (Math.abs(col - middle) / middle) ** 2;
      const jitter = Math.floor(Math.random() * 3);
      this.heat[base + col] = Math.max(0, Math.round(DoomFire.MAX_HEAT * edgeFalloff) - jitter);
    }
  }

  // 0 (cold) to 1 (hottest).
  heatAt(col, row) {
    return this.heat[row * this.cols + col] / DoomFire.MAX_HEAT;
  }
}
