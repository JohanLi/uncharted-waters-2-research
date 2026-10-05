# At sea

A voyage runs in 20-minute ticks, 72 per day. Every tick the player's fleet
moves one step. Every four hours the wind is re-rolled and a weather anomaly
may begin. Every midnight the crew eats and drinks, and rats, scurvy, and crew
losses are resolved. Forty fixed tiles hold one-time sea events. This page describes each of these systems as implemented
in `MAIN.EXE`. All addresses are `MAIN.EXE` file offsets.

## Time at sea

The day loop (`0x2052F`) runs one iteration per tick. It is the same loop in
port, where it skips the voyage-day story routes and the sea view. Each iteration
reads input, updates the other fleets, moves the player's fleet once
(`0x37479`), and adds one tick to the clock (`DS:0x0737`). The loop waits on a
fixed timer, so a faster fleet covers more ground per tick rather than taking
more steps. At tick 72 the day ends (`0x205DF`) and the midnight routine runs
(`0x1E95E`), in port as well as at sea. It refreshes each port's cached
controlling nation ([Cached allegiance](sphere-of-influence.md#cached-allegiance))
and counts down the Balm.

At the start of each month the mates' [wages](sailors.md#wages) are paid; at
sea, outside a weather anomaly, a crew spokesman reports the amount.

The **days-at-sea counter** (`DS:0x2BAA`, save-slot offset `0x1D82`) is a
single byte. It is set to 0 when the fleet sails from a Harbor (`0x2D7B4`) and
incremented at each midnight (`0x1E979`); midnights in port also increment it,
but sailing resets it. Story routes for voyage days
receive this counter; see the
[dialog system](../dialog-system/README.md#from-a-building-to-a-scenario-route).

## Wind and current

### Regions and seasons

The world map is 2,160 × 1,080 tiles. `raw/WINDCUR.DAT` divides it into
30 × 15 regions of 72 × 72 tiles, and the region under the fleet is
`(y / 72) × 30 + x / 72` (`0x287D2`). The file holds three 450-byte tables:

| Bytes     | Table                         |
| --------- | ----------------------------- |
| 0–449     | Wind, April through September |
| 450–899   | Wind, October through March   |
| 900–1,349 | Ocean current, the whole year |

The wind table is chosen when a game is loaded (`0x1B88E`) and swapped at the
end of March and of September (`0x1CA0E`). The extracted maps are
[`world-map-summer-winds.png`](../scripts/winds-current-anomalies/output/world-map-summer-winds.png)
(bytes 0–449),
[`world-map-winter-winds.png`](../scripts/winds-current-anomalies/output/world-map-winter-winds.png),
and
[`world-map-ocean-current.png`](../scripts/winds-current-anomalies/output/world-map-ocean-current.png).

Each byte encodes a speed in bits 0–2 (0–7) and a direction in bits 3–5. The
direction is where the air or water moves toward, counted clockwise from 0 =
north: 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW. Bits 6–7 mark anomaly
regions (see [Weather anomalies](#weather-anomalies)).

### Daily variation

Every four hours (ticks 0, 12, 24, 36, 48, and 60), `0x1F282` re-rolls the
wind from the region's base value:

```text
speed     = min(7, base speed + random(2))
direction = (base direction + (random(3) − 1) × floor(random(5) / 4)) mod 8
```

The speed is the base speed or one more, with equal probability. The direction
turns 45° either way with probability 1/15 each and otherwise matches the base.
Each re-roll starts again from the base, so changes do not accumulate. The
current is copied unchanged from its region and never varies. While a weather
anomaly is active the wind keeps its last direction and speed.

The re-roll uses the current region, so a fleet that enters a new region
receives its wind at the next re-roll.

The four-hour spacing applies only to a day that starts at midnight. The day
loop begins at the tick in `DS:0x0E31`, the saved copy of the clock (save-slot
offset `0x09`). The Save routine writes the current tick there (`0x1BF64`),
loading restores the clock from it (`0x1B27C`), and midnight resets it to 0, or
to 24 after a Lodge **Check In** (`0x1E95E–0x1E96A`), which is how the next day
starts at 08:00. While it is nonzero, `0x20571` skips the four-hour test, so the
wind re-roll and the anomaly check run on every tick until the next midnight.
This happens after saving or loading partway through a day, and on the day
after a Lodge stay.

## Movement and speed

### One step per tick

The player's fleet moves in the direction of its heading (fleet byte `+0x1A`,
0–7 as above; 8 means stopped). Each tick, `0x3723A` adds a velocity to two
signed accumulators in the fleet record (`+0x18` for x and `+0x19` for y):

```text
velocity = heading step × fleet speed + current step × current speed
```

The step for each direction is `(dx, dy)` from the tables at `DS:0x091A` and
`DS:0x0922`, for example `(0, −1)` for north and `(1, −1)` for northeast. When
an accumulator reaches 60, the fleet moves one tile on that axis and 60 is
subtracted; when it drops below 0, the fleet moves one tile back and 60 is
added.

A fleet speed of `S` therefore covers `S / 60` tile per tick on each axis it
moves along, or `1.2 × S` tiles per day. A diagonal heading applies the full
speed to both axes, so it covers `1.2 × S` tiles along each axis per day.

The speed is kept in half-knots. The at-sea panel shows
`floor((S + 1) / 2)` knots (`0xC2CD–0xC2D6`, message 894), so the maximum
speed of 40 appears as 20 knots, and one knot is about 2.4 tiles per day. At
20 knots a fleet moves one tile every 30 minutes, or 48 tiles per day along
each axis it moves on, plus up to 8.4 tiles from the current. Odd speeds round
up for display, so speed 21 shows as 11 knots.

The current is always added. A becalmed fleet drifts with it, but a fleet with
heading 8 (stopped) does not move at all. If the step is blocked by land, the
routine tries the headings 45° to either side at the same speed
(`0x374E0–0x37524`). The fleet occupies a 2 × 2 block of tiles, and tiles
numbered `0x34` or above are impassable (`0x36E6C`).

### Fleet speed

The fleet moves at the speed of its slowest ship (`0x36FFB`, stored at
`DS:0xC1F0`), with a minimum of 2. The one exception is a fleet with no oared
ship in a dead calm: it has speed 0.

For each active ship, with all divisions truncating:

```text
row    = |wind direction − heading|
wind   = wind speed, or max(3, wind speed) for an oared ship
f      = wind_table[row × 8 + sail type] × power × wind / 150
f      = f × min(100, floor(navigation % × crew / minimum crew)) / 100
f      = f × load factor / 100
f      = min(30, f + floor(f × Navigation Level / 10))
f      = min(40, floor(f × Seamanship / 75))
f      = floor(tacking × f / 100)        when row is 3, 4, or 5
```

The inputs are:

- **Wind table** at `DS:0x08DA` (file offset `0x3C44A`), eight rows by the
  eight sail types (ship-model byte `+0x09`; see [ships.md](ships.md)). Row 0 is
  sailing straight downwind and row 4 straight into the wind.
- **Power** and **tacking** are the ship slot's current values (`+0x05` and
  `+0x04`). Tacking matters only when sailing 135° or more away from the wind
  direction (rows 3–5).
- **Navigation %** is the ship's supply-record byte `+0x09`; crew is the slot's
  current crew; minimum crew is ship-model byte `+0x05`.
- **Load factor** is `min(150, 180 − floor(100 × load / capacity))`, from
  supply word `+0x0A` and model capacity `+0x06`. Because the game computes
  `−100 × load` in 16 bits (`0x370EE`), a ship loaded with more than 327 units
  gets an unrelated factor, usually the maximum of 150.
- **Navigation Level** (`+0x1C`) and **Seamanship** (`+0x15`) belong to the
  ship's captain, the sailor in supply byte `+0x1B`.

An **oared** ship is one whose ship-instance byte `+0x12` has bit `0x10`
clear. These are ship types 19–25: Light Galley, Flemish Galleon, Venetian
Galeass, La Reale, Tekkousen, Atakabune, and Kansen. They always count at
least wind speed 3.

The wind table is:

| Row | Angle | Sail types 0–7                |
| --: | ----: | ----------------------------- |
|   0 |    0° | 10, 8, 10, 9, 9, 8, 10, 10    |
|   1 |   45° | 10, 9, 10, 10, 10, 10, 10, 10 |
|   2 |   90° | 8, 9, 10, 10, 10, 10, 10, 10  |
|   3 |  135° | 6, 7, 8, 9, 9, 10, 9, 10      |
|   4 |  180° | 4, 6, 6, 7, 7, 8, 9, 10       |
|   5 |  225° | as row 3                      |
|   6 |  270° | as row 2                      |
|   7 |  315° | as row 1                      |

### Worked example

A Caravela Latina (sail type 5, Tacking 90, Power 75, minimum crew 10,
capacity 120) carries 30 crew with 50% on navigation and a load of 60, under a
captain with Navigation Level 5 and Seamanship 60. The load factor is
`min(150, 180 − 50) = 130`, and the navigation ratio is 100. In a north wind of
speed 2:

| Heading | Row | Speed | Knots | Tiles per day |
| ------- | --: | ----: | ----: | ------------: |
| North   |   0 |    12 |     6 |          14.4 |
| East    |   2 |    15 |     8 |          18.0 |
| South   |   4 |    10 |     5 |          12.0 |

When the re-roll raises the wind to speed 3, the eastward speed rises to 22 (11 knots).

The Fleet Info screen computes a similar speed to choose which ship's Tacking
and Power to display, but indexes the wind table by ship type instead of sail
type and omits the wind speed; see [fleet-info.md](fleet-info.md).

## Lookout and discovery

### Lookout range

The lookout range is computed at `0xD651–0xD674` and stored at `DS:0xC20A`:

```text
range = min(12, floor(best lookout % × crew / 100)) × (2 with a Telescope, else 1)
```

The lookout percentage is supply byte `+0x08`, and the best single ship counts;
the ships' lookout crews are not added together. With 300 crew, 4% already
reaches 12. The routine uses at least 2 (`0x36AEB`, `0x4B5B` takes the
maximum).

### Once per tick

The day loop calls `0x36AD9` once per tick at sea (`0x205CA`); it is skipped
in port and once an end state is set. After the
[sea-event](#active-events-and-the-queue) check, it scans the 130 port
records in ID order, skipping ports with flag `0x10` (known) or `0x20` (hidden
from the lookout) ([Ports](ports.md#known-and-visited-ports)). For each port
(`0x36BED–0x36C49`):

1. Within 2 tiles of the fleet, by Chebyshev distance (`0x183EC`), the port is
   found without a roll.
2. Otherwise, if it is a candidate (below), `random(200)` is drawn. The port
   is found when the draw is below the best Intuition among the protagonist
   and the mates (sailor byte `+0x17`, `0x36BB3–0x36BE0`). If the draw fails,
   the routine returns at once (`0x36C2F`).

A found port gets flag `0x10` and becomes known (`0x36C41`). Either outcome
ends the tick's scan, so the game makes **at most one roll per tick**, always
for the lowest-numbered candidate. A second port in range waits until the
first is found or leaves range. A failed roll on a lower-numbered port also
delays a higher-numbered port that is within 2 tiles until a later tick.

Only if no port was found or rolled for does the routine scan the 100
discovery records the same way, skipping those with flag `0x80` (not in this
game) or `0x40` (already sighted) (`0x36C4B–0x36CA2`). A sighted village gets
`0x40` and 50 Adventure Fame ([Discovery flags](#discovery-flags)).

Each tick's chance for the candidate is therefore `Intuition / 200`: 50% at
Intuition 100, with an average wait of `200 / Intuition` ticks.

### Candidates and the sea view

A target is a candidate (`0x36A85`) when all of these hold:

- no Fog is active (`DS:0x0E37` low bits not 3), so in Fog only the 2-tile
  check finds anything;
- it is within the lookout range on both axes (`0x183EC`);
- it lies inside the 24 × 24-tile window whose top-left tile is at
  `DS:0x118A`, `DS:0x118C`: `origin ≤ x < origin + 24`, and the same for y.

That window is the one the sea view scrolls with, so nothing off screen can be
sighted, however large the range. Where the fleet sits in the window depends
on the **Scroll Range** option (`DS:0x0E2D`, save-slot offset `0x05`), a
slider from 0 to 10 shown as 0–100% on the options screen (`0x26C63`, labels
at `DS:0xAFD0`). A new game starts at 6, from `DATA1.015` offset `0x05`.

When the view is re-centered (`0x1BA38`), the fleet is placed at column 11 and
row 11 of the window. After each move, `0x37661–0x376E7` scrolls the window by
one tile only when the fleet is more than Scroll Range tiles from column or
row 11:

```text
scroll left/up    when fleet − origin < 11 − Scroll Range
scroll right/down when fleet − origin > 11 + Scroll Range
```

The distance from the fleet to the edge of the view is therefore:

| Scroll Range | Visible from the fleet, per side  | Ahead when sailing one way |
| -----------: | --------------------------------- | -------------------------: |
|            0 | 11 left and up, 12 right and down |                      11–12 |
|  6 (default) | 5 to 18                           |                    about 6 |
|           10 | 1 to 22                           |                    about 2 |

A fleet sailing steadily in one direction pushes against the scroll margin, so
at the default setting it sits about 6 tiles from the leading edge and 17 from
the trailing edge. At Scroll Range 0, range 12 already covers the whole
window, so a Telescope adds nothing there. The Telescope's doubled range only
helps where the fleet is more than 12 tiles from the edge of the view: behind
or to the side after the view has lagged, never ahead.

### The sea menu

The sea menu (`0x266AC`) takes its labels from `MENU.DAT` entry `0x2E`, which
offers Sail, when bit `0x20` of `DS:0x1189` is set (the fleet is at anchor),
and otherwise from entry `0x1D`, which offers Anchor (`0x266B4–0x266C2`),
and dispatches through a jump table at `0x2670F`:

| Entry | Command     | Handler                                                                        |
| ----: | ----------- | ------------------------------------------------------------------------------ |
|     0 | Auto Sail   | `0x26724` ([route search](npc/fleet-navigation.md#the-world-navigation-graph)) |
|     1 | Sail/Anchor | `0x2672B`                                                                      |
|     2 | Port Call   | `0x26731`                                                                      |
|     3 | Go Ashore   | `0x26738` ([Going ashore](#going-ashore))                                      |
|     4 | View        | `0x2673F` → `0x255F9` (below)                                                  |
|     5 | Gossip      | `0x26746` ([Nightfall](naval-battle.md#nightfall))                             |
|     6 | Battle      | `0x26754`                                                                      |
|     7 | Options     | `0x2675B`                                                                      |

### Another fleet's details and pirate disguises

The sea menu's **View** command (menu entry 4, `0x2673F` → `0x255F9`) shows a chosen fleet's captain, a
fleet type, a nation, its heading and speed, and its ships. The fleet type is
chosen by the fleet's position in its block of ten: one label for
positions 1–5 and another for 6–9. The nation is the captain's nation nibble
(sailor `+0x29 & 0x0F`), except for a pirate, whose nibble is 6: the window
shows nation **captain ID mod 6** instead (`0x2564A–0x2565C`). Every pirate
captain therefore flies a fixed false flag:

| False flag | Pirate captains (sailor ID)                                    |
| ---------- | -------------------------------------------------------------- |
| Portugal   | Mohommed Syarook (66), Hamid Lal (114)                         |
| Spain      | Pierre Lugulan (61), Ulgu Ali (67), Henry Mancine (115)        |
| Turkey     | Louis Scott (62), Jack Raccam (68), George Eggel (116)         |
| England    | John Davis (63), Ivan Soledad (111), Jack Diffson (117)        |
| Italy      | Khayr ad-Din (64), Antonio Pintado (112), Robert Donahue (118) |
| Holland    | Idin Leis (65), Cizzaro Fedeliti (113), Richard Huxley (119)   |

A new generic pirate captain is created with a random nation 0–5
([Fleet regeneration](fleets.md#new-commanders)), so he shows that nation
directly; the unmasking below still applies, because it tests the fleet, not
the captain.

After the list, for a fleet of the pirate block (IDs 60–69) other than fleet
60, the game takes the highest Knowledge (sailor `+0x16`) among the player's
hired mates (`DS:0x073A`; the protagonist is not included). If `random(90)`
is below it, the first mate says, “Commodore, that fleet may look like a %s
from %s, but I think they're really pirates.” (message 766), with the false
fleet type and flag. With no mates, or a low roll, the disguise stands. Fleet
60 is skipped explicitly (`0x25805`); its captain, Antonio Khan (sailor 60),
is recorded as Portuguese, so it shows Portugal and is never unmasked.

## The sea map

The world is stored as three parts of 720 × 1080 tiles (`WORLDMAP.000`
Europe and Africa, `001` Asia, `002` the Americas), each a grid of 30 × 45
blocks of 24 × 24 tiles. A block is stored as 12 × 12 **large tiles**, and each
large tile names four regular tiles through the table in `DATA1.018`. Large
tiles `0x00`–`0x0F` are not in that table: their four bits mark which quarters
are land.

### The window around the fleet

The game never builds a whole part. When the fleet enters a new block, the
sea view (`0xBE5A`, `0xC022`) builds the 3 × 3 blocks around it, 72 × 72
tiles, with `0x284F9`. The window's top-left block is the fleet's block minus
one in each direction, clamped to block columns 0–27 and rows 0–42, so a
window never spans two parts. The same step charts the 3 × 3 blocks around
the fleet ([Charted areas and known ports](#charted-areas-and-known-ports)).

`0x284F9` makes three passes over the window:

1. **Place** (`0x282AA`). Each large tile is unpacked. Quarter tiles
   `0x00`–`0x0F` give plain land `0x41` or sea `0`. From a large tile `0x10` or
   above, only the regular tiles `0x34` or higher are kept, and the rest become
   sea.
2. **Coast** (`0x277C0`). Every tile below desert (`0x59`) is replaced through
   the 512-byte table in `DATA1.010`. The index has one bit for each of the
   eight neighbours that is land (tile `0x29` or higher), plus `0x100` when the
   tile itself is sea. At the window's edge a missing neighbour counts as the
   nearest tile inside the window. The land half of the table is all `0x41`.
   The sea half gives `0` for open sea, `0x01`–`0x08` for coasts, and
   `0x42`–`0x47` for one-tile channels, which are the rivers. A non-zero entry
   then gets a climate offset from the tile's block row:

   | Block rows | Map rows        | Offset | Plain land |
   | ---------- | --------------- | -----: | ---------: |
   | 0 and 44   | 0–23, 1056–1079 | `0x10` |     `0x51` |
   | 1–13       | 24–335          |    `8` |     `0x49` |
   | 14–30      | 336–743         |    `0` |     `0x41` |
   | 31–43      | 744–1055        |    `8` |     `0x49` |

   A tile gets `0x18` instead when the tile above, below, left, or right of it
   is desert. Plain land then becomes desert `0x59`, and a coast becomes a
   desert coast (`0x19`–`0x20`). The pass works in place, left to right and top
   to bottom. The neighbour bits come from the tiles as placed, but the desert
   test reads the tiles above and to the left after their own update. So
   desert spreads rightward and downward through connected plain land until
   it reaches an edge tile such as `0x69`–`0x72`.

3. **Fixed tiles** (`0x284F9` loop). Large tiles `0x13` and above are
   written back exactly as stored, replacing whatever the coast pass made of
   them. Their mountains, rivers, desert edges, and any coast or sea tiles
   drawn into them therefore ignore climate and neighbours. Large tiles `0x10`
   and `0x12` are ports and `0x11` is a village; they keep the result of the
   coast pass, except that the game draws them as plain land in the climate
   of their block row (or desert, when the tile to their left is desert):
   - a port whose record lacks the known flag (port `+0x13` bit `0x10`,
     [Known and visited ports](ports.md#known-and-visited-ports)), looked up by
     position through `0x281F6`;
   - a village whose discovery record lacks the sighted flag (`+6` bit `0x40`,
     [Discovery flags](#discovery-flags)), looked up through `0x2824F`. This
     includes every village not selected for the current game, since those can
     never be sighted.

The view shows 24 × 24 tiles starting 11 tiles left of and above the fleet
([Candidates and the sea view](#candidates-and-the-sea-view)), so it always
stays at least 12 tiles inside the window. Within the window, the only effect
of its edges is that desert can stop spreading at the border, and that reaches
at most 10 tiles in. The map is therefore the same wherever the window lies,
and `scripts/draw-world-map` builds each part in one pass. Its
`world-map.test.ts` checks every window position against the whole-part
result.

### Other map views

The Chart and Port Map commands of the Info menu (`MENU.DAT` entry `0x1C`,
dispatched at `0x265E9`) and the treasure-map view draw tiles at 8 pixels per
tile, two blocks by two, through `0x22A7E`. For modes 0 and 1 each block is
taken from the middle of its own 3 × 3 window, so the window edges never show.
The mode argument selects the source:

| Mode | Used by                  | Source                                                                                                                                |
| ---: | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
|    0 | Chart (`0x22E10`)        | `0x284F9`, as at sea; a block not yet charted is left blank                                                                           |
|    1 | Treasure map (`0x2308C`) | `0x286A6`, below                                                                                                                      |
|    2 | Port Map (`0x232CF`)     | no loader: the tiles already in the view buffer. The command is offered only in port (disabled when `DS:0x0E32` is `0xFF`, `0x265C8`) |

`0x286A6` runs the same place and coast passes, then its own fixed-tile pass
(`0x28729–0x287A6`). It differs from `0x284F9` in three ways:

- Every village is drawn, sighted or not (large tile `0x11` is written back as
  stored).
- Every port is drawn as plain land, known or not (large tiles `0x10` and
  `0x12`), or as desert when the tile to its left is desert.
- The climate for that land is re-read only every 24 large-tile rows (48
  tiles; `0x286ED–0x286F4`) instead of every 12. The first 48 rows of the
  window use the top block row's band and the last 24 use the middle one's.
  The drawn middle block therefore takes the band of the block row above it
  (block row 0, whose window cannot move up, is drawn correctly). A port
  lands in the wrong band only at a band boundary: block row 1 gets `0x51`
  instead of `0x49`, row 14 `0x49` instead of `0x41`, row 31 `0x41` instead
  of `0x49`, and row 44 `0x49` instead of `0x51`. Coasts and other land come
  from the coast pass and are unaffected.

### Colours

The map tiles are the first half of `DATA1.011`: 128 tiles of 16 × 16
pixels, four bit-planes of 256 bits each, with the first plane as the lowest
bit of the colour index. The palette is 16 entries of three bytes, stored as
blue, red, and green, 0–15 each, and shifted left by two into the VGA DAC
(`0x6B6B`, `0x6BDA`). Entries 0–7 are the same in every sea palette. Entries
8–15, which include the sea, land, desert, and ice, come from one of five
palettes at `DS:0xA892 + 0x30 × n`:

|   n | Palette | Target                                        |
| --: | ------- | --------------------------------------------- |
|   0 | Night   | from 20:00 and from 00:00, and during a Storm |
|   1 | Dawn    | from 04:00                                    |
|   2 | Day     | from 08:00; the Port Map uses it too          |
|   3 | Dusk    | from 16:00                                    |
|   4 | Fog     | during Fog: greys                             |

The hour picks the palette through the table at `DS:0xA88A`, indexed by the
clock (`DS:0x0737`) divided by 12, that is, in four-hour slots
(`0x1E9A0`). `scripts/draw-world-map` renders each map part in all five
(`world-map0.png` for day, `world-map0-night.png`, and so on). The Chart and
the treasure map fade to the sepia palette at `DS:0xAB3E` instead
([Treasure maps](#treasure-maps)).

### Fading between palettes

The sea does not switch palettes at once. The game keeps two copies: the
**target** palette `DS:0x9052`, which the routines above overwrite
(`0x97BC`), and the **shown** palette `DS:0xC176`. A fade step (`0xEDD7`)
moves every red, green, and blue value of the shown palette one level (of 16)
toward the target, sends all 16 colours to the DAC, and reports whether
anything changed.

The per-tick routine `0x20447` runs one step at most per 20-minute tick,
driven by the state byte `DS:0xA890`:

- **State 0, idle.** With no anomaly active, at clock ticks 12, 24, 48, and
  60 (04:00, 08:00, 16:00, and 20:00) it sets the target for the new slot and
  moves to state 1 (`0x1E9FA`). There is no tick for midnight: the night
  palette covers both 20:00–24:00 and 00:00–04:00.
- **State 1, fading.** One fade step per tick (`0x9884` → `0xEDD7`). Once a
  step changes nothing, the state returns to 0.
- **State 2** would run the whole fade in one go (`0x98A7`, which repeats
  the step with a short delay until nothing changes) and return to 0, but no
  code stores 2 in `DS:0xA890`.

A fade therefore begins on the tick after the change and takes as many ticks
as the largest single-channel difference between the two palettes:

| Change               | Steps | Game time | Ends at |
| -------------------- | ----: | --------: | ------: |
| Night → dawn (04:00) |     8 |  2 h 40 m |   06:40 |
| Dawn → day (08:00)   |     5 |  1 h 40 m |   09:40 |
| Day → dusk (16:00)   |     9 |   3 h 0 m |   19:00 |
| Dusk → night (20:00) |     9 |   3 h 0 m |   23:00 |

Weather uses the same fade. While an anomaly is active, the idle state makes
no time-of-day change. At each four-hourly check that finds an anomaly
(`0x1F302–0x1F314`), the target becomes the Storm or Fog palette, or the
palette for the hour during No Wind (`0x1E9B4`), and the state becomes 1.
The anomaly's own four-hourly effect then sets the target again at its end
(`0x1F27A`). When the anomaly has just ended, that target is the palette for
the current hour, so the sea fades back from the storm or fog colours while
the state is still 1. From day, fading to Fog or to the Storm (night) palette
takes 8 or 9 ticks.

The code also supports a reduced-colour display mode, flag `DS:0xC770`, but
nothing in `MAIN.EXE` turns it on. When set, it would keep the day palette at
all hours and in all weather (`0x1E9B4`, `0x1E9FA`, `0x20480`, `0x204CB`),
send every colour inverted (15 minus each value, `0xEE16–0xEE3F`), skip
the two palette-cycling animations started at `0x1B6DB` and `0x111E3`, and
merge text colour codes 0–3 into 0 and 4–6 into 4 (`0x9F17`). The flag lies
in memory that starts at zero, outside the saved game. The only store to
it is `0x1B367`, which clears it when a new game starts (`0x1C2C5`), and no
pointer to it exists, so in this version it is always 0. What display the
mode was meant for is not recorded; inverted colours and fewer text colours
fit a monochrome screen.

## Charted areas and known ports

The Chart command ([Other map views](#other-map-views)) shows only charted
areas, and the map shows only known ports. Both start the same for every
protagonist. `scripts/ports` writes the starting state to
`output/new-game-map.json`.

### The charted bitmap

The world is charted in cells of one block, 24 × 24 tiles, 90 columns by 45
rows. The bitmap is `DS:0x0F6C`, save-slot offset `0x0144`: 12 bytes per cell
row, 540 bytes in all. Cell column `c` is byte `row × 12 + c / 8`, bit
`0x80 >> (c mod 8)`. Columns count from save X 0, the left edge of
`WORLDMAP.000`, so column `c` covers map X `(24c + 720) mod 2160` onward in
the `ports.json` system. Two counters follow it: `DS:0x1192` (save `0x036A`),
the charted cells, and `DS:0x1194` (save `0x036C`), the cells not yet reported
to a cartographer ([Cartography](fame/adventure-fame.md#cartography)).

A new game clears the bitmap and charts columns 4–16 of rows 8–17, 130 cells
(`0x1B90A`, called from the new-game setup at `0x1BADA`). That is save X
96–407 and Y 192–431, or map X 816–1127 in `ports.json` terms: from the
Atlantic west of Lisbon to east of Istanbul and Alexandria, and from north of
Copenhagen to the North African coast. The new-game data has an empty bitmap
(`DATA1.015` offset `0x0144`), so the rectangle comes from code alone.

### Charting at sea

The sea view charts when the fleet's 3 × 3 window of blocks changes
(`0xBF04–0xBFD6` in `0xBE5A`, the same loop at `0xC0C1–0xC180` in `0xC022`;
[The window around the fleet](#the-window-around-the-fleet)). It charts the
fleet's cell and its eight neighbours, by the fleet's own cell rather than the
clamped window: columns `(x / 24 − 1) mod 90` to `(x / 24 + 1) mod 90`,
wrapping round the world, and rows `y / 24 − 1` to `y / 24 + 1`, skipping rows
outside 0–44. Each cell not yet charted adds one to both counters. The
reveal is therefore a 72 × 72-tile square snapped to the cell grid, not a
radius. Because it runs only when the window changes, moving into a part's
first or last block column (or block row 0 or 44) from its neighbour charts
nothing new, since the clamped window stays put.

The one other writer is a cartographer's **Report** (`0x33BFA`): with at least
3,300 cells charted, it sets every bit, 4,050 cells (`0x33C2A–0x33C98`).

The Chart's overview (`0x22D09`) lays the 90 × 45 cells out at 6 × 6 pixels
and draws a colour-13 box over each uncharted one (`0x22D5C–0x22D84`). It
opens the detail of a 2 × 2-cell area only when at least one of those cells is
charted (`0x22EAD–0x22EF3`), and the detail leaves each uncharted cell blank
(`0x22AC4`).

### Ports on the map

Each port's known flag is bit `0x10` of its saved display-record byte `+0x13`
(save `0x4F40 + port × 20 + 0x13`); `0x40` marks it visited
([Known and visited ports](ports.md#known-and-visited-ports)). The 30 supply
ports, IDs 100–129, use the same records and flags. The new-game data
(`DATA1.015`, byte for byte the start of a `KOUKAI2.DAT` slot) gives:

| Flags   | Port IDs                                  |
| ------- | ----------------------------------------- |
| visited | 0, 1, 2, 7, 8, 13, 16, 18, 27, 29, 33     |
| known   | the above and 3, 6, 9, 10, 25, 30, 32, 34 |

No supply port starts known. The new-game setup also marks the starting port
visited (`0x1BAC9`, fleet `+0x26`), but the six protagonists start in Lisbon
(0), Seville (1), London (29), Amsterdam (33), Genoa (8), and Istanbul (2),
all visited already, so the list is the same for everyone. Trebizond (25) is
known but lies in cell column 17, just east of the charted rectangle, so the
Chart does not show it until that cell is charted.

Only three writes in `MAIN.EXE` set the flag: the starting port (`0x1BAC9`),
sighting a port at sea (`0x36C41`, [Once per tick](#once-per-tick)), and
entering a port, which sets `0x50` (`0x20F9D`). The scenario scripts that touch
the byte set `0x10` only on ports already visited (Otto's Seville,
`SNR3.DAT 0x045D`; Pietro's Lisbon, `SNR5.DAT 0x014C`), or set `0x20`, hidden
from the lookout (João's Sakai and Nagasaki; Ernst's Changan, Sakai, and
Nagasaki). Nothing in the executable or the scripts sells port locations.

On the map a port is large tile `0x10`, drawn as tiles `0x74`–`0x77`, and a
supply port is large tile `0x12`, drawn as `0x78`–`0x7B` (`DATA1.018`), so
the two have different pictures. An unknown port of either kind is drawn as
plain land ([The window around the fleet](#the-window-around-the-fleet)). The
treasure-map view draws every port as land, known or not.

## Fleet sprites

The sea view is redrawn by `0xC022`. It draws the map, then the fleets from
the sprite sheet in the second half of `DATA1.011`, loaded at `0xD835`:
32 sprites of 32 × 32 pixels, extracted as
[`ship-tileset.png`](../scripts/tilesets/output/ship-tileset.png), eight per
row.

During a **Storm** or **Fog** only the player's fleet is drawn
(`0xC1F6–0xC2B1`). Otherwise the routine draws every fleet in view, row by
row so that lower fleets overlap higher ones (`0xC34B–0xC472`). A fleet is
drawn when its record is active (`+0x29` bit `0x01`), not docked (bit `0x10`
clear), and all four tiles under it are water.

Each sprite is chosen from three values:

- the **owner**: the player's fleet uses rows 0–1, every other fleet rows 2–3;
- the **rig** of one ship, from its instance byte `+0x12` bit `0x10`: clear
  (oared) selects the first row of the pair, set (sailing) the second. For the
  player this is the ship the protagonist captains (`0xC209–0xC29C`); for
  another fleet it is always the ship in slot 0, whether or not that slot is
  occupied (`0xC3F3`);
- the **heading**, grouped by the table at `DS:0x8F12` into four poses, each
  with two animation frames:

| Columns | Headings                   |
| ------- | -------------------------- |
| 0–1     | North, and stopped (8)     |
| 2–3     | Northeast, east, southeast |
| 4–5     | South                      |
| 6–7     | Southwest, west, northwest |

```text
player sprite = 8 × sail + 2 × pose + frame
other fleet   = 16 + 8 × sail + 2 × pose + frame
frame         = (fleet number + tick) mod 2
```

`sail` is 1 for a sailing ship and 0 for an oared one; the player's frame in a
Storm or Fog is `tick mod 2`. The frame alternates every tick, and neighbouring
fleets alternate out of step. Nation, ship type, and fleet size play no part:
only the one ship's rig changes the picture.

A fleet whose slot 0 is empty reads instance number `0xFF`, which is not a
real ship: the lookup lands in the port-metadata table (save slot `0x5FF6`),
whose byte there is 0 in the new-game data. Such a fleet is therefore drawn
with the oared computer-fleet sprite.

## Food and water

### Stores and rations

Each ship's supply record (save-slot offset `0x423E + slot × 0x1E`) holds water
in word `+0x00` and food in word `+0x02`, both in **tenths of a barrel**; the
game shows only whole barrels. Byte `+0x1C` is the crew's **health**, 0–100.

The **water and food rations** are single fleet-wide percentages at save-slot
offsets `0x1D83` and `0x1D84`. The ration screen (`0x26045`) moves them in
steps of 1 between 0 and 100, so rations cannot exceed 100%.

### Daily consumption

At midnight at sea, `0x1E764` runs a food pass (`0x1E1CE`) and then a water
pass (`0x1E280`) over the active ships in slot order. Each ship consumes, in
tenths of a barrel:

```text
use = floor(crew × ration / D) + 1
```

`D` is 100, or 200 while a landing party is ashore (`DS:0x1189` bits `0x18`,
set by the landing routines at `0x3AA40` and `0x3AB55`). A ship always uses at
least one tenth, even with no crew or a 0% ration. The deduction is
`min(use, stock)`.

### Health

After each deduction, the ship's health changes according to the ration and
its captain's Leadership (sailor byte `+0x14`):

```text
t = 100 − floor(Leadership / 5) − ration
health −= t / 5     if t > 0
health −= t / 10    otherwise (integer division toward zero)
health  = clamp(health, 0, 100)
```

Each 5 points of Leadership therefore count as one extra ration point. Health
falls by 1 for each full 5 points the effective ration is below 100, and rises
by 1 for each full 10 points above. The rule runs once for food and once for
water, so it applies twice a day. With a 90% ration, a captain with Leadership
50 keeps health steady.

Whenever a ship's health is below 20 after the change, it loses crew
(`0x1E18E`):

```text
loss = min(crew, floor((20 − health) × crew / 100) + 1)
```

Health is unchanged while `t` is between −9 and 4, so the lowest ration that
costs no health is `96 − floor(Leadership / 5)`. The rations are fleet-wide
(the food pass reads `DS:0x2BAC` at `0x1E1F7` and `0x1E238`, the water pass
`DS:0x2BAB` at `0x1E2A9` and `0x1E2E8`, for every ship), so the captain with
the lowest Leadership sets that threshold for the whole fleet:

| Leadership | No change | Gain per pass            |
| ---------: | --------- | ------------------------ |
|          0 | 96–100%   | none at any ration       |
|         50 | 86–99%    | +1 at 100%               |
|        100 | 76–89%    | +1 at 90–99%, +2 at 100% |

Below the threshold a ship loses `floor(t / 5)` health per pass, for example
6 per pass at a 50% ration with Leadership 100, or 10 with Leadership 0.

### What health affects

Only the crew-loss check above. Among the 107 supply-record lookups
(`0x598C`), the other code that reads byte `+0x1C` either displays it, moves
it with a ship, or adjusts it:

- the at-sea panel's crew-weighted average (`0xD50F`, drawn at `0xD744`);
- the ship panel (`0x214B2`);
- moving a ship's supply record (`0x2E2A0`);
- sea events, recruiting, and reassigning crew
  ([Other health changes](#other-health-changes), [Event types](#event-types)).

Health does not enter [fleet speed](#fleet-speed) or the
[Battles](fleet-info.md) value. Health above 20 is therefore a buffer that low
rations can spend without any other effect. It is slow to rebuild: rations
raise it by at most 2 per pass, 4 a day, and only when the captain's
Leadership allows it (table above).

### Sharing supplies between ships

A ship with no stock of a resource takes it from the lowest-numbered active
ship that still has some (`0x1E3A3–0x1E3E3`). The consumption is deducted from
that donor, and the **donor's** health changes, using the donor captain's
Leadership. The receiving ship's health does not change. A donor can
therefore feed several ships and change its health several times a day.

The crew-loss check that follows is triggered by the donor's health but applied
to the receiving ship using the receiving ship's health. If the receiving
ship's health is 20 or more, the loss formula's result is 0 or negative:

- at exactly 0 before the `+1`, one crew member is lost;
- at −1, nobody is lost;
- below −1, the signed result is compared as an unsigned number, and the
  receiving ship **loses its whole crew**.

A ship that has some stock uses only its own, even if it is not enough. The
shortfall is not taken from another ship that day.

### Running out

When no active ship has any of a resource, each ship's health falls by up to 16
for that resource, and the crew-loss rule above applies (`0x1E330`). Messages
1146, 1147, and 1148 report that food, water, or both have run out on the day it
happens. If every active ship has lost its crew, or no active ship remains,
`0x1E6D6` shows message 442 or 577 and ends the game with end state `0x19`
(see [Game over at sea](#game-over-at-sea)).

### Leaving port

Harbor **Sail** (`0x2D593`) totals water, food, and crew over the active ships
as 16-bit words and projects:

```text
days = min(water tenths, food tenths) / max(crew, 1)
```

The fleet cannot leave when `days` is 0, that is, with less than one tenth of
a barrel of either resource per crew member. The ration percentages are
ignored, and the projection does not include the per-ship `+1`. Because the
totals are 16-bit, a fleet with 65,536 or more tenths (6,553.6 barrels) of
either resource wraps around and can be told it has almost none. Messages 60,
61, and 58 describe projections of 1–9, 10–180, and more than 180 days.

### Loading and transferring

Loading at the Harbor adds whole barrels as `10 × barrels` tenths, preserving
any existing tenths (`0x2D9AC`, `0x2D9B9`). The ship-transfer screen reads each
ship's water and food as whole barrels and writes them back as
`10 × barrels`, so the tenths of every ship opened in that screen are lost
(`0x24D84–0x24DEF`, `0x24F67`, `0x24F7A`).

### Other health changes

- Recruits at the Pub join at health 60, averaged by crew with the ship's
  existing health (`0x2B6ED–0x2B71B`).
- Reassigning crew averages the health of the ships and the unassigned pool; a
  ship left without crew gets health 0 (`0x244A7–0x244E2`).

No routine restores health in port.

## Going ashore

**Go Ashore** on the sea menu (`MAIN.EXE 0x26738` → `0x3ABC3`) lands a party
on one of the eight tiles bordering the fleet's 2×2 block. The corner tiles
are not offered. Landing, searching, and loading water take no time: none of
these routines advances the clock or the days-at-sea counter.

### Where a party can land

The chosen tile is checked at `0x3AD49`:

| Tile                                | Result                              |
| ----------------------------------- | ----------------------------------- |
| Plain land (`0x41`, `0x49`, `0x51`) | Lands; water can be found           |
| Desert (`0x59`)                     | Lands; water is never found         |
| Port or supply port (`0x74`–`0x7B`) | Enters the port, as Port Call does  |
| Village (`0x7C`–`0x7F`)             | Lands                               |
| Any other tile below `0x74`         | Message 441, “We can't land there.” |

The three plain-land tiles are the same terrain in different climate bands and
behave identically. The refused tiles include the sea and coast, mountains
(`0x34`–`0x3F`), rivers, and the desert-edge tiles, including the pyramid and
sphinx. There is no separate forest tile.

The river tiles follow the same three climate bands: `0x42`–`0x47` beside
plain land `0x41`, `0x4A`–`0x4F` beside `0x49`, and `0x52`–`0x53` beside
`0x51`. In each band the tiles are straight segments and the bends and ends
where a river rises or meets the coast. On the world map they join into
branching channels that run from the coast inland (`WORLDMAP.000`–`002`,
decoded by `scripts/draw-world-map`; tile art `DATA1.011`). The coast pass
makes them from one-tile sea channels ([The sea map](#the-sea-map)).

If the tile lies in a discovery's 2×2 block and the discovery's record has
flag `0x80` clear, the game asks “Shall we land at this village?” (message 439) and opens the village menu. Otherwise it asks “Shall we land here?”
(message 440) and opens the open-land menu.

### Discovery flags

Each of the 98 discoveries has a 7-byte record (save slot `0x6E74`). Byte `+4`
names its content, byte `+5` is its difficulty, and byte `+6` holds its type
(low 3 bits) and four flags:

| Flag   | Meaning                                 | Set by                                                                                                                          |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `0x80` | Not selected for this game              | A new game (`0x1B9A2`)                                                                                                          |
| `0x40` | Village sighted                         | The lookout (`0x36C99`), which also awards 50 Adventure Fame (`0x3663A`)                                                        |
| `0x20` | Discovery found, or treasure map bought | Village Search (`0x3A780`); buying a treasure's map from a Pub patron (`0x2BFF3`); Pietro's story (`SNR5.DAT 0x06B1`, `0x0C1A`) |
| `0x10` | Reported, or treasure dug up            | Reporting to a collector (`0x33840`); digging up a treasure (`0x3A332`); the shared quest script                                |

A new game sets `0x80` on all 98 records, then clears it on 50 chosen at
random (`random(98)` until 50 distinct records are picked). Nothing clears
`0x80` afterwards: no other executable routine and no scenario script does.
So only those 50 villages can be sighted or searched, which is why
[only 50 discoveries exist in each game](fame/adventure-fame.md#villages-and-discoveries).
The other 48 still show village tiles on the map, but landing there opens
the open-land menu.

The same routine then hides the ten treasures in ten of the unselected
records. For each treasure `k` from 0 to 9 it picks a random record that still
has `0x80` and ordinary content (`+4` below 90), sets its content to item
`90 + k`, and stores that record's number in treasure map item `80 + k`
(item byte `+0x14`) (`0x1B9ED–0x1BA30`). Search on that site then finds the
treasure once its map has been bought ([Villages](#villages)).

### Treasure maps

The ten treasure maps (items 80–89, the only items whose category byte
`+0x15 & 0x0F` is `0x0C`) share one **Use** handler. The item menu
(`MAIN.EXE 0x2F91B`) passes Use to `0x2F8C4`, which sends category `0x0C` to
the map view at `0x2308C`. The Old Map (89) works like the others. Using a map
does not consume it, shows no message, and returns to the item list after a
key or click (`0x18685`).

The map item's byte `+0x14` names its discovery record, whose X and Y give the
site (`0x231AB`). The view shows a 48 × 48-tile area, four 24 × 24 cells
drawn at 8 pixels per tile. The area snaps to the 24-tile grid rather than
being centered on the site (`0x231C3–0x231FA`):

```text
cx = floor(X / 24), minus 1 when X mod 24 < 12   (wrapping around the world)
cy = floor(Y / 24), minus 1 when Y mod 24 < 12 and cy > 0
view origin = (24 × cx, 24 × cy)
```

The site therefore lies 12–35 tiles from the view's left edge and 12–35 from
its top (0–23 in the top row of cells). No random value is involved: a map
always shows the same view with the X in the same place, and only the offset
differs from site to site. For example, the Map of Staff's site (254, 688)
lies 14 tiles in from the left and 16 from the top, and the Medallion Map's
site (484, 784) lies 28 and 16 tiles in.

The view is drawn from the world-map data with the whole area shown, charted
or not (`0x22A7E` with mode 1). Port tiles are replaced by plain land, and no
ports, fleets, or player ship are drawn (`0x286A6`,
[Other map views](#other-map-views)). The X is the village tile
itself: before drawing, the routine repaints the four village-icon tiles
`0x7C–0x7F` as a diagonal cross on sea texture (`0x230BD–0x231A8`, masks at
`DS:0xAC78`). **Every** discovery site inside the view therefore shows an X,
whatever its flags, including sites already found or unrelated to the map.
The tiles are shrunk to 8 × 8 pixels and limited to colors 8–15, and the view
fades in to the same sepia palette (`DS:0xAB3E`) as the world-map overview at
sea, with the X in orange-red (`0x22C1A`, `0x2325F`).

The cartographer's **Locate** uses the same discovery coordinates but reports
them as rounded latitude and longitude with a small random error
([Collector and cartographer dialogue](buildings.md#collector-and-cartographer-dialogue)).

### Finding water

Right after landing is confirmed, the game rolls once for water (`0x3AAC5`):

```text
spring found = Luck × W > random(100)
```

`Luck` is the protagonist's own; mates do not count. `W` is 0 on desert and 1
elsewhere. The chance is therefore `min(Luck, 100)`%, and 0 on desert.

The result is stored (`DS:0xBCEC`) and does not change while the party stays
ashore, so repeating Search always gives the same answer. Landing again rolls
again. Going ashore after **Wait** (below) skips the tile choice and the
question but still rolls again.

**Search** on open land (`0x3A244`) reads the stored result. On desert it
first asks, “I doubt that there is a spring here, but would you like to
search for water?” (message 424). It then reports either “We couldn't find
water.” (425) or “We found a clear spring.” (426). One exception comes first:
a treasure from the royal special search, whose map was bought from the Pub
patron, is found by Search on its tile instead of water.

### Loading water

After a spring is found, a ship picker (`0x3A183`) repeats until cancelled.
Water is free, and any ship can be filled any number of times. Each load is
limited to the ship's free cargo space, calculated as in the Harbor's Supply
screen. A full ship gets “You can't load any more - our cargo bay is full.”
(message 422). Otherwise the prompt is “How many barrels of water (0-%d)?”
(423), and the ship's water becomes `(floor(water / 10) + n) × 10` tenths.
Any confirmed load, even of 0 barrels, therefore drops the ship's odd tenths.

### Villages

Village **Search** (`0x3A5BD`) involves no random roll. It needs food aboard
(otherwise message 428) and a discovery not yet found (otherwise 432). It
succeeds when

```text
floor(3 × Luck / 20) + floor(7 × Intuition / 20) + friendship > difficulty
```

using the protagonist's Luck and Intuition and the discovery's difficulty byte
(`+5`). The sum is taken in 8 bits. Friendship starts at 0 on every entry to
the village menu and rises by 5 with each **Entertain**, which costs 2 barrels
of food. Without Entertain the score is at most 50. Failure shows “We didn't
find anything.” (429).

A found Monster attacks the party (message 430) and costs crew. Any other
discovery is announced and marked found, and has a 1-in-16 chance
(`random(16) = 7`) that some crew stay in the village.

The announcement depends on the discovery type, the low 3 bits of byte `+6`
(`0x3A690–0x3A73E`; type names at `DS:0x0AC2`):

| Type                                           | Before the message                 | Message                                                        |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| 0 Cultural Artifact                            | Treasure-chest picture, then sound | 431, “We discovered a Cultural Artifact!”                      |
| 1 Monument                                     | Nothing                            | 431                                                            |
| 4 Ruins                                        | Sound                              | 1404, “We discovered Ruins of an ancient civilization!”        |
| 2, 3, 6 (Exotic Animal, Plant, Natural Wonder) | Sound                              | 431, “We discovered %s %s!” with “a” or “an” and the type name |

The picture is graphics record `0x40`, drawn over the top of the sea view by
`0x58B7` (arguments `0xA0`, `0x10`, `0x40`) after `0x20D3` resets a
0x240-word table in the code segment to `0xFFFF`. The sound is an effect, not music: `0x9626` hands the FM
driver the effect table at `DS:0x0D9C` (interrupt `0x66`, function 5), and
`0x96C2` plays effect `0x3C` (function 6) when bit `0x08` of `DS:0x0E28`
(save-slot offset `0x00`) is set. That byte also holds the **BGM** setting
(bit `0x04`), but the Options screen (`0x26B59`) never changes bit `0x08`.
Neither call waits, and the background music keeps playing. Finding a discovery
gives no Fame, gold, or experience by itself.

Crew losses in both cases, and after a counterattack during **Plunder**, use
the protagonist's Swordsmanship `S` and Battle Level `B` (`0x3A4EA`):

```text
h    = floor(S / 2)
p    = floor((100 − min(100, h + floor(h × B / 25))) / 2)
loss = floor(p × crew / 100)        for each active ship
```

**Plunder** (`0x3A866`) takes 20–60 barrels of food, has a 1-in-4 chance of a
counterattack, lowers Luck by up to 2, and resets friendship to 0. Charm
falls by `min(2, Charm − 50)` computed unsigned (`0x3A904`): Charm 50 or 51
stops at 50, any other Charm loses 2, and Charm 0 or 1 wraps to 254 or 255. A village never offers water unless its record has
flag `0x80`, in which case it is treated as open land.

### Waiting ashore

**Wait** (`0x3AB40`) returns to the sea loop with the fleet at anchor and the
party still ashore (`DS:0x1189` bits `0x18`). Time passes normally, but daily
[food and water use](#daily-consumption) is halved and storms cause no damage.
Choosing Go Ashore again returns to the same place without moving the fleet.
The ashore bits are cleared whenever a landing menu opens, so leaving by
**Sail** clears them.

## Items at sea

The item menu offers **Equip** and **Use** (`MENU.DAT` entry 33, handler
`0x2F91B`), so an item cannot be dropped at sea. **Use** (`0x2F8C4`) picks a
handler from the low four bits of the item's type byte `+0x15`: measuring
instruments (7) at `0x2F75F`, voyager's aids (8) at `0x2F5C9`, emergency
items (9) at `0x2F6C2`, and maps (`0x0C`) at `0x2F8BC`
([Treasure maps](#treasure-maps)). Any other item answers that it cannot be
used here (`0x2F4E4`). An emergency item (Rat Poison, Balm, Lime Juice) is
used up whether or not it had anything to do (`0x2F6EF`).

### Measuring latitude and longitude

Using the Quadrant, Sextant, or Theodolite (`0x2F75F`) in port only says,
“Measure longitude and latitude on the ship.” (message 756). At sea it needs
Celestial Navigation (skill bit `0x10`): the protagonist's own, or, after
message 757, a mate with the skill chosen from a list (`0x2F70C`). Without
one, the protagonist tries anyway (messages 759 and 761), and a single
`random(100) + 1` is added to both readings (`0x2F7ED`, `0x2F871–0x2F896`).

The reading is rounded down to a multiple of the instrument's rating byte
`+0x14`, in degrees (`0x2F82C–0x2F86A`):

| Instrument | Item   | Reading rounded down to |
| ---------- | ------ | ----------------------: |
| Quadrant   | `0x14` |                      5° |
| Sextant    | `0x15` |                      2° |
| Theodolite | `0x16` |                      1° |

Only the Theodolite therefore gives the exact degree, even with the skill.
Instruments are not used up.

### Voyager's aids

- **Telescope** (`0x18`) and **Cat** (`0x19`) work while carried. Setting
  sail scans the 20 inventory slots and sets bit `0x80` (Telescope) or `0x40`
  (Cat) of `DS:0xC1EC` (`0xD8DA–0xD901`); nothing else writes that byte. The
  lookout range reads the Telescope bit ([Lookout range](#lookout-range)) and
  the rat check the Cat bit ([Rats and scurvy](#rats-and-scurvy)). Using
  either only shows a line (“We can see far!”, “Meow!”). Because the bits are
  set only on departure, a Telescope or Cat gained at sea would not count
  until the next departure, but no source adds one at sea: fleets carry only
  items 50–69 as spoils ([Gold and items](naval-battle.md#gold-and-items)),
  and the other sources are in port.
- The second **Telescope** record (`0x1B`) does nothing: the departure scan
  tests only `0x18`, and its rating 0 means Item Shops will not buy it.
- **Pocket Watch** (`0x17`, `0x2F533`) shows the time of day with the format
  `%2u:%02u %s`. The hour is `floor(tick / 3) mod 12`, shown as 12 for 0,
  but the minutes are `(tick mod 3) × 30` although a tick is 20 minutes, so
  it shows only :00, :30, and :60 (8:40 reads “8:60”). It shows AM only while
  the tick is below 24, so 8:00–11:40 AM read as PM.

## Rats and scurvy

Both are resolved in the midnight routine after food and water, and both are
cured on entering any port (`0x20FA6`). Their flags are bits `0x10` and `0x20`
of `DS:0x0E37`.

**Rats** (`0x1E508`) can appear after day 30 when no Cat (item `0x19`) is in
the inventory. The check succeeds when `random(floor(NavLevel / 5) + 2)` is 0
and `random(105)` exceeds the protagonist's Luck, where NavLevel is the
protagonist's Navigation Level. Message 473 announces them. From that day
each active ship loses one barrel of food per day (`0x1E58A`). Rat poison
(item `0x29`) removes them.

**Scurvy** (`0x1E5EC`) can appear after day 60 when `random(105)` exceeds the
protagonist's Luck; rations and health do not matter. Message 474 announces
it. Each day, each active ship loses
`min(crew, floor((100 − Knowledge) / 5) + random(2))` crew, where Knowledge
(sailor byte `+0x16`) belongs to the ship's captain (`0x1E64F`). Lime Juice
(item `0x2B`) cures it. The day counter is one byte, so after day 255 it
restarts at 0 and both checks pause until days 31 and 61 again.

## Weather anomalies

### Regions

Anomalies can begin only in regions whose **wind** byte has bit 7 set; the
same bits are set in both seasonal tables. The **current** byte's bits 6–7 then
select the type: 1 Storm, 2 No Wind, 3 Fog. Wind-byte bit 6 additionally marks
the two **Missing Ship** regions, which are also Storm regions: region 206 in
the western Atlantic and region 223 in the western Pacific. See
[`world-map-anomalies.png`](../scripts/winds-current-anomalies/output/world-map-anomalies.png). Two other regions,
90 in the North Atlantic and 449 in the far South Atlantic, have wind-byte bit
6 without bit 7. The anomaly check tests bit 7 first (`0x1ECEF`), so nothing
ever happens there; they are the two cells marked “Unused” on the extracted map.

### Checks every four hours

When no anomaly is active, the four-hourly re-roll calls `0x1ECD8`:

1. **Luck.** `L` is the highest Luck among the protagonist and every mate
   whose duty is 3 (First Mate) or 5 (Chief Navigator). If `L + 50 ≥ random(155)`, nothing
   happens. Even Luck 100 leaves a 4-in-155 chance to continue.
2. **Figureheads.** `F` is the average figurehead value of the active ships
   (supply byte `+0x1D`: 0 none, 1 Sea Horse, 2 Commodore, 3 Unicorn, 4 Lion,
   5 Giant Eagle, 6 Hero, 7 Neptune, 8 Dragon, 9 Angel, 10 Goddess), rounded
   down. If `random(11) ≤ F`, nothing happens. A fleet averaging 10 is immune.
3. **Missing Ship**, in the two marked regions, before the type roll (see
   below).
4. **Type roll** with the current wind speed `S`:

| Anomaly | Begins when                                  | Probability at speed S         |
| ------- | -------------------------------------------- | ------------------------------ |
| Storm   | `random(7) + 3 ≥ S` and no Balm is in effect | 1 for S ≤ 3, then (10 − S) / 7 |
| No Wind | `random(6) ≥ S`                              | (6 − S) / 6                    |
| Fog     | `random(10) = 0`, then `random(6) ≥ S`       | (6 − S) / 60                   |

Low wind makes every anomaly more likely. When an anomaly begins
(`0x1EBDB`), the better of the First Mate and the Chief Navigator by Intuition may
warn about it: the warning appears when `random(100) ≤ Intuition`. The warning
messages are 340 (Storm), 344 (No Wind), and 348 (Fog), plus 2 when that mate's
Knowledge is below 70 and plus 1 for a rough-spoken mate (personality bit
`0x08`).

### Duration and effects

An anomaly takes effect at the next four-hourly check, which announces it with
message 352 (Storm), 354 (No Wind), or 356 (Fog), and then applies its effect
every four hours (`0x1F1B9`). It cannot end on the day it starts.

**Storm** (`0x1EE10`). For each active ship:

```text
n = (100 − Seamanship) / (floor(Navigation Level / 5) + 3) + 1
D = min(10, n) + random(2)
D = 5 × D          for a ship whose instance byte +0x12 has bit 0x40 clear
durability     −= D   (not below 0)
tacking, power −= D / 2 each
max durability  = max(floor(model durability / 4), max durability − 1)
```

Seamanship and Navigation Level are the ship's captain's. The ships that take
five times the damage are the Hansa Cog, Buss, Tallette, Light Galley, Flemish
Galleon, Venetian Galeass, Atakabune, and Kansen. A ship reduced to durability
0 is lost with message 358: with a generic captain, the captain is lost too;
with a named captain, message 809 says the captain was rescued and becomes an
unassigned mate. If the flagship sinks, message 1031 is shown and the game
ends with end state `0x18`. No damage is dealt while a
landing party is ashore. The storm holds the wind at speed 7 and ends with
message 360 when `random(8)` is 0 or the fleet has left the anomaly region.

**No Wind** (`0x1F0EB`) holds the wind at speed 0, so only fleets with an oared
ship keep moving. It ends with message 362 when `random(20)` is 0 and the
region's base wind speed is not 0. Leaving the region does not end it.

**Fog** (`0x1F168`) freezes the wind, hides other fleets, and disables the
long-range lookout roll. A Storm also hides other fleets from the sea view
([Fleet sprites](#fleet-sprites)). It ends with message 364 when `random(30)` is 0 or the
fleet has left the anomaly region.

On average after its first day, a Storm lasts about 8 checks (32 hours), No Wind
about 20 (80 hours), and Fog about 30 (5 days), less when the fleet sails out of
a Storm or Fog region.

The **Balm** item (`0x2F639`) ends an active Storm (message 372 or 373; 374
otherwise) and prevents new Storms for `10 + random(6)` days (`DS:0x122A`,
counted down at `0x1E989`). It has no effect on the other anomalies.

### Missing Ship

In the two Missing Ship regions, after the Luck and figurehead checks,
`0x1EAD2` scans the active ships in slot order. For each ship not captained by
the protagonist it draws `random(100)`. The ship is safe when its captain's Luck
is at least the draw. If the draw exceeds the Luck and the captain is a
**generic** sailor (sailor byte `+0x13` bits 6–7 set, the sailors drawn with
generic portraits), the ship goes missing and the scan stops, so at most one
ship is lost per check. Named mates are never lost this way.

A missing ship is removed permanently with its captain, crew, guns, supplies,
cargo, and figurehead (`0x1EA8F`, `0xB13F`), and message 336 reports it. The
name in that message is read from the ship instance whose number equals the
slot index rather than from the lost ship's own instance, so it can name a
different ship.

## Sea events

Forty fixed tiles at sea hold one-time events such as a ghost ship, a phoenix,
or sirens. Ten are active at any time, and each one that fires is replaced by
the next event from a queue of thirty.

### Active events and the queue

The save holds the ten active events: their tile positions as pairs of 16-bit
words at save-slot offset `0x036E` (`DS:0x1196`), their types at `0x0396`
(`DS:0x11BE`), and a queue position at `0x03A0` (`DS:0x11C8`). A new game
starts with the ten events stored in `DATA1.015` at the same offsets.

Every tick at sea, `0x36AD9` compares the fleet's position with the ten active
tiles. The fleet must stand exactly on the tile; neighbouring tiles do not
count. When it does, the event runs, and its entry is replaced by record
`queue position` of `raw/MONSTER.DAT`, a 5-byte record of x word, y word, and
type (`0x36B59–0x36BAC`); the queue position then advances. The file holds 30
records followed by zeros, so once the queue is exhausted, replacements are
placed at tile `(0, 0)`.

### Event types

`0x369A3` calls the type's routine through the table at `DS:0xBB94`. When the
routine reports that it applied, the game plays a short effect twice
and shows the
type's two lines, `MESSAGE.DAT` entries `510 + 2 × type` and the next one.

| Type | Event           | Messages | Effect                                                                                                                                  |
| ---: | --------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------- |
|    0 | Sirens          |  510–511 | Every active ship loses a quarter of its crew, rounded down.                                                                            |
|    1 | Kraken          |  512–513 | The protagonist and every mate lose up to 10 Courage (sailor byte `+0x18`).                                                             |
|    2 | Vanishing ship  |  514–515 | The last active ship not captained by the protagonist leaves the fleet with its crew and cargo; its captain becomes an unassigned mate. |
|    3 | Manta ray       |  516–517 | No effect.                                                                                                                              |
|    4 | St. Elmo's fire |  518–519 | Every active ship's crew health rises by up to 10, to at most 100.                                                                      |
|    5 | Phoenix         |  520–521 | The last active ship not captained by the protagonist has its Power halved.                                                             |
|    6 | Tornado         |  522–523 | Every active ship loses all of its cargo; food, water, lumber, and shot are kept.                                                       |
|    7 | Dragon          |  524–525 | Every active ship's crew health falls by up to 10. No tile uses this type.                                                              |
|    8 | Whales          |  526–527 | The last active ship not captained by the protagonist has its current durability halved.                                                |
|    9 | Ghost ship      |  528–529 | The protagonist loses up to 30 Luck.                                                                                                    |

"The last ship" is found by scanning the fleet's slots from 9 down to 0
(`0x36768`, `0x36828`, `0x3692D`). The Vanishing ship, Phoenix, and Whales
events do nothing, and show no message, when every active ship is captained by
the protagonist. The Vanishing ship clears the ship's active status bit
(`0x10`) and its captain field rather than deleting the ship record.

### Event tiles

Latitude and longitude use the game's own conversion (see the cartographer's
**Locate** in [buildings.md](buildings.md)). Queue records become active one
at a time, in order, as earlier events fire.

| Order    | Tile         | Position   | Event           |
| -------- | ------------ | ---------- | --------------- |
| Start 1  | (241, 148)   | 69°N 10°E  | Ghost ship      |
| Start 2  | (300, 178)   | 64°N 20°E  | Sirens          |
| Start 3  | (99, 267)    | 52°N 13°W  | St. Elmo's fire |
| Start 4  | (324, 325)   | 44°N 24°E  | Sirens          |
| Start 5  | (173, 528)   | 15°N 1°W   | Phoenix         |
| Start 6  | (176, 601)   | 5°N 0°W    | Manta ray       |
| Start 7  | (260, 809)   | 23°S 13°E  | St. Elmo's fire |
| Start 8  | (436, 738)   | 13°S 42°E  | Vanishing ship  |
| Start 9  | (425, 513)   | 17°N 41°E  | Phoenix         |
| Start 10 | (614, 526)   | 16°N 72°E  | Kraken          |
| Queue 1  | (1771, 513)  | 17°N 94°W  | Tornado         |
| Queue 2  | (1905, 538)  | 14°N 72°W  | Ghost ship      |
| Queue 3  | (1953, 684)  | 6°S 64°W   | Phoenix         |
| Queue 4  | (714, 484)   | 21°N 89°E  | Tornado         |
| Queue 5  | (1897, 1011) | 52°S 73°W  | St. Elmo's fire |
| Queue 6  | (881, 647)   | 0°S 117°E  | Vanishing ship  |
| Queue 7  | (1843, 759)  | 16°S 82°W  | Vanishing ship  |
| Queue 8  | (1088, 808)  | 23°S 151°E | Manta ray       |
| Queue 9  | (1235, 891)  | 35°S 176°E | Whales          |
| Queue 10 | (993, 627)   | 1°N 135°E  | Kraken          |
| Queue 11 | (780, 21)    | 86°N 100°E | St. Elmo's fire |
| Queue 12 | (1358, 205)  | 61°N 163°W | Whales          |
| Queue 13 | (1395, 492)  | 20°N 157°W | St. Elmo's fire |
| Queue 14 | (1042, 537)  | 14°N 143°E | Tornado         |
| Queue 15 | (950, 440)   | 28°N 128°E | Manta ray       |
| Queue 16 | (1647, 81)   | 78°N 115°W | St. Elmo's fire |
| Queue 17 | (1971, 92)   | 76°N 61°W  | Kraken          |
| Queue 18 | (1955, 316)  | 45°N 64°W  | Sirens          |
| Queue 19 | (1744, 1060) | 58°S 99°W  | Ghost ship      |
| Queue 20 | (666, 666)   | 3°S 81°E   | Whales          |
| Queue 21 | (563, 463)   | 24°N 64°E  | Phoenix         |
| Queue 22 | (488, 568)   | 10°N 51°E  | St. Elmo's fire |
| Queue 23 | (1221, 95)   | 76°N 173°E | Whales          |
| Queue 24 | (1183, 1067) | 59°S 167°E | Whales          |
| Queue 25 | (1838, 481)  | 22°N 83°W  | Tornado         |
| Queue 26 | (1844, 597)  | 6°N 82°W   | Manta ray       |
| Queue 27 | (1064, 324)  | 44°N 147°E | Vanishing ship  |
| Queue 28 | (1327, 142)  | 69°N 168°W | Kraken          |
| Queue 29 | (1634, 484)  | 21°N 117°W | Sirens          |
| Queue 30 | (1502, 620)  | 2°N 139°W  | Ghost ship      |

## Game over at sea

Losing the whole crew or the flagship ends the game. The routine sets an end
state in `DS:0x05EC`, and the main loop passes it to the ending routine at
`0x1C741` (`0x1B328–0x1B343`), which also plays the protagonists' ordinary
endings. End states `0x10`–`0x1F` play music track `0x14` and show a closing
epilogue from `MESSAGE2.DAT` chosen by the low four bits (`0x1C8C7–0x1C8FE`):

| End state | Cause                           | Epilogue                                                        |
| --------: | ------------------------------- | --------------------------------------------------------------- |
|    `0x18` | The flagship sinks in a storm   | 1014, “…ran into a terrible storm, and his battered ship sank…” |
|    `0x19` | The whole crew or fleet is lost | 1015, “…the harsh conditions on board cost… his entire crew…”   |
|    `0x1A` | Defeat in a naval battle        | 1013, “…was defeated in battle…”                                |
|    `0x10` | The year 1553 ends              | 1016, “…decided to put an end to his quest at sea…”             |

The last one is the game's time limit. The year-end routine (`0x1B214`)
advances the year byte `DS:0x0734`, which holds the year minus 1,501
(`0x15B61`), and sets end state `0x10` once it passes 52 (`0x1B21B–0x1B226`):
the game ends as 1553 turns into 1554, whatever the story has reached. The
same `DS:0x05EC` byte also takes `0x88` when the player confirms “Is it okay
to end this game?” (message 881) in the in-game menu (`0x26D2E–0x26D4B`).

Each epilogue begins with the in-game date and the protagonist's name.

## Open questions

None remain.

## Evidence

- `MAIN.EXE 0x2052F`, `0x205DF`, `0x1E95E`, `0x1E979`: day loop, midnight, and
  the days-at-sea counter.
- `MAIN.EXE 0x1F282`, `0x287D2`, `0x1B88E`, `0x1CA0E`: wind re-roll, region
  lookup, and season tables.
- `MAIN.EXE 0x36FFB–0x371C2`, `0x3723A`, `0x374E0`: fleet speed and movement.
- `MAIN.EXE 0x36AD9–0x36CA2`, `0x36A85`, `0x183EC`, `0xD651–0xD674`, `0x205CA`:
  lookout range, candidates, and the one-roll-per-tick scan.
- `MAIN.EXE 0x1BA38`, `0x37661–0x376E7`, `0x26C63`, `DS:0xAFD0`: sea-view
  window, scrolling, and the Scroll Range option; `DATA1.015` offset `0x05`:
  its new-game value.
- `MAIN.EXE 0xBE5A`, `0x284F9`, `0x282AA`, `0x277C0`, `0x281F6`, `0x2824F`;
  `DATA1.010`, `DATA1.018`, `WORLDMAP.000`–`002`: the sea map.
- `MAIN.EXE 0x22A7E`, `0x22B1A–0x22B8F`, `0x286A6`, `0x265E9`: Chart, Port Map,
  and treasure-map views.
- `MAIN.EXE 0x1B90A`, `0x1BADA`, `0xBF04–0xBFD6`, `0xC0C1–0xC180`,
  `0x33C2A–0x33C98`, `0x22D09`, `0x22EAD–0x22EF3`, `0x1BAC9`, `0x20F9D`,
  `0x36C41`; `DATA1.015` offsets `0x0144` and `0x4F40`: charted areas and known
  ports.
- `MAIN.EXE 0x6B6B`, `0x6BDA`, `0x97BC`, `0x1E9A0`, `0x1E9B4`, `0x1E9FA`,
  `0x20447–0x20474`, `0xEDD7`, `0x1F302–0x1F314`, `DS:0xA88A`, `DS:0xA892`,
  `DS:0x9052`, `DS:0xC176`, `DS:0xA890`: map colours, time-of-day palettes,
  and fading.
- `MAIN.EXE 0xC022`, `0xC1F6–0xC472`, `0x7A8C`, `0xD835`, `DS:0x8F12`: fleet
  sprites.
- `MAIN.EXE 0x1E764`, `0x1E1CE`, `0x1E280`, `0x1E18E`, `0x1E3A3`: food, water,
  health, and supply sharing.
- `MAIN.EXE 0x1E228–0x1E26C`, `0x1E1F7`, `0x1E2A9`, `0x598C`, `0xD50F`,
  `0xD744`, `0x214B2`, `0x2E2A0`: health threshold, fleet-wide rations, and the
  readers of health.
- `MAIN.EXE 0x2D593`: departure check.
- `MAIN.EXE 0x3ABC3`, `0x3AD49`, `0x3AA55`, `0x3AAC5`, `0x3A244`, `0x3A183`,
  `0x3A5BD`, `0x3A4EA`, `0x3A866`, `0x3AB40`: going ashore.
- `MAIN.EXE 0x1E508`, `0x1E5EC`: rats and scurvy.
- `MAIN.EXE 0x1ECD8`, `0x1EAD2`, `0x1F1B9`, `0x1EE10`, `0x1F0EB`, `0x1F168`:
  anomalies.
- `MAIN.EXE 0x36AD9–0x36BAC`, `0x369A3`, `0x36708–0x369A2`: sea events.
- `raw/WINDCUR.DAT`: wind, current, and anomaly regions.
- `raw/MONSTER.DAT` and `DATA1.015` offsets `0x036E–0x03A0`: sea-event tiles.
- `MAIN.EXE 0x1B328–0x1B343`, `0x1C741`, `0x1C8C7–0x1C8FE`: end states and
  epilogues.
