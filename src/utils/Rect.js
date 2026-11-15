// Axis-aligned rectangles are plain { x, y, w, h } objects.
class Rect {
  static overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  static contains(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  static inset(rect, amount) {
    return {
      x: rect.x + amount,
      y: rect.y + amount,
      w: rect.w - amount * 2,
      h: rect.h - amount * 2,
    };
  }
}
