# Naval battle

This page covers how a naval battle is fought and how it ends: the battle map
and movement, the two ship attacks, the ways a battle can end, and what the
winner takes.

The two attacks are **cannon fire** and **boarding**, the crew-against-crew
fight between adjacent ships. Both are made with the battle menu's
**Attack** command: an attack on a ship in range fires the guns, and an attack
on an adjacent ship boards it. When the protagonist's flagship attacks the
enemy flagship, the game first asks, “Will you challenge the enemy commodore
to a duel?”; answering No boards the ship instead. Sword duels between
commodores are documented separately in [Dueling](dueling.md).

## Battle units

When a battle starts (`MAIN.EXE 0x1477C–0x148F5`, with extra setup at
`0x145F3`), each ship gets a 24-byte unit record. The fields that matter for
damage are:

| Unit field | Meaning                                                                                                                                                                           |
| ---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    `+0x00` | The ship's captain's sailor record                                                                                                                                                |
|    `+0x02` | The ship's fleet slot: crew (`+0`), durability (`+2`), maximum durability (`+3`), Tacking (`+4`), Power (`+5`), guns (`+6`), gun type (low 3 bits of `+8`)                        |
|    `+0x0D` | Battle role (below), side number (bits 4–5), and slot number (bits 0–3)                                                                                                           |
|    `+0x0E` | Shots remaining                                                                                                                                                                   |
|    `+0x10` | Firepower at each distance (below)                                                                                                                                                |
|    `+0x15` | Gun range                                                                                                                                                                         |
|    `+0x16` | Boarding factor (below)                                                                                                                                                           |
|    `+0x17` | Combat share of the crew, in percent: for the player's ships `100 −` the lookout and navigation shares ([Fleet info](fleet-info.md)); for other fleets 25, or 50 on an oared ship |

A player ship's shots are its supply of Shot, written back when the battle
ends (`0x1466A`, `0x1607E`). A computer ship starts with
`r + random(r)` shots, where `r` is a fifth of its model's maximum guns, or
with only `random(r)` if it is an oared ship or belongs to a merchant fleet
(fleet ID ending in 1–4) (`0x14677–0x146E3`). Each volley uses one shot, however many guns fire
(`0x13CBD`).

### Battle roles

Up to four fleets can take part, one per side number. Bits 6–7 of unit byte
`+0x0D` give each ship's role (`0x1479B–0x1481D`):

| Bits 6–7 | Role                                                        |
| -------: | ----------------------------------------------------------- |
|   `0x80` | The player's own fleet                                      |
|   `0xC0` | Another fleet fighting on the player's side                 |
|   `0x00` | The main enemy fleet                                        |
|   `0x40` | An assisting enemy fleet, fighting alongside the main enemy |

### Fleets that join a battle

When a battle involving the player starts (`0x163E8`), `0x162CA` offers each side one supporting
fleet from the active, undocked fleets within 2 tiles of the player's fleet on
both axes (`0x1843A`, `0x183EC`), excluding the two fleets already fighting. A
candidate must be a convoy or voyaging fleet (position 5–9 of its block,
`0x16351`); merchant fleets and protagonist fleets never join. The first
candidate of the defender's nation supports the defender (message 779,
“%s %s will support the defending side.”), and the first of the attacker's
nation supports the attacker (message 780); the two `%s` are the supporting
commodore's first and last names, shown in a plain message window. A nation
here is the commander's fleet ID divided by 10, the protagonist's included
(`0x16368`, `0x163A2`): Relations and the alliance flag are not read,
so an allied nation's fleet never joins either side. A candidate of the
defender's nation found after the defender's support is chosen falls through
to the attacker's test, so in a battle between two fleets of one nation the
first such fleet supports the defender and the second the attacker. If the player's
affiliation is Piracy, no fleet joins at all (`0x1630C–0x16320`). Pirate
corsairs and privateers can support a pirate fleet the player attacks.

### Flagship

Each fleet's flagship is chosen afresh when a battle is set up (`0x144DC`).
The player's flagship is the ship the protagonist captains. A computer fleet's
flagship is its active ship with the highest **maximum durability**, the
earlier slot winning a tie; crew and current durability are not compared.
After a battle in which the old flagship lost maximum durability to critical
hits, another ship can therefore lead the fleet next time. A ship with no crew
can be chosen too; the side then loses as soon as its first turn comes, because
a crewless flagship counts as defeated ([How a battle ends](#how-a-battle-ends)). The flagship
becomes the side's first unit and moves first; the other ships follow in slot
order.

### Officers on the flagship

Several values below are **pooled** on the protagonist's own ship: the game
uses the best value among the protagonist, the First Mate, and the Chief
Navigator (`0x127E1` for attributes, `0x12847` for Battle Level). Gunnery
counts on the flagship if any of the three has it (`0x1289C`). On every other
ship these are simply the captain's own values. See
[Duties](sailors.md#duties).

## The battle screen

### Layout

The battle draws into the 640 × 400 area (`0x572E` adds 40 lines). The left
416 pixels show 13 × 12 hexes of the 52 × 48 map (`0x11345`); the view's top
left is `DS:0xA069`/`0xA06A`. Terrain is a plain grid of 32 × 32 tiles,
`HDAT.PUT + 0x200 × t` for map byte `DS:0x928E + 52 × row + col` & `0x1F`,
400 lines tall (`0x1160B`). Ships, markers, and hit boxes sit in hex cells:
x = 32 × (col − `A069`), y = 32 × (row − `A06A`), plus 16 in odd columns
(`0x113D5`, `0x11203`, `0x10DDE`).

The right side is `GRAPH.DAT` record 26 at (416, 0) (`0x11974`), then
(`0x1196B`):

- the mini-map, a colour-5 box at (424, 8), 208 × 192, with land cells as
  colour-0 dots (`0x115A3`) and each ship as a dot at
  (424 + 4 × col, 8 + 4 × row): the player's ships colour 7, allies 6, the
  main enemy 2, the assisting enemy 3 (`0x11376`). Every dot is the 4 × 4
  stencil at `DS:0xA078` (rows 2, 4, 4, 2 pixels wide, a plus with its
  corners cut), the nibble at `DS:0xA07C` for odd columns (`0x11308`).
  Nothing marks the view's position;
- the wind dial for the battle direction `d`, `DATA1.014` picture
  `floor((15d − floor(d / 3)) / 10)` at (440, 230), which maps directions 0–5
  to the dial's 0, 1, 3, 4, 5, 7;
- the message box, black at (424, 328), 192 × 64, text from (432, 336)
  (`0x117A8`).

The flagship panel (`0x117E1`) always shows the player's flagship, colour 0 on
colour 7, and is redrawn after every ship's turn (`0x151C9`):

| y   | x              | Value                                  |
| --- | -------------- | -------------------------------------- |
| 216 | centred on 560 | Ship name, colour 1                    |
| 232 | 560            | Crew / crew bunks                      |
| 248 | 560            | Durability / maximum durability        |
| 264 | 560            | Tacking / model Tacking                |
| 280 | 560            | Power / model Power                    |
| 296 | 448, 472       | Clock: tick / 3, (tick mod 3) × 20     |
| 296 | 592            | Shots remaining                        |

The battle palette is `DS:0xA0F0` (stored blue, red, green, 0–15), faded in
one level per timer unit (`0x111BE`, `0xEDD7`) at the start, after an Info
screen, and after a duel. Windows drawn during the battle use it too, so their
pink and orange are `F341C3` and `F3A200` (entries 3 and 6), not the port's.

The water shimmers: unless the game is over or `DS:0xC770` is set, `0x111BE`
hooks the timer interrupt (INT 1Ch, handler `0x9584`), which every 17 ticks
(about 0.93 seconds) sets palette entries 8–15 from the next of four frames at
`DS:0xA0A8` (12-bit words, green in bits 8–11, red in 4–7, blue in 0–3).
Entries 8, 10, 12, and 13 stay fixed; 9, 11, 14, and 15 rotate through
`0044DD`, `0066EE`, `0088FF`, `0088FF`, a frame apart. `0x111EA` removes the
hook before a fade-out or an Info screen.

### Ships on the map

A ship's sprite is `HDAT.PUT + 0x1A00 + 0x280 × (6 × set + facing)`: an AND
mask of 0x80 bytes, then a four-plane image OR'ed on top (`0x113D5`). The set
is 0 for the player's side and 1 for other fleets, plus 2 for an oared ship
(instance byte `+0x12` bit `0x10` clear). A ship with crew also shows its slot
digit in an 8 × 16 black cell at the hex's top left, or 24 pixels to the right
for an assisting fleet: white for a flagship, blue otherwise. Sunk ships and
ships that have left are not drawn (`0x1151A`); a ship that loses its last
crew stays on the map and its hex becomes an obstacle (`0x13A63`).

The view centres on the player's flagship at the start (`0x14BCD`), clamping
the corner to columns 0–39 and rows 0–36 (`0x14B84`), and scrolls back to it
one hex per axis, 4 timer units per step, after each of the player's moves
(`0xFC8F`). There is no free scrolling.

### Hex markers

All markers are 32 × 32 stencils drawn at a hex (`0x11203`):

| Kind       | Shape                                     | Colour            | Meaning                       |
| ---------- | ----------------------------------------- | ----------------- | ----------------------------- |
| 1          | `DATA1.014 0x3820`, bracketed cross       | `cx` on entry     | Next step                     |
| 2          | `DATA1.014 0x3820`                        | 4                 | Reachable, or selectable ship |
| 3          | `DATA1.014 0x38A0`, circled cross         | 6                 | Target in gun range           |
| 4          | `DATA1.014 0x3920`, sword                 | 3                 | Adjacent target (boarding)    |
| `0x80 + f` | `HDAT.PUT 0x6B40 + 0x80 × f`, arrow       | 4                 | A plotted step facing `f`     |

Kind 1 takes its colour from `cx` (`0x11262`, blit mode `cx | 0x400` at
`0x112B1`). The plotter (`0xFB7A`) does not set it for the call at `0xFC0A`:
the `mov cx, 0x34` at `0xFBCB` is the map width for the `imul` that follows,
and the far call `2DFF:0x843F` at `0xFBD8` comes between, so the colour is
whatever that call leaves in `cx`. The picker cursor XORs colour 7 over the
chosen cell's palette indices (`0x18704`, blit mode 1), so every colour in it
becomes its index XOR 7. The cannonball is redrawn only when it enters another
8 × 8 cell (`0x11DA2–0x11DEB`). Enter or the left button chooses;
Esc, `0`, or the right button cancels (`0x1939A`, `0x18698`).

### The battle menu

The flagship's turn opens `MENU.DAT` entry 50 at the pointer (`0x10D7A`,
`0x19659`); it cannot be cancelled, and it repeats until a command ends the
turn. It is a popup (style record 1, `FC4:0x3BC0`): an ordinary window
(`0:0x756C`) `w + 4` columns wide and `(n + 2) × 16` tall, `w` being the
longest item, with 16-pixel rows, each item centred, the first 16 pixels down
(`0x18E32–0x18E5D`, `0x18D06`). Its x is the pointer less `4(w + 4)` when the
pointer is further right than that, at most `(75 − w) × 8`, truncated to a
column; its y is the pointer less 24 when the pointer is below 24, at most
`360 − 16n` (`0x1969E–0x19714`). As in every menu, a disabled item is not
recoloured: the 8 × 16 checkerboard at `DATA1.014 0x280` is stamped in colour
7 over each of its characters (`0x18DA1` → `0:0x6791`).

| Command | Routine   | Disabled when (`0x10C20`)                 |
| ------- | --------- | ----------------------------------------- |
| Move    | `0x1018C` | never                                     |
| Attack  | `0x101A4` | no enemy in gun range and arc or adjacent |
| Info    | `0x106CD` | never                                     |
| Plan    | `0x1077B` | the flagship has no other ship            |
| Order   | `0x10BAA` | no other own ship is in view              |
| Wait    | `0x10BC1` | never                                     |
| Item    | `0x10BEA` | `FC4:0x335C` returns 0                    |
| Escape  | `0x10BF2` | the flagship is not on an edge (`0xEFBB`) |

**Move** (`0xFD11`) marks the reachable hexes (`0x12FE1`) and shows message
767. Each pick of a marked neighbour ahead or 60° to either side adds a step,
picking the course's end removes one, and cancelling finishes; after 10 steps
it finishes at once. “Is it OK to follow this course?” (768) confirms; No
starts over. The ship then moves one hex per step, 8 timer units each
(`0xF76D`). With no steps, “In what direction should we set our sails?” (769)
lets the ship turn 60° on the spot (`0xFF26`), which empties its turn charge.
The attack prompt follows, and the turn ends whether or not a target is
chosen.

The battle's questions (768, 770, 775, 776) clear the message box and print
there in colour 7 (`DS:0xA132`); their YES/NO buttons go through `0x11168`,
which sets the text window to columns 0–79 at y 200 before the shared yes/no
(`FC4:0x4529`), so they appear at (272, 200) until the mouse is used and at
the pointer afterwards ([Ports](ports.md#text-and-font)).

**Attack** (`0x100E9`) marks targets and asks “Whom do you want to attack?”
(772). A ship in range is fired on (`0x13C72`); an adjacent one is boarded
(`0x13D04`), after the duel question “Will you challenge the enemy commodore
to a duel?” (770) if it is the first ship of an enemy side. When the duel's
crew test fails, “The enemy's crew has blocked your attempt.” (771) is shown
and the ship is boarded.

**Info** (`DS:0x9170`) offers:

| Entry       | Routine   | Shows                                                                                                                              |
| ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Own Fleet   | `0x1020B` | the port's Fleet Info screen `FC4:0xD221` for the player's fleet, with a fade out and back in (`0x101A9`)                           |
| Own Mates   | `0x10213` | the mate list, then the Mate Info card `FC4:0xC8D5` at column 6 (x 48; in port column 15)                                         |
| Own Ships   | `0x10248` | a list of the player's ships still in the battle, then Ship Info `FC4:0xC1D5` at column 6, with the Info palette `DS:0xAB6E`       |
| Other Fleet | `0x102C5` | the Fleet Info screen of a commander of any other side, allies included; with one, at once, else after a list                      |
| Other Mates | `0x1032C` | the same commanders, then their Mate Info card                                                                                     |
| Other Ships | `0x103A4` | a ship picked on the map (`0x110FB`), then its card `FC4:0xC6D2`; repeated until the pick is cancelled                              |
| Order List  | `0x1052E` | a window over the map (`0xC67B`: x 0, y 32, 52 columns, `24n + 32` tall) with, per ship of the player's side still in the battle, its slot number and name in blue (message 1378) at x 8, then “Flagship” (1379) at x 144, or from x 128 its Tactic, Method, and Target strings |

**Item** opens the same item routine as the Info tab (`1E5F:0xBD2B`): the
inventory list, then Equip or Use (`MENU.DAT` 33) against the tabs at y 264
(`0x2F935`). Using an item does not check for a battle.

**Wait** asks “Is it OK to end the turn?” (775); **Escape** asks “Are you
sure you want to flee?” (776) and removes the flagship (`0x139A4`). **Item**
opens the item list (`1E5F:0xBD2B`) and returns to the menu. **Info** opens
`MENU.DAT` entry 51, which can be cancelled, and shows the fleet information
screens (`DS:0x9170`); its Other Ships and Order List entries can be
disabled (`0x1061B`). The Order List shows each live ship's slot number and
name (message 1378), then “Flagship” (1379) or its Tactic, Method, and Target.

### Plan and Order

**Plan** (`0x1077B`) shows the flagship's three settings at (432, 368) in
colour 6, Fight/Flee (bit `0x08`), Fanout/Pack (`0x04`), and Defend/Chase
(`0x01`), with hit boxes 56 pixels apart from x 440. Choosing one toggles it;
on leaving, every other ship's orders become
`(orders & 0xF0) | (flags & 0x0D) | ((flags & 1) << 1)`, so Chase also sets
Attack.

**Order** (`0x10BAA`) marks the player's other ships in view and asks “Give
orders to which ship?” (773), then lists (`0x10939`), labels in colour 7 at
x 432 and values in colour 6:

- Tactic at y 336: Attack or Escape (bit `0x02`); choosing it toggles bit
  `0x02` and sets bit `0x01` to match;
- Method at y 352: Fire or Rush (bit `0x10`);
- Target at y 368: Delegate without bit `0x80`; with it, Support or Enemy
  followed by “Flagship” or “No. n” (unit `+0x06`). Choosing Target without
  one marks the enemies and asks “Select your target.” (774); with one it is
  cleared.

### Animations

Combat prints no messages; the map, the mini-map, and the flagship panel
show the results.

- **Cannon fire** (`0x121B0`): when either ship is in view, an 8 × 8 ball
  (`HDAT.PUT 0x7B60`) flies from the firing ship to the target one pixel per
  timer unit along an arc up to 12 pixels above the straight line
  (`0x11C38`). When the target is in view, its hex then shows three groups of
  four 8-unit frames of the 32 × 32 explosion (`0x6E40 + 0x280 × f`) and the
  16 × 20 splash (`0x7840 + 0xC8 × f`, 12 pixels down and, when
  `random(2)` is 0, 16 to the right); the middle group shows only the splash
  when a gun with range 4 or more fires at exactly its range, and only the
  explosion otherwise.
- **Boarding** (`0x125AB`): `DATA1.014 0x2E20 + 0x280 × f` frames
  0, 1, 2, 3, 1, 3, 0, 2, 2 units each, on the target, the attacker, and the
  target again, each in view only.
- **Sinking** erases the ship's hex and mini-map dot (`0x13A21`,
  `0x11ADF`).
- After each ship's turn the game redraws the flagship panel and waits 8
  units (`0x151C9`, `0x151CC`).

## Map, turns, and movement

### The battle map

The battle map is 52 × 48 hexes (`0x12A8A`), arranged in vertical columns with
every odd column half a hex lower. It is drawn from the 6 × 6 world-map tiles
starting two tiles west and north of the defending fleet (`0x141A2`): each
tile fills an 8 × 8 block (rows `8r…8r+7`, columns `8c+2…8c+9`); tiles `0x34`
or above become land (`0x84`, map bit `0x80`), the others sea (1).

Then, for every sea block, each hex within 4 of it (rows `8r−4…8r+11`, columns
`8c−2…8c+13`, clipped to the map) becomes water: tile 0 or 1 at random where
the test cell `(x >> 3, y >> 3)` is land, else tile 1 (`0x142B1–0x1437F`).
Both are water; the low five bits of a map byte only pick the tile graphic
(`0x1162F`). Land therefore survives only more than 4 hexes from any sea
block, which gives straight coasts. The test uses the shifted column rather
than `(x − 2) >> 3`, and columns 48–49 read one cell past the row
(`[row][6]`, the next row's first cell). Columns 0–1 copy column 2 and
columns 50–51 copy column 49 (`0x1438C`).

`0x13F74` then gives each land hex a coast tile from a mask of its non-land
neighbours (NW `0x80`, N `0x40`, NE `0x20`, W `0x10`, E `0x08`, SW `0x04`,
S `0x02`, SE `0x01`; neighbours past the edge are clamped). Any mask not listed
keeps `0x84`:

| Tile   | Masks                  |
| ------ | ---------------------- |
| `0x8B` | 1, 2, 3, 4, 6, 7       |
| `0x89` | 8, 9, 32, 40, 41       |
| `0x8C` | 11, 15, 43, 47         |
| `0x88` | 16, 20, 128, 144, 148  |
| `0x8A` | 22, 23, 150, 151       |
| `0x86` | 64, 96, 192, 224       |
| `0x87` | 104, 105, 232, 233     |
| `0x85` | 208, 212, 240, 244     |

Bits `0x20` and `0x40` mark a hex holding a ship of the attacking or defending
side. No ship can enter land. Distance is counted in hexes (`0x12902`,
`0x12996`). Adjacent ships are at distance 1; they can board each other but
cannot fire on each other.

A ship faces one of six directions (unit byte `+0x0A`): 0 north, 1 northeast,
2 southeast, 3 south, 4 southwest, and 5 northwest (neighbour table
`DS:0xA080`). Every ship of a fleet starts facing the same way, the fleet's
heading at sea `h` (0–7) turned into `floor(5h / 7)` (`0x149DC`).

### Starting positions

Each fleet is placed relative to the defender (`0x14AF5`, `0x14A10`). With
`Δ` its offset in world tiles, its flagship's target hex is
`x = 8·clamp(Δx + 2, 0, 4) + 10`, `y = 8·(clamp(Δy + 2, 0, 4) + 1)`. If that
hex is off the map or not empty (`& 0xE0`), both coordinates are re-rolled as
the target `+ random(16) − 8` until one fits (`0x14A23–0x14A60`). Each other
ship takes the flagship's hex `+ random(8) − 4` on each axis, re-rolled until
free (`0x14A97–0x14AED`). The hex is marked `0x20` or `0x40` by side, and unit
`+4` holds `y × 52 + x`. The view opens on the player's flagship at
`x − 6` (0–39), `y − 6` (0–36) (`0x14B84`).

### Turns

The four fleets act in the order: attacking main fleet, defending main fleet,
attacking assisting fleet, defending assisting fleet (side records
`DS:0x9C5A`, `0x9C62`, `0x9C6A`, `0x9C72`). A turn has ten rounds; in each
round every fleet moves its next ship, starting with its flagship
(`0x151D8`). Sunk ships, ships without crew, and ships that have left the
battle are skipped (`0x15158`). Each turn advances the clock by one tick of 20
minutes. The clock test comes before each turn (`0x151DA` jumps to
`0x1522B`). A turn runs only the ships' moves, so no supplies are used and no
other fleet, weather, or day processing happens during a battle (`0x15227`).

In its turn a ship can move and then attack once. The player controls only
the flagship; the player's other ships follow their **Plan** and **Order**
settings like computer-controlled ships (`0x15198–0x151AD`). The player plots
up to 10 steps and confirms the course (message 768); choosing **Move** leads
straight to the attack prompt and ends the turn, while **Attack** attacks
without moving.

### Wind and movement points

Each battle rolls its own wind once (`0x143BF`): a strength `WS` of
`1 + random(8)`, from 1 to 8, and a direction of `floor(random(8) × 5 / 7)`,
from 0 to 5. The direction uses the same numbering as the facings and is the
heading the wind blows toward.

A ship's movement points per turn come from its Power and its captain's own
Seamanship `Sea` and Navigation Level `NL`, which are not pooled
(`0x12B3F`):

```text
P  = floor(Power × WS × 8 / 150) + 20
Q  = floor(P × Sea / 100)
MP = max(10, min(25, Q + floor(NL × Q / 15)))
```

Each step costs movement points depending on the wind weight `W` of the
step's direction: 1 for the wind's own direction, 2 at 60° from it, 3 at
120°, and 4 for the opposite direction (`DS:0xA06C`). A step straight ahead costs
`floor(Power × W / 100) + 5`. A step that turns costs
`10 − floor(5 × Tacking / 100)` when `W` is 3 or 4, and 5 otherwise
(`0x12AA3`).

Sailing with the wind is therefore cheapest and against it dearest. A higher
Power raises the movement points but also the cost of each straight step,
while a higher Tacking makes turns into the wind cheaper.

### Turning

A ship can only step straight ahead or turn 60° to either side; it cannot
turn further or reverse in one step. Before each step the ship's turn rate is
added to its turn charge, up to 100. The step may turn when the result is at
least 50 (`0x12B33`; the player's plotter at `0x12EC5`, computer ships at
`0x132F6`); a turn empties the charge, and a straight step keeps the new
value. The charge carries over between turns (unit byte `+0x0B`) and starts
at 0. The turn rate is (`0x12AF2`):

```text
T         = floor(Tacking × Sea / 200)
turn rate = min(100, T + floor(NL × T / 15))
```

A ship with a turn rate of 50 or more can therefore turn on every step. A
ship cannot enter land, another ship, or a ship without crew.

## Cannon fire

### Guns

A ship's gun type sets its range `A` and strength `B` (tables at `DS:0x09EE`
and `DS:0x09FE`). The type numbers follow the Shipyard's gun list
([Figureheads and guns](ships.md#figureheads-and-guns)). Firepower at
distance `d` is `B` times a multiplier of 10, 9, 8, or 7 for distances 2, 3,
4, and 5, and 0 beyond the range (`0x14720–0x1474A`):

| Type | Gun           | Range | Strength | Firepower at distance 2 / 3 / 4 / 5 |
| ---: | ------------- | ----: | -------: | ----------------------------------- |
|    1 | Cannon        |     3 |       20 | 200 / 180 / – / –                   |
|    2 | Demicannon    |     2 |       14 | 140 / – / – / –                     |
|    3 | Canon Pedrero |     2 |       10 | 100 / – / – / –                     |
|    4 | Culverin      |     5 |       10 | 100 / 90 / 80 / 70                  |
|    5 | Demiculverin  |     5 |        4 | 40 / 36 / 32 / 28                   |
|    6 | Saker         |     2 |        4 | 40 / – / – / –                      |
|    7 | Carronade     |     5 |       20 | 200 / 180 / 160 / 140               |

A ship can fire (`0x12BB2`) when it has shots left, the target is at
distance 2 up to its range, and the target lies in one of its two
**broadside arcs**: the 60° cones on either side of the ship, square to its
keel, with their edges included. Nothing ahead of or behind the ship can be
fired on. At distance `d`, `2d + 2` of the `6d` hexes are in arc. Boarding has
no arc limit.

In these diagrams `@` is the ship, `o` the adjacent hexes it can only board,
`#` the hexes it can fire on at up to distance 4, and `.` the hexes it cannot:

```text
facing N or S        facing NE or SW      facing SE or NW
        .                    #                    #
      .   .                #   .                .   #
    .   .   .            #   #   .            .   #   #
  .   .   .   .        #   #   .   .        .   .   #   #
#   .   .   .   #    #   #   #   .   .    .   .   #   #   #
  #   .   .   #        #   #   .   .        .   .   #   #
#   #   o   #   #    .   #   o   .   .    .   .   o   #   .
  #   o   o   #        .   o   o   .        .   o   o   .
#   #   @   #   #    .   .   @   .   .    .   .   @   .   .
  #   o   o   #        .   o   o   .        .   o   o   .
#   #   o   #   #    .   .   o   #   .    .   #   o   .   .
  #   .   .   #        .   .   #   #        #   #   .   .
#   .   .   .   #    .   .   #   #   #    #   #   #   .   .
  .   .   .   .        .   .   #   #        #   #   .   .
    .   .   .            .   #   #            #   #   .
      .   .                .   #                #   .
        .                    #                    #
```

### Damage

`0x12D85` computes the damage `D` of one volley. All divisions round down.

```text
A = floor(BL × L / 100) + floor(L / 2)
G = min(floor(guns / 2), floor(floor(crew × combat % / 100) / 2))
Y = floor(G × firepower[distance] / 10)
Z = floor(ceil(Y / 20) × A / 100)      with Gunnery
Z = floor(ceil(Y / 40) × A / 100)      without Gunnery
W = floor(Z × (50 + random(floor(S / 2))) / 100)
D = max(1, min(W, 50 + random(floor(C / 2))))
```

- `L` is the pooled Leadership, `BL` the pooled Battle Level, and `S` the
  pooled Swordsmanship. The code reads Leadership twice for `A`.
- `G` is the number of guns firing: half the guns, limited by half the
  combat crew.
- Gunnery halves the divisor, which roughly doubles the damage.
- `C` is the firing captain's **own** Battle Level, not pooled. The cap
  `50 + random(floor(C / 2))` therefore ranges from 50 up to 99.
- `Z` is truncated to 16 bits (`0x12E63`).

Nothing about the target enters the formula: its captain, hull, and crew do
not reduce the damage. Courage and Seamanship are not used.

### Effect on the target

`0x13ADB` applies `D` to the target's fleet slot:

```text
durability −= min(durability, D)
crew       −= min(crew, floor(D / 2) + random(3))
```

A volley can also do extra damage. When `D` is below 10 there is a 1-in-5
chance to check for it; from 10 it is always checked. `random(19)` then
chooses:

| `random(19)` | Extra damage                   |
| -----------: | ------------------------------ |
|          0–2 | maximum durability             |
|          3–6 | Power                          |
|         7–10 | Tacking                        |
|        11–12 | maximum durability and Power   |
|        13–14 | maximum durability and Tacking |
|        15–16 | Power and Tacking              |
|        17–18 | all three                      |

From `D` 20, a second roll replaces this with at least two of them:
`random(7)` 0–1 gives maximum durability and Power, 2–3 maximum durability and
Tacking, 4–5 Power and Tacking, and 6 all three. From `D` 40, all three are
always damaged.

- **Maximum durability** drops by 1, but not below a quarter of the model's
  durability.
- **Power** and **Tacking** each drop by `floor(D / 2) + random(3)`, not below 0.

Guns are never destroyed. If the target's durability reaches 0 it sinks
(`0x13A21`); otherwise, if its crew reaches 0, it is
[left without crew](#ships-without-crew). Otherwise a player ship that fired
gains 10 Battle experience
([Battle experience](levels.md#battle-experience)).

## Boarding

When a ship attacks an adjacent ship, the boarding fight (`0x13CC5`) runs
`0x12D08` once for each side. The boarding factor `M` is set when the battle starts
(`0x1474C–0x14773`) from the captain's own Swordsmanship `Sw` and Battle Level
`BL`, which are not pooled:

```text
M = floor((floor(Sw × BL / 100) + floor(Sw / 2)) × k / 3)
```

`k` is 3 for the player's ships and for the first active ship in a computer
fleet's slot order, and 2 for its other ships (`0x146E6`, `0x147D4`,
`0x1489F`). That first ship is not necessarily the flagship, which is chosen
afterwards by the greatest maximum durability (`0x14670`). `M` therefore ranges up to 150.

Each side's kills `K` are:

```text
F = floor((crew + random(10)) × combat % / 100)
X = floor(M × F / 100)
K = max(1, min(50, floor(((X × (50 + random(floor(S / 2)))) mod 65536) / 100)))
```

`S` is the side's pooled Swordsmanship. The attacker strikes first: the
target loses `min(crew, K)` for the attacker's `K`. The target then strikes
back with its reduced crew, and the attacker loses `min(crew, K)` for the
target's `K`.

- Each side kills between 1 and 50 crew per boarding attack.
- There is no term for the difference between the two crews. Each side's
  kills depend only on its own combat crew, boarding factor, and Swordsmanship,
  so a larger crew kills more.
- Boarding never damages durability, Power, Tacking, or guns.
- The product is taken modulo 65536 before dividing by 100 (`0x12D64`). That
  only matters when `X` exceeds about 661, which needs well over 400 combat
  crew with a high boarding factor.

If the target's crew reaches 0, it is
[left without crew](#ships-without-crew). Otherwise a player ship that
attacked gains 10 Battle experience.

Computer-controlled ships choose between the two attacks by their
[Method order](#orders).

### Enemy duel challenges

When an enemy flagship boards the player's flagship (`0x13D0E`), it
challenges the protagonist to a duel instead when both of these hold:

```text
random(15) + enemy captain's Swordsmanship >= protagonist's Swordsmanship
enemy captain's Luck                      >= random(player flagship's crew)
```

Otherwise the ordinary boarding fight follows. The protagonist's own duel challenge is
described in [Starting a duel during a naval battle](dueling.md#starting-a-duel-during-a-naval-battle).

## Ships without crew

A ship whose durability reaches 0 sinks: `0x13A21` clears its fleet slot. A
ship whose crew reaches 0 is handled by `0x13A63` instead, which marks its
square on the battle map but leaves the fleet slot intact, so the ship stays
in its fleet. From then on the turn loop skips it, as it skips a sunk ship
(`0x1517C–0x15196`), so it cannot move or attack for the rest of the battle.
A player ship left this way keeps its place in the fleet, and crew can be
moved to it afterwards.

Either way, a player attack that sinks the ship or clears its crew earns the
finishing Battle experience, 10 × the target's maximum durability.

## How a battle ends

The battle's outcome code (`DS:0xA075`) selects its ending (`0x15AC5`). A side
loses when its flagship has no crew, has durability 0, or has left the battle
(`0x128E4`, `0xF7F4`). A duel between the commodores also ends the battle
(`0x18077`), except against the commodore of an assisting fleet (role `0x40`):
the duel then only sets that ship's crew to 0, whichever side won it
(`0x1807D–0x18093`), and the battle goes on. That branch skips the code that
records a lost duel, so losing to an assisting commodore does not end the
game and costs the player nothing. With its flagship now crewless, the rest of
the assisting fleet turns to flee under the [morale rule](#morale). The protagonist can challenge either enemy flagship: the offer at
`0x1005B` accepts the flagship of the main enemy fleet or of the assisting
fleet.

| Code | Ending                                                  | Message                                                        |
| ---: | ------------------------------------------------------- | -------------------------------------------------------------- |
|    4 | The enemy flagship has no crew or has sunk: **victory** | 833, “The enemy's flagship ran up the white flag. …”           |
|    6 | The protagonist wins the duel: **victory**              | 833                                                            |
|    2 | The enemy flagship fled                                 | 565, “The battle ended as the enemy's flagship fled.”          |
|    1 | Nightfall                                               | 563, “The setting sun put an end to the day's battle.”         |
|    3 | The player's flagship fled                              | 564, “The battle ended as the flagship fled.”                  |
|    9 | The player's flagship surrendered                       | 566, “Our flagship had no choice but to surrender.”            |
|    5 | The player's flagship has no crew or has sunk: defeat   | 1017, “%s %d, %d. %s %s's journal stops abruptly …”; the game ends ([Game over at sea](at-sea.md#game-over-at-sea)) |
|    7 | The protagonist loses the duel: defeat                  | 1017; the game ends                                            |

Each ending shows a 192 × 128 `GRAPH.DAT` picture at (120, 32) (`0x15A56` →
`0:0x58B7`) and prints its message in a fixed window:

| Codes | Picture | Window |
| ----- | ------- | ------ |
| 4, 6 | 53 (`0x15B56`) | `0x15AA3`: (56, 176), 38 columns × 144 |
| 2 | 54 (`0x15BBD`) | `0x15A6C`: (80, 176), 30 columns × 96 |
| 3, 9 | 54 (`0x15CCD`) | `0x15A6C` |
| 1 | 55 (`0x15C76`) | `0x15A6C` |
| 5, 7 | 56 (`0x15D73`) | `0x15AA3` |

Message 1017 takes the month, day, and year, the protagonist's names, and
“her” or “his” (`DS:0xA19F` / `0xA1A3`, by protagonist 1); defeat then sets
end state `0x1A`. A victory plays track `0x15`, then `0x11` once the message
is acknowledged; defeat plays `0x14`. The screen is never cleared between the
ending's steps, so a victory's picture stays behind the spoils.

After the ending, the battle's end sequence (`0x16040–0x16185`) treats the
codes by parity. For an even code (2, 4, 6, or 8), each of the player's
captains gains end-of-battle Battle experience (`0x160D7`), and the
diplomatic update runs: the naval [Relation loss and personal-Friendship
changes](friendship.md#naval-victory-rules) against the opposing fleet's
nation (`0x1610C` → `0x15DE5`, whose only guard is `0x15DED`, the parity
test). Odd codes skip both, so nightfall (1), fleeing (3), and surrender (9)
change neither Relations nor Friendship; 5 and 7 end the game first.

The end-of-battle experience is `floor(B / 5)` for each captain of an active
player ship, where `B` is the total maximum durability of every enemy ship in
the battle, assisting fleet included: the setup routine's result (`0x1492B`,
`0x14907`, `0x160DE`). An accepted merchant surrender makes the pre-battle
routine return −1 instead, so it gives no experience. Sunk player ships are
removed (`0x160C2`). Before this, each ship's remaining shots are written back
to its supplies (`0x1606A–0x16087`).

A victory (4 or 6) awards [Piracy Fame](fame/piracy-fame.md#naval-victories)
with the full battle-result factor of 3 and the [spoils](#spoils-of-victory).
When the enemy flagship flees (2), the player still gains Piracy Fame, with
factor 1, but takes no spoils (`0x15B33–0x15BBB`). The other endings give
neither.

### After the battle

Unless the game is over, `MAIN.EXE 0x16126–0x16185` then checks every computer
fleet that took part, on either side. Its captain loses the fleet (`0x15302`:
the captain's fleet byte `+0x24` becomes `0xFF` and he is moved to a random
port) when any of these holds:

- the fleet's flagship has sunk, has no crew, or has durability 0;
- the battle ended in a duel won by the protagonist (code 6); or
- the captain's sailor byte `+0x29` lacks bit `0x20`.

Losing the fleet empties all ten of its ship slots and marks the fleet
inactive (`0x15302–0x15359`); the fleet record is later given a new captain by
the ordinary fleet regeneration ([Fleets](fleets.md#fleet-regeneration)). A
captain drawn with a generic portrait (sailor byte `+0x13` bits `0xC0`) also
has bit `0x20` cleared (`0x1533A`), which frees his sailor record: each month it
has a 1-in-3 chance of being reused for a new generic sailor
([Sailors](sailors.md#temporary-vagabonds)), so such a captain can disappear
for good.

An enemy flagship that fled (code 2) or survived to nightfall (code 1) keeps its
fleet, provided its captain has that bit. Scenario scripts test “the opponent's
fleet byte is `0xFF`” to tell a real victory from an escape.

For endings 2, 4, and 6 the defeated captain then speaks a parting line
(`0x161BB–0x16239`), chosen by his fleet type and by whether he fled:

| Fleet                     | Defeated | Fled |
| ------------------------- | -------: | ---: |
| Pirate (fleet IDs 60–69)  |      830 |  834 |
| Merchant (IDs ending 1–4) |      832 |  836 |
| Any other                 |      831 |  835 |

A scenario flag set by a before- or after-battle route (`DS:0x0F6A` or
`DS:0x0EE0`) skips this line (`0x161A7–0x161B8`); nothing else is skipped.

### Leaving the battle

A ship leaves the battle from any hex on the map's edge (`0xEFBB`), with no
roll and whatever its speed (`0x139A4`). The player's flagship does so with
the **Escape** command, which asks “Are you sure you want to flee?” (message 776) and is available only on an edge hex (`0x10C20`). If a main fleet's
flagship leaves, the battle ends at once: code 3 for the player, 2 for the
enemy (`0xF7F4`).

### Nightfall

Each turn advances the clock by 20 minutes, and the battle ends in nightfall
(code 1) after the turn that reaches 21:00 or later (`0x15227–0x15232`). The
sea menu's **Battle** command works only from 5:00 to 19:40 (“You can't
attack someone at night.”, message 781, `0x16493`), so a battle started with
it lasts between 4 and 48 turns. Its messages use the window at (160, 128),
30 columns × 96 (`0:0x756C`; 781 at `0x16516`, 782 for a fleet of the
player's own nation at `0x164D6`). It lists the fleets in reach under “Enemy
Fleet” (list type 3, `0x16262`), then shows the chosen commodore's card
(`FC4:0xC8D5`, column 15, mode 0; `0x16276–0x16285`) with a yes/no
(`0x1628A`); No returns to the list.

**Gossip** has no such limit. Gossiping with a fleet that is out to attack the
player starts the battle at once, at any hour (`0x2589B`, battle entry
`0FC4:11A8`). The fleet's order decides:

| Fleet's order                  | Gossip line                                                                     | Battle |
| ------------------------------ | ------------------------------------------------------------------------------- | ------ |
| 3                              | 155, “Ohhh, I was waiting for you to sail by. It's time to teach you a lesson.” | Yes    |
| 4                              | 156, “Unlucky fool! You don't know who I am.”                                   | Yes    |
| 5–7, targeting the protagonist | 161, “And you know what? You are my next prey.”                                 | Yes    |
| Any other                      | Where it is heading or what it is doing (152–160)                               | No     |

The nightfall check still applies. A battle started this way before 5:00 runs
until 21:00; one started at 21:00 or later has no turns at all and ends in
nightfall at once.

A fleet that attacks the player on its own does so only from 6:00 to 17:40
(`0x1FA60–0x1FA6C`).

### Before the battle: Fight, Flee, or Surrender

After the battle screen is drawn and the scenario's `0xA1` routes have run
([Cancelled battles](#cancelled-battles)), an encounter dialogue follows
unless either route left variable 63 set (`0x1507B`). Both sides' strength
totals here include the supporting fleets (`0x1492B`; a fleet's rating is
described under
[Pre-combat merchant surrender](fame/piracy-fame.md#pre-combat-merchant-surrender)).
A commodore whose sailor status is Piracy counts as fleet 60 in these tests.

**When the protagonist attacks** (`0x14D12`), the protagonist speaks first,
in the lower panel:

- To a pirate: “Pirate %s %s, your days of terrorizing the seven seas are
  numbered.” (810) when the shared scenario has an `0xA1` route for the
  battle, otherwise “Pirate %s %s, your luck has run out.” (811), with the
  pirate's first and last names. The pirate answers in the upper panel, “What
  rubbish! You're the one who is doomed to sink!” (813).
- To anyone else: “Stop your ship, or we'll attack!” (812). A merchant fleet
  (IDs ending in 1–4) much weaker than the player's side answers with the
  [surrender offer](fame/piracy-fame.md#pre-combat-merchant-surrender) (815)
  and a Yes/No choice; accepting ends the battle with code 2. A merchant that
  refuses says “Huh, why should we listen to you?” (816), and any other fleet
  “You are pretty brave to challenge us.” (814).

**When an enemy fleet attacks** (`0x14DFB`), its commodore speaks first, in
the upper panel:

- A pirate: “If you don't want to get hurt, surrender your cargo and gold!!”
  (817).
- A fleet sent after the player (objective 3): “We finally got you, %s! You
  are under arrest for your actions against %s!” (818), with the
  protagonist's last name and the fleet's nation.
- Any other: “You're from %s, our sworn enemy! …” (819), with the player's
  nation.

A mate then sizes up the enemy, the First Mate first (duty order First Mate,
Bookkeeper, Chief Navigator, Captain, Navigator): “Nothing to fear,
Commodore, they're no match for us.” (821) when
`floor(3 × player strength / 2)` is at least the enemy's, otherwise
“Commodore, I think we're in big trouble.” (820) (`0x14EA0`). With no mate
holding any of those duties, the speaker is the last mate on the roster. The
game then offers **Fight**, **Flee**, or **Surrender** (menu 54).

**Flee** succeeds when the protagonist's own Luck plus Navigation Level is
greater than `random(150)` (`0x14EF6–0x14F0E`), “We managed to escape!”
(message 822); the battle is skipped and ends with code 3. Otherwise
“Commodore, there's nowhere to run! We have no choice but to fight.” (824),
and the battle begins. The same mate speaks both.

**Surrender** skips the battle and ends it with code 9 (`0x14F3D–0x15066`);
the enemy commodore speaks:

- A national fleet announces, “You are wise to surrender. According to our
  law, we'll take away 2/3 of your gold and cargo.” (825). In fact the player
  keeps two thirds: gold becomes `floor(2 × gold / 3)`, and every goods load
  on every ship becomes `floor(2 × amount / 3)`.
- A pirate fleet (fleet IDs 60–69) takes all the goods (826). Gold under 1,000
  is raised by 1,000 (827), gold from 1,000 to 9,999 is left alone (828), and
  gold of 10,000 or more is set to 5,000 (829).

Water, food, lumber, and shot are never taken. After a surrender the enemy
fleet heads back to its home port, unless it is a story fleet (fleet flag
`0x40`, which scenario scripts set) or is pursuing someone (`0x15C9F`).

When the dialogue ends the battle (an accepted offer, a successful flight, or
a surrender), the pre-battle routine returns −1 at once (`0x15102`), so the
Loyalty withdrawal below does not run and no end-of-battle experience is
given.

### Mates who withdraw

When the battle goes ahead, the
[Loyalty withdrawal](sailors.md#mate-loyalty) runs next (`0x14C3E`), but
only when the enemy side's strength is at least 20 more than the player
side's. Each of the player's ships after the flagship whose captain has
Loyalty below 40 then leaves: the captain speaks one of messages 787–790,
chosen by personality bits 6–7, in the lower panel with their portrait; they
are dismissed with their ship (`0x13EE5`), and the ship is removed from the
battle and the map. The strength totals and the end-of-battle experience
base were already taken, so the ship still counts in them.

### After fleeing or surrendering

After code 3 or 9, each of the player's other ships whose captain has Loyalty
below 40 is lost with its captain, “Commodore, I don't see %s's ship
anywhere.” (message 791), as in the
[battle-start withdrawal](sailors.md#mate-loyalty) (`0x15D0F–0x15D5B`).

### Cancelled battles

A scenario's pre-battle route can cancel a battle before it starts (code 8,
`0x150FD`). No battle is fought (`0x16444`), and the ending shows no message
and gives no Fame or spoils (`0x15AD3`). The end sequence still runs
(`0x16467`), however, and 8 is even. The opposing captain was already
recorded when the battle was set up (`0x14BF2`), so the naval Relation loss
and personal-Friendship changes are applied against that fleet's nation as if
it had been fought, including the same-nation shame and exile checks. The
end-of-battle experience is zero, because its base is the pre-battle
routine's result, −1 for a cancelled battle, divided by 5. The scenario's after-battle routes also still run (`0x16191`), as after any other battle.

Before the battle the protagonist's `0xA1` route runs first; if it cancels,
the shared route is not run (`0x150E5–0x15105`). After the battle the shared
`0xA2` route runs first (`0x16191–0x161A2`). Each route's find routine clears
its variable 63 first (`0x38FF4–0x3929C`); variable 63 set by either `0xA1`
route skips Fight/Flee/Surrender and the merchant offer (`0x15121`). Against a
pirate, the merchant-offer path shows message 810 when a shared `0xA1` route
exists, else 811 (`0x14D56`). When the game is over, everything after the
ending, both `0xA2` routes included, is skipped (`0x16101`).

### Journal entry

Every battle that is fought or fled adds an entry to the journal (`0x235E1`),
which keeps the 48 most recent entries and drops the oldest when full
(`0x23601–0x2365C`). The entry names the enemy's nation and whether it was a
merchant ship or a battle ship, and ends with one of three phrases, chosen by the ending (`0x15B30`,
`0x15C73`, `0x15CCA`):

| Ending                                    | Phrase                              |
| ----------------------------------------- | ----------------------------------- |
| Victory, or the enemy flagship fled       | “and served them a crushing defeat” |
| Nightfall                                 | “but sunset ended it in a draw”     |
| The player's flagship fled or surrendered | “but we were forced to flee”        |

The journal is not part of the main save record. It is a separate 0x300-byte
block (handle `DS:0x0E12`, allocated at `0x1C399`) holding 48 records of 16
bytes, cleared to `0xFF` for a new game (`0x1BADD–0x1BB01`). Saving writes it
straight after the 0x79C8 bytes from `DS:0x0E28`, so it fills save-slot
offsets `0x79C8–0x7CC7` (`0x1BD30–0x1BD7D`; loading, `0x1BF86–0x1BFC4`). A
record holds six words and 4 unused bytes (`0x2355B`): the date
`(year byte × 12 + month) × 31 + day` (`0xFFFF` when empty), a type, and four
parameters. Adding an entry (`0x235E1`) fills the first empty record, or
moves records 1–47 down and writes the last. The text is built when the
journal is shown (`0x2367A`), from the date and a handler chosen by type
(table at `0x2378B`):

| Type | Writer                     | Message                                             | Parameters                                        |
| ---: | -------------------------- | --------------------------------------------------- | ------------------------------------------------- |
|    0 | Arrival, `0x212FA`         | 366                                                 | days at sea (`DS:0x2BAA`), port                   |
|    1 | Harbor restock, `0x2D7AF`  | 367                                                 | days, port                                        |
|    9 | Port sighted, `0x36C3C`    | 381, “Discovered %s.”                               | port                                              |
|    2 | Battle, `0x15B30`/`0x15C73`/`0x15CCA` | 837, “Our fleet had a battle with a %s %s, %s.” | opponent's fleet ID (sailor `+0x24`), phrase |
|   12 | Market purchase, `0x2A087` | 384, “Bought %d %s of %s for %ld gold pieces each.” | goods, price (high word, then low word), quantity |

In a battle entry the nation is the adjective `DS:0xA3A[id / 10]`, the kind is
MENU entry 52 (“Ship” for an ID of 60 or more or ending in 0, “Merchant ship”
for 1–4, “Battle ship” for 5–9), and the phrase is MENU entry 53: 0 for a
victory or a fleeing enemy, 1 for nightfall, 2 for fleeing or surrender
(`0x23815`).

The display also handles types 13–18 (`0x23815`, `0x238FA–0x23A37`);
types 3–8, 10 and 11 print nothing.

## Spoils of victory

### Gold and items

After a victory (`0x15912`), the player takes `(F + 1) × 100` gold, where `F`
is the defeated fleet's treasury, the word at fleet record `+0x24`. The fleet's
item (`+0x1D`) is taken as well when the inventory holds fewer than 20 items
(`0x15950`); the item stays in the fleet record until the fleet is relaunched.
One message, in a window at (160, 128), 240 × 96 (`0x15968–0x15983`), tells
both (`0x15989–0x15A2D`, spaces from `0:0x4991`): 562 “We managed to seize”,
560 “%ld gold pieces”, for an item 561 “and %s %s” with “an” or “a” by the
name's first letter (`0x158E1`), then 1027 “from those scurvy dawgs!”. Item
`0x37`, the Circlet, uses 1422 “and a Circlet from those scurvy dawgs!” in
place of both. The gold is added after the message.

Every fleet starts without an item (`0xFF`). Each time a computer fleet
returns home, it gets one with probability ½ if it has none: one of items
50–69, the gift and jewellery items from the Silk Shawl to the Ruby Ring
(`50 + random(20)`, `0x3990B–0x39933`). The same loop can also fill the next
three bytes, `+0x1E` to `+0x20`, with rolls of ¼, ⅙, and ⅛, each
made only when every earlier roll succeeded, but nothing reads them. A relaunch clears
all four to `0xFF` (`0x1D961`).

A fleet's treasury starts at `floor(G / 10) + 1 + random(3)`, where `G` is its
nation's Guild Profit ([Sphere of influence](sphere-of-influence.md)), each
time the fleet is relaunched (`0x1D938–0x1D94D`) and each time it returns
home; investing halves it and trading spends it
([Investing and trading](npc/fleet-objectives.md#investing-and-trading)).
For each ship one computer fleet sinks of another at sea, it takes a fifth of
the loser's treasury, up to a treasury of 60,000 (`0x1FBA0–0x1FBC1`;
[Battles between computer fleets](npc/fleet-objectives.md#battles-between-computer-fleets)). The routine also skips the
item when the defeated flagship has a player-side [role](#battle-roles), which
cannot happen when the player wins, so in practice only a full inventory
prevents it.

### Capturing ships

`0x154D8` then looks at the defeated side's units (`0x154FA–0x15541`). A unit
whose durability is not 0 counts toward the surviving ships `T`, and it is a
candidate when its hex also lies inside the battle view, which is centred on
the player's flagship (`0:0xBD45`). Ships with no crew are candidates too.
Only the defeated fleet's own ships are considered, so ships of another fleet
that fought alongside it can never be captured. With no candidate the routine
returns at once: no message and no cargo.

The number that can be kept is `K = min(10 − active ships, free captains,
candidates)` (`0x1571B–0x1573A`; `0x18229` lists the free captains, see
[Assigning duties](sailors.md#assigning-duties)). When `K` is 0 nothing is
announced and the cargo follows. Otherwise, while `K` is above 0:

1. The vendor text window (scenario panel 0, x 240, y 8, 240 × 128) shows
   1413, “We captured 1 enemy ship! We can add it to our fleet.”, when there
   is one candidate, else 558, “We captured %d enemy %s! We can add %d of
   them to our fleet.”, with the candidates (which never shrink), “ships”, and
   `K`.
2. The ship list `FC4:0x5904` type 14 (`0x157D1`): x 464, y 64, titled “Ship
   Model” (MENU 47 item 14), one row per candidate with its instance name,
   which for a computer fleet is the model's name.
3. Cancelling the list asks “Is this OK?” (559) in the same window; Yes ends
   capturing, No shows the message and list again (`0x158A7`).
4. Choosing a ship shows its card and a yes/no. The routine saves the area
   at (96, 128), 384 × 176, fills it with colour 8 and (104, 136), 368 × 160,
   with colour 15 (`0x15803–0x1584F`), then calls the ship card
   `1E5F:0xD289` (file `0x30E79`) in mode 3; see
   [the ship card](#the-ship-card). No returns to the list. Yes captures it (`0x15361`) with the first free
   captain, removes it from the candidates, lowers `K`, and loops.

A captured ship (`0x15361`) takes the first player slot that is neither
active nor pending and the first ship-instance record 0–39 whose type is
`0xFF`. The slot keeps the enemy's durability, maximum durability, Tacking,
Power, and guns, and the whole status byte, so the gun type; its crew is
`min(floor(crew / 10), maximum crew)`, a tenth of what it had when the battle
ended, so a ship captured with no crew joins with none. The maximum crew is
the instance's crew bunks (`+0x14`, the “Used Crew” of
[Ships](ships.md#24-byte-ship-identity-record)). Only the instance's type,
`+0x12`, gun spaces, crew bunks, and capacity are copied, not its name. The
supply record gets no water, food, lumber, shot, or goods, a 25% lookout and
50% navigation share, `+0x1C` 60, and the captain, whose duty becomes 2
(Captain); the figurehead byte is untouched. “Name the ship.” (557) then opens
the name entry (`2DFF:0x2DEA`) for “Ship name?”, at most 8 characters, which
repeats until a name is entered; it cannot be cancelled (`0x154AF–0x154CB`).

The name entry draws its keyboard window at (0, 0), 29 columns × 160
(`0x363F4`). The prompt window (`0x36530`) for a name of up to `n`
characters starts at column `29 − n − 3`, y 256, max(n + 6, 17) columns × 80;
the prompt (`DS:0xBAFA` “First name?”, `0xBB06` “Last name?”, `0xBB12` “Ship
name?”, `0xBB1D` “Port name?”) is at column `29 − n`, y 272, and the entry at
y 304 over `n` underscores 8 pixels lower (`DS:0xBB28`); the cursor's
underscore uses `DS:0xBAEC`, the others `0xBAF4` (`0x362A0`).

#### The ship card

`1E5F:0xD289` (file `0x30E79`) draws `GRAPH.DAT` record 22 at (104, 136)
(`FC4:0xB592`), the model's picture at (120, 160) (`0:0x7DE5`), the
instance's name in colour 1 at (328, 148) (`DS:0xB7BA`), and from (256, 168),
16 pixels a line, messages 1405, 1406, 1411, 1407, `DS:0xB7C3`, 1409, and
1410 (`0x30FAB–0x3106F`). Its mode (`dx`) picks the values
(`0x30EB8–0x30F93`):

| Value | Mode 0 | Mode 1 | Mode 2 | Mode 3 |
| --- | --- | --- | --- | --- |
| Durability | ⌊9 × model `+1` / 10⌋ | that less a fifteenth | 0 | slot `+2` |
| Maximum | ⌊9 × model `+1` / 10⌋ | that less a fifteenth | ⌊9 × model `+1` / 10⌋ | slot `+3` |
| Tacking, Power | model `+2`, `+3` | model | model | model |
| Capacity | model `+6` | model `+6` | model `+6` | model `+6` |
| Cargo | instance `+0x16` | template `+0x16` | model `+6` | instance `+0x16` |
| Guns | instance `+0x13` / model `+8` | template | 0 / model `+8` | instance `+0x13` / model `+8` |
| Min/Max Crew | model `+5` / instance `+0x14` | template | model `+5` / 0 | model `+5` / instance `+0x14` |
| Max Crew (Remodel) | model `+4` × 10 | same | same | same |

Mode 0 takes a ship instance, modes 1 and 2 a model (its template instance
`model + 0x28`), mode 3 a ship slot. Captures and the Shipyard's own-ship
cards use mode 3 (`0x15859`, `0x2DF90`); New Ship uses mode 2
(`0x31BAB`, `0x31CB8`) and mode 1 appears at `0x31E75`.

### Cargo

The spoils (`0x15573–0x15715`) are a record of up to nine entries: Water,
Food, Lumber, Shot, and one goods type. For each candidate, let `free` be its
cargo capacity (instance `+0x16`) minus its remaining shots and its share of
the goods below:

```text
water  += floor((30 + random(5)) × free / 100)
food   += floor((30 + random(5)) × free / 100)
lumber += floor((2 + random(2)) × free / 100)
shot   += the ship's remaining shots
```

The multiplication is unsigned (`mul di`), so a ship whose shots and goods
share exceed its capacity yields about 20,000 water and food. Water and food
are counted in cargo units, a tenth of the supply value.

Goods depend on the defeated fleet's cargo record (`+0x21` type, `+0x22`
amount), which is rewritten with the result:

- If the fleet carries goods, the amount becomes
  `floor(amount × candidates / T)`, split evenly among the candidates.
- If it carries none, a fleet whose ID ends in 1–4 (pirate fleets 61–64
  included) has a 1-in-2 chance of goods sized from the candidates' total
  capacity `C`: with chance 9 in 10 type `10 + random(6)` (Sugar, Cheese,
  Fish, Grain, Olive Oil, or Wine), `floor(C / 5)` of them; otherwise type
  `26 + random(7)` (Coral, Amber, Ivory, Pearl, Tortoise Shell, Gold, or
  Silver), `floor(floor(C / 4) / 5)`.
- Other fleets yield no goods.

The supplies and goods, but not the gold, therefore scale with how many
enemy ships are on screen when the battle ends: each one adds its supplies and
a share of the goods, whether or not it is captured.

When any entry is not 0, the crew list is drawn and the goods-transfer screen
opens with the spoils in its unloading area (`1E5F:0x17C2`, mode 1). This is
the Fleet tab's **Transfer Cargo** screen ([Fleet Info](fleet-info.md)),
which starts with the area empty. Ending it with spoils still in the area
asks “There are items left in the unloading area! Is it still okay to end the
transfer process?” (1373), else “Is this OK?” (219); whatever is left is lost.

## Computer-controlled ships

### Orders

Each ship's orders are unit byte `+0x0C`, which the **Order** screen shows and
the player can change for their own ships:

| Order    | Choices                   | Bits                 |
| -------- | ------------------------- | -------------------- |
| Strategy | Flee, Fight Back, or Pack | `0x08`, `0x04`, none |
| Tactic   | Attack or Escape          | `0x02`, none         |
| Chase    | Chase or Defend           | `0x01`, none         |
| Method   | Fire or Rush              | `0x10`, none         |

At the start of a battle every ship gets (`0x14463`):

- Pack, except merchant fleets (fleet IDs ending in 1–4, outside the pirate
  block), which start with Flee;
- Attack;
- Chase when the captain's `Courage >= random(50)`, otherwise Defend;
- Fire when the ship has shot and is a sailing ship, otherwise Rush.

A computer fleet's ships all use the fleet commander as captain (side record
`+6`, `0x1480A`), so the fleet ID tested is the commander's and every ship of
a merchant fleet starts with Flee. The flagship is then chosen (`0x144DC`,
[Flagship](#flagship)) and its orders are replaced outright with `0x22`
(`0x14581`): Pack, Attack, Defend, and Rush, plus bit `0x20`. Nothing
reads that bit: every later write to the orders byte keeps it (`0x108AD`,
`0x10B19`, `0x10B42`, `0x10B51`, `0x1398B`), and the game finds a side's
flagship through the side record's first pointer (`0x1457A`) instead. So a merchant fleet's escorts flee from the first turn
whatever their strength, while its flagship stays and fights. It flees only
through the [morale check](#morale). Every computer flagship likewise starts
with Rush, even when it has shot.

The Strategy and Tactic select how a ship moves (`0xF6D2`, far-pointer table
`DS:0x90B2` indexed by `orders & 0x0F`):

| Orders              | Routine  | Movement                                                           |
| ------------------- | -------- | ------------------------------------------------------------------ |
| Flee                | `0xF265` | Leave from the edge if on it, otherwise head for an edge hex       |
| Pack + Attack       | `0xF5DF` | Close on the target ship, or the enemy flagship if it has none     |
| Pack + Escape       | `0xF618` | Move to the reachable hex least exposed to enemy fire and boarding |
| Fight Back + Attack | `0xF47F` | Close on its own flagship, the same routine as Pack + Attack       |
| Fight Back + Escape | `0xF4A2` | Move as close to its own flagship as possible, then least exposed  |

Computer fleets never use Fight Back or Escape. Their orders are set only at
the start of the battle (Attack, with Chase and Fire as above) and by the
morale check, which adds Flee (`0xF874`); every other write to `+0x0C` comes
from the player's Order screen (`0x10803–0x10B51`). The same screen is the
only place a ship is given its own target (orders bit `0x80`, unit byte
`+0x06`, `0x10B2F–0x10B3D`). A computer ship therefore always closes on the
opposing **main** fleet's flagship (`0x129DB`), even when it belongs to an
assisting fleet, or flees. The other rows apply to the player's escorts.

Chase or Defend does not change the movement. It is read only when the game
decides whether a ship looks for targets, which it does when Attack or Chase
is set (`0x131E2`). Because every ship starts with Attack, **Courage has no
practical effect in battle**, and it never enters any damage formula.

With **Fire**, a ship fires when it can and otherwise boards an adjacent ship.
With **Rush**, it boards when adjacent and otherwise fires (`0x13DDA`).

### Choosing a destination

Each computer-controlled ship's turn (`0xF857`) builds three 52 × 48 maps
(`0xF6FB`, `0x13570`), picks a destination hex (`0xF6D2`), plots a path to it
(`0x138F7`), moves (`0xF76D`), and attacks (`0xF73F`). Nothing in it is
random.

**Candidate hexes.** A depth-first search (`0x132EB`) tries every course the
ship could actually sail this turn: at each step a left turn, straight on, and
a right turn, under the real [movement point](#wind-and-movement-points) and
[turning](#turning) rules. A step must stay on the map, avoid every ship and
crewless hull, and cost no more than the points left. A hex becomes a
candidate only when the ship could take **one more** legal step from it
(`0x133CC–0x133D3`), so a hex reachable only by spending almost all its
points is never chosen; the starting hex is always a candidate (`0x135B8`).
Candidates are then removed for every living ship of the mover's own and
allied fleets, the mover included: the hex directly ahead of that ship, and
its last free neighbour when five of its six are occupied (`0x13537`,
`0x1340F`).

**Attack value.** On a ship with Attack or Chase, every hex the search enters
is scored for the facing the ship arrives with; the starting hex is scored for
its current facing and both turns (`0x135C0–0x135E9`). For each enemy ship
(`0x131C8`):

```text
if own ship has shots and the enemy is within its range and broadside arc:
    v = enemy firepower at distance d × (2 with Fire, else 1)
if d = 1:
    v = enemy boarding value (+0x16) × (2 with Rush, else 1)
if v ≥ value[hex]: value[hex] = v, and the hex records that facing
```

The firepower and boarding values are the **enemy's** (`0x13272`, `0x132AD`),
not the moving ship's own, and `v` is kept in one byte, so 256 or more wraps:
a Fire ship's value for an enemy firing 200 at distance 2 becomes 144.

**Exposure.** For each enemy ship, every hex within 5 of it that lies in its
range and **current** broadside arc adds that enemy's firepower at the
distance, and an adjacent hex adds its boarding value (`0x13131`, `0x130BD`).
The total is also one byte and wraps.

**Choosing.** The routines scan the candidates row by row from the top, left to
right within a row, and keep a running best. With `R` the ship's own gun range
(0 without guns), `D` the distance to the hex being closed on, `m` the
distance moved, and `ceil10` rounding up to a multiple of 10:

| Routine                  | Takes a hex when                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Close on (`0xF34B`)      | `max(D, R)` is lower; or equal and value > `T`; or equal, value = `T`, and `m` is larger |
| Near flagship (`0xF4A2`) | `D` is lower; or equal and exposure < `T`; or equal, exposure = `T`, and `m` is larger   |
| Least exposed (`0xF618`) | exposure is lower; or equal and `m` is larger                                            |

For closing on a ship, `T = ceil10(floor((12 − min(max(D, R), 10)) × best value / 10))`;
near the flagship, `T = ceil10(floor(min(D, 10) × best exposure / 10))`
(`0xF3E3–0xF417`, `0xF57A–0xF594`). Every hex at distance `R` or less from
the target ties on `max(D, R)`, including the hexes next to it, from which no
ship can fire. A ship therefore closes to within `R` hexes of the target and
then picks among those hexes by attack value. The threshold is taken from the
current best, so the result depends on the scan order. With `R` of 3 or 5
the factor is below 10, and a later hex (farther down, then farther right)
with about 90% or 70% of the best value replaces it. With `R` of 2 the factor
is 10, and an equal later hex does not.

A hex next to one of the player's ships ties with the firing hexes on the
first rule whenever it is no more than `R` from the target, so it competes
with them on attack value alone. Because the values are
the player's, a computer ship boards rather than fires when the player's
boarding factor beats the player's own doubled firepower, as it is kept in
one byte. With Fire, a firing hex scores `2 × firepower mod 256`:

| Player's guns | Firing hex value at distance 2 / 3 / 4 / 5 |
| ------------- | ------------------------------------------ |
| Cannon        | 144 / 104 / – / –                          |
| Demicannon    | 24 / – / – / –                             |
| Canon Pedrero | 200 / – / – / –                            |
| Culverin      | 200 / 180 / 160 / 140                      |
| Demiculverin  | 80 / 72 / 64 / 56                          |
| Saker         | 80 / – / – / –                             |
| Carronade     | 144 / 104 / 64 / 24                        |

A player captain with a boarding factor near its maximum of 150 therefore
draws boarders against every gun type except Culverin and Canon Pedrero, and
a player ship without guns can only be boarded. With Rush the boarding value
is doubled instead and can wrap too: 150 becomes 44.

**Fleeing** (`0xF265`) leaves the battle from an edge hex unless that hex is
land (`0xEFBB`, `0x139A4`). Otherwise it takes the candidate edge hex
farthest from its own starting hex, the first in scan order on ties
(`0xF2E6–0xF300`); the enemy's position plays no part. With no candidate on
an edge, it takes the candidate nearest any of 12 points on the edges, the
four corners and the two middle hexes of each side, skipping points that are
land (`0xF00D`). The land test swaps row and column: it reads map byte
`x × 52 + y` instead of `y × 52 + x`, so it checks the wrong hex, and for
the four points on the right edge it reads past the map into the unit
records:

| Point (x, y)       | Byte tested                                   | Effect                                                            |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------------- |
| (0, 0)             | hex (0, 0)                                    | correct                                                           |
| (25, 0), (26, 0)   | hexes (0, 25), (0, 26)                        | skipped when the left edge's middle is land                       |
| (0, 23), (0, 24)   | hexes (23, 0), (24, 0)                        | skipped when the top edge's middle is land                        |
| (0, 47)            | hex (47, 0)                                   | skipped when that top-edge hex is land                            |
| (25, 47), (26, 47) | hexes (47, 25), (47, 26)                      | skipped when those hexes, 4 columns from the right edge, are land |
| (51, 0)            | `DS:0x9CEA`, unit 4 `+0x10`                   | never skipped                                                     |
| (51, 23), (51, 24) | `DS:0x9D01`, `0x9D02`, unit 5 `+0x0F`/`+0x10` | never skipped                                                     |
| (51, 47)           | `DS:0x9D19`, unit 6 `+0x0F`                   | never skipped                                                     |

The unit array begins at `DS:0x9C7A`, right after the map, with ten 24-byte
records per side (`0x144ED`), so units 4–6 are slots 4–6 of the attacking
main fleet. Byte `+0x10` is the firepower at distance 1, which is 0 for every
gun type (`0x145F3`), and `+0x0F` is the high byte of the 16-bit shot count,
so neither can hold `0x80`. The right-edge points therefore always count,
even when they are land.

**Sunk and departed ships still count.** A sunk ship is never removed from
its side's unit list: sinking clears its map hex, cancels any player-set target aimed at
it, and zeroes its fleet slot (`0x13A21`, `0x11ADF`, `0x13959`), and leaving
the battle only sets orders bit `0x40` (`0x139A4`). Its position and shot
count stay in the unit record. The attack-value and exposure maps loop over
every unit in the list and test only shots, not whether the ship is still
in the battle (`0x131C8`, `0x13131`, `0x12C99`, `0x12CDB`). A computer ship
can therefore choose a hex for firing on, or boarding, a ship that has sunk,
left, or lost its crew, and avoid fire from one. The attack after the move
does check (`0x13DDA` calls `0x128E4`), so it only attacks a ship still in
the battle; if none is in reach, the ship ends its turn without attacking.

**Moving and attacking.** When the destination recorded a facing, the path
(`0x136CD`) must arrive with that facing, so the ship ends with a target in
its broadside arc; of several such courses the last one found, trying left,
straight, then right at each step, wins. Otherwise it takes the course with
the fewest turns, the first found on ties. A ship that stays in its hex only turns in place,
to the recorded facing or else toward its target (`0x137F5`); this costs no
points and does not empty the turn charge (`0xF7AD`). It then attacks once
when its hex recorded a facing: its own target if the player set one,
otherwise the first enemy it can attack in list order, starting with that
fleet's flagship (`0x13EC8`, `0x13E53`), with Fire or Rush deciding between
firing and boarding as [above](#orders). A ship with neither Attack nor Chase
never attacks.

### Morale

At the start of each computer-controlled ship's turn, the game checks its own
fleet's flagship (`0xEF6A`). If the flagship's crew has fallen to 40% or less
of its maximum crew, its durability to 40% or less of its maximum, or it has
left the battle, the ship switches to **Flee** for the rest of the battle
(`0xF870`). This applies to the player's escorts too, whenever the player's
flagship is that badly damaged.

## Open questions

None remain.
