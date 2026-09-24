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
record, not its name or condition. Ship types are zero-based in the save;
`display ship ID = saved type + 1`. The extracted images are
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
