// Canvas layout. The screen (the framed area) has a fixed size for the whole game:
// big enough for the menu and for the largest level. Each level is centred inside it.
class Layout {
  static screenRect() {
    const { margin, minScreenWidth, minScreenHeight } = CONFIG.layout;
    const maps = DIFFICULTIES.flatMap((difficulty) => difficulty.levels.map(Level.mapOf));
    const w = Math.max(minScreenWidth, ...maps.map((map) => Level.widthOf(map) * CELL));
    const h = Math.max(minScreenHeight, ...maps.map((map) => map.length * CELL));
    return { x: margin, y: margin, w, h };
  }

  static canvasSize() {
    const { margin } = CONFIG.layout;
    const screen = Layout.screenRect();
    return { width: screen.w + margin * 2, height: screen.h + margin * 2 };
  }

  static levelOrigin(level) {
    const screen = Layout.screenRect();
    return {
      x: screen.x + Math.floor((screen.w - level.pixelWidth) / 2),
      y: screen.y + Math.floor((screen.h - level.pixelHeight) / 2),
    };
  }

  // Canvas coordinates (e.g. the mouse) to coordinates inside the screen frame.
  static toScreen(x, y) {
    const screen = Layout.screenRect();
    return { x: x - screen.x, y: y - screen.y };
  }

  // Canvas coordinates to coordinates inside the level.
  static toLevel(x, y, level) {
    const origin = Layout.levelOrigin(level);
    return { x: x - origin.x, y: y - origin.y };
  }
}
