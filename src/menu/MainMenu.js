// Menu pages, their items, where those sit and what they do. Drawing is in MenuRenderer.
// Item rects are in screen coordinates, i.e. relative to the inside of the screen frame.
//
// Pages: MAIN (new game, music) -> DIFFICULTY (easy/medium/hard) -> LEVELS (that difficulty's grid).
class MainMenu {
  static Page = Object.freeze({ MAIN: "main", DIFFICULTY: "difficulty", LEVELS: "levels", CREDITS: "credits" });

  static PADDING = 60;
  static CORNER_BUTTON = { w: 200, h: 44, y: 40 }; // music on the main page, back on the others
  static NEW_GAME_RECT = { x: 60, y: 170, w: 260, h: 48 };
  static CARDS_TOP = 130;
  static CARD_HEIGHT = 200;
  static CARD_GAP = 20;
  static GRID_TOP = 130;
  static TILE = 56;
  static TILE_GAP = 12;
  static TILES_PER_ROW = 10; // 20 levels fit in two rows
  static CREDITS_BUTTON = { w: 120, h: 32, bottom: 14 }; // bottom-right corner of the main page
  static SLIDER_GAP = 12;
  static SLIDER_LABEL_WIDTH = 82;

  static PREV_KEYS = ["arrowup", "arrowleft", "w", "a"];
  static NEXT_KEYS = ["arrowdown", "arrowright", "s", "d"];
  static ACTIVATE_KEYS = ["enter", " "];
  // Left/right change the value of a selected slider instead of moving the selection.
  static SLIDER_KEYS = { arrowleft: -1, a: -1, arrowright: 1, d: 1 };

  constructor(game) {
    this.game = game;
    this.page = MainMenu.Page.MAIN;
    this.difficultyId = null;
    this.selected = 0;
    this.lastPointer = null;
    this.dragging = false;
  }

  get difficulty() {
    return this.game.difficultyById(this.difficultyId);
  }

  openPage(page, difficultyId = this.difficultyId) {
    this.page = page;
    this.difficultyId = difficultyId;
    this.selected = Math.max(0, this.items.findIndex((item) => item.enabled));
  }

  // Esc and the back button go up one page.
  back() {
    const { Page } = MainMenu;
    if (this.page === Page.LEVELS) {
      const previous = this.difficultyId;
      this.openPage(Page.DIFFICULTY);
      this.selected = this.items.findIndex((item) => item.difficultyId === previous);
    } else if (this.page === Page.DIFFICULTY) {
      this.openPage(Page.MAIN);
    } else if (this.page === Page.CREDITS) {
      this.openPage(Page.MAIN);
      this.selected = this.items.findIndex((item) => item.id === "credits");
    }
  }

  // ---------- Items per page (keyboard order = array order) ----------

  get items() {
    switch (this.page) {
      case MainMenu.Page.DIFFICULTY:
        return [...this.game.difficulties.map((d, i) => this.difficultyCard(d, i)), this.backButton()];
      case MainMenu.Page.LEVELS:
        return [...this.game.playableLevels(this.difficulty).map((_, i) => this.levelTile(i)), this.backButton()];
      case MainMenu.Page.CREDITS:
        return [this.backButton()];
      default:
        return [
          { id: "new", kind: "button", label: "NEW GAME", rect: MainMenu.NEW_GAME_RECT, enabled: true },
          { id: "music", kind: "button", label: `MUSIC: ${this.game.music.enabled ? "ON" : "OFF"}`, rect: this.cornerRect(), enabled: true },
          { id: "volume", kind: "slider", label: "VOL", value: this.game.music.volume, rect: this.volumeRect(), enabled: true },
          { id: "credits", kind: "button", small: true, label: "CREDITS", rect: this.creditsRect(), enabled: true },
        ];
    }
  }

  creditsRect() {
    const { w, h, bottom } = MainMenu.CREDITS_BUTTON;
    const screen = Layout.screenRect();
    return { x: screen.w - MainMenu.PADDING - w, y: screen.h - bottom - h, w, h };
  }

  volumeRect() {
    const corner = this.cornerRect();
    return { ...corner, y: corner.y + corner.h + MainMenu.SLIDER_GAP };
  }

  // The draggable track inside the volume slider, shared with MenuRenderer.
  static sliderTrack(rect) {
    const left = rect.x + MainMenu.SLIDER_LABEL_WIDTH;
    return { x: left, y: rect.y + rect.h / 2 - 7, w: rect.x + rect.w - 14 - left, h: 14 };
  }

  setVolumeFromPointer(item, x) {
    const track = MainMenu.sliderTrack(item.rect);
    this.changeVolume((x - track.x) / track.w);
  }

  changeVolume(volume) {
    if (this.game.setMusicVolume(volume)) this.game.sfx.play("select");
  }

  // Dragging while the button is held keeps adjusting the slider it started on.
  drag(pointer) {
    const item = this.items[this.selected];
    if (this.dragging && item?.kind === "slider") this.setVolumeFromPointer(item, pointer.x);
  }

  endDrag() {
    this.dragging = false;
  }

  cornerRect() {
    const { w, h, y } = MainMenu.CORNER_BUTTON;
    return { x: Layout.screenRect().w - MainMenu.PADDING - w, y, w, h };
  }

  backButton() {
    return { id: "back", kind: "button", label: "BACK", rect: this.cornerRect(), enabled: true };
  }

  difficultyCard(difficulty, index) {
    const { PADDING, CARDS_TOP, CARD_HEIGHT, CARD_GAP } = MainMenu;
    const count = this.game.playableLevels(difficulty).length;
    const cardWidth = (Layout.screenRect().w - PADDING * 2 - CARD_GAP * 2) / 3;
    return {
      id: "difficulty",
      kind: "card",
      difficultyId: difficulty.id,
      label: difficulty.name,
      levelCount: count,
      clearedCount: this.game.saveData.clearedCount(difficulty.id, count),
      enabled: count > 0,
      rect: { x: PADDING + index * (cardWidth + CARD_GAP), y: CARDS_TOP, w: cardWidth, h: CARD_HEIGHT },
    };
  }

  levelTile(index) {
    const { saveData } = this.game;
    const { TILE, TILE_GAP, TILES_PER_ROW, PADDING, GRID_TOP } = MainMenu;
    const id = this.difficultyId;
    const status = saveData.isCleared(id, index) ? "CLEAR" : saveData.isUnlocked(id, index) ? "OPEN" : "LOCKED";
    const col = index % TILES_PER_ROW;
    const row = Math.floor(index / TILES_PER_ROW);
    return {
      id: "level",
      kind: "tile",
      index,
      label: String(index + 1).padStart(2, "0"),
      status,
      enabled: status !== "LOCKED",
      rect: { x: PADDING + col * (TILE + TILE_GAP), y: GRID_TOP + row * (TILE + TILE_GAP), w: TILE, h: TILE },
    };
  }

  // ---------- Input ----------

  move(step) {
    const items = this.items;
    let index = this.selected;
    do {
      index = (index + step + items.length) % items.length;
    } while (!items[index].enabled);
    this.select(index);
  }

  select(index) {
    if (index === this.selected) return;
    this.selected = index;
    this.game.sfx.play("select");
  }

  indexAt(x, y) {
    return this.items.findIndex((item) => item.enabled && Rect.contains(item.rect, x, y));
  }

  // Only follows the mouse when it actually moves, so keyboard selection isn't overridden.
  hover(pointer) {
    const moved = !this.lastPointer || this.lastPointer.x !== pointer.x || this.lastPointer.y !== pointer.y;
    this.lastPointer = { ...pointer };
    if (!moved) return;
    if (this.dragging) {
      this.drag(pointer);
      return;
    }

    const index = this.indexAt(pointer.x, pointer.y);
    if (index !== -1) this.select(index);
  }

  click(x, y) {
    const index = this.indexAt(x, y);
    if (index === -1) return;
    this.selected = index;
    const item = this.items[index];
    if (item.kind === "slider") {
      this.dragging = true;
      this.setVolumeFromPointer(item, x);
    } else {
      this.activate(item);
    }
  }

  handleKey(key) {
    const item = this.items[this.selected];
    if (item?.kind === "slider" && MainMenu.SLIDER_KEYS[key]) {
      this.changeVolume(item.value + MainMenu.SLIDER_KEYS[key] * Music.VOLUME_STEP);
      return;
    }

    if (key === "escape" && this.page !== MainMenu.Page.MAIN) {
      this.game.sfx.play("select");
      this.back();
    } else if (key === "escape") return;
    else if (MainMenu.PREV_KEYS.includes(key)) this.move(-1);
    else if (MainMenu.NEXT_KEYS.includes(key)) this.move(1);
    else if (MainMenu.ACTIVATE_KEYS.includes(key)) this.activate(this.items[this.selected]);
  }

  activate(item) {
    this.game.sfx.play("select");
    switch (item.id) {
      case "new":
        this.openPage(MainMenu.Page.DIFFICULTY);
        break;
      case "music":
        this.game.toggleMusic();
        break;
      case "credits":
        this.openPage(MainMenu.Page.CREDITS);
        break;
      case "back":
        this.back();
        break;
      case "difficulty":
        this.openPage(MainMenu.Page.LEVELS, item.difficultyId);
        break;
      case "level":
        this.game.startLevel(this.difficultyId, item.index);
        break;
    }
  }
}
