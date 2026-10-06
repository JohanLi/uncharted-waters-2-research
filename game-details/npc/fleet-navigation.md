# NPC fleet navigation

NPC fleets do not choose a straight line to a remote port. The game contains a
world-navigation graph. It finds graph nodes near the fleet and its
destination, searches that graph, caches the next few nodes in the fleet
record, and then uses a separate map-aware movement routine to sail toward the
current node.

Two routes computed from the stored graph (see
[Worked routes from Lisbon](#worked-routes-from-lisbon)) show the consequences:

- Fleets bound from Lisbon for Pernambuco follow West Africa, continue around
  the Cape of Good Hope and along the far south of the map, and only then turn
  west.
- Fleets crossing from Lisbon toward Veracruz go north by Ireland and
  Greenland before following North America south.

Those are graph routes, not direct great-circle-like courses and not evidence
that the game has mistaken the horizontal wrap seam. The paths can be poor in
geographical terms because the graph has no lanes across the open ocean
([Tools](#tools)), and its search does not always find the cheapest route
through the graph it has ([The world-navigation graph](#the-world-navigation-graph)).

## Fleet navigation state

The 0x85-byte fleet record contains considerably more route state than the two
previously identified coordinate pairs:

```text
fleet[0x00..0x03]  current world position
fleet[0x04..0x07]  final/current mission navigation target
fleet[0x08..0x0B]  local terrain-aware temporary waypoint
fleet[0x0C..0x0D]  route-slot index and navigation flags
fleet[0x0E..0x0F]  in-area step accumulator
fleet[0x10..0x17]  four cached navigation-graph node IDs (u16 each)
fleet[0x1B]        objective
fleet[0x1C]        objective argument
```

The low bits of `+0x0C` select one of the four cached node IDs. The upper bits
of the `+0x0C/+0x0D` word record which slots are populated and which phase of
navigation is active. The most useful decoded flag is `fleet[0x0D] & 0x20`:
when set, the target selector uses the final target at `+0x04/+0x06` directly.
Without that flag it normally resolves the selected node ID from
`+0x10..+0x16` and uses that node's coordinates.

`fleet[0x0D] & 0x80` takes precedence over the graph cache and selects the
local temporary waypoint at `+0x08/+0x0A`. The route-state code normally
derives this waypoint from the current cached graph node by running a second,
terrain-aware search. Bit `0x08` marks a cached graph route that reaches the
graph node nearest the final destination; after its cached nodes have been
consumed, navigation switches to the exact `+0x04/+0x06` target.

### Route state

The high byte `+0x0D` holds these flags:

| Bit    | Meaning                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------ |
| `0x01` | Preserved by the view-shift reset (`0xBE3D`); no reader found                                    |
| `0x02` | Reset the step accumulator at `+0x0E` on the next in-area step (`0x36F6A–0x36F7C`), then cleared |
| `0x08` | The cached route reaches the graph node nearest the destination (`0x28F23`)                      |
| `0x20` | Steer to the exact target at `+0x04/+0x06`                                                       |
| `0x40` | The cached route is empty or used up and must be rebuilt                                         |
| `0x80` | The temporary waypoint at `+0x08/+0x0A` is active                                                |

Bit `0x40` is set when advancing through the cache leaves no filled slot
(`0x2989A`, `0x2998B`). The route-state code then either switches to the exact
target, when bit `0x08` is set, or calls the route builder (`0x28A18`), which
refills the cache and clears `0x40` (`0x28F2B`). When a fleet is given a new
destination, the game writes the whole word as `0x4000`, or `0x6000` for an
exact target in the loaded area (`0x395AB`, `0x39671`, `0x20379`,
`0x36DAC`, `0x36E4F`): cache slot 0, no cached nodes, no waypoint, and a
rebuild pending. Scenario scripts use the same value. When the loaded sea area
shifts, fleets whose waypoint now lies on land are reset the same way,
keeping only bit `0x01` (`0xBDD8`, `0xBE3D–0xBE42`).

The word at `+0x0E/+0x0F` is the step accumulator of the in-area heading
routine (`0x36EC1`): it is seeded with `−(|dx| / 2)` when bit `0x02` is set
and drives a line-drawing walk toward the target (`0x36F6A–0x36FAC`).

The objective byte `+0x1B` selects what a fleet is doing. Speaking to a fleet
with **Gossip** at sea reports it through a line chosen by objective
(`MAIN.EXE 0x2589B`, dispatch table at `0x25954`):

| Objective | Gossip line                                                                                                              | Argument `+0x1C`         |
| --------: | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
|         0 | 152, “We're on our way home.”                                                                                            | port                     |
|         1 | 153, “We're heading for %s to make an investment there.”                                                                 | port                     |
|         2 | 154, “We're off to trade goods in %s.”                                                                                   | port                     |
|         3 | 155, “Ohhh, I was waiting for you to sail by. It's time to teach you a lesson.”                                          | port                     |
|         4 | 156, “Unlucky fool! You don't know who I am.”                                                                            | none; follows the player |
|       5–7 | 157, “We're looking for %s of %s.” (161, “And you know what? You are my next prey.”, when the target is the protagonist) | sailor; 7 pursues        |
|         8 | 158, “We're sailing in a convoy to protect merchant fleets. …”                                                           | —                        |
|         9 | 159, “I'm on the lookout for pirates. They won't get away from me!”                                                      | port                     |
|        10 | 160, “I have some business with you.”                                                                                    | sailor; follows          |

Objectives 3, 4, and 5–7 aimed at the protagonist are hostile: Gossip then
starts a battle at any hour ([Nightfall](../naval-battle.md#nightfall)).

For objectives 5–7, the pursuit refresh at `MAIN.EXE`
`0x1F94E–0x1F9CF` continually copies the tracked fleet's coordinates into
`+0x04/+0x06`. Pursuit therefore changes the endpoint continually, but it can
still pass through the same graph routing machinery when the target is remote.

## The world-navigation graph

The graph is held in a dynamically allocated block referenced through the
handle at runtime data word `0x0E1A`. The allocation made at `MAIN.EXE`
`0x1C3B1–0x1C3C8` reserves `0x300` paragraphs, or 12,288 bytes.

The loader at `MAIN.EXE` `0x1B7BA–0x1B80A` opens `C:DATA1.LZW`. It expands
archive member 5 into runtime data beginning at `0xC1C2`, then member 4 into
the block referenced by `0x0E1A`. The already extracted files establish the
contents directly:

```text
raw/DATA1/DATA1.005  u16 node count: 0x026E = 622
raw/DATA1/DATA1.004  768 × 16-byte graph-node storage
```

Nodes 0–621 are active. The allocation and extracted member have capacity for
768 nodes; records after the active count are ignored.

The earlier identification of `KOUKAI2.COM` was caused by using the wrong
DS-to-file base. At startup the program makes `DS` equal to its relocated stack
segment. With that segment accounted for, `DS:0x0B64` maps to the embedded
`C:DATA1.LZW` string at file offset `0x3C6D4`.

Each graph node is 16 bytes:

```text
node[0x00]  world X; bit 15 is also used as a marker
node[0x02]  world Y
node[0x04]  neighbor 0 node ID, or 0xFFFF
node[0x06]  neighbor 1 node ID, or 0xFFFF
node[0x08]  neighbor 2 node ID, or 0xFFFF
node[0x0A]  neighbor 3 node ID, or 0xFFFF
node[0x0C]  cost of edge 0 (unsigned byte)
node[0x0D]  cost of edge 1
node[0x0E]  cost of edge 2
node[0x0F]  cost of edge 3
```

Thus a node has at most four outgoing connections, and every link is stored in
both directions with the same cost byte. The cost is a strictly increasing
function of the wrapped straight-line distance `d` between the two nodes and
of nothing else: edges with the same offset always have the same byte, and a
longer edge never has a smaller one. It fits `3.105 d + 0.0201 d² +
0.00075 d³` to within 1.5 (rms 0.42), about 3.4 per tile for short edges and
5.3 per tile at 43 tiles, and every edge of 46 tiles or more stores 255. It
does not follow the water path between the nodes. This is a sparse authored
sea-lane graph, not a waypoint list attached to each port.

The route builder at `MAIN.EXE` `0x28A18–0x28F37` works as follows:

1. `0x28939–0x28A17` selects the node nearest the fleet by squared wrapped
   distance, flagging an exact hit with bit 15, and repeats the scan for the
   final navigation target. The scan runs from 622 down to 0 with a strict
   `<`, so it includes the unused record 622, which duplicates node 621's
   position and wins that tie; no node links to 622, so a search starting or
   ending there finds no route.
2. If the fleet stands exactly on a node that is also the target's nearest
   node, it switches straight to the exact target (`0x28A49`).
3. Otherwise it searches outward from the destination node with a queue of
   `{node, cost}` entries (`bp−0x1B08`), taking nodes in first-discovery order.
   Each edge adds its cost byte to the label (`0x28BDC–0x28BEB`); a node already
   queued keeps the smaller label (`0x28B80–0x28BA9`). The search stops when
   the fleet's node is queued.
4. From the fleet's node it walks toward the destination, at each step taking
   the first neighbour whose label plus the connecting edge equals the current
   label (`0x28E3C–0x28E7A`).
5. At `0x28EAB–0x28F2B` it stores as many as four successive node IDs in the
   fleet's `+0x10..+0x16` cache, skipping the fleet's own node when it stands
   exactly on it. Filling starts at the first empty slot at or after the
   current one, without moving the current slot, and stops at the
   destination's node, setting `0x08`. It then clears `0x40`, except when the
   fleet already stands on the node nearest the target, which sets `0x28` and
   returns.

A player fleet on auto-sail uses a copy of the loop (`0x28AAA–0x28C38`) that
also skips nodes whose X lacks bit 15, set from a bitmap at `DS:0x11CA` by
`0x0D88D`; computer fleets use `0x28C3B–0x28DBF`.

Because nodes are taken in discovery order, a node's label is the cheapest
route through the neighbours expanded before it, not the true cheapest route.
Over all start and destination pairs, the chosen route is the cheapest possible
about 64% of the time; it takes more graph hops than necessary about 18% of
the time; and it differs from a plain fewest-hop search in about half of all
cases. The costs exist only during the search: nothing stores the total, and
no other code reads the cost bytes.

## Worked routes from Lisbon

Running that search over `DATA1.004`, using the count from
`DATA1.005`, gives the following routes from Lisbon `(120,358)`. The node
nearest Lisbon is node 184 at `(115,357)`.

Pernambuco `(2064,722)` maps from node 184 to node 463 in 49 graph hops. Its
route begins south along West Africa, passes the Cape, follows the southern map
boundary west, and then turns north to Pernambuco. The exact node sequence is:

```text
184, 618, 617, 602, 601, 24, 25, 26, 27, 28, 29, 603, 30, 31,
32, 33, 34, 35, 36, 296, 604, 297, 298, 299, 557, 556, 555, 554,
553, 552, 551, 550, 549, 548, 547, 546, 545, 544, 543, 476, 475,
474, 473, 469, 468, 467, 466, 465, 464, 463
```

Veracruz `(1736,532)` maps from node 184 to node 441 in 43 hops, passing node
420 where a plain fewest-hop search would take 421. Its route goes
north from Lisbon, across the Ireland/Greenland corridor, and south along North
America. Both corridors are therefore the graph search's intended output, not a
local collision-avoidance accident.

## Following the cached route

`MAIN.EXE` `0x1F340–0x1F3E2` chooses the coordinate toward which an NPC fleet
will move during the current update. Its relevant priority is:

1. use the temporary waypoint at `+0x08/+0x0A` when flag `0x80` is set;
2. otherwise use the exact mission target at `+0x04/+0x06` when flag `0x20`
   is set; and
3. otherwise resolve the selected graph-node ID from the four-node cache.

In ordinary graph mode the third branch:

1. reads the active slot from `fleet[0x0C]`;
2. reads the corresponding node ID from `fleet[0x10 + slot * 2]`;
3. multiplies the ID by 16;
4. reads that graph node's X and Y; and
5. passes those coordinates to the movement routine.

The matching route-state code at `0x2980C–0x299CC` notices when the fleet has
reached a temporary waypoint or cached node, advances to another populated
slot, refills/rebuilds the cache when necessary, and finally switches to the
exact target when the graph portion of the route is complete.

### Local terrain waypoint layer

The four-node cache is the long-distance layer; it does not directly account
for every coastline tile between graph nodes. Before ordinary movement, the
route-state routine resolves the selected graph node into coordinates and
writes those coordinates to `+0x08/+0x0A`. It then invokes the local search at
`MAIN.EXE` `0x291FD–0x294DF`.

That routine constructs a 72-by-72-cell terrain work area, explores as many as
eight neighboring directions, reconstructs a local path, and overwrites
`+0x08/+0x0A` with a nearer sub-waypoint. Flag `0x80` then makes that
sub-waypoint the fleet's effective target. Only after the fleet reaches it
exactly does `0x2980C–0x299CC` generate another local waypoint or resume
advancing through the graph-node cache. The resulting hierarchy is:

```text
final mission target
  -> 622-node world-graph route
  -> selected node from the four-node cache
  -> 72x72 local terrain search
  -> temporary waypoint at fleet +0x08
  -> incremental ship movement
```

How the fleet then moves depends on whether it is inside the loaded 72 × 72
sea area around the player:

- **Inside the area**, `0x2025D` moves it every tick. `0x36EC1` picks a heading
  toward `+0x08/+0x0A` (Bresenham style, stepping one tile on the major axis
  and 0 or 1 on the minor; heading 8, stop, when already there), and `0x200D0`
  moves it with the terrain test `0x36E6C` on the 2 × 2 block. When the
  heading and both neighbouring headings are blocked, the local search is run
  again toward the same waypoint (`0x299CD`, `0x203F6`). Heading 8 sets fleet
  flag `0x20` and skips the move (`0x2038E`).
- **Outside the area**, the daily update (`0x1FE94`) runs the route state
  (`0x29927`), resolves the target (`0x1F340`), and calls `0x1F456`, which
  does not step at all: it places the fleet directly on the target. Only when
  that point lies inside the loaded area does it put the fleet on the area's
  border instead, scanning along the edge for a clear 2 × 2 spot
  (`0x1F4CF–0x1F6AB`).

### The local search

`0x28FE5` fills the 72 × 72 cost grid (handle `DS:0x0E0C`) with `0x801` for
tiles `0x34` and above and `0x800` otherwise, and fails at once if the target
cell itself is land (`0x2904D`, a 1 × 1 test). The fleet's own cell is forced
to `0x800`. It then floods outward from the target in eight directions, 2 per
orthogonal step and 3 per diagonal (table `DS:0xB378`), keeping its queue
sorted by label as it inserts and fixing each label when first set, staying
inside the grid and admitting a cell only when it and the three cells to its
right and below are water, the fleet's 2 × 2 block (`0x2913F–0x2915B`). The
fleet's cell counts as reached before that test; the search succeeds on
reaching it.

`0x291FD` then descends from the fleet's cell to the strictly lowest of the
eight neighbours (north when they tie), up to 256 steps, and writes as the
waypoint the first step, extended while the path keeps the same direction.
With its flag set (by the route state, not by `0x299CD`) it allows one turn,
45° right first, then left, and keeps extending after the turn only if the
straight part had at least one extra step. The window origin is added to
turn the local cell into world coordinates (`0x294C2`).

When the target is not inside the area, `0x2980C` first tries `0x2976D`,
which handles a target at the very edge of a 720-column map part, and
otherwise `0x2965C`, which clips the target to the area's border along the
line to the fleet (to column or row 0 or 70 of the window) and searches toward
that point. If every attempt fails, the unsearched point stays in
`+0x08/+0x0A` with flag `0x80` set.

## Temporary-waypoint deadlock

The route-state routine advances only on exact arrival. When flag `0x80` is
set, `0x29819–0x29836` compares the fleet position with the waypoint at
`+0x08/+0x0A` and returns unchanged if they differ. Nothing counts attempts or
times out. A waypoint the fleet cannot reach exactly therefore holds it until
the flag is cleared. Two faults produce such waypoints:

1. **The corner bug.** When the local search's start and target cells are the
   same, `0x291FD` writes the window origin itself as the waypoint, without
   the local offset (`0x2927D–0x2928C`), which is the area's top-left corner.
   This happens whenever the fleet stands on the line where its target is
   clipped: at column 70 heading east, column 0 heading west, or row 0 or 70
   heading north or south, the clipped point is the fleet's own position.
   Heading west or north, the fleet sails to the corner and stops there,
   because every new search clips to the corner again. Heading east or south,
   it turns back toward the corner and then out again, back and forth. If the
   corner is land, the next search fails at `0x2904D` and the fleet stops
   where it is.
2. **An unusable border point.** The clipped point is taken at column or row
   70 of the window, and if it is land, or has no 2 × 2 water path to the
   fleet inside the window, the search fails and the raw point is kept. The
   fleet steers straight at it until blocked, and every new search fails the
   same way.

A simulation of these routines over the world map, with the area held still,
puts about a fifth of route legs that start inside it at a parked corner, a
third into corner oscillation or blockage, and an eighth into a failed border
point; only a quarter leave the area normally. Examples: the leg from node 184
to node 0 on the Lisbon–Veracruz route, with the area at `(48,288)`, parks at
that corner; the leg from node 395 to 393, with the area at `(1776,192)`, turns
at `(1846,216)` toward a land corner and stops at `(1777,193)`.

## Recovery

Flag `0x80` is cleared in three places:

- `0x203FD`, in the in-area loop, for a computer fleet whose own 2 × 2 block
  is clear, but only while the player is in port (`DS:0x0E32` not `0xFF`) or
  the fleet is outside the loaded area;
- `0x299A6`, whenever the route state runs for a fleet outside the area; and
- `0xBDD8`, when the loaded area shifts, which resets the route word to
  `0x4000` for fleets whose waypoint falls in the new area on land, but skips
  fleets with flag `0x20` set, which includes fleets stopped by heading 8.

A stuck fleet is therefore released when the player enters port or when the
player's movement shifts the loaded area far enough that the fleet falls
outside it; being off screen alone is not enough.

## Coordinate seam

Port coordinates in the save use the game's raw world X coordinate. The map
extractor rotates X for presentation, placing the pieces in the intuitive
Americas → Europe/Africa → Asia order. For example:

```text
             raw game coordinate    rotated display coordinate
Lisbon             (120, 358)              (840, 358)
Veracruz          (1736, 532)              (296, 532)
Pernambuco        (2064, 722)              (624, 722)
```

After a move into another map part, `0x3764E–0x3765E` reduces fleet word
`+8`, the temporary waypoint's X, mod 2160. That is what makes `0x2976D`'s
two-tile step past a part's first column (target X − 2) reachable across the
X 0 / 2159 seam.

With the raw width of 2160, Lisbon to Pernambuco correctly wraps west by 216
X units. Lisbon to Veracruz also chooses the westward Atlantic direction. The
peculiar routes therefore do not arise from choosing the wrong side of the
world seam.

## Tools

- `pnpm draw-navigation-graph`
  ([`scripts/fleet-navigation/draw-graph.ts`](../../scripts/fleet-navigation/draw-graph.ts))
  draws the 622 nodes and their links over the world map, with the two worked
  routes from Lisbon highlighted, to
  `scripts/fleet-navigation/output/navigation-graph.png`. It needs the world
  map from `pnpm draw-world-map`.
- [`scripts/fleet-navigation/route.ts`](../../scripts/fleet-navigation/route.ts)
  transcribes the nearest-node scan and the route search described above;
  `pnpm navigation-route <from> <to>` prints the route between two port IDs or
  raw `x,y` points, for example `pnpm navigation-route 0 5` for Lisbon to
  Tunis.

![NPC navigation graph](../../scripts/fleet-navigation/output/navigation-graph.png)

The graph has no link across the open Atlantic or Indian Ocean: its lanes
follow the coasts, a corridor along the bottom edge of the map, and one across
the far north. That is why the routes from Lisbon to Pernambuco and Veracruz
are so long.

## Relevant code

- `MAIN.EXE` `0x1C3B1–0x1C3C8`: allocate the navigation-graph block and store
  its handle at runtime word `0x0E1A`.
- `MAIN.EXE` `0x1B7BA–0x1B80A`: load graph members 5 and 4 from `DATA1.LZW`.
- `DATA1.005`: active graph-node count, 622.
- `DATA1.004`: 16-byte graph-node records.
- `MAIN.EXE` `0x28939–0x28A17`: find the graph node nearest a world coordinate.
- `MAIN.EXE` `0x28A18–0x28F37`: cost-labelled graph search and route reconstruction.
- `MAIN.EXE` `0x28F05–0x28F23`: cache as many as four route-node IDs in a fleet.
- `MAIN.EXE` `0x291FD–0x294DF`: construct a 72-by-72 local terrain route and
  write a temporary waypoint.
- `MAIN.EXE` `0x295B8–0x2965B`: select a graph node or exact mission endpoint.
- `MAIN.EXE` `0x2980C–0x299CC`: advance cached graph nodes and rebuild route
  state.
- `MAIN.EXE` `0x1F340–0x1F3E2`: resolve an NPC fleet's active movement target.
- `MAIN.EXE` `0x1F456–0x1F71A`: place a fleet outside the loaded area on its
  target, or on the area's border.
- `MAIN.EXE` `0x28FE5`, `0x291FD–0x294DF`: 72 × 72 local flood and waypoint.
- `MAIN.EXE` `0x2965C`, `0x2976D`: clip an outside target to the area's border.
- `MAIN.EXE` `0x36EC1`, `0x200D0`: heading and step for fleets in the loaded
  area.
- `MAIN.EXE` `0xBDD8`: route reset when the loaded area shifts.
- `MAIN.EXE` `0x1F94E–0x1F9CF`: refresh a moving fleet target for pursuit.
- `MAIN.EXE` `0x1FE94–0x1FF39`: skip ordinary world movement for a fleet in
  the loaded sea area and update it normally when off-screen.
- `MAIN.EXE` `0x2025D–0x20417`: active-fleet sea-area loop; the branch at
  `0x203FD` clears the temporary-waypoint flag (see [Recovery](#recovery)).
- `MAIN.EXE` logical address `2DFF:387C`: terrain predicate used by the local
  movement routines.

## Open questions

None remain.
