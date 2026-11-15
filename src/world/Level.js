// The static layout of a level, parsed from a text map (see levels.js for the legend).
class Level {
  static TILE_TYPES = { B: "block", F: "fire", G: "goal" };

  constructor(map) {
    this.rows = map.length;
    this.cols = Level.widthOf(map);
    this.wallCells = [];
    this.wallKeys = new Set();
    this.tileSpawns = [];
    this.spawn = null;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.parseCell(map[row][col], col, row);
      }
    }
  }

  parseCell(char, col, row) {
    if (char === "#") {
      this.wallCells.push({ col, row });
      this.wallKeys.add(Level.key(col, row));
    } else if (char in Level.TILE_TYPES) {
      this.tileSpawns.push({ type: Level.TILE_TYPES[char], col, row });
    } else if (char === "P") {
      this.spawn = { col, row };
    }
  }

  // Rows may differ in length; missing cells at the end of a row are empty.
  static widthOf(map) {
    return Math.max(...map.map((row) => row.length));
  }

  static key(col, row) {
    return col + "," + row;
  }

  get pixelWidth() {
    return this.cols * CELL;
  }

  get pixelHeight() {
    return this.rows * CELL;
  }

  isInside(x, y) {
    return x >= 0 && y >= 0 && x <= this.pixelWidth && y <= this.pixelHeight;
  }

  // Outside the map counts as a wall, except below it: that is open so pits can be fallen into.
  isWall(col, row) {
    if (row >= this.rows) return false;
    if (col < 0 || row < 0 || col >= this.cols) return true;
    return this.wallKeys.has(Level.key(col, row));
  }

  // For drawing: treats everything outside the map as wall so the border has no outline.
  isWallOrOutside(col, row) {
    return row >= this.rows || this.isWall(col, row);
  }

  wallRectsOverlapping(rect) {
    const rects = [];
    const col0 = Math.floor(rect.x / CELL);
    const row0 = Math.floor(rect.y / CELL);
    const col1 = Math.floor((rect.x + rect.w - 0.001) / CELL);
    const row1 = Math.floor((rect.y + rect.h - 0.001) / CELL);
    for (let row = row0; row <= row1; row++) {
      for (let col = col0; col <= col1; col++) {
        if (this.isWall(col, row)) rects.push({ x: col * CELL, y: row * CELL, w: CELL, h: CELL });
      }
    }
    return rects;
  }
}
