// Level legend:
//   #  wall (cannot be moved)
//   B  block (repelled by the bubble, solid to stand on)
//   F  fire (repelled by the bubble, touching it restarts the level)
//   G  goal (reach it to win; the bubble can push it too)
//   K  key (collect every key before the goal opens; collected keys follow the player)
//   O  button (pressed for good by the player or a block; opens every door)
//   D  door (solid like a wall until a button is pressed)
//   P  player start
//   .  empty
// A gap in the bottom row is a pit: falling through it restarts the level.
//
// A level is an array of rows, or an object with a second layer of conditions laid over the map:
//   {
//     map:   ["#####", "#P.G#", "#####"],
//     zones: [".....", ".xx..", "....."],
//   }
// The object can also have `dialog`: a list of pages for a conversation box shown once when the
// level is entered (not on restarts). Each page is a string; long lines wrap.
//   dialog: ["FIRST PAGE.", "SECOND PAGE."],
// And `hint`: a pulsing "click here" marker, shown until the player starts their first bubble.
// `x` and `y` are in cells (fractions allowed, e.g. 13.5 is the middle of column 13);
// `side` is where the label goes: "above" (default), "below", "left" or "right".
//   hint: { x: 13.5, y: 10, text: "HOLD CLICK HERE", side: "left" },
// Zones legend (same grid as the map; missing rows or cells have no condition):
//   x  no-bubble zone (the bubble can't be started here; drawn in red)
//   .  no condition
//
// Levels are grouped by difficulty, up to CONFIG.maxLevelsPerDifficulty (20) each.
// Within a difficulty, each level unlocks once the previous one is cleared.

const DIFFICULTIES = [
  {
    id: "easy",
    name: "EASY",
    levels: [
      {
        map: [
          "####################",
          "#......######......#",
          "#......######......#",
          "#......######......#",
          "#......######......#",
          "#.F..F.######.F..F.#",
          "#.#..#.######.#..#.#",
          "#.......BBBB.......#",
          "#.......BBBB.......#",
          "#..P....BBBB....G..#",
          "####################",
        ],
        dialog: [
          "WELCOME TO PUSHTRON. YOU CAN'T PUSH ANYTHING WITH YOUR HANDS, BUT YOU CAN BLOW A BUBBLE.",
          "HOLD THE LEFT MOUSE BUTTON TO GROW A BUBBLE. IT SHOVES BLOCKS AWAY, AND YOU CAN STAND ON A BLOCK WHILE IT MOVES.",
          "DRAG TO MOVE THE BUBBLE. LET GO AND EVERYTHING SLIDES BACK HOME, SO DON'T BE IN THE WAY OR YOU'LL BE CRUSHED.",
        ],
        hint: { x: 10, y: 8, text: "HOLD CLICK HERE", side: "above" },
      },
      {
        map: [
          "###############",
          "#.............#",
          "#.............#",
          "#.............#",
          "#.............#",
          "#.............#",
          "#.............#",
          "#.............#",
          "#.............#",
          "#.............#",
          "#.............#",
          "#..F...F...F..#",
          "#..F...F...F..#",
          "#P.F...F...F.G#",
          "###############",
        ],
        zones: [
          "...............",
          "...............",
          "...............",
          "...............",
          "...............",
          "...............",
          "...............",
          "...............",
          "...............",
          "...............",
          "...............",
          ".xxxxxxxxxxxxx.",
          "xxxxxxxxxxxxxx.",
          ".xxxxxxxxxxxxx.",
          "...............",
        ],
        dialog: [
          "WARNING: THIS SECTOR HAS A STATIC FIELD, THE RED STRIPED AREA. YOUR BUBBLE SHORTS OUT THE MOMENT IT TOUCHES ONE.",
          "YOU CAN'T START A BUBBLE INSIDE IT, AND DRAGGING ONE IN SHUTS IT DOWN, SO YOU CAN'T PUSH THE FIRE AWAY FROM IN THERE.",
        ],
      },
      [
        "####################",
        "#..................#",
        "#..................#",
        "#..................#",
        "#..................#",
        "#..................#",
        "#..................#",
        "#..................#",
        "#..................#",
        "#P......FFFF.....G.#",
        "####################",
      ],
    ],
  },
  {
    id: "medium",
    name: "MEDIUM",
    levels: [
      [
        "####################",
        "#...........FF.....#",
        "#...........FF.....#",
        "#...........FF.....#",
        "#...........FF..G..#",
        "#..........#########",
        "#..................#",
        "#..................#",
        "#...####...........#",
        "#P........B........#",
        "####....############",
      ],
    ],
  },
  {
    id: "hard",
    name: "HARD",
    levels: [
      [
        ".................",
        ".................",
        ".................",
        ".................",
        "..............",
        "P.............",
        "B...F#F#F#F..G",
        "...............",
        ".................",
        ".................",
        ".................",
        ".................",

      ],
      [
        ".......#...#........",
        "P......#...#.....G..",
        "BBBBB..#...#..BBBBB.",
        ".......FFFFF........",
        ".......FBBBF........",
        ".......FBBBF........",
        "..BB...FFFFF....BB..",
        ".......#...#........",
        ".......#...#........",
        ".BBBBBB#...#BBBBBB..",
        ".......#...#........",
        ".......#...#........",
        "BBBBBBB#...#BBBBBBB.",
        ".......BBBBB........",
        ".......B...B........",
        ".......B.F.B........",
        ".......B...B........",
        "BBBBBBBBBBBBBBBBBBBB",
        "....................",
        "....................",
      ],
      [
        "P......#...........K",
        "#####..#.###########",
        ".............D......",
        ".......#.BBB.#......",
        "###.####.....#......",
        ".......#..F..#......",
        ".......#######......",
        ".FBBBF.#F...........",
        ".B...B.#F...........",
        ".F.B.F.#............",
        ".B...B.#...FF..FF.F.",
        ".FBBBF.#..BBBBBBBBBB",
        ".......#............",
        "B..O..B#............",
        "########B...........",
        "....................",
        "....................",
        ".............B......",
        ".G.B..B..B..........",
        "....................",
      ],
    ],
  },
];
