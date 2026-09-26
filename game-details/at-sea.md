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

The lookout range is the best single ship's `lookout % × crew / 100`, capped at
12 (supply byte `+0x08`), and doubled with a Telescope in the inventory
(`0xD3FC`). Every tick, `0x36AD9` checks ports and discoveries by Chebyshev
distance. Anything within 2 tiles is found automatically. Anything within the
lookout range and inside the visible map is found when `random(200)` is below
the best Intuition among the commodore and the mates. Fog disables the
long-range roll. A port found this way becomes
[known](ports.md#known-and-visited-ports) (`0x36C41`).

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
(`0x34`–`0x3F`), rivers and lakes, and the desert-edge tiles, including the
pyramid and sphinx. There is no separate forest tile.

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
or not (`0x22A7E` with mode 1). Port markers are replaced by sea, and no ports,
fleets, or player ship are drawn (`0x286A6`). The X is the village tile
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
(`random(16) = 7`) that some crew stay in the village. Finding a discovery
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
|    `0x10` | Retirement                      | 1016, “…decided to put an end to his quest at sea…”             |

Each epilogue begins with the in-game date and the protagonist's name.

## Open questions

- **Terrain names.** The tile classes in
  [Where a party can land](#where-a-party-can-land) are named from the tileset
  image; tiles `0x42`–`0x47`, `0x4A`–`0x4F`, and `0x52`–`0x53` look like
  rivers and lakes, but the code only treats them as not landable.
- **Village Search effects.** The fanfare and picture calls in village Search
  are identified only by where they are used.

## Evidence

- `MAIN.EXE 0x2052F`, `0x205DF`, `0x1E95E`, `0x1E979`: day loop, midnight, and
  the days-at-sea counter.
- `MAIN.EXE 0x1F282`, `0x287D2`, `0x1B88E`, `0x1CA0E`: wind re-roll, region
  lookup, and season tables.
- `MAIN.EXE 0x36FFB–0x371C2`, `0x3723A`, `0x374E0`: fleet speed and movement.
- `MAIN.EXE 0x36AD9`, `0xD3FC`: lookout and discovery.
- `MAIN.EXE 0xC022`, `0xC1F6–0xC472`, `0x7A8C`, `0xD835`, `DS:0x8F12`: fleet
  sprites.
- `MAIN.EXE 0x1E764`, `0x1E1CE`, `0x1E280`, `0x1E18E`, `0x1E3A3`: food, water,
  health, and supply sharing.
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
