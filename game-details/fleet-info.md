# Fleet Info

The **Fleet Info** view shows the active ships in a fleet over a fixed sea
background, with a summary of the fleet and its commodore below. The rules
below are from the English DOS game's `MAIN.EXE` fleet-view routine at
file offsets `0x22461–0x22974`, the save layout, and the extracted ship art.

## Which ships appear, and where

The game resolves the fleet ID from the captain's sailor record, then scans its
ten nine-byte ship slots in order. It draws a ship only when
`slot[0x08] & 0x30 == 0x10`. Each visible ship gets the next position in a
fixed ten-position formation; an inactive slot consumes no position. The
positions therefore follow **visible ship order**, not necessarily the raw
slot numbers if there are gaps. The first ship is the flagship.

The ten ordered coordinate pairs are stored at `MAIN.EXE` file offset
`0x467C4`. The first byte is a horizontal position in 8-pixel units; the
second is a vertical position in 16-pixel units. On the 640 × 400 game screen,
the sprite origin is `(8 × x, 16 × y)`, measured from its top-left corner:

| Visible ship | Stored `(x, y)` | Sprite origin on game screen |
| -----------: | --------------: | ---------------------------: |
|  1, flagship |      `(32, 10)` |                 `(256, 160)` |
|            2 |       `(48, 4)` |                  `(384, 64)` |
|            3 |       `(16, 4)` |                  `(128, 64)` |
|            4 |       `(32, 1)` |                  `(256, 16)` |
|            5 |      `(16, 13)` |                 `(128, 208)` |
|            6 |      `(48, 13)` |                 `(384, 208)` |
|            7 |        `(0, 1)` |                    `(0, 16)` |
|            8 |       `(0, 10)` |                   `(0, 160)` |
|            9 |       `(64, 1)` |                  `(512, 16)` |
|           10 |      `(64, 10)` |                 `(512, 160)` |

These are screen positions, not saved coordinates or ship movement positions.
`MAIN.EXE 0x224DE–0x22540` scans active slots and passes the next coordinate
and ship type to the sprite drawing routine.

The picture used for a ship comes from the **ship type** in its ship-instance
record, not its name or condition. Ship types are zero-based, as in
[ships.md](ships.md#ship-catalog). The extracted images are
[`GRAPH.DAT` records 28–52](../scripts/ships/graph-ships.ts), 128 × 96 pixels
each, arranged in type order in
[`scripts/ships/output/ships.png`](../scripts/ships/output/ships.png). The
extractor decodes their 16-color graphics and palette; the game draws the same
ship types over its sea backdrop. See [ships.md](ships.md) for the type names.

## Where the displayed values come from

For a `KOUKAI2.DAT` save, let `base = 0x97 + (save_slot - 1) × 0x7CC8`. All
offsets in this section are relative to that save-slot base. The currently
selected protagonist is identified in the save header. Their sailor record is
`base + 0x0612 + protagonist_id × 0x2A`, and its byte `+0x24` gives the fleet
ID. The fleet record starts at `base + 0x1DE0 + fleet_id × 0x85`. Its byte
`+0x2A` identifies the commodore shown in the panel. That identity selects
the character portrait from the game's `KAO` art, while the sailor record
supplies the name, **Navigation Level** (`+0x1C`), and **Battle Level**
(`+0x1D`). See [sailors.md](sailors.md) for the sailor layout and
[`scripts/portraits-items-discoveries`](../scripts/portraits-items-discoveries/index.ts)
for the portrait extractor.

The fleet's ship slots start at `fleet + 0x2B`; slot `i` starts another
`i × 9` bytes later. For each active slot, `slot[0x07]` selects the ship
instance at `base + 0x47FC + instance_id × 0x18`, whose `+0x11` byte is the
ship type. The summary is then calculated as follows:

| Panel value | Source and rule                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Tacking     | Current tacking, `slot[+0x04]`, of the ship with the **lowest calculated sailing score** in the fleet.                   |
| Power       | Current power, `slot[+0x05]`, of that same limiting ship.                                                                |
| Durability  | Lowest current durability, `slot[+0x02]`, among active ships. It is the remaining condition, not the maximum at `+0x03`. |
| Crew        | Sum of active ships' current crew, each a little-endian `u16` at `slot[+0x00]`.                                          |
| Guns        | Sum of active ships' loaded gun counts, each at `slot[+0x06]`.                                                           |
| Battles     | Calculated fleet battle strength described below; it is neither a battle count nor the commodore's Battle experience.    |

The sailing score is each ship's computed sailing speed
(`MAIN.EXE 0x2283E–0x228DA`), so the printed pair belongs to the fleet's
slowest ship. The displayed Tacking and Power are therefore a pair from one
ship, but that ship need not be the flagship, nor the ship with the lowest raw
Tacking value. On a tie the earlier ship keeps the place. The name **Power**
here is the ship's saved propulsion stat, not the Battles rating.

For each active ship the speed is computed as follows, with all divisions
truncating:

```text
navigation ratio = min(100, floor(navigation % × current crew / minimum crew))
load factor      = min(150, 180 − min(180, floor(100 × load / capacity)))
wind             = wind_table[|D − H| × 8 + ship type]
speed            = floor(floor(navigation ratio × wind × power / 100) × load factor / 100)
speed            = min(30, speed + floor(speed × Navigation Level / 10))
speed            = min(40, floor(speed × Seamanship / 75))
```

The minimum crew and capacity come from the ship's model record (`+0x05` and
`+0x06`). The wind table is at `DS:0x08DA` (file offset `0x3C44A`). `D` is
bits 3–5 of save-slot byte `0x0D` (`DS:0x0E35`) and `H` is byte `+0x1A` of
the player's own fleet record, even when another fleet is shown. For the
player's fleet, the navigation percentage and load are the ship's supply-record
bytes `+0x09` and word `+0x0A`, and the captain is the sailor in supply byte
`+0x1B`. For any other fleet, the navigation percentage is 50, the load is half
the capacity, and the captain is the fleet's commodore. Navigation Level is
sailor byte `+0x1C` and Seamanship is sailor byte `+0x15`.

This is only the panel's estimate. The speed that actually moves the fleet is
computed by a separate routine that indexes the wind table by the model's
sail type, includes the wind speed, and applies Tacking against the wind; see
[At sea](at-sea.md#fleet-speed). Because the panel indexes the table by ship
type (0–24), types above 7 read values from later rows or beyond the table, so
the ship whose Tacking and Power are shown can differ from the fleet's
actually slowest ship.

For **Battles**, the routine at `MAIN.EXE 0x227D5–0x2283B` adds a contribution
from each active ship. It counts only the ship's combat crew: the crew left
after the lookout and navigation shares. For the player's fleet these shares
are the percentages at `+0x08` (lookout) and `+0x09` (navigation) of the
ship's supply record, at `base + 0x423E + ship_slot_index × 0x1E`. For any
other fleet the game uses 25% and 50%, so a quarter of the crew counts. Let
`L` and `N` be the two percentages:

```text
available crew = min(300, floor(current crew × (100 − L − N) / 100))
ship contribution = 2 × current durability + available crew
                  + floor(min(loaded guns, available crew) × gun factor / 10)
Battles = sum(ship contribution for every active ship)
```

The gun type is selected by the low three bits of the ship slot's status
byte. The gun factor is `2 × gun_table_A[type] + gun_table_B[type]`, using
the game's tables at `MAIN.EXE` file offsets `0x3C55E` and `0x3C56E`.
For a fleet with no loaded guns, the last term is zero. Durability alone
contributes twice its value for each ship.

## Example calculation

Khayr ad-Din's starting fleet has **five Venetian Galeasses** and **two
Flemish Galleons**. The Galeasses have 320 crew, 90 current durability,
Tacking 70, Power 70, and 50 loaded guns each. The Galleons have 180 crew,
80 current durability, Tacking 75, Power 80, and 30 loaded guns each. The
Galeasses are never slower than the Galleons, and the flagship is a Galeass,
so the panel shows **Tacking 70** and **Power 70**. The lowest current durability is **80**. The fleet totals
**1,960 Crew** and **310 Guns**. Khayr's Navigation and Battle Levels are
**18** and **32**.

Khayr's fleet is not the player's, so a quarter of each ship's crew counts as
combat crew. The ships' gun types differ, so the Battles calculation separates
them:

| Ships                | Gun type      | Available crew each | Gun factor |                       Battles each | Subtotal |
| -------------------- | ------------- | ------------------: | ---------: | ---------------------------------: | -------: |
| 2 Venetian Galeasses | Cannon        |                  80 |         26 | `2 × 90 + 80 + 50 × 26 / 10 = 390` |      780 |
| 3 Venetian Galeasses | Demicannon    |                  80 |         18 | `2 × 90 + 80 + 50 × 18 / 10 = 350` |    1,050 |
| 2 Flemish Galleons   | Canon Pedrero |                  45 |         14 | `2 × 80 + 45 + 30 × 14 / 10 = 247` |      494 |

The resulting fleet value is **Battles 2,324** (`780 + 1,050 + 494`).

The slot and instance structure is also documented in [fleets.md](fleets.md).

## Assign Crew

The Crew tab's **Assign Crew** (`MAIN.EXE 0x249A0`) sets each ship's
navigation and lookout shares. It first draws the crew list (`0x23BF6`): a
window at x 104–448 from y 32, `(n + 2) × 24` tall for `n` active ships in
slot order (`FC4:0x2E8A`). The header “Nav. Look Cmbat Load Spd”
(`DS:0xAD38`) is at (208, 48) in blue, and row `i` at y `72 + 24i` holds the
ship's name at x 120 and, from x 216, `"%3d  %3d  %3d  %3d%% %3d"`
(`DS:0xAD5B`):

```text
Nav.  = floor(navigation % × crew / 100)
Look  = floor(lookout % × crew / 100)
Cmbat = crew − Nav. − Look
Load  = trunc(100 × (crew + guns + cargo load) / model capacity)
Spd   = trunc((S + 1) / 2)
```

The cargo load is the remake's ship load (`0:0xB08A`: water and food in
tenths, lumber, shot and goods); the capacity is the model's (stats word
`+6`). `S` comes from `FC4:0xC0DC`, the at-sea speed formula with no wind or
heading: `f = floor(power × T × 4 / 150)` with `T` the wind table
`DS:0x8DA` read by **ship type** rather than sail type, then the navigation
ratio, the load factor from the list's load (its minimum unsigned, so a
negative factor counts as 150), Navigation Level (`min(30, …)`) and
Seamanship (`min(40, floor(f × Sea / 75))`). There is no Tacking term and no
oared minimum. A ship whose captain byte (supply `+0x1B`) has bit `0x80`
shows “Scrapped” in red instead (`DS:0xAD75`) and can still be picked.

**The bar** (`0:0x90DF`, with column `c` and y) starts at x = 8c + 4 and is
62 pixels wide and 8 tall. It fills columns c + 1 to c + 7 with colour 5
(`0:0x15F06`). It then draws an outer box from x to x + 61 and an inner box
from x + 5 to x + 56, rows y + 1 to y + 6, both in colour 0 (`1E5F:0x38D4`).
Lines in colour 7 (`1E5F:0x370A`) then cover the outer box's top and left
edges and the inner box's bottom and right edges, so the outer box looks
raised and the track sunken, with light-blue ends 4 pixels wide between
them. `0:0x91C0` draws the value 0–100 in the track, rows y + 2 to y + 5,
from x + 6: value / 2 pixels of `DS:0xBF3A` (red), then the rest of the 50
pixels in `DS:0xBF3C` (blue). The Ship Info card's long bar (`0:0x8F89`,
`0:0x906A`) is the same shape, 112 pixels wide, with a 100-pixel track at a
pixel per percent.

The rows are picked with the grid picker (`FC4:0x43B1`; hit boxes x 120–424,
16 tall). Choosing one opens the crew panel (`0x24897`) at x 408–632,
y 224–352, while the list stays on screen, redrawn after the panel closes.
Row `r` (Navigation, Lookout, Combat) has its label at (416, 240 + 32r),
arrows at x 504 and 592 (`DATA1.014` pictures `0x390` and `0x410`), a bar at
column 65, y `244 + 32r` (`0:0x90DF`, below), and `"%4d :%3d%%"` (`DS:0xAE0C`)
at (512, 256 + 32r): the crew count and percentage as in the list. The six
arrow cells (21 × 16) are picked with the same picker; a press
(`0x24864`) on a row's arrow changes that row's share `a`, with `b` the next
row and `c` the one after (Navigation → Lookout → Combat → Navigation):

- the right arrow raises `a` by 1 if it is below 100, and lowers `b` by 1,
  or `c` if `b` is 0;
- the left arrow lowers `a` by 1 if it is above 0, and raises `b` by 1.

Every press writes supply `+8`/`+9` at once; closing the panel (Esc, `0`, or
the right button) keeps the changes.

## The Fleet and Crew tabs

The side panel's Fleet tab (`0x26365`, `MENU.DAT` 26) disables every command
when no ship is active, and Cargo Info and Log of Goods when no ship carries
goods (`0x2630C`). The Crew tab (`0x26480`, `MENU.DAT` 27) disables Change
Captain, Transfer Crew, Assign Crew, and Rations with no ships, and Change Job
Duty and Wages with no mates (`FC4:0x2FC1`). Ships are picked either in the
ship list (`FC4:0x5904` type 0: x 480, y 64) or in the crew list of
[Assign Crew](#assign-crew); mates in list type 9 (x 368, y 208, 31 columns,
10 rows), which shows their duties. Its row drawer (`FC4:0x491C`, from the
table at `DS:0xA5E0`) looks for the sailor among the 10 supply records'
captains (`+0x1B`); it prints the first name, pads it with blanks
(`DS:0xA5B8`) to 9 columns (`0x19BC9–0x19BD6`), then, for a captain, the
protagonist included, the name of the ship they command (slot `+0x32`) with
the whole row in colour 6 (`DS:0xA5B0`), and for anyone else the duty's name
(`DS:0xA1E`) in colour 0 (`DS:0xA5B4`).

The Crew tab draws the crew list (`0x23BF6`, in a static frame `0:0x707B`
that saves nothing under it) before Change Captain, Change Job Duty,
Transfer Crew and Assign Crew (`0x264E1–0x2650B`) and loops back to its menu
without redrawing (`0x26520` → `0x26499`); the menu saves and restores only
its own rectangle (`0x19431`), so the list stays behind it, and behind
Wages and Rations, until the menu is left and the view is redrawn
(`0x26524` → `0x262E2`). The Fleet tab likewise draws the list before Scrap
and again after it (`0x26429–0x26453`) and before Transfer Cargo
(`0x26466`); Ship Info redraws the view when it ends (`0x263F1–0x2641A`),
and so does Fleet Info when it has shown the fleet (`0x229CC` returns 1 after
`0x22461`; the dispatcher then redraws the view with `0:0x8B01`, or
`0:0x8276` when `DS:0xE32` is 0xFF, `0x263CE–0x263E4`), which also removes
the list.

A menu sets the text margins to its column + 2 and its column + longest
item + 1 (`0x19484–0x1948D`) and leaves them there.

### Fleet Info

`0x22461` fades out and draws, in the Info palette (`DS:0xAB6E`), the
16 × 16 sea tile at `DATA1.014 0x2BA0` over the whole screen (40 × 20 tiles),
then each active ship's type picture at the formation places of
`DS:0xAC54`: (256, 160), (384, 64), (128, 64), (256, 16), (128, 208),
(384, 208), (0, 16), (0, 160), (512, 16), (512, 160). The panel is a black
box at y 304, 640 × 96, outlined in colours 13, 14, 10, and 0 at insets 1–4
(`0x225A4–0x225F6`), with its left part, x 5–255, y 309–394, in colour 8 and
the commodore's portrait in a black 64 × 80 box at (8, 312). The text is
919 “Commodore %s” (the first name, orange on colour 8) at (88, 314), the last
name at (168, 330), 920 and 921 (Navigation and Battle Level) at (88, 356)
and (88, 378), and from (272, 320), 24 pixels apart, 922–924: Tacking and
Crew, Power and Guns, Durability and Battles, with the
[values above](#where-the-displayed-values-come-from), 924 at column 34,
y 368. The message wait follows (`0x2296C` → `FC4:0x4638`); no window has set
the margins, so they are the Fleet menu's (columns 62 to 75), and the caret
goes at column 68, 24 pixels below y 368 but held at y 384 (`0x198AE`). With
no ship it shows only “You have no ship.” (918).

### Ship Info

`0x229F6` fades to the Info palette over the building backdrop; each ship
picked in the ship list (type 0 with the restore flag `0x80`, `0x22975`)
draws its card, `0x21415`, a window at column 15 (column 6 in battle), y 32,
43 columns by 336. The card has no wait, so the list opens again at once
beside it (`0x22A14–0x22A27`) and the card stays until the next is drawn;
Esc on the list ends the command. The port's Mate Info (`0x22A2D`) works the
same way with list type 6 and the Mate Info card (`0x22A35–0x22A4B`). The
card holds:

- the ship's type picture at (136, 48) and, when it has one, its figurehead
  at (272, 48): 48 × 48, four planes, in `TRANSIT.DAT` at
  `0x1980 + 0x480 × figurehead` (the file name is at `DS:0x0C44`);
- water ÷ 10, food ÷ 10, lumber, and shot beside their 16 × 32 icons
  (`DATA1.014 0x20D0 + 0x100 × n`) at x 328 and 384, y 48 and 88, the
  numbers as `%4d` 16 pixels lower and 16 to the right;
- a red strip at x 288, y 128, 224 tall;
- on the left from x 136: the name in blue (884) centred on x 200 at y 152,
  the model's name at 170, “Captain” (885) and the captain's names at 188
  and 204, “Guns” (887) with the gun's name at 220 and guns over gun spaces
  (888) at 236 when it has a gun type, then at y 252–332 Minimum Crew (891,
  the model's), Navigation, Lookout, and Combat crews, Load (892, 893:
  `100 × (cargo + guns + crew) / model capacity`), and Speed (894, the crew
  list's Spd);
- on the right, the seven rows of `MENU.DAT` 41 as “%-10s%4d/%3d” (895) at
  x 304, y 128 + 32i, each over a long bar at column 40, y 148 + 32i
  (`0:0x8F89`, `0:0x906A`: light-blue ends and 100 pixels of red over blue):
  Durability over maximum durability, Tacking and Power over the model's,
  Crew over the bunks, Health (supply `+0x1C`) over 100, Cargo over the
  instance capacity, and cargo, guns, and crew over the model's capacity.

### The Mate Info card

`FC4:0xC8D5` takes the sailor in `al`, a text column `c` in `dx`, and a mode
in `bx`. The port's Mate Info passes column 15 and mode 1 (`0x22A35`), battle
Info column 6 with mode 1 for the player's mates and 0 for other commanders
(`0x1021E`, `0x10364`, `0x1038F`), and the sea's Battle command column 15 and
mode 0 (`0x1627A`).

- **Window:** column `c`, y 32, 43 columns × 352 (`0:0x707B`). The portrait is
  at column `c + 2`, y 48 (`0:0x7A5A`). A colour-2 strip one column wide runs
  at column `c + 18`, y 144, 224 tall (`0:0x906`).
- **Name:** at column `c + 15`, y 48, in colour 1, with the first name
  right-aligned in eight columns (897, “%8s %-8s”).
- **Duty line:** in mode 1, at column `c + 11`, y 80, the duty name
  (`DS:0xA1E`, by sailor `+0x26`) and “ of ” and a ship's name. The ship is
  the one the sailor captains, else the protagonist's (`0x21B69–0x21BE5`).
- **Loyalty and age:** 906 “Loyal to %s” (`DS:0xA2C`, by `+0x29` & `0x0F`),
  then three columns on, 898 “Age %3d”, on the next line.
- **Attributes:** seven of them, from column `c + 2`, y 144 + 32i, as
  “%-12s%3d” (`DS:0xAC21`), each with the bar `0:0x90DF`/`0:0x91C0` at
  y 164 + 32i (`0x21CE4–0x21D54`).
- **Right column:** at column `c + 20`, y 144, with 18-pixel lines
  (`0:0x923F(2, 1)`).
  - In mode 1, the protagonist's line is “Rank ” (899) plus the rank name in
    colour 5, or “None” (900). A mate's line is “Wages %3d” (901) with ten
    times the roster's wage byte.
  - Then 902 Navigation Level and 903 Experience, three columns in. Then 904
    Battle Level and 905 Experience, the experience alone with no threshold.
  - Then 10 more pixels, 907 “Skills”, and one column in, the five skill names
    from `DS:0xA48`: colour 0 when the sailor has the skill (`+0x28` bit
    `0x10 >> i`), else 6 (908, 909; `0x21E39–0x21E87`).

### Hero Info

Hero Info (`FC4:0xD811` → `0x21EE3`) draws a window at column 15, y 32,
39 columns by 168, style 0 (`0:0x707B`). From column 17 it prints message
910 at y 48 (“Gold” and “Friendship” in colour 1), 911 and 912 (coins as
gold mod 10,000 and ingots as gold / 10,000) at y 72 and 88, 913 (“Fame”) at
y 112, and the three fame lines (914, names from `MENU.DAT` entry 42) at
y 136, 152 and 168. From column 36 and y 72, 16 pixels apart, it prints the
six nations (915, names at `DS:0xA2C`), with no Piracy line. A friendship
byte below 100 is printed in colour 2 (916) as its distance below 100 with
a minus sign: `"  -%d"` under 10, `"-%3d"` at 100, `" -%2d"` otherwise. One
of 100 or more is printed as `" %3d"` of its excess (`DS:0xAC34–0xAC45`,
`0x22002–0x22095`). The message wait (`FC4:0x4638`) follows, its caret 24
pixels under the last nation's line.

### Rearrange, Scrap, Cargo Info, Log of Goods

**Rearrange** (`0x25CF5`) with one ship says “We only have one ship.” (217) in
a window at (160, 128), 240 × 96. Otherwise it first opens the new-order
panel (`0x25A12`): a window at column 22, y 144, 24 columns by
`(n + 2) × 16`, style 0, numbered “%2d:” (`DS:0xAEC1`) from 0 at column 24,
y `160 + 16i`. For each position in turn `0x25A63` fills the panel: with
`ESC C0 ESC B7` (`DS:0xAEC6`), at column 28, each ship chosen so far as
“%-10s” (`DS:0xAECD`), the rest blank (`DS:0xAED3`). Then “Which ship will be
the ship #%d?” (218, numbered from 0) opens at (160, 64), 240 × 72, style 0,
its text from y 88 (`0:0x44C6(0x58)`, `0x25D60`), over the ship list of the
ships not yet placed (`0x25D7D`); the question is restored after each pick.
Esc takes back the last choice, or with none made ends the choosing. The
panel is filled once more (`0x25DCF`) and “Is this OK?” (219), or “Is it OK
to cancel rearranging?” (1414) when nothing was placed, opens in the same
window; both windows are restored after the answer (`0x25E21`, `0x25E26`).
No starts again and Yes applies the order (`0x25C87`).

**Scrap** (`0x24B12`) picks ships in the crew list; a ship already scrapped
cannot be picked (`0x24A0D`). The flagship is refused with 233; another is
confirmed with 234 and loses its captain (`0:0x5B3F`), staying in the list
as “Scrapped”. The questions open in `0x249D6`'s window, (128, 160),
36 columns by 128, style 1, and after each the list is drawn again
(`0x24B4C`). Leaving removes every active ship without a captain. With one
ship it says 217 in the same window.

**Cargo Info** (`0x22A56`, `0x220B4`) shows, for each ship picked, its goods
only, in a window at (120, 32), 25 columns by 144: the name in blue at
(192, 40) and “%-14s %5d” (917) from (136, 80); a ship without goods shows
nothing. The window (`0:0x721A`) sets the margins to columns 17 and 37, so
the message wait's caret (`0x22183` → `FC4:0x4638`) is at column 27, 24
pixels below the last goods line. **Log of Goods** (`0x2224E`) lists the goods carried (list type 1,
x 440, y 64) and names the best known port in the named panel.

### Transfer Cargo

`0x252FE` keeps the crew list on screen and an unloading area, “Remaining
Cargo” (748), at (440, 64), 176 × 208, its entries from y 112, the names at
x 456 and amounts as `%4d` at x 568. A ship picked in the crew list opens at
(176, 64), 176 × 208: its name in blue centred at y 80, then Water and Food
(÷ 10), Lumber, and Shot at y 112–160, and its goods from y 176, amounts at
x 304 (`0x25229`, `0x24CB9`). One picker covers the ship's rows, an empty row
below them, and the area's entries. A ship row asks, with the number pad, how
much stays on the ship, from 0 to the smaller of that row plus the same kind
in the area and the row plus the free capacity; the rest goes to the area.
The empty row loads an entry of the area into the ship, into a matching row
or a new goods slot (`0x24FE0`, `0x24EF4`). Each change rewrites the ship's
supplies, water and food as ten times the shown value, so remainders below
10 are lost. Leaving the crew list asks “There are items left in the
unloading area! Is it still okay to end the transfer process?” (1373) when
the area holds anything, else “Is this OK?” (219), in a window at (240, 288);
what is left is lost. After a naval victory the same screen opens with the
spoils in the area ([Naval battle](naval-battle.md#cargo)).

### Crew commands

**Change Captain** (`0x2400D`) picks ships in the crew list and then a mate,
the protagonist included, and repeats; leaving is refused while the
protagonist commands no ship, “You haven't selected the ship you'll
command.” (226, at (128, 160)).

**Change Job Duty** (`0x24301`) opens a window at (144, 96), 35 columns by 96,
with First Mate, Bookkeeper, and Chief Navigator in blue at x 160, y 112, 136,
and 160 and their holders at x 312 (`0x2406D`, `0x240B5`). A duty, then a
mate: a captain is refused (227), anyone else appointed (228). It repeats
until Esc; with no mates it says 229.

**Transfer Crew** (`0x24573`) moves men through a pool, “Remaining Crew” at
(480, 16), 112 × 96, with its count as `%5d` at (496, 72). Each ship picked
in the crew list asks “How many men will you assign to your/my ship?” (230,
“your” when the protagonist captains it) at (240, 288), 0 up to the smaller
of the ship's crew plus the pool and its bunks; with nothing to give it says
777. Men leaving a ship carry its health into the pool's, and men joining a
ship bring the pool's, both as crew-weighted averages (`0x244A4–0x24525`).
Leaving with men in the pool asks “We will dismiss %d men. Is this OK?” (231);
No continues.

**Wages** (`0x26280` → `0x260C9`) lists the mates. One with Loyalty 80 or
more answers “You don't have to worry about my wages. I like working for
you!” (220). Otherwise the crew spokesman asks the new wage (222, or 221 when
it is the spokesman's own) from the current wage to 2,000; the mate thanks
(223), Loyalty rises by a fifth of the raise, up to 100, and the wage byte
becomes the amount ÷ 10. Cancelling the number pad (`DS:0x8E9E`, `0x26166`)
restores the window (`0x261FF`) and the mate list opens again (`0x2629F`).

**Rations** (`0x26045`) opens a window at (456, 224), 176 × 96, with Water and
Food at x 472, y 240 and 272, the slider arrows at x 512 and 600, the short
bars at column 66, and “%3d%%” at x 560 below; each arrow moves its share by
one, from 0 to 100, at once (`DS:0x2BAB`, `0x2BAC`).

## Open questions

None remain.
