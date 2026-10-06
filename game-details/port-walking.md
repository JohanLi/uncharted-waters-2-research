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

- **Mouse** (`0x20C37–0x20C82`): the pointer's horizontal and vertical offsets
  from the player are compared. If neither is more than 8, there is no move.
  Otherwise the larger one decides: right or left for the horizontal offset,
  down or up for the vertical one; a tie goes to the vertical.
- **Keyboard and click areas** (`0x20B3E`): a table of twelve 9-byte entries at
  `DS:0xA984` holds a screen rectangle and a key code. An entry matches when
  the input's key code equals its own or the pointer is inside its rectangle.
  Entries 0–3 and 4–7 give the four directions and override the mouse
  direction; entries 8–11 call the side-panel commands through the far
  pointers at `DS:0xAA08`.

There are no diagonal moves. The loop sets one of five pointer shapes, one
for no direction and one for each direction (the table at `[bp−0x18]`, filled
at `0x20BE4–0x20BF8` and selected at `0x20CAC–0x20CCB`).

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
  player stays on the door tile.
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

- The exact reference point and unit of the mouse offsets: they come from
  `0:4DB7` and `0:4CCE`, which are not traced here.
