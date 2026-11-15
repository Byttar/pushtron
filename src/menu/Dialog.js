// A conversation box shown over a level: one or more pages of text, typed out one character at
// a time while the "speaking" sound loops. The level is paused while it's open.
// Enter, Space or a click finishes the page being typed, then moves to the next one.
// Layout (in screen coordinates, like the menus) is here; drawing is in Renderer.
class Dialog {
  static ADVANCE_KEYS = ["enter", " "];
  static MARGIN = 40;
  static HEIGHT = 130;
  static PADDING = 22;

  constructor(sfx) {
    this.sfx = sfx;
    this.pages = [];
    this.page = 0;
    this.elapsed = 0;
  }

  get isOpen() {
    return this.page < this.pages.length;
  }

  get text() {
    return this.pages[this.page] ?? "";
  }

  get shownText() {
    return this.text.slice(0, Math.floor(this.elapsed / CONFIG.dialog.typeSpeed));
  }

  get isTyping() {
    return this.isOpen && this.shownText.length < this.text.length;
  }

  get isLastPage() {
    return this.page === this.pages.length - 1;
  }

  // Along the top of the screen: levels are built up from the floor, so that's usually empty sky
  // and the box doesn't hide what the text is talking about.
  get box() {
    const screen = Layout.screenRect();
    const { MARGIN, HEIGHT } = Dialog;
    return { x: MARGIN, y: MARGIN / 2, w: screen.w - MARGIN * 2, h: HEIGHT };
  }

  open(pages) {
    this.pages = pages;
    this.page = 0;
    this.elapsed = 0;
  }

  close() {
    this.pages = [];
    this.page = 0;
    this.silence();
  }

  update(dt) {
    if (!this.isOpen) return;
    this.elapsed += dt;
    if (this.isTyping) this.sfx.startLoop("speaking");
    else this.silence();
  }

  silence() {
    this.sfx.stopLoop("speaking");
  }

  // The first press shows the whole page; the next one turns it.
  advance() {
    if (this.isTyping) {
      this.elapsed = this.text.length * CONFIG.dialog.typeSpeed;
      this.silence();
      return;
    }
    this.sfx.play("select");
    this.page++;
    this.elapsed = 0;
    if (!this.isOpen) this.close();
  }
}
