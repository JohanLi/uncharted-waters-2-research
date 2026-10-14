# Walking in port

The player walks around a port one tile at a time, in four directions. When
the way is blocked, the game looks to both sides for a way past and steps
sideways toward it, so holding a direction against a wall leads the player
around it. This page describes the move routine, its input, and what entering
a building does to the player's position. All addresses are `MAIN.EXE` file
offsets.

## Position and view

The player's position is kept relative to a 23 × 23-tile view of the 95 × 95
port map:

| Address     | Save offset | Meaning                         |
| ----------- | ----------: | ------------------------------- |
| `DS:0x0E38` |      `0x10` | View left edge, in map tiles    |
| `DS:0x0E3A` |      `0x12` | View top edge                   |
| `DS:0x0E3C` |      `0x14` | Player x within the view (0–22) |
| `DS:0x0E3E` |      `0x16` | Player y within the view (0–22) |

The player's map position is the view edge plus the position within it. It is
the top-left tile of the 2 × 2 sprite. A position can be stood on when the two
tiles under the sprite's feet, at (x, y + 1) and (x + 1, y + 1), pass the
tileset's thresholds (`0xB3C9`; see [Ports](ports.md#supply-port-town) for the
rule).

## Input

The town loop at `0x20BDC` turns input into one of four directions (1 up,
2 right, 3 down, 4 left, or 0 for none):

- **Mouse** (`0x20C37–0x20C82`): each pass reads the mouse driver's motion
  counters (`0:0x4DB7`, INT 33h function 0Bh), the distance the mouse has
  moved since the last read, not the pointer's position. If neither axis is
  more than 8, the direction is kept. Otherwise the larger one decides: right
  or left for horizontal motion, down or up for vertical; a tie goes to the
  vertical. The direction (`di`) persists from pass to pass, so the mouse
  sets a heading that holds until it moves again. Entering the loop clears
  both: the counters are read and discarded (`0x20C0A`) and the direction
  starts at none (`0x20BFD`). The loop is entered afresh after every building
  visit (`0x20930` returning nonzero ends it at `0x20D05`), so leaving a
  building always shows the plain pointer and walks nowhere until the mouse
  moves. The side-panel commands and townspeople run inside the loop and keep
  the direction. The pointer position itself comes from function 3
  (`0:0x4CCE`) and is used only for the click areas below.
- **Keyboard and click areas** (`0x20B3E`): a table of twelve 9-byte entries at
  `DS:0xA984` holds a screen rectangle and a key code. An entry matches when
  the input's key code equals its own or the pointer is inside its rectangle.
  Entries 0–3 and 4–7 give the four directions and override the mouse
  direction; entries 8–11 call the side-panel commands through the far
  pointers at `DS:0xAA08`, indexed by the entry number itself, so the four
  handlers are the table's entries 8–11 (`0x20BB3`): Fleet `0x26365`, Crew
  `0x26480`, Info `0x2652C`, and Navigation `0x266AC`, the sea menu. Each
  opens its menu against the tabs, at column 74 less the menu's width
  (`0x262AE`), at y 48, 136, 196, and 176 (`0x2639B`, `0x264B5`, `0x265D4`,
  `0x266F5`).

  The Info menu (`MENU.DAT` entry 28) greys out items through `DS:0xA554`
  (`0x2654D–0x265CF`): Item with no items (bit `0x04`, `FC4:0x335C`),
  Discovery with no listed discovery (`0x08`;
  [Discovery flags](at-sea.md#discovery-flags)), Journal while it is empty
  (`0x10`; [Journal entry](naval-battle.md#journal-entry)), Chart while no
  cell is charted (`0x20`, `DS:0x1192`), and Port Map at sea (`0x40`,
  `DS:0x0E32` = `0xFF`). After a command the menu opens again, except after
  the Port Map (case 6, `0x26650` → `0x265FC`), which sets `di` and so
  closes it (`0x2654A`).

  | Entries | Rectangle (x1, y1, x2, y2)                        | Keys                     |
  | ------- | ------------------------------------------------- | ------------------------ |
  | 0, 4    | (528, 304, 576, 344), the compass's up arrow      | `8`, scan code `0x1E`    |
  | 1, 5    | (552, 336, 600, 376), right                       | `6`, `0x1C`              |
  | 2, 6    | (528, 368, 576, 408), down                        | `2`, `0x1F`              |
  | 3, 7    | (504, 336, 552, 376), left                        | `4`, `0x1D`              |
  | 8–11    | the tabs at x 618–639, y 72, 152, 232, 312, 80 tall | `/`, `*`, `+`, `=` (F1–F4) |

  The compass in the side panel is therefore the four direction arrows; the
  first matching entry wins where the rectangles overlap. A pointer inside a
  rectangle counts only with an input (`0x20B86`).

There are no diagonal moves. The loop sets one of five pointer shapes, one
for no direction and one for each direction (the table at `[bp−0x18]`, filled
at `0x20BE4–0x20BF8` and selected at `0x20CAC–0x20CCB`).

Each pass of the loop is paced by a timer started at `0x20CDF` and awaited at
`0x20D68`: 8 timer units when Graphics Delay is on (save byte `0x00` bit
`0x01`, set in the new-game data), 4 when it is off (`0x20CD0–0x20CDC`). A
pass makes at most one step and gives the townspeople one turn (the walker
routine `0:0x5FA6`, called at `0x20D51` when the player does not move), so
switching Graphics Delay off doubles the walking speed, from 8 timer units
per tile to 4.

The player moves only while there is an input (`[bp−1]`, tested at `0x20CE5`)
and a direction. The loop then calls the move routine with the direction
minus one (0 up, 1 right, 2 down, 3 left) at `0x20CF5`, and checks for a
building at the player's position with the building dispatcher `0x20930` at
`0x20CFB`.

## The move routine

The move routine at `0xB9E8` takes the direction and computes a step
(`dx`, `dy`): (0, −1), (1, 0), (0, 1) or (−1, 0).

1. **View edge** (`0xBA17–0xBA44`). If the new position within the view would
   be outside 0–22 on either axis, the player does not move but turns to face
   the direction.
2. **Townsperson** (`0xBA47–0xBA83`). The routine looks for a townsperson
   within one tile of the new position (`0xB4AF`; see
   [Townspeople](townspeople.md#talking-to-townspeople)). If there is one and
   the talk counter `DS:0x8EE8` has reached 10, that townsperson's line is
   shown (`0xB800`), the counter is set to 0, and the routine returns. The
   player neither moves nor turns.
3. **Talk counter** (`0xBA86–0xBA8D`). Otherwise the counter goes up by one, up
   to 10.
4. **Step** (`0xBA91–0xBABC`). If the new position can be stood on and has no
   townsperson within one tile, the player moves there.
5. **Way around** (`0xBABF–0xBC7F`). Otherwise the routine looks to the two
   sides of the direction, (`dy`, `dx`) and (−`dy`, −`dx`). For each side and
   `k` from 1 to 19, it tests the tile `k` tiles to that side of the player:
   - the search on that side ends if the tile is outside the map (0–94), can't
     be stood on, or has a townsperson within one tile;
   - it also ends if the tile one step further in the original direction is
     outside the map;
   - otherwise, if that further tile can be stood on and has no townsperson
     within one tile, that side has a way past at distance `k`. If not, the
     search goes on with `k` + 1.

   With no way past on either side, the player stays and turns to face the
   direction. Otherwise the player takes one step toward the nearer side, and
   toward (−`dy`, −`dx`) when both are equally near. Moving right, that is up;
   moving down, left; moving left, down; moving up, right.

6. **Facing** (`0xBD00–0xBD1D`). The player faces the way they moved, so a step
   around an obstacle turns the player sideways.

Because a townsperson only speaks when the counter has reached 10, one who
has just spoken is an obstacle like any wall for the next ten moves, and the
player walks around them. The counter counts every move the routine attempts
past the view-edge test, blocked or not.

### The view

After the step, `0xBC82–0xBCFC` keeps the player between 4 and 18 within the
view. Moving left to x 3 or less, or right to x 19 or more, shifts the view
one tile that way, unless its left edge is already 0 or 72. The same applies
vertically. The shift uses the direction of the step actually taken, or the
held direction when the player could not move.

## Buildings

Moving onto a building entrance enters it: after every move the town loop
calls the building dispatcher (`0x20930`), which looks up the entrance at the
player's position. The player therefore walks onto the door tile.

- A closed building shows message 765, “It's closed...” (`0x20803`), and the
  player stays on the door tile. The message goes in a fixed style-0 window
  with a shadow at column 28, y 48, 20 columns by 48 (`0:0x756C` with
  ax 0x1C, dx 0x30, bx 0x14), its text from column 30 to 45 at y 64; the
  message wait (`0x19878`) puts the caret at column 37, y 88, and the window
  is closed again (`0:0x7690`).
- An open building moves the player one row down before the visit begins
  (`0x20A13`: `inc word [0x0E3E]`), so after the visit the player stands one
  tile below the door.

Entering a town (`0xE101`) from sea, with the previous-port byte
`DS:0x0E33` at `0xFF`, places the view 12 tiles left of and 13 tiles above
the Harbor entrance, clamped to 0–72. It places the player one row below the
entrance (`0xE12C–0xE18B`). Whenever the port differs from `DS:0x0E33`, the
talk counter is set to 10 (`0xE198`), so the first townsperson the player
walks into speaks at once.

## Evidence

- `0x20BDC–0x20D7E`: the town loop, mouse direction and pointer shapes.
- `0x20B3E–0x20BDB`: keyboard and click-area directions (`DS:0xA984`).
- `0xB9E8–0xBD90`: the move routine.
- `0xB3C9–0xB41C`: whether a position can be stood on.
- `0xB4AF–0xB57D`: townsperson within one tile.
- `0x20930–0x20B3D`: the building dispatcher; `0x20A13` moves the player down
  a row; `0x20803` is the closed-building message.
- `0xE101–0xE198`: arrival position and the talk counter's starting value.

## Open questions

- How many mouse-driver units (mickeys) a given hand movement produces,
  which sets how quick a flick the threshold of 8 per pass needs.
