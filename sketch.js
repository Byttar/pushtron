// PUSHTRON - p5 entry point. Game logic lives in src/, drawing in src/render/.
// Move: A/D or arrows. Jump: W / Up / Space. R: restart level.
// Hold click: a bubble that repels blocks and fire. Drag to move it, release to let them return.

let game;
let renderer;

async function setup() {
  const [sprite, hangSprite, font] = await Promise.all([
    loadOptional(loadImage, CONFIG.player.sprite.path),
    loadOptional(loadImage, CONFIG.player.sprite.hangPath),
    loadOptional(loadFont, THEME.fontPath),
  ]);

  game = new Game(DIFFICULTIES);
  renderer = new Renderer(sprite, hangSprite);

  const size = Layout.canvasSize();
  createCanvas(size.width, size.height);
  noSmooth();
  textFont(font ?? "monospace");
}

// The game receives canvas coordinates and converts them for the menu or the level.
function draw() {
  game.update(Math.min(deltaTime, CONFIG.maxFrameTime), { x: mouseX, y: mouseY });
  renderer.draw(game);
}

function mousePressed() {
  game?.pointerPressed(mouseX, mouseY);
}

function mouseReleased() {
  game?.pointerReleased();
}

// Assets can't load when index.html is opened straight from disk (use Live Server);
// the game still runs with plain shapes and the default font.
async function loadOptional(loader, path) {
  try {
    return await loader(path);
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return null;
  }
}
