// Draws the menu pages inside the screen frame. The selected item is shown inverted,
// like a highlighted line on a terminal.
class MenuRenderer {
  static HINTS = {
    [MainMenu.Page.MAIN]: "A/D MOVE   W/SPACE JUMP   HOLD+DRAG PUSH   R RESET   ESC MENU",
    [MainMenu.Page.DIFFICULTY]: "ARROWS SELECT   ENTER OPEN   ESC BACK",
    [MainMenu.Page.LEVELS]: "ARROWS SELECT   ENTER PLAY   ESC BACK",
    [MainMenu.Page.CREDITS]: "ESC BACK",
  };

  static CREDITS = [
    { text: GAME_TITLE, size: 48 },
    { text: 'INSPIRED BY "PUSH" BY CASUAL COLLECTIVE', size: THEME.textSize + 4 },
    { text: "", size: 4 },
    { text: "SOUNDTRACK & SOUND DESIGN: GABRIEL NADALETI", size: THEME.textSize },
    { text: "MADE WITH THE HELP OF AI (CLAUDE OPUS 5.5)", size: THEME.textSize },
    { text: "", size: 4 },
    { text: "BUILT WITH P5.JS", size: THEME.textSize, alpha: 150 },
    { text: "FONT: VT323 (SIL OPEN FONT LICENSE)", size: THEME.textSize, alpha: 150 },
  ];

  draw(menu) {
    const screen = Layout.screenRect();
    push();
    translate(screen.x, screen.y);
    Phosphor.glow(8);

    if (menu.page === MainMenu.Page.MAIN) this.drawTitle();
    else if (menu.page === MainMenu.Page.DIFFICULTY) this.drawHeading("> SELECT DIFFICULTY");
    else if (menu.page === MainMenu.Page.CREDITS) this.drawCredits();
    else this.drawHeading(`> ${menu.difficulty.name} // SELECT SECTOR`);

    menu.items.forEach((item, i) => {
      const selected = i === menu.selected;
      if (item.kind === "card") this.drawDifficultyCard(item, selected);
      else if (item.kind === "tile") this.drawLevelTile(item, selected);
      else if (item.kind === "slider") this.drawSlider(item, selected);
      else this.drawButton(item, selected);
    });
    this.drawHint(MenuRenderer.HINTS[menu.page], screen);

    Phosphor.noGlow();
    Phosphor.solid();
    pop();
  }

  drawTitle() {
    const x = MainMenu.PADDING;
    noStroke();
    Phosphor.fill();
    textAlign(LEFT, TOP);
    textSize(110);
    text(GAME_TITLE, x - 4, 10);
  }

  drawCredits() {
    this.drawHeading("> CREDITS");
    noStroke();
    textAlign(LEFT, TOP);
    let y = 130;
    for (const line of MenuRenderer.CREDITS) {
      Phosphor.fill(line.alpha ?? 255);
      textSize(line.size);
      text(line.text, MainMenu.PADDING, y);
      y += line.size + 8;
    }
  }

  drawHeading(label) {
    noStroke();
    Phosphor.fill();
    textAlign(LEFT, CENTER);
    textSize(40);
    text(label + (Phosphor.blink() ? "_" : ""), MainMenu.PADDING, MainMenu.CORNER_BUTTON.y + MainMenu.CORNER_BUTTON.h / 2);
  }

  drawButton(item, selected) {
    const { x, y, h } = item.rect;
    this.drawBox(item.rect, selected);
    this.textColor(selected);
    textSize(item.small ? 20 : 26);
    textAlign(LEFT, CENTER);
    text(`${selected ? ">" : " "} ${item.label}`, x + (item.small ? 10 : 14), y + h / 2 - 2);
  }

  // Label plus a row of segments, one per volume step.
  drawSlider(item, selected) {
    const { x, y, h } = item.rect;
    this.drawBox(item.rect, selected);
    this.textColor(selected);
    textSize(26);
    textAlign(LEFT, CENTER);
    text(`${selected ? ">" : " "} ${item.label}`, x + 14, y + h / 2 - 2);

    const track = MainMenu.sliderTrack(item.rect);
    const segments = Math.round(1 / Music.VOLUME_STEP);
    const filled = Math.round(item.value * segments);
    const gap = 2;
    const segmentWidth = (track.w - gap * (segments - 1)) / segments;
    for (let i = 0; i < segments; i++) {
      const sx = track.x + i * (segmentWidth + gap);
      if (i < filled) {
        this.textColor(selected);
        rect(sx, track.y, segmentWidth, track.h);
      } else {
        noFill();
        if (selected) stroke(...THEME.background);
        else Phosphor.stroke(110, 1);
        strokeWeight(1);
        rect(sx + 0.5, track.y + 0.5, segmentWidth - 1, track.h - 1);
      }
    }
  }

  drawDifficultyCard(item, selected) {
    const { x, y, w, h } = item.rect;
    const pad = 18;

    if (!item.enabled) {
      this.drawDisabledBox(item.rect);
      textAlign(LEFT, TOP);
      textSize(44);
      text(item.label, x + pad, y + pad);
      textSize(THEME.textSize);
      text("NO SECTORS YET", x + pad, y + 90);
      return;
    }

    this.drawBox(item.rect, selected);
    this.textColor(selected);
    textAlign(LEFT, TOP);
    textSize(44);
    text(`${selected ? ">" : ""}${item.label}`, x + pad, y + pad);
    textSize(THEME.textSize);
    text(`${item.levelCount} SECTOR${item.levelCount === 1 ? "" : "S"}`, x + pad, y + 90);
    text(`CLEARED ${item.clearedCount}/${item.levelCount}`, x + pad, y + 115);

    // Progress bar
    const barY = y + h - 36;
    const barW = w - pad * 2;
    noFill();
    if (selected) stroke(...THEME.background);
    else Phosphor.stroke(255, 1);
    strokeWeight(1);
    rect(x + pad, barY, barW, 12);
    this.textColor(selected);
    rect(x + pad + 2, barY + 2, (barW - 4) * (item.clearedCount / item.levelCount), 8);
  }

  drawLevelTile(item, selected) {
    const { x, y, w, h } = item.rect;

    if (item.enabled) {
      this.drawBox(item.rect, selected);
      this.textColor(selected);
    } else {
      this.drawDisabledBox(item.rect);
    }

    textAlign(CENTER, CENTER);
    textSize(28);
    text(item.label, x + w / 2, y + h / 2 - 7);
    textSize(14);
    text(item.status, x + w / 2, y + h - 11);

    // Corner marker on cleared levels.
    if (item.status === "CLEAR") {
      this.textColor(selected);
      triangle(x + w - 12, y + 2, x + w - 2, y + 2, x + w - 2, y + 12);
    }
  }

  drawBox(box, selected) {
    const { x, y, w, h } = box;
    if (selected) {
      noStroke();
      Phosphor.fill();
    } else {
      noFill();
      Phosphor.stroke(255, 2);
    }
    rect(x, y, w, h);
  }

  // Dashed, dim outline; leaves the fill set for dim text.
  drawDisabledBox(box) {
    noFill();
    Phosphor.stroke(70, 1);
    Phosphor.dashed([4, 4]);
    rect(box.x, box.y, box.w, box.h);
    Phosphor.solid();
    noStroke();
    Phosphor.fill(70);
  }

  textColor(selected) {
    noStroke();
    if (selected) fill(...THEME.background);
    else Phosphor.fill();
  }

  drawHint(hint, screen) {
    noStroke();
    Phosphor.fill(110);
    textSize(18);
    textAlign(LEFT, BOTTOM);
    text(hint, MainMenu.PADDING, screen.h - 24);
  }
}
