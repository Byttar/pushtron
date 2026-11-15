# PUSHTRON

A small puzzle platformer made with [p5.js](https://p5js.org/). You can't push anything with your hands. Instead, you hold the mouse button to blow a bubble that shoves blocks, fire and even the goal out of the way. Let go and they slide back where they were.

## Running the game

There's no build step. It's plain JavaScript, so you only need to serve the folder over HTTP.

1. Open the project in VS Code or Cursor with the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension installed.
2. Right-click `index.html` and choose **Open with Live Server**.

Any static server works too:

```bash
python3 -m http.server 5500
# then open http://localhost:5500
```

The game still starts if you open `index.html` straight from disk, but browsers block the sprites, font and audio from loading that way, so you'll get plain shapes and no sound.

## Controls

### In a level

| Action | Keys |
| --- | --- |
| Move | `A` / `D` or `←` / `→` |
| Jump | `W`, `↑` or `Space` |
| Bubble | Hold the left mouse button; drag to move it |
| Restart level | `R` |
| Back to level list | `Esc`, then confirm with `Y` / `Enter` on LEAVE (`N` / `Esc` to stay) |

Some movement details:

- Let go of jump early for a shorter hop.
- Jump into a ceiling while holding jump to grab it, then slide along it with left and right.
- You can still jump for a moment after running off a ledge, and a jump pressed just before landing still counts.

### In the menu

Move with the arrow keys or `WASD`, and confirm with `Enter` or `Space`. `Esc` goes back a page. You can also use the mouse. When the music volume slider is selected, left and right change the volume.

## How to play

Get to the goal on every level. The bubble pushes away blocks (`B`), fire (`F`) and the goal (`G`), but not walls. Blocks are solid, so you can stand on them while they're pushed. Touching fire or falling into a pit kills you, and you press `R` to try again.

Levels come in three difficulties: Easy, Medium and Hard. The first level of each difficulty is open from the start, and every level after that unlocks when you clear the one before it. Your progress and music settings are saved in the browser's `localStorage` under the `push.save.v1` key. Clear that key to reset your save.

## Project structure

```
index.html            loads p5 and every script in dependency order
sketch.js             p5 entry point: setup, draw and mouse events
p5.min.js             p5.js library
assets/               sprites, font (VT323) and audio
src/
  config.js           all tuning values: physics, timings, audio, layout
  levels.js           level maps, grouped by difficulty
  Game.js             game states, level flow and input routing
  Input.js            keyboard state and jump buffering
  Layout.js           canvas sizing and coordinate conversion
  SaveData.js         progress and settings in localStorage
  world/              Level (parses a map) and World (runs the simulation)
  entities/           Player, Bubble, Block, Fire, Goal, Tile, ParticleBurst
  menu/               main menu, difficulty and level selection
  audio/              music and sound effects
  render/             all drawing: theme, menus, loading screen, effects
  utils/              small helpers (Rect)
```

There are no modules or bundler. Every file defines globals and is loaded with a `<script>` tag, so the order in `index.html` matters: each file can only use classes from the files above it. When you add a file, add its tag in the right place.

## Adding levels

Levels live in `src/levels.js`. Each one is an array of strings, one string per row:

| Character | Meaning |
| --- | --- |
| `#` | Wall. Can't be moved. |
| `B` | Block. Pushed by the bubble, and you can stand on it. |
| `F` | Fire. Pushed by the bubble, and touching it kills you. |
| `G` | Goal. Reach it to win. The bubble can push it too. |
| `K` | Key. Collect every key before the goal opens. Collected keys follow you. |
| `O` | Button. Pressed for good by you or a block, and opens every door. |
| `D` | Door. Solid like a wall until a button is pressed. |
| `P` | Player start. |
| `.` | Empty. |

A gap in the bottom row is a pit. Each difficulty shows up to 20 levels in the menu. Levels can be any size: the screen grows to fit the biggest one and smaller levels are centred.

```js
[
  "####################",
  "#..................#",
  "#P......FFFF.....G.#",
  "####################",
],
```

## Tuning

Almost every number that affects how the game feels is in `src/config.js`, with a comment explaining it. That includes run speed, jump height, gravity, coyote time, bubble size, transition timings and volumes. Movement values scale with `CELL`, so jumps cover the same number of tiles whatever cell size you pick.

## Credits

- Built with [p5.js](https://p5js.org/).
- Font: [VT323](https://fonts.google.com/specimen/VT323), under the SIL Open Font License (see `assets/VT323-OFL.txt`).
