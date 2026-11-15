// Typed terminal message shown over the level when it's cleared or the player dies.
class MessageOverlay {
  static DEATH_CAUSES = { fire: "BURNED", fall: "LOST IN THE VOID", crush: "CRUSHED" };

  static TYPE_SPEED = 28; // ms per typed character
  static BOX_WIDTH = 420;
  static BOX_HEIGHT = 100;

  constructor() {
    this.lastState = null;
    this.stateChangedAt = 0;
  }

  // `dim` darkens the level behind the box; `delay` is ms before the box appears.
  static messageFor(game) {
    switch (game.state) {
      case Game.State.FINISHED:
        return {
          lines: [`> ALL ${game.difficulty.name} SECTORS CLEARED`, "> ENTER/CLICK: BACK TO SECTORS"],
          dim: true,
          delay: CONFIG.transition.winGlowTime,
        };
      case Game.State.DEAD:
        return {
          lines: [`> YOU DIED // ${MessageOverlay.DEATH_CAUSES[game.deathCause]}`, "> PRESS R TO RESTART   ESC: MENU"],
          dim: false,
          delay: CONFIG.deathMessageDelay,
        };
      default:
        return null;
    }
  }

  draw(game) {
    if (game.state !== this.lastState) {
      this.lastState = game.state;
      this.stateChangedAt = millis();
    }

    const message = MessageOverlay.messageFor(game);
    if (!message) return;
    const elapsed = millis() - this.stateChangedAt - message.delay;
    if (elapsed < 0) return;

    const area = Layout.screenRect();
    if (message.dim) {
      noStroke();
      fill(0, 0, 0, 190);
      rect(area.x, area.y, area.w, area.h);
    }

    const { BOX_WIDTH: w, BOX_HEIGHT: h } = MessageOverlay;
    const x = area.x + (area.w - w) / 2;
    const y = area.y + (area.h - h) / 2;
    this.drawBox(x, y, w, h);
    this.drawTypedLines(message.lines, x + 22, y + 24, elapsed);
  }

  drawBox(x, y, w, h) {
    Phosphor.glow(8);
    fill(...THEME.background);
    Phosphor.stroke(255, 2);
    rect(x, y, w, h);
    noFill();
    Phosphor.stroke(110, 1);
    rect(x + 5, y + 5, w - 10, h - 10);
    Phosphor.noGlow();
  }

  // Lines appear one character at a time, with a blinking cursor at the end.
  drawTypedLines(lines, x, y, elapsed) {
    let budget = Math.floor(elapsed / MessageOverlay.TYPE_SPEED);
    noStroke();
    Phosphor.glow(6);
    Phosphor.fill();
    textSize(THEME.textSize);
    textAlign(LEFT, TOP);
    lines.forEach((line, i) => {
      const shown = line.slice(0, Math.max(0, budget));
      budget -= line.length;
      const typingThisLine = budget < 0 && shown.length > 0;
      const finishedTyping = i === lines.length - 1 && budget >= 0;
      const cursor = typingThisLine || (finishedTyping && Phosphor.blink()) ? "_" : "";
      text(shown + cursor, x, y + i * (THEME.lineHeight + 8));
    });
    Phosphor.noGlow();
  }
}
