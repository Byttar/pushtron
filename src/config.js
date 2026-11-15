const GAME_TITLE = "PUSHTRON";

// Size of one grid cell in pixels. Everything in the game is measured from it.
const CELL = 24;

// Movement is tuned for 40 px cells and scaled with CELL, so jumps cover the same
// number of tiles whatever the cell size.
const WORLD_SCALE = CELL / 40;

// The character sprite is 12x12 source pixels, drawn at this scale.
const SPRITE_SCALE = 2;

const CONFIG = Object.freeze({
  maxFrameTime: 50, // ms; longer frames are clamped so physics stays stable
  maxLevelsPerDifficulty: 20, // what the level grid in the menu has room for
  deathMessageDelay: 600, // ms of particles before "you died" appears
  fallBurstLift: 0.35, // px per ms of upward kick when the player falls off the screen

  transition: Object.freeze({
    loadTime: 1400, // ms of the loading screen before a level opens from the menu
    fadeTime: 600, // ms the level takes to fade in after loading
    winGlowTime: 650, // ms the frozen level glows after reaching the goal
    winFadeOut: 0.35, // last part of the glow (0-1) that fades to dark before the next level loads
  }),

  audio: Object.freeze({
    soundtrack: "assets/audio/soundtrack.mp3",
    musicVolume: 0.45,
    sfxVolume: 0.6,
    effects: Object.freeze({
      jump: "assets/audio/jump.mp3",
      select: "assets/audio/jump.mp3", // menu selection reuses the jump sound
      die: "assets/audio/die.mp3",
    }),
  }),

  layout: Object.freeze({
    margin: 24, // space between the screen frame and the canvas edge
    // The screen never shrinks below this (in px), so the menu always fits.
    // It grows to fit the largest level; smaller levels are centred inside it.
    minScreenWidth: 800,
    minScreenHeight: 440,
  }),

  player: Object.freeze({
    // Hitbox matches the visible pixels of the sprite (10x8 inside the 12x12 frame, feet on row 9).
    width: 10 * SPRITE_SCALE,
    height: 8 * SPRITE_SCALE,
    sprite: Object.freeze({
      path: "assets/character.gif",
      hangPath: "assets/character_holding.gif", // same frame size; arms reach the 2 rows above the body
      scale: SPRITE_SCALE,
      offsetX: 1, // source pixels between the frame edge and the visible body
      offsetY: 2,
    }),
    runSpeed: 0.3 * WORLD_SCALE, // top horizontal speed, px per ms
    // Horizontal acceleration in px per ms^2. Lower values feel slidier.
    groundAccel: 0.003 * WORLD_SCALE, // speeding up on the ground (~100 ms to top speed)
    groundDecel: 0.004 * WORLD_SCALE, // slowing down or turning around on the ground
    airAccel: 0.0018 * WORLD_SCALE, // steering while jumping or falling
    airDecel: 0.0005 * WORLD_SCALE, // keeps momentum through the air when no key is held
    gravity: 0.0025 * WORLD_SCALE, // px per ms^2
    jumpSpeed: 0.7 * WORLD_SCALE, // px per ms, about 2.4 cells high
    lowJumpGravity: 2.5, // gravity multiplier when jump is released early
    maxFallSpeed: 0.9 * WORLD_SCALE,
    // Hanging: jump into a ceiling while holding up to grab it, then slide along it.
    hangSpeed: 0.18 * WORLD_SCALE, // px per ms while sliding along a ceiling
    hangGap: 2 * SPRITE_SCALE, // px between the ceiling and the body (where the raised arms are)
    coyoteTime: 90, // ms you can still jump after leaving a ledge
    jumpBuffer: 120, // ms a jump press is remembered before landing
    physicsStep: 8, // ms per substep, keeps fast movement from tunnelling
  }),

  bubble: Object.freeze({
    maxRadius: CELL * 2.75,
    growTime: 900, // ms to reach full size (fast start, slow finish)
    shrinkTime: 400,
  }),

  tile: Object.freeze({
    followTime: 60, // ms smoothing for tiles chasing their target position
    maxStep: 6, // max px per collision substep
  }),

  block: Object.freeze({
    // How far past a pinned player a block must be trying to go before it crushes them, in px.
    // Smaller nudges just leave the block resting against the player.
    crushDepth: CELL * 0.4,
  }),

  fire: Object.freeze({
    hitInset: 3, // px of forgiveness before fire counts as touching
  }),
});
