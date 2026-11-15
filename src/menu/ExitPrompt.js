// "Leave this sector?" confirmation opened by Esc during a level. The level is paused while it's open.
// Rects are in screen coordinates, like MainMenu's. Drawing is in Renderer.
class ExitPrompt {
  static BOX = { w: 420, h: 150 };
  static BUTTON = { w: 140, h: 40, gap: 20, bottom: 22 };

  static PREV_KEYS = ["arrowleft", "a", "arrowup", "w"];
  static NEXT_KEYS = ["arrowright", "d", "arrowdown", "s"];
  static ACTIVATE_KEYS = ["enter", " "];

  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.selected = 0;
    this.lastPointer = null;
  }

  // Opens with STAY selected, so a stray Enter doesn't throw the level away.
  open() {
    this.isOpen = true;
    this.selected = 0;
    this.lastPointer = null;
    this.game.sfx.play("select");
  }

  get box() {
    const screen = Layout.screenRect();
    const { w, h } = ExitPrompt.BOX;
    return { x: (screen.w - w) / 2, y: (screen.h - h) / 2, w, h };
  }

  get items() {
    const box = this.box;
    const { w, h, gap, bottom } = ExitPrompt.BUTTON;
    const left = box.x + (box.w - w * 2 - gap) / 2;
    const y = box.y + box.h - bottom - h;
    return [
      { id: "stay", kind: "button", label: "STAY", rect: { x: left, y, w, h } },
      { id: "leave", kind: "button", label: "LEAVE", rect: { x: left + w + gap, y, w, h } },
    ];
  }

  handleKey(key) {
    if (key === "escape" || key === "n") this.choose("stay");
    else if (key === "y") this.choose("leave");
    else if (ExitPrompt.PREV_KEYS.includes(key)) this.select(0);
    else if (ExitPrompt.NEXT_KEYS.includes(key)) this.select(1);
    else if (ExitPrompt.ACTIVATE_KEYS.includes(key)) this.choose(this.items[this.selected].id);
  }

  indexAt(x, y) {
    return this.items.findIndex((item) => Rect.contains(item.rect, x, y));
  }

  // Only follows the mouse when it actually moves, so keyboard selection isn't overridden.
  hover(pointer) {
    const moved = !this.lastPointer || this.lastPointer.x !== pointer.x || this.lastPointer.y !== pointer.y;
    this.lastPointer = { ...pointer };
    if (!moved) return;
    const index = this.indexAt(pointer.x, pointer.y);
    if (index !== -1) this.select(index);
  }

  click(x, y) {
    const index = this.indexAt(x, y);
    if (index !== -1) this.choose(this.items[index].id);
  }

  select(index) {
    if (index === this.selected) return;
    this.selected = index;
    this.game.sfx.play("select");
  }

  choose(id) {
    this.isOpen = false;
    this.game.sfx.play("select");
    if (id === "leave") this.game.returnToLevelList();
    // Space can confirm, and it's also a jump key; don't let it carry into the level.
    else this.game.input.consumeJump();
  }
}
