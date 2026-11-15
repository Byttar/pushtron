// Draws the game world in the phosphor-terminal style; game classes only hold state.
class Renderer {
  static FIRE_RESOLUTION = 6; // simulation cells per tile side
  static FIRE_CORE = [210, 255, 180]; // the hottest cells glow almost white

  constructor(playerSprite, hangSprite) {
    this.playerSprite = playerSprite; // animated GIF, or null if it failed to load
    this.hangSprite = hangSprite ?? playerSprite; // shown while hanging from a ceiling
    this.messageOverlay = new MessageOverlay();
    this.menuRenderer = new MenuRenderer();
    this.loadingScreen = new LoadingScreen();
    this.staticLayer = null;
    this.staticLevel = null;
    this.fireEffects = new WeakMap(); // Fire tile -> DoomFire
  }

  draw(game) {
    Phosphor.noGlow();
    background(...THEME.background);

    if (game.state === Game.State.MENU) {
      this.drawPanel(window);
      this.menuRenderer.draw(game.menu);
      return;
    }
    if (game.state === Game.State.LOADING) {
      this.drawPanel(window);
      this.loadingScreen.draw(game);
      return;
    }

    const { level, world } = game;
    const origin = Layout.levelOrigin(level);
    const dead = game.state === Game.State.DEAD;
    const won = game.state === Game.State.WON || game.state === Game.State.FINISHED;

    image(this.staticLayerFor(level), 0, 0);

    push();
    translate(origin.x, origin.y);
    if (won) this.drawWinLight(game.reachedGoal, game.winProgress);
    Phosphor.glow();
    this.drawHomeOutlines(world.tiles);
    this.drawDoors(level);
    for (const button of world.buttons) this.drawButton(button);
    for (const goal of world.goals) this.drawGoal(goal, !world.hasAllKeys);
    for (const tile of world.tiles) {
      if (tile instanceof Fire) this.drawFire(tile, !won);
      else if (tile instanceof Block) this.drawBlock(tile);
    }
    this.drawDust(world.dust);
    if (dead) this.drawParticles(game.deathBurst, level);
    else this.drawPlayer(world.player, !won);
    for (const key of world.keys) this.drawKey(key);
    this.drawBubbles(world.bubbles);
    if (won) this.drawWinGlow(game.reachedGoal, game.winProgress);
    Phosphor.noGlow();
    pop();

    this.messageOverlay.draw(game);
    this.drawFadeIn(game.fadeAmount);
    if (game.state === Game.State.WON) this.drawWinFadeOut(game.winProgress);
    if (game.exitPrompt.isOpen) this.drawExitPrompt(game.exitPrompt);
  }

  // Dims the paused level and shows the leave/stay box in the message-box style.
  drawExitPrompt(prompt) {
    const screen = Layout.screenRect();
    noStroke();
    fill(0, 0, 0, 190);
    rect(screen.x, screen.y, screen.w, screen.h);

    push();
    translate(screen.x, screen.y);
    const box = prompt.box;
    this.messageOverlay.drawBox(box.x, box.y, box.w, box.h);

    noStroke();
    Phosphor.glow(6);
    Phosphor.fill();
    textSize(THEME.textSize);
    textAlign(LEFT, TOP);
    text("> LEAVE THIS SECTOR?" + (Phosphor.blink() ? "_" : ""), box.x + 22, box.y + 24);
    Phosphor.fill(110);
    text("> PROGRESS ON IT WILL BE LOST", box.x + 22, box.y + 24 + THEME.lineHeight + 8);

    Phosphor.glow(8);
    prompt.items.forEach((item, i) => this.menuRenderer.drawButton(item, i === prompt.selected));
    Phosphor.noGlow();
    pop();
  }

  // ---------- Reaching the goal ----------

  // Light flooding out from the goal, drawn behind everything else.
  drawWinLight(goal, progress) {
    const cx = goal.x + CELL / 2;
    const cy = goal.y + CELL / 2;
    const radius = CELL * (1 + 5 * (1 - (1 - progress) ** 3));
    const strength = Math.min(1, progress / 0.2);
    const ctx = drawingContext;
    const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    light.addColorStop(0, `rgba(66, 255, 0, ${0.22 * strength})`);
    light.addColorStop(1, "rgba(66, 255, 0, 0)");
    ctx.fillStyle = light;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  // The goal lights up solid and sends out expanding rings.
  drawWinGlow(goal, progress) {
    const cx = goal.x + CELL / 2;
    const cy = goal.y + CELL / 2;
    const strength = Math.min(1, progress / 0.2);

    Phosphor.glow(8 + 16 * strength);
    noStroke();
    fill(...Renderer.FIRE_CORE, 210 * strength);
    const inset = CELL * 0.1;
    rect(goal.x + inset, goal.y + inset, CELL - inset * 2, CELL - inset * 2, CELL * 0.18);

    noFill();
    for (const delay of [0, 0.2, 0.4]) {
      const ring = (progress - delay) / 0.6;
      if (ring <= 0 || ring >= 1) continue;
      Phosphor.stroke(160 * (1 - ring), 1.5);
      circle(cx, cy, CELL * (1 + ring * 5));
    }
  }

  // Before the next level loads, the frozen frame fades to dark.
  drawWinFadeOut(progress) {
    const fadeOut = CONFIG.transition.winFadeOut;
    const amount = (progress - (1 - fadeOut)) / fadeOut;
    if (amount <= 0) return;
    const { x, y, w, h } = Layout.screenRect();
    noStroke();
    fill(...THEME.background, 255 * Math.min(1, amount));
    rect(x, y, w, h);
  }

  // Darkens the screen while the level fades in, with a scan line sweeping down over it.
  drawFadeIn(amount) {
    if (amount <= 0) return;
    const { x, y, w, h } = Layout.screenRect();
    noStroke();
    fill(...THEME.background, 255 * amount);
    rect(x, y, w, h);

    const scanY = y + h * (1 - Math.sqrt(amount));
    Phosphor.glow(12);
    Phosphor.fill(200 * amount);
    rect(x, scanY - 1, w, 2);
    Phosphor.noGlow();
  }

  // ---------- Static layer (cached per level) ----------

  staticLayerFor(level) {
    const fresh = this.staticLayer && this.staticLevel === level && this.staticLayer.width === width;
    if (fresh) return this.staticLayer;

    this.staticLayer?.remove();
    const g = createGraphics(width, height);
    const origin = Layout.levelOrigin(level);
    this.drawPanel(g);
    g.push();
    g.translate(origin.x, origin.y);
    this.drawGrid(g, level);
    this.drawNoBubbleZones(g, level);
    this.drawWalls(g, level);
    g.pop();

    this.staticLayer = g;
    this.staticLevel = level;
    return g;
  }

  // Double-line frame around the screen, like the panels of an old terminal UI.
  drawPanel(g) {
    const { x, y, w, h } = Layout.screenRect();
    g.noFill();
    Phosphor.glow(8, g);
    Phosphor.stroke(255, 2, g);
    g.rect(x - 8, y - 8, w + 16, h + 16);
    Phosphor.noGlow(g);
    Phosphor.stroke(70, 1, g);
    g.rect(x - 13, y - 13, w + 26, h + 26);
  }

  drawGrid(g, level) {
    g.noStroke();
    Phosphor.fill(45, g);
    for (let row = 0; row <= level.rows; row++) {
      for (let col = 0; col <= level.cols; col++) {
        if (!level.isWallOrOutside(col, row)) g.rect(col * CELL - 1, row * CELL - 1, 2, 2);
      }
    }
  }

  // Red tint with diagonal stripes, outlined only around the edge of each zone. The stripes line
  // up across neighbouring cells, so a zone reads as one area.
  drawNoBubbleZones(g, level) {
    const cells = level.noBubbleCells;
    if (cells.length === 0) return;
    const [r, gr, b] = THEME.danger;
    const inZone = (col, row) => level.noBubbleKeys.has(Level.key(col, row));

    g.noStroke();
    g.fill(r, gr, b, 26);
    for (const { col, row } of cells) g.rect(col * CELL, row * CELL, CELL, CELL);

    g.stroke(r, gr, b, 70);
    g.strokeWeight(1);
    const half = CELL / 2;
    for (const { col, row } of cells) {
      const x = col * CELL;
      const y = row * CELL;
      g.line(x, y + half, x + half, y);
      g.line(x, y + CELL, x + CELL, y);
      g.line(x + half, y + CELL, x + CELL, y + half);
    }

    g.drawingContext.shadowBlur = 6;
    g.drawingContext.shadowColor = `rgba(${r}, ${gr}, ${b}, 0.75)`;
    g.stroke(r, gr, b, 200);
    g.strokeWeight(1.5);
    Phosphor.dashed([4, 3], 0, g);
    for (const { col, row } of cells) {
      const x = col * CELL;
      const y = row * CELL;
      if (!inZone(col, row - 1)) g.line(x, y, x + CELL, y);
      if (!inZone(col, row + 1)) g.line(x, y + CELL, x + CELL, y + CELL);
      if (!inZone(col - 1, row)) g.line(x, y, x, y + CELL);
      if (!inZone(col + 1, row)) g.line(x + CELL, y, x + CELL, y + CELL);
    }
    Phosphor.solid(g);
    Phosphor.noGlow(g);
  }

  // Each wall cell is its own block: an outlined square with a dotted face.
  drawWalls(g, level) {
    g.noStroke();
    Phosphor.fill(60, g);
    for (const { col, row } of level.wallCells) {
      for (let dy = 6; dy < CELL - 4; dy += 6) {
        for (let dx = 6; dx < CELL - 4; dx += 6) g.rect(col * CELL + dx - 1, row * CELL + dy - 1, 2, 2);
      }
    }

    Phosphor.glow(6, g);
    g.noFill();
    Phosphor.stroke(220, 2, g);
    for (const { col, row } of level.wallCells) {
      g.rect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
    }
    Phosphor.noGlow(g);
  }

  // ---------- Dynamic objects ----------

  // A little screen with a blinking cursor: the exit terminal. While keys are missing it's
  // dim and dashed, with no cursor.
  drawGoal({ x, y }, locked = false) {
    noFill();
    Phosphor.stroke(locked ? 110 : 255, 2);
    if (locked) Phosphor.dashed([3, 3]);
    const inset = CELL * 0.1;
    rect(x + inset, y + inset, CELL - inset * 2, CELL - inset * 2, CELL * 0.18);
    Phosphor.solid();
    if (!locked && Phosphor.blink()) {
      noStroke();
      Phosphor.fill();
      rect(x + CELL * 0.4, y + CELL * 0.28, CELL * 0.2, CELL * 0.44);
    }
  }

  // Closed: a barred gate. Open: a faint dashed outline where it stood.
  drawDoors(level) {
    noFill();
    for (const { col, row } of level.doorCells) {
      const x = col * CELL;
      const y = row * CELL;
      if (level.doorsOpen) {
        Phosphor.stroke(60, 1);
        Phosphor.dashed([2, 4]);
        rect(x + 3, y + 3, CELL - 6, CELL - 6);
        Phosphor.solid();
        continue;
      }
      Phosphor.stroke(255, 2);
      rect(x + 2, y + 2, CELL - 4, CELL - 4);
      Phosphor.stroke(170, 1);
      for (const bar of [0.3, 0.5, 0.7]) line(x + CELL * bar, y + 4, x + CELL * bar, y + CELL - 4);
    }
  }

  // A raised plate on the floor of its cell; flat and dim once pressed.
  drawButton({ x, y, pressed }) {
    if (pressed) {
      noStroke();
      Phosphor.fill(110);
      rect(x + 3, y + CELL - 3, CELL - 6, 2);
      return;
    }
    noFill();
    Phosphor.stroke(255, 2);
    rect(x + 5, y + CELL - 7, CELL - 10, 5);
    Phosphor.stroke(170, 1);
    line(x + 2, y + CELL - 1, x + CELL - 2, y + CELL - 1);
  }

  // A bobbing key until it's collected; then it just trails the player.
  drawKey(key) {
    const s = Key.SIZE;
    const bob = key.collected ? 0 : Math.sin(millis() / 250) * 2;
    push();
    translate(key.x, key.y + bob);
    noFill();
    Phosphor.stroke(255, 2);
    circle(-s * 0.25, 0, s * 0.4);
    line(-s * 0.05, 0, s * 0.45, 0);
    line(s * 0.28, 0, s * 0.28, s * 0.2);
    line(s * 0.42, 0, s * 0.42, s * 0.25);
    pop();
  }

  drawHomeOutlines(tiles) {
    noFill();
    Phosphor.stroke(70, 1);
    Phosphor.dashed([3, 4]);
    for (const tile of tiles) {
      if (tile.isAwayFromHome) rect(tile.homeX + 3, tile.homeY + 3, CELL - 6, CELL - 6);
    }
    Phosphor.solid();
  }

  // Outlined crate with a 3x3 grid of keys, like the keyboard in the reference art.
  drawBlock({ x, y }) {
    noFill();
    Phosphor.stroke(255, 2);
    rect(x + 2, y + 2, CELL - 4, CELL - 4);

    const key = Math.round(CELL * 0.16);
    const gap = Math.max(1, Math.round(CELL * 0.06));
    const start = (CELL - (key * 3 + gap * 2)) / 2;
    Phosphor.stroke(170, 1);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) rect(x + start + i * (key + gap), y + start + j * (key + gap), key, key);
    }
  }

  fireEffectFor(tile) {
    let effect = this.fireEffects.get(tile);
    if (!effect) {
      effect = new DoomFire(Renderer.FIRE_RESOLUTION, Renderer.FIRE_RESOLUTION);
      this.fireEffects.set(tile, effect);
    }
    return effect;
  }
  // Doom-fire flames drawn as phosphor dots: brighter where hotter.
  drawFire(tile, animate = true) {
    const { x, y } = tile;
    const effect = this.fireEffectFor(tile);
    if (animate) effect.update(Math.min(deltaTime, CONFIG.maxFrameTime));

    // Soft light cast by the flames, and a faint box marking the deadly area.
    Phosphor.noGlow();
    const ctx = drawingContext;
    const light = ctx.createRadialGradient(x + CELL / 2, y + CELL, 0, x + CELL / 2, y + CELL, CELL);
    light.addColorStop(0, "rgba(66, 255, 0, 0.22)");
    light.addColorStop(1, "rgba(66, 255, 0, 0)");
    ctx.fillStyle = light;
    ctx.fillRect(x - CELL / 2, y - CELL / 2, CELL * 2, CELL * 1.5);

    noFill();
    Phosphor.stroke(45, 1);
    rect(x + 1, y + 1, CELL - 2, CELL - 2);

    // Shadow blur per dot is too slow, so the dots are drawn without glow.
    const dot = CELL / effect.cols;
    noStroke();
    for (let row = 0; row < effect.rows; row++) {
      for (let col = 0; col < effect.cols; col++) {
        const heat = effect.heatAt(col, row);
        if (heat < 0.15) continue;
        const level = Math.ceil(heat * 4); // 1..4 brightness steps
        if (level === 4) fill(...Renderer.FIRE_CORE);
        else Phosphor.fill(level * 70);
        rect(x + col * dot, y + row * dot, dot - 1, dot - 1);
      }
    }
    Phosphor.glow();
  }

  drawPlayer(player, animate = true) {
    const sprite = player.hanging ? this.hangSprite : this.playerSprite;
    if (!sprite) {
      noFill();
      Phosphor.stroke(255, 2);
      rect(player.x, player.y, player.width, player.height);
      return;
    }

    if (animate) sprite.play();
    else sprite.pause();

    const { scale, offsetX, offsetY } = CONFIG.player.sprite;
    image(sprite, player.x - offsetX * scale, player.y - offsetY * scale, sprite.width * scale, sprite.height * scale);
  }

  // Clipped to the level so particles falling into a pit don't draw over the frame.
  drawParticles(burst, level) {
    const ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, level.pixelWidth, level.pixelHeight);
    ctx.clip();

    Phosphor.noGlow();
    noStroke();
    for (const p of burst.visibleParticles) {
      Phosphor.fill(255 * p.alpha);
      rect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
    Phosphor.glow();
  }

  // Dimmer than the death particles, and without glow, so it reads as dust.
  drawDust(puffs) {
    Phosphor.noGlow();
    noStroke();
    for (const puff of puffs) {
      for (const p of puff.visibleParticles) {
        Phosphor.fill(170 * p.alpha);
        rect(p.x, p.y, p.size, p.size);
      }
    }
    Phosphor.glow();
  }

  drawBubbles(bubbles) {
    for (const bubble of bubbles) {
      const alpha = bubble.released ? 0.5 : 1;

      noStroke();
      Phosphor.fill(18 * alpha);
      circle(bubble.x, bubble.y, bubble.radius * 2);

      noFill();
      Phosphor.stroke(255 * alpha, 2);
      Phosphor.dashed([8, 6], -millis() / 30);
      circle(bubble.x, bubble.y, bubble.radius * 2);

      if (!bubble.released) {
        Phosphor.stroke(60, 1);
        Phosphor.dashed([2, 8]);
        circle(bubble.x, bubble.y, CONFIG.bubble.maxRadius * 2);
      }
      Phosphor.solid();
    }
  }
}
