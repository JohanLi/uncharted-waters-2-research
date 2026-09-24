# Townspeople

Every port shows up to eight townspeople. Four of them wander,
and four stand in fixed places beside building entrances. In a port whose
nation is blockading the player's nation, three halberd guards can replace
some of the fixed townspeople around the Harbor.

Walking into a townsperson shows a short line of ordinary dialogue from
`MESSAGE.DAT` or `MESSAGE2.DAT`; each townsperson has its own kind of line (see
[Talking to townspeople](#talking-to-townspeople)). Townspeople also matter for
game mechanics: their movement draws from the general gameplay random number
generator every frame, which is why executable-side random results cannot be
predicted from a save (see [General RNG consumption](#general-rng-consumption)).

## Sprites

All townspeople use the 24 frames of `CHAR.006`, extracted as
[`char6.png`](../scripts/portraits-items-discoveries/output/char6.png). Each
character has two animation frames per pose.

| `char6` frames | Character          | Role                              |
| -------------: | ------------------ | --------------------------------- |
|            0–7 | Woman in blue hood | Walker (even slots 0 and 2)       |
|           8–15 | Man in orange      | Walker (odd slots 1 and 3)        |
|          16–17 | Man in hat, waving | Fixed, type 0, beside the Market  |
|          18–19 | Dog                | Fixed, type 1, beside the Pub     |
|          20–21 | Guard with halberd | Fixed, type 2, hostile-port guard |
|          22–23 | Old man            | Fixed, type 3, beside the Lodge   |

A walker's eight frames are four facing directions in the order up, right,
down, left, two frames each:

```text
walker frame     = 2 × ((slot & 1) × 4 + direction) + ((x + y) is even ? 1 : 0)
fixed-actor frame = 16 + 2 × type + random(2)
```

The walking animation therefore alternates with the parity of the tile being
stood on, while a fixed actor's animation frame is chosen at random each frame.
In the game's sprite buffer these frames follow the player's own eight frames,
so the executable's frame numbers are 8 higher than the `char6` numbers above.

## Save layout

The actor table is part of each save slot, at slot-relative `0x18`
(`DS:0x0E40`): eight records of three bytes.

|  Offset | Meaning                                                                      |
| ------: | ---------------------------------------------------------------------------- |
| `+0x00` | Tile x, or `0xFF` when the slot is inactive                                  |
| `+0x01` | Tile y, or `0xFF` when the slot is inactive                                  |
| `+0x02` | Walkers: direction (0 up, 1 right, 2 down, 3 left). Fixed actors: type (0–3) |

Slots 0–3 are walkers and slots 4–7 are fixed actors. Walkers keep the position
and direction they had wandered to when the game was saved.

## Spawn layout

Townspeople are placed relative to the building entrances of the current port
(the `ZA_DAT.DAT` coordinates copied to `DS:0x0A60`). The routine at
`MAIN.EXE 0x0DFE2` places one walker and one fixed actor at each of the Market,
Pub, Shipyard, and Lodge; the Harbor has none by default.

| Building | Walker slot and start     | Fixed slot and position        |
| -------- | ------------------------- | ------------------------------ |
| Market   | 0: woman, entrance −2, +1 | 4: waving man, entrance +2, +1 |
| Pub      | 1: man, entrance −2, +1   | 5: dog, entrance +2, +1        |
| Shipyard | 2: woman, on the entrance | 6: inactive (guard slot)       |
| Lodge    | 3: man, entrance −2, +1   | 7: old man, entrance +2, +1    |

Offsets are in tiles, x first; +1 in y is one tile below the entrance. Every
walker starts facing down. The save editor's port-change function uses the
same layout when it moves a save to a different port.

## Movement

The walker routine at `MAIN.EXE 0x0B5A6` runs once per town frame, whether or
not the player is moving. For each of the four walkers in turn:

1. Draw `random(10)`. On 0 (10%), choose a new direction with `random(4)`;
   otherwise keep the current direction.
2. Draw `random(3)`. On 0 (one frame in three), try to step one tile in the
   current direction.
3. If the step succeeds, or the walker did not try to move this frame, keep the
   direction.
4. If the step is blocked, stay in place and change direction by
   `random(3) − 1`: turn left, carry on, or turn right, one chance in three each.

A step is blocked by a non-walkable map tile, by the edge of the 94 × 94 tile
area, or by any other townsperson or the player within one tile of the
destination. A walker is never blocked by itself.

Per frame, therefore, a walker keeps its direction with probability
90% + 10% × ¼ = **92.5%** and switches to each other direction with probability
**2.5%**, apart from the turns caused by obstacles, so walkers tend to travel
in long straight lines.

The fixed actors never move. The same routine draws a `random(2)` animation
frame for each of them while it is inside the 23 × 23 tile view.

### Night

The routine first tests the clock (`0x0B49A`). From 20:00 until 04:00 it does
not move or draw anyone and makes no random draws. Instead it calls the spawn
routine every frame, which puts every townsperson back at its spawn position
facing down. The proximity check also reports no townsperson at night, so
townspeople cannot be bumped into.

Townspeople are therefore absent from 20:00 until 04:00 and reappear at their
spawn positions. Because their positions are part of the save (slot-relative
`0x18`) and the reset happens only when a night frame is drawn, time that
passes without town frames does not reset them. Lodge **Check In** advances
the clock directly to 08:00 the next day, so checking in before 20:00 leaves
the townspeople where they were. Checking in after 20:00 follows town frames
already drawn at night, so they have been reset.

## Hostile-port guards

After the normal spawn, the same routine adds guards when all of the following
hold:

- it is daytime (04:00–19:40);
- the port belongs to one of the six nations rather than to pirates;
- that nation's status toward the player's nation has the blockade flag
  (`0x10`) set (see [Friendship](friendship.md#confirmed-status-flag-effects));
  and
- the player is standing on the tile just below the Harbor entrance, which is
  where a player arriving by sea appears.

Three guards (type 2) then replace fixed slots 4–6, in a V shape below the
Harbor:

| Slot | Position (Harbor entrance + x, + y) |
| ---: | ----------------------------------- |
|    4 | −2, +2                              |
|    5 | 0, +3                               |
|    6 | +2, +2                              |

This removes the waving man and the dog for as long as the guards stay. Like
the other fixed actors, the guards never move.

The Harbor's entry routine (`0x2E55F–0x2E643`) can undo this. Entering the
Harbor of a blockading port at 06:00 or earlier, or at 18:00 or later, has a
one-in-three chance (`random(3)`) of restoring slots 4–6 to their ordinary
occupants. This check identifies the player's nation from the player fleet's ID
(fleet ID ÷ 10) rather than from the protagonist's affiliation.

## Talking to townspeople

When the player's step is blocked by a townsperson, the game shows that
townsperson's line (`MAIN.EXE 0x0B800`), but only if the player has taken at
least ten unobstructed steps since the last such line (counter `DS:0x8EE8`).
Otherwise the player is simply blocked. The line depends on who was bumped, not
on where they are standing. Message numbers below are combined zero-based
indices: 0–999 are `MESSAGE.DAT` and 1000–1422 are `MESSAGE2.DAT` minus 1,000.

| Townsperson             | Message               | Content                                                            |
| ----------------------- | --------------------- | ------------------------------------------------------------------ |
| Market woman (0)        | 642 + port ID         | One fixed line per regular port, such as local history             |
| Pub man (1)             | 1274 + day % 10 (+30) | Gameplay tips                                                      |
| Shipyard woman (2)      | 640 or 641            | The first ship in the local Used Ship stock, or that there is none |
| Lodge man (3)           | 1264 + day % 10 (+30) | Gameplay tips                                                      |
| Waving man (4)          | 1284 + day % 10 (+30) | Gameplay tips; at a supply port, 578 welcomes you by port name     |
| Dog (5)                 | 619 + port ID % 3     | “Bowwow!”, “Yap-yap!”, or “Sniff-sniff!”                           |
| Guard (6, or any guard) | 622                   | “No visitors are allowed entrance to this port…”                   |
| Old man (7)             | 616, then 617 or 618  | The port's specialty good, or that it has none                     |

The day is the saved zero-based day of the month, so the tip changes daily and
repeats every ten days. The three tip families add 30 to the index, selecting
a second set of ten lines each (1294–1323), except in the first game year,
1522, and at ports with ID 42 or higher. Those later lines name collectors,
cartographers, teachers, and profitable trade routes.

The Shipyard woman names the model of the first occupied entry in the saved
Used Ship stock (`DS:0x7C84`, slot-relative `0x6E5C`). The old man's line 617,
“%s %s the specialty of this port.”, names the specialty good from port
metadata `+0x1C` and uses “are” for Glass Beads and Arms and “is” otherwise;
line 618 is used when the port has no specialty (`0xFF`).

## General RNG consumption

The walker routine and every other executable-side random choice share one
generator (see
[open questions](../dialog-system/open-questions.md#3-general-gameplay-rng-lifecycle)).
Its state starts at zero when the program is launched, is never reseeded, and
is not stored in the save. In daytime, each town frame consumes between 8 and
12 draws for the walkers, plus one per visible fixed actor. These draws are
one of the reasons the generator's state when the player enters a building
depends on the program's history since launch rather than on the save.
Random results such as the
40-, 60-, or 80-minute building visit, hostile-building encounters, or Used
Ship stock cannot be predicted from a save.

## Evidence

- `MAIN.EXE 0x0DFE2–0x0E100`: spawn layout and hostile-port guards.
- `MAIN.EXE 0x0B5A6–0x0B7FF`: per-frame walker movement and fixed-actor
  animation.
- `MAIN.EXE 0x0B4AF`: townsperson proximity check (returns 7 for a guard,
  otherwise slot + 1); `0x0B57E`: on-screen test; `0x0B49A`: 04:00–19:40
  daytime test.
- `MAIN.EXE 0x0B800–0x0B9E7`: townsperson lines; base indices at
  `DS:0x8EF8–0x8F09`.
- `MAIN.EXE 0x2E55F–0x2E643`: guard removal on a night-time Harbor entry.
- `MAIN.EXE 0x0A166–0x0A1B1`: the general generator and `random(n)`.
- Save slots in real saves: slots 4, 5, and 7 always hold types 0, 1, and 3,
  and slot 6 is inactive (`0xFF, 0xFF`, type 2) in every friendly-port save.

## Still unconfirmed

- The starting value of the ten-step conversation counter when entering a
  town.
