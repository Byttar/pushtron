// Level editor: paint a map on a grid and copy it out in the format levels.js expects.
// Uses the same legend as the game (see src/levels.js). Zone tools paint the second layer
// (`zones`) without touching the map underneath.

const EDITOR_CELL = 32;
const EMPTY = ".";

// `key` is the keyboard shortcut.
const TOOLS = [
  { char: "#", label: "WALL", key: "1" },
  { char: "B", label: "BLOCK", key: "2" },
  { char: "F", label: "FIRE", key: "3" },
  { char: "S", label: "SPIKE", key: "s" },
  { char: "G", label: "GOAL", key: "4" },
  { char: "K", label: "KEY", key: "5" },
  { char: "O", label: "BUTTON", key: "6" },
  { char: "D", label: "DOOR", key: "7" },
  { char: "P", label: "PLAYER", key: "8" },
  { char: EMPTY, label: "ERASE", key: "9" },
  { char: "L", label: "LAMP", key: "l", layer: "props" },
  { char: "W", label: "COBWEB", key: "w", layer: "props" },
  { char: "x", label: "NO-BUBBLE ZONE", key: "x", layer: "zones" },
];
const MAP_CHARS = TOOLS.filter((t) => !t.layer).map((t) => t.char);
const ZONE_CHARS = TOOLS.filter((t) => t.layer === "zones").map((t) => t.char);
const PROP_CHARS = TOOLS.filter((t) => t.layer === "props").map((t) => t.char);

let grid = [];
let zones = []; // same size as grid
let props = []; // decoration only; painted over the map without replacing it
let tool = "#";
let painting = null; // { layer, char } while the pointer is held, or null
let hoverCell = null;

const toolLayer = (char) => TOOLS.find((t) => t.char === char)?.layer ?? "map";

function setup() {
  const canvas = createCanvas(EDITOR_CELL, EDITOR_CELL);
  canvas.parent("stage");
  textFont("VT323, monospace");

  const el = canvas.elt;
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    // Right-click erases on the layer of the selected tool.
    painting = { layer: toolLayer(tool), char: e.button === 2 ? EMPTY : tool };
    paintAt(e);
  });
  el.addEventListener("pointermove", (e) => {
    hoverCell = cellAt(e);
    if (painting !== null) paintAt(e);
  });
  el.addEventListener("pointerup", () => (painting = null));
  el.addEventListener("pointerleave", () => (hoverCell = null));

  buildPalette();
  bindControls();
  newGrid(20, 11);
  addBorder();
  updateOutput();
}

// ---------- Grid ----------

function newGrid(cols, rows) {
  grid = Array.from({ length: rows }, () => Array(cols).fill(EMPTY));
  zones = Array.from({ length: rows }, () => Array(cols).fill(EMPTY));
  props = Array.from({ length: rows }, () => Array(cols).fill(EMPTY));
  fitCanvas();
}

// Keeps whatever fits in the new size, anchored to the top-left corner.
function resizeGrid(cols, rows) {
  const resized = (layer) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => layer[r]?.[c] ?? EMPTY));
  grid = resized(grid);
  zones = resized(zones);
  props = resized(props);
  fitCanvas();
  updateOutput();
}

function fitCanvas() {
  resizeCanvas(grid[0].length * EDITOR_CELL, grid.length * EDITOR_CELL);
  document.getElementById("cols").value = grid[0].length;
  document.getElementById("rows").value = grid.length;
}

function addBorder() {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) grid[r][c] = "#";
    }
  }
  updateOutput();
}

function cellAt(e) {
  const col = Math.floor(e.offsetX / EDITOR_CELL);
  const row = Math.floor(e.offsetY / EDITOR_CELL);
  if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) return null;
  return { col, row };
}

function paintAt(e) {
  const cell = cellAt(e);
  if (!cell) return;
  const { layer, char } = painting;
  const target = layer === "zones" ? zones : layer === "props" ? props : grid;
  if (target[cell.row][cell.col] === char) return;
  // A level has a single player start.
  if (char === "P") grid = grid.map((row) => row.map((c) => (c === "P" ? EMPTY : c)));
  const cells = layer === "zones" ? zones : layer === "props" ? props : grid;
  cells[cell.row][cell.col] = char;
  updateOutput();
}

// ---------- Text in and out ----------

const hasZones = () => zones.some((row) => row.some((char) => char !== EMPTY));
const hasProps = () => props.some((row) => row.some((char) => char !== EMPTY));

// A plain array of rows, or { map, zones, props } once a zone or a prop is painted.
function levelText() {
  const rows = (layer, indent) => layer.map((row) => `${indent}"${row.join("")}",`);
  if (!hasZones() && !hasProps()) return ["      [", ...rows(grid, "        "), "      ],"].join("\n");
  const lines = ["      {", "        map: [", ...rows(grid, "          "), "        ],"];
  if (hasZones()) lines.push("        zones: [", ...rows(zones, "          "), "        ],");
  if (hasProps()) lines.push("        props: [", ...rows(props, "          "), "        ],");
  lines.push("      },");
  return lines.join("\n");
}

const quotedRows = (text) => [...text.matchAll(/["'`]([^"'`\n]*)["'`]/g)].map((m) => m[1]);

// Accepts a level copied from levels.js, in either format: every quoted string is one row,
// and rows after "zones:" belong to the zones layer.
function parseLevel(text) {
  const propsMatch = text.match(/props\s*:\s*\[([\s\S]*?)\]/);
  const stripped = text.replace(/props\s*:\s*\[[\s\S]*?\]\s*,?/, "");
  const [mapText, zonesText = ""] = stripped.split(/zones\s*:/);
  const mapRows = quotedRows(mapText);
  if (mapRows.length === 0) return null;
  const cols = Math.max(...mapRows.map((r) => r.length));
  if (cols === 0) return null;
  const zoneRows = quotedRows(zonesText);
  const propRows = propsMatch ? quotedRows(propsMatch[1]) : [];
  const toGrid = (source, allowed) =>
    mapRows.map((_, r) => Array.from({ length: cols }, (_, c) => (allowed.includes(source[r]?.[c]) ? source[r][c] : EMPTY)));
  const propsGrid = toGrid(propRows, PROP_CHARS);
  // Older levels put lamps and cobwebs on the map. Move those onto the props layer.
  const mapGrid = mapRows.map((row, r) =>
    Array.from({ length: cols }, (_, c) => {
      const char = row[c];
      if (PROP_CHARS.includes(char)) {
        if (propsGrid[r][c] === EMPTY) propsGrid[r][c] = char;
        return EMPTY;
      }
      return MAP_CHARS.includes(char) ? char : EMPTY;
    }),
  );
  return { grid: mapGrid, zones: toGrid(zoneRows, ZONE_CHARS), props: propsGrid };
}

function updateOutput() {
  document.getElementById("output").value = levelText();
  const flat = grid.flat();
  const warnings = [];
  const players = flat.filter((c) => c === "P").length;
  if (players === 0) warnings.push("! NO PLAYER START (P)");
  if (!flat.includes("G")) warnings.push("! NO GOAL (G)");
  document.getElementById("warnings").textContent = warnings.join("   ");
}

// ---------- Controls ----------

function buildPalette() {
  const palette = document.getElementById("palette");
  TOOLS.forEach(({ char, label, key, layer }) => {
    const button = document.createElement("button");
    button.textContent = `${key.toUpperCase()} ${char} ${label}`;
    if (layer === "zones") button.classList.add("zone");
    if (layer === "props") button.classList.add("prop");
    button.dataset.char = char;
    button.addEventListener("click", () => selectTool(char));
    palette.appendChild(button);
  });
  selectTool(tool);

  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const match = TOOLS.find((t) => t.key === e.key.toLowerCase());
    if (match) selectTool(match.char);
  });
}

function selectTool(char) {
  tool = char;
  for (const button of document.querySelectorAll("#palette button")) {
    button.classList.toggle("active", button.dataset.char === char);
  }
}

function bindControls() {
  const readSize = (id, min, max) => {
    const input = document.getElementById(id);
    return Math.min(max, Math.max(min, Math.round(Number(input.value)) || min));
  };

  document.getElementById("resize").addEventListener("click", () => resizeGrid(readSize("cols", 3, 60), readSize("rows", 3, 40)));
  document.getElementById("border").addEventListener("click", addBorder);
  document.getElementById("clear").addEventListener("click", () => {
    newGrid(grid[0].length, grid.length);
    updateOutput();
  });

  const copyButton = document.getElementById("copy");
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(levelText());
      copyButton.textContent = "COPIED!";
    } catch {
      document.getElementById("output").select();
      copyButton.textContent = "PRESS CTRL+C";
    }
    setTimeout(() => (copyButton.textContent = "COPY"), 1200);
  });

  document.getElementById("load").addEventListener("click", () => {
    const parsed = parseLevel(document.getElementById("output").value);
    if (!parsed) {
      document.getElementById("warnings").textContent = "! NO ROWS FOUND IN THE TEXT";
      return;
    }
    ({ grid, zones, props } = parsed);
    fitCanvas();
    updateOutput();
  });
}

// ---------- Drawing (simplified versions of the game's tiles) ----------

function draw() {
  Phosphor.noGlow();
  background(...THEME.background);

  noStroke();
  Phosphor.fill(45);
  for (let r = 0; r <= grid.length; r++) {
    for (let c = 0; c <= grid[0].length; c++) rect(c * EDITOR_CELL - 1, r * EDITOR_CELL - 1, 2, 2);
  }

  Phosphor.noGlow();
  zones.forEach((row, r) => row.forEach((char, c) => char === "x" && drawNoBubbleZone(c * EDITOR_CELL, r * EDITOR_CELL, 1)));
  Phosphor.glow(6);
  grid.forEach((row, r) => row.forEach((char, c) => drawCell(char, c * EDITOR_CELL, r * EDITOR_CELL, 255)));
  props.forEach((row, r) => row.forEach((char, c) => char !== EMPTY && drawCell(char, c * EDITOR_CELL, r * EDITOR_CELL, 255)));

  if (hoverCell) {
    const x = hoverCell.col * EDITOR_CELL;
    const y = hoverCell.row * EDITOR_CELL;
    if (tool === "x") drawNoBubbleZone(x, y, 0.5);
    else drawCell(tool, x, y, 110);
    noFill();
    Phosphor.stroke(110, 1);
    Phosphor.dashed([3, 3]);
    rect(x + 0.5, y + 0.5, EDITOR_CELL - 1, EDITOR_CELL - 1);
    Phosphor.solid();
  }
  Phosphor.noGlow();
}

// Red tint and stripes, like the game. Each cell gets its own outline here, so single cells are
// easy to see while painting.
function drawNoBubbleZone(x, y, strength) {
  const [r, g, b] = THEME.danger;
  const s = EDITOR_CELL;
  noStroke();
  fill(r, g, b, 40 * strength);
  rect(x, y, s, s);
  stroke(r, g, b, 110 * strength);
  strokeWeight(1);
  line(x, y + s / 2, x + s / 2, y);
  line(x, y + s, x + s, y);
  line(x + s / 2, y + s, x + s, y + s / 2);
  noFill();
  stroke(r, g, b, 200 * strength);
  rect(x + 0.5, y + 0.5, s - 1, s - 1);
}

function drawCell(char, x, y, alpha) {
  const s = EDITOR_CELL;
  switch (char) {
    case "#":
      noFill();
      Phosphor.stroke(220 * (alpha / 255), 2);
      rect(x + 2, y + 2, s - 4, s - 4);
      noStroke();
      Phosphor.fill(60 * (alpha / 255));
      for (let dy = 8; dy < s - 4; dy += 8) for (let dx = 8; dx < s - 4; dx += 8) rect(x + dx - 1, y + dy - 1, 2, 2);
      break;
    case "B": {
      noFill();
      Phosphor.stroke(alpha, 2);
      rect(x + 2, y + 2, s - 4, s - 4);
      const key = Math.round(s * 0.16);
      const gap = Math.max(1, Math.round(s * 0.06));
      const start = (s - (key * 3 + gap * 2)) / 2;
      Phosphor.stroke(170 * (alpha / 255), 1);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rect(x + start + i * (key + gap), y + start + j * (key + gap), key, key);
      break;
    }
    case "S": {
      noStroke();
      Phosphor.fill(50 * (alpha / 255));
      rect(x + s * 0.28, y + s * 0.28, s * 0.44, s * 0.44);
      Phosphor.fill(alpha);
      triangle(x + s / 2, y + 2, x + s * 0.3, y + s * 0.32, x + s * 0.7, y + s * 0.32);
      triangle(x + s / 2, y + s - 2, x + s * 0.3, y + s * 0.68, x + s * 0.7, y + s * 0.68);
      triangle(x + 2, y + s / 2, x + s * 0.32, y + s * 0.3, x + s * 0.32, y + s * 0.7);
      triangle(x + s - 2, y + s / 2, x + s * 0.68, y + s * 0.3, x + s * 0.68, y + s * 0.7);
      break;
    }
    case "F": {
      // A static flame shape made of dots, brighter toward the bottom.
      const flame = ["..#...", ".##.#.", ".####.", "######", "######", "######"];
      const dot = s / 6;
      noStroke();
      flame.forEach((line, r) => {
        [...line].forEach((ch, c) => {
          if (ch !== "#") return;
          Phosphor.fill((90 + r * 30) * (alpha / 255));
          rect(x + c * dot, y + r * dot, dot - 1, dot - 1);
        });
      });
      break;
    }
    case "G": {
      const inset = s * 0.1;
      noFill();
      Phosphor.stroke(alpha, 2);
      rect(x + inset, y + inset, s - inset * 2, s - inset * 2, s * 0.18);
      if (Phosphor.blink()) {
        noStroke();
        Phosphor.fill(alpha);
        rect(x + s * 0.4, y + s * 0.28, s * 0.2, s * 0.44);
      }
      break;
    }
    case "K":
      noFill();
      Phosphor.stroke(alpha, 2);
      circle(x + s * 0.32, y + s / 2, s * 0.28);
      line(x + s * 0.46, y + s / 2, x + s * 0.82, y + s / 2);
      line(x + s * 0.68, y + s / 2, x + s * 0.68, y + s * 0.64);
      line(x + s * 0.78, y + s / 2, x + s * 0.78, y + s * 0.68);
      break;
    case "O":
      noFill();
      Phosphor.stroke(alpha, 2);
      rect(x + s * 0.2, y + s - 9, s * 0.6, 6);
      Phosphor.stroke(170 * (alpha / 255), 1);
      line(x + 2, y + s - 1, x + s - 2, y + s - 1);
      break;
    case "D":
      noFill();
      Phosphor.stroke(alpha, 2);
      rect(x + 2, y + 2, s - 4, s - 4);
      Phosphor.stroke(170 * (alpha / 255), 1);
      for (const bar of [0.3, 0.5, 0.7]) line(x + s * bar, y + 4, x + s * bar, y + s - 4);
      break;
    case "W":
      noFill();
      Phosphor.stroke(140 * (alpha / 255), 1);
      line(x + 2, y + 2, x + s * 0.75, y + 4);
      line(x + 2, y + 2, x + 4, y + s * 0.75);
      line(x + 2, y + 2, x + s * 0.7, y + s * 0.7);
      break;
    case "L":
      noFill();
      Phosphor.stroke(170 * (alpha / 255), 1);
      line(x + s / 2, y, x + s / 2, y + s * 0.3);
      Phosphor.stroke(alpha, 2);
      line(x + s * 0.35, y + s * 0.3, x + s * 0.65, y + s * 0.3);
      line(x + s * 0.35, y + s * 0.3, x + s * 0.2, y + s * 0.55);
      line(x + s * 0.65, y + s * 0.3, x + s * 0.8, y + s * 0.55);
      noStroke();
      Phosphor.fill(alpha);
      circle(x + s / 2, y + s * 0.55, s * 0.18);
      break;
    case "P":
      noFill();
      Phosphor.stroke(alpha, 2);
      rect(x + s * 0.2, y + s * 0.35, s * 0.6, s * 0.65 - 1);
      noStroke();
      Phosphor.fill(alpha);
      textAlign(CENTER, CENTER);
      textSize(s * 0.6);
      text("P", x + s / 2, y + s * 0.62);
      break;
  }
}
