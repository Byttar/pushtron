// The layout of a level, parsed from a text map (see levels.js for the legend).
// Everything is static except whether the doors are open.
//
// A level is either just the map (an array of rows) or { map, zones }, where `zones` is a second
// grid laid over the map that adds conditions to cells (see ZONE_TYPES).
class Level {
  static TILE_TYPES = { B: "block", F: "fire", G: "goal" };
  static ZONE_TYPES = { x: "noBubble" };

  constructor(entry) {
    const map = Level.mapOf(entry);
    this.rows = map.length;
    this.cols = Level.widthOf(map);
    this.wallCells = [];
    this.wallKeys = new Set();
    this.doorCells = [];
    this.doorKeys = new Set();
    this.doorsOpen = false;
    this.keyCells = [];
    this.buttonCells = [];
    this.tileSpawns = [];
    this.spawn = null;
    this.noBubbleCells = [];
    this.noBubbleKeys = new Set();

    const zones = Level.zonesOf(entry);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.parseCell(map[row][col], col, row);
        this.parseZone(zones[row]?.[col], col, row);
      }
    }

    if (!this.spawn) {
      this.spawn = Level.firstEmptyCell(map);
      console.warn(`Level has no player start (P); starting at column ${this.spawn.col}, row ${this.spawn.row}.`, map);
    }
  }

  static firstEmptyCell(map) {
    for (let row = 0; row < map.length; row++) {
      const col = map[row].indexOf(".");
      if (col !== -1) return { col, row };
    }
    return { col: 0, row: 0 };
  }

  parseCell(char, col, row) {
    if (char === "#") {
      this.wallCells.push({ col, row });
      this.wallKeys.add(Level.key(col, row));
    } else if (char === "D") {
      this.doorCells.push({ col, row });
      this.doorKeys.add(Level.key(col, row));
    } else if (char === "K") {
      this.keyCells.push({ col, row });
    } else if (char === "O") {
      this.buttonCells.push({ col, row });
    } else if (char in Level.TILE_TYPES) {
      this.tileSpawns.push({ type: Level.TILE_TYPES[char], col, row });
    } else if (char === "P") {
      this.spawn = { col, row };
    }
  }

  parseZone(char, col, row) {
    if (Level.ZONE_TYPES[char] === "noBubble") {
      this.noBubbleCells.push({ col, row });
      this.noBubbleKeys.add(Level.key(col, row));
    }
  }

  static mapOf(entry) {
    return Array.isArray(entry) ? entry : entry.map;
  }

  // Missing rows or cells in the zones grid have no condition.
  static zonesOf(entry) {
    return Array.isArray(entry) ? [] : entry.zones ?? [];
  }

  // `x` and `y` are in level coordinates.
  allowsBubbleAt(x, y) {
    return !this.noBubbleKeys.has(Level.key(Math.floor(x / CELL), Math.floor(y / CELL)));
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
  // Closed doors are solid too.
  isWall(col, row) {
    if (row >= this.rows) return false;
    if (col < 0 || row < 0 || col >= this.cols) return true;
    const key = Level.key(col, row);
    return this.wallKeys.has(key) || (!this.doorsOpen && this.doorKeys.has(key));
  }

  // For drawing the cached background: treats everything outside the map as wall so the border
  // has no outline. Doors are left out because they can open.
  isWallOrOutside(col, row) {
    if (row >= this.rows || col < 0 || row < 0 || col >= this.cols) return true;
    return this.wallKeys.has(Level.key(col, row));
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
