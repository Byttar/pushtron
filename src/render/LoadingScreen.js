// Terminal boot log shown while a level "loads": each step gets dotted out and marked OK,
// and a progress bar fills underneath. Driven by game.loadingProgress (0 to 1).
class LoadingScreen {
  static LEFT = 60;
  static TOP = 50;
  static STEP_WIDTH = 26; // characters a step label is dotted out to
  static BAR_CELLS = 30;

  // Steps reflect what's actually in the level.
  static stepsFor(level) {
    const count = (type) => level.tileSpawns.filter((spawn) => spawn.type === type).length;
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "S"}`;
    const blocks = count("block");
    const fires = count("fire");

    const steps = ["READING MAP", `BUILDING ${plural(level.wallCells.length, "WALL")}`];
    if (blocks) steps.push(`PLACING ${plural(blocks, "BLOCK")}`);
    if (fires) steps.push(`IGNITING ${plural(fires, "FIRE")}`);
    steps.push("CALIBRATING BUBBLE", "LOCATING EXIT");
    return steps;
  }

  draw(game) {
    const screen = Layout.screenRect();
    const progress = game.loadingProgress;
    const steps = LoadingScreen.stepsFor(game.level);
    const sector = `${game.difficulty.name}-${String(game.levelIndex + 1).padStart(2, "0")}`;

    push();
    translate(screen.x + LoadingScreen.LEFT, screen.y + LoadingScreen.TOP);
    Phosphor.glow(8);
    noStroke();
    textAlign(LEFT, TOP);

    Phosphor.fill();
    textSize(48);
    text(`> SECTOR ${sector}`, 0, 0);

    textSize(THEME.textSize);
    const lineHeight = THEME.lineHeight + 8;
    const top = 80;
    // Steps share the first 85% of the time; the rest is the READY line.
    const stepTime = 0.85 / steps.length;
    steps.forEach((label, i) => {
      const local = (progress - i * stepTime) / stepTime;
      if (local < 0) return;
      const dots = ".".repeat(LoadingScreen.STEP_WIDTH - label.length);
      const shownDots = dots.slice(0, Math.ceil(dots.length * Math.min(1, local)));
      const status = local >= 1 ? " OK" : "";
      Phosphor.fill(local >= 1 ? 170 : 255);
      text(`> ${label} ${shownDots}${status}`, 0, top + i * lineHeight);
    });

    const barY = top + steps.length * lineHeight + 20;
    this.drawBar(progress, barY);

    if (progress >= 0.85) {
      Phosphor.fill();
      text(`> READY${Phosphor.blink(180) ? "_" : ""}`, 0, barY + lineHeight + 10);
    }

    Phosphor.noGlow();
    pop();
  }

  drawBar(progress, y) {
    const cells = LoadingScreen.BAR_CELLS;
    const filled = Math.floor(progress * cells);
    const percent = String(Math.floor(progress * 100)).padStart(3, " ");
    Phosphor.fill();
    text(`[${"#".repeat(filled)}${"-".repeat(cells - filled)}] ${percent}%`, 0, y);
  }
}
