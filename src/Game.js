// Game flow: menu, which level is loaded, win/lose state, and routing input.
class Game {
  static State = Object.freeze({
    MENU: "menu",
    LOADING: "loading",
    PLAYING: "playing",
    DEAD: "dead",
    WON: "won",
    FINISHED: "finished",
  });

  constructor(difficulties) {
    this.difficulties = difficulties;
    this.saveData = new SaveData();
    this.music = new Music(this.saveData.musicEnabled, this.saveData.musicVolume);
    this.sfx = new Sfx();
    this.menu = new MainMenu(this);
    this.exitPrompt = new ExitPrompt(this);
    this.input = new Input((key) => this.onKeyPressed(key));

    this.difficulty = null;
    this.levelIndex = 0;
    this.level = null;
    this.world = null;

    Game.warnAboutOversizedDifficulties(difficulties);
    this.openMenu();
  }

  static warnAboutOversizedDifficulties(difficulties) {
    for (const { name, levels } of difficulties) {
      if (levels.length > CONFIG.maxLevelsPerDifficulty) {
        console.warn(`${name} has ${levels.length} levels; only the first ${CONFIG.maxLevelsPerDifficulty} are shown.`);
      }
    }
  }

  difficultyById(id) {
    return this.difficulties.find((d) => d.id === id);
  }

  // Levels of a difficulty that the menu can show.
  playableLevels(difficulty) {
    return difficulty.levels.slice(0, CONFIG.maxLevelsPerDifficulty);
  }

  // `withTransition` plays the loading screen and fade-in.
  loadLevel(difficulty, index, withTransition = false) {
    this.difficulty = difficulty;
    this.levelIndex = index;
    this.level = new Level(difficulty.levels[index]);
    this.world = new World(this.level);
    this.state = withTransition ? Game.State.LOADING : Game.State.PLAYING;
    this.loadingElapsed = 0;
    this.fadeDuration = withTransition ? CONFIG.transition.fadeTime : 0;
    this.fadeElapsed = 0;
    this.winElapsed = 0;
    this.reachedGoal = null;
    this.deathCause = null;
    this.deathBurst = null;
    this.input.consumeJump();
  }

  startLevel(difficultyId, index) {
    const difficulty = this.difficultyById(difficultyId);
    if (difficulty && this.saveData.isUnlocked(difficultyId, index)) this.loadLevel(difficulty, index, true);
  }

  restart() {
    this.loadLevel(this.difficulty, this.levelIndex);
  }

  nextLevel() {
    if (this.isLastLevel) this.openMenu(MainMenu.Page.LEVELS, this.difficulty.id);
    else this.loadLevel(this.difficulty, this.levelIndex + 1, true);
  }

  // 0 to 1 through the glow after reaching the goal.
  get winProgress() {
    return Math.min(1, this.winElapsed / CONFIG.transition.winGlowTime);
  }

  get isCelebrating() {
    return (this.state === Game.State.WON || this.state === Game.State.FINISHED) && this.winProgress < 1;
  }

  // 0 to 1 through the loading screen.
  get loadingProgress() {
    return Math.min(1, this.loadingElapsed / CONFIG.transition.loadTime);
  }

  get isFadingIn() {
    return this.state === Game.State.PLAYING && this.fadeElapsed < this.fadeDuration;
  }

  // How dark the level still is: 1 when it starts, eased down to 0.
  get fadeAmount() {
    if (!this.isFadingIn) return 0;
    return (1 - this.fadeElapsed / this.fadeDuration) ** 2;
  }

  openMenu(page = MainMenu.Page.MAIN, difficultyId = null) {
    this.world?.clearBubbles();
    this.menu.openPage(page, difficultyId);
    this.state = Game.State.MENU;
  }

  // Esc during a level goes back to that difficulty's level list.
  returnToLevelList() {
    this.openMenu(MainMenu.Page.LEVELS, this.difficulty.id);
  }

  setMusicVolume(volume) {
    const before = this.music.volume;
    this.music.setVolume(volume);
    if (this.music.volume === before) return false;
    this.saveData.setMusicVolume(this.music.volume);
    return true;
  }

  toggleMusic() {
    const enabled = !this.music.enabled;
    this.music.setEnabled(enabled);
    this.saveData.setMusicEnabled(enabled);
  }

  get isLastLevel() {
    return this.levelIndex === this.playableLevels(this.difficulty).length - 1;
  }

  // `pointer` is in canvas coordinates.
  update(dt, pointer) {
    if (this.exitPrompt.isOpen) {
      this.exitPrompt.hover(Layout.toScreen(pointer.x, pointer.y));
    } else if (this.state === Game.State.MENU) {
      this.menu.hover(Layout.toScreen(pointer.x, pointer.y));
    } else if (this.state === Game.State.LOADING) {
      this.loadingElapsed += dt;
      if (this.loadingProgress >= 1) {
        this.state = Game.State.PLAYING;
        this.music.switchTo(CONFIG.audio.levelSoundtrack);
      }
    } else if (this.isFadingIn) {
      // The level holds still until it has faded in.
      this.fadeElapsed += dt;
    } else if (this.state === Game.State.PLAYING) {
      const { x, y } = Layout.toLevel(pointer.x, pointer.y, this.level);
      this.world.moveBubble(x, y);
      this.world.update(dt, this.input);
      if (this.world.player.justJumped) this.sfx.play("jump");
      for (const sound of this.world.events) this.sfx.play(sound);
      this.checkOutcome();
    } else if (this.state === Game.State.DEAD) {
      // Bubbles are cleared on death, so the tiles slide back home.
      this.world.updateTiles(dt);
      this.deathBurst.update(dt, this.level);
    } else if (this.state === Game.State.WON || this.state === Game.State.FINISHED) {
      // The level stays frozen while the goal glows; then the next level loads on its own.
      this.winElapsed += dt;
      if (this.state === Game.State.WON && this.winProgress >= 1) this.nextLevel();
    }
  }

  checkOutcome() {
    if (this.world.playerCrushed) {
      this.die("crush");
    } else if (this.world.isPlayerBurned()) {
      this.die("fire");
    } else if (this.world.hasPlayerFallen()) {
      this.die("fall");
    } else if (this.world.hasPlayerReachedGoal()) {
      this.reachedGoal = this.world.goalReachedByPlayer();
      this.saveData.markCleared(this.difficulty.id, this.levelIndex);
      this.state = this.isLastLevel ? Game.State.FINISHED : Game.State.WON;
      this.world.clearBubbles();
    }
  }

  // Stays dead until the player presses R (or Esc for the menu).
  die(cause) {
    const { player, level } = this.world;
    this.state = Game.State.DEAD;
    this.deathCause = cause;
    this.world.playerAlive = false;
    this.world.clearBubbles();
    this.sfx.play("die");

    if (cause === "fall") {
      // The body is already off screen, so it bursts up from the bottom edge.
      const rect = { ...player.bounds, y: level.pixelHeight - player.height };
      this.deathBurst = new ParticleBurst(rect, CONFIG.fallBurstLift);
    } else {
      this.deathBurst = new ParticleBurst(player.bounds);
    }
  }

  // `x` and `y` are in canvas coordinates.
  pointerPressed(x, y) {
    this.music.unlock();
    const screenPoint = Layout.toScreen(x, y);
    if (this.exitPrompt.isOpen) {
      this.exitPrompt.click(screenPoint.x, screenPoint.y);
    } else if (this.state === Game.State.MENU) {
      this.menu.click(screenPoint.x, screenPoint.y);
    } else if (this.state === Game.State.FINISHED && !this.isCelebrating) {
      this.nextLevel();
    } else if (this.state === Game.State.PLAYING && !this.isFadingIn) {
      const levelPoint = Layout.toLevel(x, y, this.level);
      if (this.level.isInside(levelPoint.x, levelPoint.y)) this.world.startBubble(levelPoint.x, levelPoint.y);
    }
  }

  pointerReleased() {
    this.menu.endDrag();
    this.world?.releaseBubbles();
  }

  onKeyPressed(key) {
    this.music.unlock();
    if (this.state === Game.State.MENU) {
      this.menu.handleKey(key);
      return;
    }

    if (this.exitPrompt.isOpen) this.exitPrompt.handleKey(key);
    else if (key === "escape") this.exitPrompt.open();
    else if (this.state === Game.State.LOADING || this.state === Game.State.WON) return;
    else if (this.state === Game.State.FINISHED) {
      if (key === "enter" && !this.isCelebrating) this.nextLevel();
    } else if (key === "r") this.restart();
  }
}
