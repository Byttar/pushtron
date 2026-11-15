// Monochrome phosphor-terminal look. Every colour in the game is this green at some alpha.
const THEME = Object.freeze({
  phosphor: [66, 255, 0],
  background: [8, 11, 8],
  fontPath: "assets/VT323-Regular.ttf",
  textSize: 20,
  lineHeight: 20,
  glow: 10,
});

// Drawing helpers. `g` is the drawing target: the main canvas (window) or a p5.Graphics.
class Phosphor {
  static fill(alpha = 255, g = window) {
    g.fill(...THEME.phosphor, alpha);
  }

  static stroke(alpha = 255, weight = 1, g = window) {
    g.stroke(...THEME.phosphor, alpha);
    g.strokeWeight(weight);
  }

  static glow(blur = THEME.glow, g = window) {
    const [r, gr, b] = THEME.phosphor;
    g.drawingContext.shadowBlur = blur;
    g.drawingContext.shadowColor = `rgba(${r}, ${gr}, ${b}, 0.75)`;
  }

  static noGlow(g = window) {
    g.drawingContext.shadowBlur = 0;
  }

  static dashed(pattern, offset = 0, g = window) {
    g.drawingContext.setLineDash(pattern);
    g.drawingContext.lineDashOffset = offset;
  }

  static solid(g = window) {
    g.drawingContext.setLineDash([]);
  }

  // Blinks on and off like a terminal cursor.
  static blink(periodMs = 530) {
    return Math.floor(millis() / periodMs) % 2 === 0;
  }
}
