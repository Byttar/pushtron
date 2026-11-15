// Level editor: paint a map on a grid and copy it out in the format levels.js expects.
// Uses the same legend as the game (see src/levels.js).

const EDITOR_CELL = 32;
const EMPTY = ".";

const TOOLS = [
  { char: "#", label: "WALL" },
  { char: "B", label: "BLOCK" },
  { char: "F", label: "FIRE" },
  { char: "G", label: "GOAL" },
  { char: "K", label: "KEY" },
  { char: "O", label: "BUTTON" },
  { char: "D", label: "DOOR" },
  { char: "P", label: "PLAYER" },
  { char: EMPTY, label: "ERASE" },
];

let grid = [];
let tool = "#";
let painting = null; // the char being painted while the pointer is held, or null
let hoverCell = null;

function setup() {
  const canvas = createCanvas(EDITOR_CELL, EDITOR_CELL);
  canvas.parent("stage");
  textFont("VT323, monospace");

  const el = canvas.elt;
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    painting = e.button === 2 ? EMPTY : tool;
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
  fitCanvas();
}

// Keeps whatever fits in the new size, anchored to the top-left corner.
function resizeGrid(cols, rows) {
  grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => grid[r]?.[c] ?? EMPTY));
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
  if (!cell || grid[cell.row][cell.col] === painting) return;
  // A level has a single player start.
  if (painting === "P") grid = grid.map((row) => row.map((char) => (char === "P" ? EMPTY : char)));
  grid[cell.row][cell.col] = painting;
  updateOutput();
}

// ---------- Text in and out ----------

function levelText() {
  const lines = grid.map((row) => `        "${row.join("")}",`);
  return ["      [", ...lines, "      ],"].join("\n");
}

// Accepts a level copied from levels.js: every quoted string is one row.
function parseLevel(text) {
  const rows = [...text.matchAll(/["'`]([^"'`\n]*)["'`]/g)].map((m) => m[1]);
  if (rows.length === 0) return null;
  const cols = Math.max(...rows.map((r) => r.length));
  if (cols === 0) return null;
  return rows.map((r) => Array.from({ length: cols }, (_, c) => (TOOLS.some((t) => t.char === r[c]) ? r[c] : EMPTY)));
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
  TOOLS.forEach(({ char, label }, i) => {
    const button = document.createElement("button");
    button.textContent = `${i + 1} ${char} ${label}`;
    button.dataset.char = char;
    button.addEventListener("click", () => selectTool(char));
    palette.appendChild(button);
  });
  selectTool(tool);

  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const index = Number(e.key) - 1;
    if (TOOLS[index]) selectTool(TOOLS[index].char);
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
    grid = parsed;
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

  Phosphor.glow(6);
  grid.forEach((row, r) => row.forEach((char, c) => drawCell(char, c * EDITOR_CELL, r * EDITOR_CELL, 255)));

  if (hoverCell) {
    const x = hoverCell.col * EDITOR_CELL;
    const y = hoverCell.row * EDITOR_CELL;
    drawCell(tool, x, y, 110);
    noFill();
    Phosphor.stroke(110, 1);
    Phosphor.dashed([3, 3]);
    rect(x + 0.5, y + 0.5, EDITOR_CELL - 1, EDITOR_CELL - 1);
    Phosphor.solid();
  }
  Phosphor.noGlow();
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
